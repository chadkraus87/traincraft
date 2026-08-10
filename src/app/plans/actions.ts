"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { filterForLimitations, filterForEquipment, WORKOUT_TYPES, type LimitationTag } from "@/lib/safety/rules";
import { deriveQaForStoredPlan } from "@/lib/ai/plan-qa";
import type { PlanJson, QaReport } from "@/lib/types";

export async function deletePlan(form: FormData) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const planId = String(form.get("id"));
  const clientId = String(form.get("client_id"));

  // RLS ("own plans" policy) already scopes this to the signed-in trainer;
  // deliveries cascade-delete automatically via the FK in the schema.
  await supabase.from("workout_plans").delete().eq("id", planId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  redirect(`/clients/${clientId}`);
}

/**
 * Logs what a client actually did for one exercise — optional, never
 * blocks anything else. This is what lets future generations reference
 * real history instead of a generic placeholder load.
 */
/**
 * Records that the trainer confirms they actually sent a plan. This is
 * explicitly trainer-attested, not automatically detected — since
 * delivery now happens through the trainer's own device (Web Share API /
 * mailto), the app has no way to know whether a share sheet action or a
 * mail app send actually completed. Honest audit trail, not a claim of
 * verified delivery.
 */
export async function confirmDeliverySent(planId: string, channel: "email") {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // The destination is looked up from the plan's client rather than accepted
  // from the browser. It used to be a parameter, which meant the delivery
  // audit trail recorded whatever address the caller claimed — an audit
  // record that the audited party writes is not an audit record.
  const { data: planRow } = await supabase
    .from("workout_plans")
    .select("client_id, clients(email)")
    .eq("id", planId)
    .single();
  if (!planRow) throw new Error("Plan not found");

  const destination = (planRow.clients as unknown as { email: string | null } | null)?.email;
  if (!destination) throw new Error("This client has no email address on file.");

  const { error } = await supabase.from("deliveries").insert({
    trainer_id: user.id,
    plan_id: planId,
    channel,
    destination,
    status: "sent",
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/plans/${planId}`);
}

export async function logExercisePerformance(input: {
  clientId: string;
  exerciseId: string;
  planId: string | null;
  weightUsed: string;
  repsCompleted: string;
  rpe: string;
  notes: string;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  await supabase.from("exercise_logs").insert({
    trainer_id: user.id,
    client_id: input.clientId,
    exercise_id: input.exerciseId,
    plan_id: input.planId,
    weight_used: input.weightUsed || null,
    reps_completed: input.repsCompleted || null,
    rpe: input.rpe ? Number(input.rpe) : null,
    notes: input.notes || null,
  });

  if (input.planId) revalidatePath(`/plans/${input.planId}`);
}

/**
 * Saves the current structure of a plan as a reusable template. Templates
 * store the same PlanJson shape as a real plan — applying one to a client
 * later re-runs the full safety filter and QA validator against that
 * specific client, so a template built for one person can't silently
 * carry over something unsafe for someone else.
 */
export async function saveAsTemplate(planId: string, name: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: planRow } = await supabase.from("workout_plans").select("*").eq("id", planId).single();
  if (!planRow) throw new Error("Plan not found");

  // Strip the exclusions before storing. They describe why *this* client's
  // injuries removed certain exercises — one person's medical context, which
  // has no business travelling into a template that will be applied to
  // someone else. Leaving them in meant Client B's printed plan could carry
  // "excluded because of a lumbar disc injury" belonging to Client A.
  // applyTemplate recomputes exclusions for whoever the template lands on.
  const sourcePlan = planRow.plan as PlanJson;
  const { exclusions: _sourceClientExclusions, ...portable } = sourcePlan;

  const { error } = await supabase.from("plan_templates").insert({
    trainer_id: user.id,
    name,
    workout_type: planRow.workout_type,
    weeks: planRow.weeks,
    days_per_week: planRow.days_per_week,
    plan: { ...portable, exclusions: [] },
  });
  if (error) throw new Error(error.message);
}

/**
 * Persists a trainer's *review* of a plan: their per-check notes, which
 * concerns they've dismissed, and the "I've reviewed this" confirmation.
 *
 * The trainer's judgment is the only thing this accepts. The checks
 * themselves — which passed, which failed, and why — are re-derived on the
 * server from the stored plan, so a hand-crafted request cannot mark a
 * contraindicated plan as having passed QA. Dismissing a concern is still
 * allowed and still recorded: an experienced trainer overriding a flag is a
 * legitimate workflow, and the audit trail should show that they made that
 * call rather than pretending the check never failed.
 */
export interface QaReviewInput {
  trainerConfirmed: boolean;
  /** Keyed by QaCheck.name. Unknown names are ignored. */
  annotations: Record<string, { dismissed?: boolean; addressedNote?: string }>;
}

export async function saveQaReview(planId: string, review: QaReviewInput): Promise<QaReport> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: planRow } = await supabase
    .from("workout_plans")
    .select("client_id, workout_type, days_per_week, is_single_workout, extra_equipment_types, plan, qa_report")
    .eq("id", planId)
    .single();
  if (!planRow) throw new Error("Plan not found");

  // Attempt count belongs to the generation that produced this plan; a
  // review doesn't re-run the builder, so carry it forward rather than
  // resetting the audit trail to 1.
  const priorAttempts = (planRow.qa_report as QaReport | null)?.attempts ?? 1;

  const derived = await deriveQaForStoredPlan(
    supabase,
    planRow,
    planRow.plan as PlanJson,
    priorAttempts
  );

  const checks = derived.checks.map((c) => {
    const note = review.annotations?.[c.name];
    if (!note) return c;
    return {
      ...c,
      // A passing check has nothing to dismiss; ignore the flag rather than
      // storing a confusing "dismissed" marker against a green result.
      dismissed: c.pass ? undefined : !!note.dismissed,
      addressedNote: note.addressedNote?.trim() ? note.addressedNote.trim().slice(0, 500) : undefined,
    };
  });

  const report: QaReport = {
    passed: derived.passed,
    checks,
    attempts: derived.attempts,
    trainerConfirmed: !!review.trainerConfirmed,
    trainerConfirmedAt: review.trainerConfirmed ? new Date().toISOString() : undefined,
  };

  // A plan is deliverable when the validator cleared it OR the trainer has
  // explicitly taken responsibility for the open flags.
  const status = derived.passed || review.trainerConfirmed ? "final" : "draft";

  const { error } = await supabase
    .from("workout_plans")
    .update({ qa_report: report, status })
    .eq("id", planId);
  if (error) throw new Error(error.message);

  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/clients/${planRow.client_id}`);
  revalidatePath("/");

  return report;
}

/**
 * Persists a manually edited plan (exercises added/swapped/removed,
 * trainer notes). Safety-critical: the allowed pool and client
 * limitations are re-derived fresh from the database here, server-side —
 * never trusted from the client — and the full deterministic QA
 * validator re-runs against the edited plan exactly as it does after AI
 * generation. A manual edit that reintroduces a contraindicated exercise
 * or breaks movement balance will re-flag the plan as a draft, the same
 * as a failed AI generation would.
 */
export async function saveEditedPlan(planId: string, plan: PlanJson) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: planRow } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (!planRow) throw new Error("Plan not found");

  const priorAttempts = (planRow.qa_report as QaReport | null)?.attempts ?? 1;
  const qa = await deriveQaForStoredPlan(supabase, planRow, plan, priorAttempts);

  // An edit invalidates any prior sign-off: the trainer confirmed the plan
  // as it was, not as it now is. Dropping trainerConfirmed here is what
  // stops "reviewed and confirmed" from silently carrying over to content
  // nobody has looked at.
  const { error } = await supabase
    .from("workout_plans")
    .update({
      plan,
      qa_report: qa,
      status: qa.passed ? "final" : "draft",
    })
    .eq("id", planId);
  if (error) throw new Error(error.message);

  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/clients/${planRow.client_id}`);
  revalidatePath("/");

  return qa;
}

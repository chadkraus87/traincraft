"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { filterForLimitations, filterForEquipment, WORKOUT_TYPES, type LimitationTag } from "@/lib/safety/rules";
import { validatePlan } from "@/lib/ai/validate";
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
 * Persists trainer edits to the QA report (notes, dismissed concerns, and
 * the "I've reviewed this" confirmation). Confirming flips the plan to
 * "final" status so it shows correctly everywhere else in the app. This
 * only edits the *review record* — it never touches which exercises are
 * actually in the plan, so it can't be used to bypass the safety engine.
 */
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
export async function confirmDeliverySent(planId: string, channel: "email", destination: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  await supabase.from("deliveries").insert({
    trainer_id: user.id,
    plan_id: planId,
    channel,
    destination,
    status: "sent",
  });

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

export async function saveQaReview(planId: string, report: QaReport) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: planRow } = await supabase
    .from("workout_plans")
    .select("client_id")
    .eq("id", planId)
    .single();
  if (!planRow) throw new Error("Plan not found");

  await supabase
    .from("workout_plans")
    .update({
      qa_report: report,
      status: report.trainerConfirmed ? "final" : "draft",
    })
    .eq("id", planId);

  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/clients/${planRow.client_id}`);
  revalidatePath("/");
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

  const [{ data: limitations }, { data: equipment }, { data: pool }] = await Promise.all([
    supabase.from("client_limitations").select("*").eq("client_id", planRow.client_id).eq("active", true),
    supabase.from("client_equipment").select("*").eq("client_id", planRow.client_id),
    supabase.from("exercises").select("*").eq("is_active", true),
  ]);

  const limitationTags = (limitations ?? []).map((l) => l.tag as LimitationTag);
  const { allowed } = filterForLimitations(pool ?? [], limitationTags);
  const ownedTypes = (equipment ?? []).map((e) => e.equipment_type);
  const { usable } = filterForEquipment(allowed, ownedTypes);

  const qa = validatePlan(
    plan,
    usable,
    limitationTags,
    planRow.workout_type as keyof typeof WORKOUT_TYPES,
    planRow.days_per_week
  );

  await supabase
    .from("workout_plans")
    .update({
      plan,
      qa_report: qa,
      status: qa.passed ? "final" : "draft",
    })
    .eq("id", planId);

  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/clients/${planRow.client_id}`);
  revalidatePath("/");

  return qa;
}

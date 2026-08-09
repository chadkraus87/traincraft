/**
 * POST /api/generate · orchestrates Builder -> QA -> retry -> persist.
 * Handles both multi-week plans ("Build a Plan") and single one-off
 * sessions ("Build a Workout") via the isSingleWorkout flag — when set,
 * weeks/daysPerWeek are forced server-side to 1/1 regardless of what the
 * client sent, since the shape of a single workout isn't something the
 * browser should be trusted to dictate.
 * Failed QA on the retry still saves the plan as a draft with the QA report
 * attached, so the trainer sees exactly which checks failed.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildWorkout } from "@/lib/ai/builder";
import { validatePlan } from "@/lib/ai/validate";
import { WORKOUT_TYPES, EQUIPMENT_TYPES, type LimitationTag } from "@/lib/safety/rules";
import type { QaReport } from "@/lib/types";
import { z } from "zod";

export const maxDuration = 120;

/**
 * Per-trainer generation quota. Enforced against generation_events rather
 * than process memory, because serverless instances are recycled and
 * requests fan out — a module-level counter would reset constantly and
 * enforce nothing.
 */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * weeks and daysPerWeek used to be read straight off the body with no upper
 * bound, and both feed prompt size and completion length. `daysPerWeek: 60`
 * was a valid request that inflated every token count on the operator's
 * bill. Bounds are what a human trainer would actually program.
 */
const GenerateRequest = z.object({
  clientId: z.string().uuid("must be a valid client id"),
  workoutType: z.enum(Object.keys(WORKOUT_TYPES) as [string, ...string[]]),
  weeks: z.number().int().min(1).max(12).default(4),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
  title: z.string().trim().max(200).optional(),
  extraInstructions: z.string().trim().max(2000).optional(),
  extraEquipmentTypes: z.array(z.enum(EQUIPMENT_TYPES)).max(EQUIPMENT_TYPES.length).optional(),
  isSingleWorkout: z.boolean().optional(),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Rate limit before doing any work. Each request costs one or two Claude
  // calls against a shared API key, so an unbounded endpoint lets any
  // account drain the budget for everyone.
  const windowStart = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count: recentCount } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", user.id)
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      {
        error: `You've generated ${RATE_LIMIT} plans in the last hour, which is the current limit. Try again shortly — this cap is here so one busy account can't slow generation down for everyone.`,
      },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = GenerateRequest.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".") || "request"}: ${first.message}` },
      { status: 400 }
    );
  }
  const {
    clientId,
    workoutType,
    weeks: requestedWeeks,
    daysPerWeek: requestedDays,
    title,
    extraInstructions,
    extraEquipmentTypes,
    isSingleWorkout,
  } = parsed.data;

  const weeks = isSingleWorkout ? 1 : requestedWeeks;
  const daysPerWeek = isSingleWorkout ? 1 : requestedDays;

  const [{ data: client }, { data: limitations }, { data: equipment }, { data: pool }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("client_limitations").select("*").eq("client_id", clientId).eq("active", true),
      supabase.from("client_equipment").select("*").eq("client_id", clientId),
      supabase.from("exercises").select("*").eq("is_active", true),
    ]);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Recent logged performance for this client, so the builder can ground
  // load suggestions in what actually happened last time instead of a
  // generic placeholder. Optional — most clients won't have any logs yet.
  const { data: recentLogs } = await supabase
    .from("exercise_logs")
    .select("performed_at, weight_used, reps_completed, rpe, exercises(name)")
    .eq("client_id", clientId)
    .order("performed_at", { ascending: false })
    .limit(20);

  const recentPerformanceText = (recentLogs ?? [])
    .filter((l) => l.weight_used || l.reps_completed)
    .map((l) => {
      const exName = (l.exercises as unknown as { name: string } | null)?.name ?? "Unknown exercise";
      const date = new Date(l.performed_at).toLocaleDateString();
      const parts = [l.weight_used, l.reps_completed, l.rpe ? `RPE ${l.rpe}` : null].filter(Boolean);
      return `- ${exName} (${date}): ${parts.join(", ")}`;
    })
    .join("\n");

  // Recent trainer notes (nutrition, sleep, how they're feeling, etc.) —
  // context that isn't tied to a specific exercise but is still worth the
  // builder knowing about.
  const { data: recentNotes } = await supabase
    .from("client_notes")
    .select("note, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentNotesText = (recentNotes ?? [])
    .map((n) => `- (${new Date(n.created_at).toLocaleDateString()}) ${n.note}`)
    .join("\n");

  // Equipment picked in the "consider additional equipment" toggle is
  // ephemeral — used for this generation only, never written to the
  // client's saved equipment record.
  const extraEquipment = ((extraEquipmentTypes ?? []) as string[]).map((type) => ({
    id: `extra-${type}`,
    client_id: clientId,
    label: `${type.replace(/_/g, " ")} (this plan only)`,
    equipment_type: type,
    quantity: 1,
    weight_lb: null,
  }));

  const limitationTags = (limitations ?? []).map((l) => l.tag as LimitationTag);
  const input = {
    client,
    limitations: limitationTags,
    equipment: [...(equipment ?? []), ...extraEquipment],
    pool: pool ?? [],
    workoutType,
    weeks,
    daysPerWeek,
    extraInstructions,
    isSingleWorkout: !!isSingleWorkout,
    recentPerformance: recentPerformanceText || undefined,
    recentNotes: recentNotesText || undefined,
  };

  // Logged before the Claude calls, not after, so a request that times out
  // or throws still counts against the quota. Counting only successes would
  // let a loop of failing requests bill indefinitely.
  await supabase.from("generation_events").insert({
    trainer_id: user.id,
    client_id: clientId,
    workout_type: workoutType,
    weeks,
    days_per_week: daysPerWeek,
  });

  try {
    // Attempt 1
    let { plan, allowedPool } = await buildWorkout(input);
    let qa = validatePlan(plan, allowedPool, limitationTags, workoutType, daysPerWeek, 1, !!isSingleWorkout);

    // One retry with failure feedback folded into trainer notes
    if (!qa.passed) {
      const failures = qa.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`).join(" | ");
      const retry = await buildWorkout({
        ...input,
        extraInstructions: `${extraInstructions ?? ""}\nPREVIOUS ATTEMPT FAILED QA — fix these exactly: ${failures}`,
      });
      const retryQa = validatePlan(retry.plan, retry.allowedPool, limitationTags, workoutType, daysPerWeek, 2, !!isSingleWorkout);
      if (isBetterAttempt(retryQa, qa)) {
        plan = retry.plan;
        qa = retryQa;
      }
    }

    const defaultTitle = isSingleWorkout
      ? `${WORKOUT_TYPES[workoutType].label} workout — ${client.full_name}`
      : `${WORKOUT_TYPES[workoutType].label} — ${client.full_name}`;

    const { data: saved, error } = await supabase
      .from("workout_plans")
      .insert({
        trainer_id: user.id,
        client_id: clientId,
        title: title || defaultTitle,
        workout_type: workoutType,
        weeks,
        days_per_week: daysPerWeek,
        status: qa.passed ? "final" : "draft",
        plan,
        qa_report: qa,
        is_single_workout: !!isSingleWorkout,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ id: saved.id, qa });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Decides whether the retry is genuinely better than the first attempt.
 *
 * Counting passed checks alone treats every check as equally important,
 * which they are not. pool_membership failing means the model invented an
 * exercise id that was never screened against this client's injuries — the
 * one failure that can put an unvetted movement in front of a real person.
 * Under a plain count, a retry that fixed movement_balance but broke
 * pool_membership scored equal and won the tie, swapping a merely
 * unbalanced plan for an unsafe one.
 *
 * So: never trade away pool_membership, and only take the retry on a strict
 * improvement otherwise. Ties go to the first attempt.
 */
const GATING_CHECKS = ["pool_membership", "contraindications"] as const;

function isBetterAttempt(retry: QaReport, first: QaReport): boolean {
  const gateOk = (r: QaReport) =>
    GATING_CHECKS.every((name) => r.checks.find((c) => c.name === name)?.pass !== false);

  if (!gateOk(retry)) return false;
  if (!gateOk(first)) return true;
  if (retry.passed) return true;
  return countPasses(retry) > countPasses(first);
}

function countPasses(r: { checks: { pass: boolean }[] }) {
  return r.checks.filter((c) => c.pass).length;
}

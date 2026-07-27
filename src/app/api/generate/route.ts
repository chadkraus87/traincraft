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
import { WORKOUT_TYPES, type LimitationTag } from "@/lib/safety/rules";

export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const {
    clientId,
    workoutType,
    weeks: requestedWeeks = 4,
    daysPerWeek: requestedDays = 3,
    title,
    extraInstructions,
    extraEquipmentTypes,
    isSingleWorkout,
  } = body;
  if (!clientId || !WORKOUT_TYPES[workoutType])
    return NextResponse.json({ error: "clientId and valid workoutType required" }, { status: 400 });

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
  };

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
      if (retryQa.passed || countPasses(retryQa) >= countPasses(qa)) {
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

function countPasses(r: { checks: { pass: boolean }[] }) {
  return r.checks.filter((c) => c.pass).length;
}

/**
 * QA/REVIEWER · validates Builder output against the Advisor's ruleset.
 * All checks are deterministic code — no LLM in the verification path.
 * A plan is not "done" until this passes (or the trainer overrides a
 * flagged draft knowingly).
 */
import {
  CONTRAINDICATIONS,
  WORKOUT_TYPES,
  type LimitationTag,
} from "@/lib/safety/rules";
import type { Exercise, PlanJson, QaCheck, QaReport } from "@/lib/types";

const PUSH = new Set(["push_horizontal", "push_vertical"]);
const PULL = new Set(["pull_horizontal", "pull_vertical"]);

// Internal check names (below) stay snake_case — tests and the retry-
// feedback loop key off these exact strings. This lookup is purely for
// display, so the trainer never sees the code-facing names.
export const QA_CHECK_LABELS: Record<string, string> = {
  pool_membership: "Every exercise really exists in your library",
  contraindications: "No conflicts with logged injuries",
  session_count: "Correct number of sessions",
  movement_balance: "Balanced movement patterns for this workout type",
  pull_push_ratio: "Balanced pulling vs. pushing volume",
  volume_sanity: "Reasonable number of exercises and sets per session",
  progression_defined: "Clear week-to-week progression, including a deload",
};

export function validatePlan(
  plan: PlanJson,
  allowedPool: Exercise[],
  limitations: LimitationTag[],
  workoutType: keyof typeof WORKOUT_TYPES,
  daysPerWeek: number,
  attempts = 1
): QaReport {
  const checks: QaCheck[] = [];
  const poolById = new Map(allowedPool.map((e) => [e.id, e]));
  const wt = WORKOUT_TYPES[workoutType];

  // 1. Every programmed exercise must come from the allowed pool
  const unknown: string[] = [];
  for (const s of plan.sessions)
    for (const b of s.blocks)
      if (!poolById.has(b.exercise_id)) unknown.push(`${b.name} (${b.exercise_id})`);
  checks.push({
    name: "pool_membership",
    pass: unknown.length === 0,
    detail: unknown.length
      ? `Exercises outside the safety-filtered pool: ${unknown.join("; ")}`
      : "All exercises come from the contraindication- and equipment-filtered pool.",
  });

  // 2. Re-run contraindication check on the final selection (belt + suspenders)
  const contraHits: string[] = [];
  for (const s of plan.sessions) {
    for (const b of s.blocks) {
      const ex = poolById.get(b.exercise_id);
      if (!ex) continue;
      for (const tag of limitations) {
        const rule = CONTRAINDICATIONS[tag];
        if (!rule) continue;
        if (
          rule.avoidPatterns.includes(ex.pattern) ||
          ex.contraindication_tags.some((t) => rule.avoidExerciseTags.includes(t))
        ) {
          contraHits.push(`${ex.name} conflicts with ${tag}`);
        }
      }
    }
  }
  checks.push({
    name: "contraindications",
    pass: contraHits.length === 0,
    detail: contraHits.length
      ? contraHits.join("; ")
      : "No programmed exercise conflicts with the client's logged limitations.",
  });

  // 3. Session count matches request
  checks.push({
    name: "session_count",
    pass: plan.sessions.length === daysPerWeek,
    detail: `Requested ${daysPerWeek} sessions/week, plan has ${plan.sessions.length}.`,
  });

  // 4. Required movement patterns present across the week
  const patterns = new Set<string>();
  for (const s of plan.sessions)
    for (const b of s.blocks) {
      const ex = poolById.get(b.exercise_id);
      if (ex) patterns.add(ex.pattern);
    }
  const missing = wt.balance.requiredPatterns.filter((p) => !patterns.has(p));
  checks.push({
    name: "movement_balance",
    pass: missing.length === 0,
    detail: missing.length
      ? `Missing required patterns for ${wt.label}: ${missing.join(", ")}`
      : `All required patterns present: ${wt.balance.requiredPatterns.join(", ")}.`,
  });

  // 5. Pull:push set ratio
  let pushSets = 0,
    pullSets = 0;
  for (const s of plan.sessions)
    for (const b of s.blocks) {
      const ex = poolById.get(b.exercise_id);
      if (!ex) continue;
      if (PUSH.has(ex.pattern)) pushSets += b.sets;
      if (PULL.has(ex.pattern)) pullSets += b.sets;
    }
  const ratioOk =
    pushSets === 0 || pullSets / pushSets >= wt.balance.pullToPushMin;
  checks.push({
    name: "pull_push_ratio",
    pass: ratioOk,
    detail: `Pull sets ${pullSets} : push sets ${pushSets} (minimum ratio ${wt.balance.pullToPushMin}).`,
  });

  // 6. Sane volume per session (guard against degenerate output)
  const volumeIssues: string[] = [];
  for (const s of plan.sessions) {
    const totalSets = s.blocks.reduce((n, b) => n + b.sets, 0);
    if (s.blocks.length < 3 || s.blocks.length > 10)
      volumeIssues.push(`Day ${s.day}: ${s.blocks.length} exercises`);
    if (totalSets < 8 || totalSets > 35)
      volumeIssues.push(`Day ${s.day}: ${totalSets} total sets`);
  }
  checks.push({
    name: "volume_sanity",
    pass: volumeIssues.length === 0,
    detail: volumeIssues.length
      ? volumeIssues.join("; ")
      : "Per-session exercise count and set volume within sane bounds.",
  });

  // 7. Progression notes exist and mention a deload
  const prog = (plan.progression_notes ?? "").toLowerCase();
  checks.push({
    name: "progression_defined",
    pass: prog.length > 80 && prog.includes("deload"),
    detail:
      prog.length > 80 && prog.includes("deload")
        ? "Progression scheme with deload documented."
        : "Progression notes are missing, too thin, or omit a deload week.",
  });

  return { passed: checks.every((c) => c.pass), checks, attempts };
}

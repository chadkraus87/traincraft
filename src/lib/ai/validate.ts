/**
 * QA/REVIEWER · validates Builder output against the Advisor's ruleset.
 * All checks are deterministic code — no LLM in the verification path.
 * A plan is not "done" until this passes (or the trainer overrides a
 * flagged draft knowingly).
 */
import {
  CONTRAINDICATIONS,
  WORKOUT_TYPES,
  PROGRESSION_RULES,
  isKnownLimitationTag,
  type LimitationTag,
} from "@/lib/safety/rules";
import type { Exercise, PlanJson, QaCheck, QaReport } from "@/lib/types";

const PUSH = new Set(["push_horizontal", "push_vertical"]);
const PULL = new Set(["pull_horizontal", "pull_vertical"]);

/**
 * Muscle groups that tolerate daily work and shouldn't trigger a
 * consecutive-day warning on their own. Core and calves are trained
 * frequently by design; quads or back repeated back-to-back is the signal
 * this check is actually looking for.
 */
const FAST_RECOVERY_MUSCLES = new Set(["core", "obliques", "calves", "forearms", "hip_flexors"]);

/**
 * Sets on one muscle in one session that constitute real training emphasis
 * rather than incidental involvement. Roughly two working exercises. Below
 * this, a muscle appearing on consecutive days is normal full-body training.
 */
const HIGH_VOLUME_SETS = 6;

/**
 * Smallest rep number in a prescription string.
 *
 * Prescriptions are deliberately free-form ("8-10", "30s", "AMRAP",
 * "8/side"), so this returns null whenever there's no rep count to read —
 * a time-based or open-ended block isn't a rep-range violation, and
 * guessing one would produce false failures on legitimate conditioning work.
 */
function lowestRep(reps: string): number | null {
  if (/s\b|sec|min|amrap|max|emom/i.test(reps)) return null;
  const numbers = [...reps.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (numbers.length === 0) return null;
  return Math.min(...numbers);
}

// Internal check names (below) stay snake_case — tests and the retry-
// feedback loop key off these exact strings. This lookup is purely for
// display, so the trainer never sees the code-facing names.
export const QA_CHECK_LABELS: Record<string, string> = {
  pool_membership: "Every exercise really exists in your library",
  limitation_vocabulary: "Every logged injury is one the safety engine understands",
  contraindications: "No conflicts with logged injuries",
  session_count: "Correct number of sessions",
  movement_balance: "Balanced movement patterns for this workout type",
  pull_push_ratio: "Balanced pulling vs. pushing volume",
  volume_sanity: "Reasonable number of exercises and sets per session",
  recovery_spacing: "No primary muscle group trained on back-to-back days",
  rep_range_appropriate: "Rep ranges suit the client's experience level",
  progression_defined: "Clear week-to-week progression, including a deload",
};

export function validatePlan(
  plan: PlanJson,
  allowedPool: Exercise[],
  limitations: readonly string[],
  workoutType: keyof typeof WORKOUT_TYPES,
  daysPerWeek: number,
  attempts = 1,
  isSingleWorkout = false
): QaReport {
  const checks: QaCheck[] = [];
  const poolById = new Map(allowedPool.map((e) => [e.id, e]));
  const wt = WORKOUT_TYPES[workoutType];

  // 0. The client's limitations must all be tags the engine has rules for.
  // Without this, an unrecognized tag means "nothing was excluded for that
  // injury" — and because the contraindication check below skips unknown
  // tags the same way, both layers would agree the plan is clean. This check
  // exists so that failure is loud instead of invisible.
  const unrecognized = [...new Set(limitations.filter((t) => !isKnownLimitationTag(t)))];
  checks.push({
    name: "limitation_vocabulary",
    pass: unrecognized.length === 0,
    detail: unrecognized.length
      ? `No safety rule exists for: ${unrecognized.join(", ")}. Nothing was filtered for ${unrecognized.length > 1 ? "these limitations" : "this limitation"} — re-log it using a supported injury type before sending this plan.`
      : "All logged limitations map to a known safety rule.",
  });

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
        // Unknown tags are surfaced by limitation_vocabulary above, so
        // skipping here no longer hides anything.
        const rule = CONTRAINDICATIONS[tag as LimitationTag];
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
  // A minimum ratio of 0 (lower_body) can never fail: pushSets === 0
  // short-circuits, and otherwise any non-negative quotient clears 0. It was
  // still reported as a passing safety check, which is a false assurance —
  // the trainer reads "balanced pulling vs pushing: passed" on a plan where
  // nothing was actually verified. Report it honestly as not applicable.
  const ratioApplies = wt.balance.pullToPushMin > 0;
  const ratioOk = !ratioApplies || pushSets === 0 || pullSets / pushSets >= wt.balance.pullToPushMin;
  checks.push({
    name: "pull_push_ratio",
    pass: ratioOk,
    detail: !ratioApplies
      ? `Not applicable to ${wt.label} — no pull:push requirement is defined for this workout type.`
      : `Pull sets ${pullSets} : push sets ${pushSets} (minimum ratio ${wt.balance.pullToPushMin}).`,
  });

  // 6. Sane volume per session (guard against degenerate output).
  // Bounds are split by session type. A single one-off session is legitimately
  // shorter than a day inside a structured week — a 5-block mobility or
  // conditioning finisher is a real thing a trainer programs, and the
  // multi-week floor of 3 blocks / 8 sets was failing those and demoting
  // perfectly good workouts to draft.
  const minBlocks = isSingleWorkout ? 2 : 3;
  const minSets = isSingleWorkout ? 4 : 8;
  const volumeIssues: string[] = [];
  for (const s of plan.sessions) {
    const totalSets = s.blocks.reduce((n, b) => n + b.sets, 0);
    if (s.blocks.length < minBlocks || s.blocks.length > 10)
      volumeIssues.push(`Day ${s.day}: ${s.blocks.length} exercises`);
    if (totalSets < minSets || totalSets > 35)
      volumeIssues.push(`Day ${s.day}: ${totalSets} total sets`);
  }
  checks.push({
    name: "volume_sanity",
    pass: volumeIssues.length === 0,
    detail: volumeIssues.length
      ? volumeIssues.join("; ")
      : "Per-session exercise count and set volume within sane bounds.",
  });

  // 6b. No heavy work on the same muscle group two days running.
  // WORKOUT_TYPES declared maxSameMuscleConsecutiveDays for every workout
  // type and nothing ever read it — a 4-day plan hammering quads on days 1
  // through 4 passed every check. Recovery between sessions is the whole
  // point of splitting a week, so this is a programming-quality rule the
  // validator should own rather than trusting the model to remember.
  if (wt.balance.maxSameMuscleConsecutiveDays && !isSingleWorkout) {
    // Measured in sets, not in "did this muscle appear". Full-body training
    // three times a week necessarily touches the same muscles on consecutive
    // days and is perfectly sound programming — flagging that would make the
    // check fire on the most common template in the app. What actually needs
    // a recovery day is repeated *emphasis*: a hypertrophy-range dose landing
    // twice in a row on the same tissue.
    const setsByDayMuscle = new Map<number, Map<string, number>>();
    for (const s of plan.sessions) {
      const perMuscle = new Map<string, number>();
      for (const b of s.blocks) {
        const ex = poolById.get(b.exercise_id);
        if (!ex) continue;
        for (const mg of ex.muscle_groups) {
          perMuscle.set(mg, (perMuscle.get(mg) ?? 0) + b.sets);
        }
      }
      setsByDayMuscle.set(s.day, perMuscle);
    }
    const days = [...setsByDayMuscle.keys()].sort((a, b) => a - b);
    const clashes: string[] = [];
    for (let i = 1; i < days.length; i++) {
      if (days[i] !== days[i - 1] + 1) continue; // not actually consecutive
      const prev = setsByDayMuscle.get(days[i - 1])!;
      const curr = setsByDayMuscle.get(days[i])!;
      for (const [mg, sets] of curr) {
        // Core, calves and forearms tolerate daily work by design.
        if (FAST_RECOVERY_MUSCLES.has(mg)) continue;
        const prevSets = prev.get(mg) ?? 0;
        if (sets >= HIGH_VOLUME_SETS && prevSets >= HIGH_VOLUME_SETS) {
          clashes.push(`Days ${days[i - 1]}→${days[i]}: ${mg} (${prevSets} then ${sets} sets)`);
        }
      }
    }
    checks.push({
      name: "recovery_spacing",
      pass: clashes.length === 0,
      detail: clashes.length
        ? `Same primary muscles trained on back-to-back days — ${clashes.join("; ")}`
        : "No primary muscle group is loaded on consecutive days.",
    });
  }

  // 6c. Rep ranges match the client's experience level.
  // PROGRESSION_RULES declared beginnerRepRange and strengthRepRange and
  // nothing enforced them, so those numbers existed only as English in the
  // model's prompt. Low-rep, near-maximal work programmed for a novice is a
  // technique-under-fatigue injury risk, which is exactly the kind of call
  // this validator is supposed to make deterministically.
  const [beginnerLow] = PROGRESSION_RULES.beginnerRepRange;
  const outOfRange: string[] = [];
  for (const s of plan.sessions) {
    for (const b of s.blocks) {
      const low = lowestRep(b.reps);
      if (low !== null && low < beginnerLow) {
        outOfRange.push(`${b.name} (${b.reps})`);
      }
    }
  }
  // Only enforced for beginner-oriented programming; an intermediate lifter
  // doing triples is correct, not a defect.
  if (workoutType === "beginner_foundations") {
    checks.push({
      name: "rep_range_appropriate",
      pass: outOfRange.length === 0,
      detail: outOfRange.length
        ? `Below the ${beginnerLow}-rep floor for beginner programming: ${outOfRange.join("; ")}. Novices should earn load with reps before going heavy.`
        : `All prescriptions sit at or above the ${beginnerLow}-rep beginner floor.`,
    });
  }

  // 7. Progression notes: a multi-week plan needs a real progression +
  // deload scheme; a single one-off workout just needs a short note,
  // not a multi-week periodization narrative.
  const prog = (plan.progression_notes ?? "").toLowerCase();
  if (isSingleWorkout) {
    checks.push({
      name: "progression_defined",
      pass: prog.trim().length > 10,
      detail:
        prog.trim().length > 10
          ? "Brief follow-up guidance included."
          : "Missing a short note on what to adjust next time.",
    });
  } else {
    checks.push({
      name: "progression_defined",
      pass: prog.length > 80 && prog.includes("deload"),
      detail:
        prog.length > 80 && prog.includes("deload")
          ? "Progression scheme with deload documented."
          : "Progression notes are missing, too thin, or omit a deload week.",
    });
  }

  return { passed: checks.every((c) => c.pass), checks, attempts };
}

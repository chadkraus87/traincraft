/**
 * AI WORKOUT BUILDER · Backend Engineer, implementing the Advisor's rules.
 *
 * Architecture decision (Architect + Advisor): the LLM never sees excluded
 * exercises. We deterministically filter the pool for contraindications and
 * equipment BEFORE prompting, so safety doesn't depend on the model obeying
 * instructions. The model's job is programming quality (selection, order,
 * volume, progression) from an already-safe pool. QA then re-validates.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  filterForLimitations,
  filterForEquipment,
  PROGRESSION_RULES,
  WORKOUT_TYPES,
  type LimitationTag,
  type Exclusion,
} from "@/lib/safety/rules";
import type { Client, EquipmentItem, Exercise, PlanJson } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface BuildInput {
  client: Client;
  limitations: LimitationTag[];
  equipment: EquipmentItem[];
  pool: Exercise[]; // full library incl. trainer's custom exercises
  workoutType: keyof typeof WORKOUT_TYPES;
  weeks: number;
  daysPerWeek: number;
  isSingleWorkout?: boolean;
  extraInstructions?: string;
}

export interface BuildOutput {
  plan: PlanJson;
  allowedPool: Exercise[];
  exclusions: Exclusion[];
}

export async function buildWorkout(input: BuildInput): Promise<BuildOutput> {
  const { client, limitations, equipment, pool, workoutType } = input;

  // 1. Deterministic safety + equipment gates (never delegated to the LLM)
  const { allowed, excluded } = filterForLimitations(pool, limitations);
  const ownedTypes = equipment.map((e) => e.equipment_type);
  const { usable } = filterForEquipment(allowed, ownedTypes);

  if (usable.length < 8) {
    throw new Error(
      `Only ${usable.length} exercises remain after safety and equipment filtering. ` +
        `Add equipment or custom exercises before generating.`
    );
  }

  const wt = WORKOUT_TYPES[workoutType];

  // 2. Prompt: pool is the ONLY allowed exercise set; ids must be echoed back.
  // Grouped by movement pattern (not a flat list) so a required-but-easy-to-
  // miss pattern like pull_horizontal is visually obvious to satisfy, not
  // something the model has to mentally filter for out of a long list.
  const poolByPattern = new Map<string, Exercise[]>();
  for (const e of usable) {
    if (!poolByPattern.has(e.pattern)) poolByPattern.set(e.pattern, []);
    poolByPattern.get(e.pattern)!.push(e);
  }
  const poolLines = [...poolByPattern.entries()]
    .map(
      ([pattern, exs]) =>
        `${pattern.toUpperCase()}:\n` +
        exs
          .map(
            (e) =>
              `  - id:${e.id} | ${e.name} | muscles:${e.muscle_groups.join(",")} | equip:${e.equipment_types.join(",")} | ${e.difficulty}${
                e.unilateral ? " | unilateral" : ""
              }`
          )
          .join("\n")
    )
    .join("\n\n");

  const equipLines =
    equipment.length > 0
      ? equipment.map((e) => `- ${e.label} (x${e.quantity})`).join("\n")
      : "- Bodyweight only";

  const system = `You are an expert strength coach programming for a personal trainer's client. You must follow these rules exactly:

PROGRAMMING RULES (from the Exercise Science Advisor):
${PROGRESSION_RULES.guidance.map((g) => `- ${g}`).join("\n")}
- Required movement patterns across each training week: ${wt.balance.requiredPatterns.join(", ")}
- Pulling set volume must be >= ${wt.balance.pullToPushMin}x pushing set volume across the week (if any pushing is programmed).
- Sessions start with the most technical/heaviest lift, end with core/conditioning.
- Prescribe loads only from the client's actual equipment list; use RPE for bodyweight.

HARD CONSTRAINTS:
- Use ONLY exercises from the provided pool. Echo each exercise's id exactly.
- Do not invent exercises, substitute names, or reference equipment not listed.

NON-NEGOTIABLE FOR THIS SPECIFIC PLAN — check both before you respond:
1. At least one exercise from EACH of these patterns must appear somewhere across the week: ${wt.balance.requiredPatterns.join(", ")}. The pool above is grouped by pattern — find each required pattern's section and use something from it.
2. If you include ANY push_horizontal or push_vertical exercise, total pulling sets (pull_horizontal + pull_vertical) must be >= total pushing sets (minimum ratio ${wt.balance.pullToPushMin}). Add up your own sets before responding — if pulling is short, add or increase a pulling exercise now.
Re-read your planned sessions against these two rules before writing your final answer. A plan that skips a required pattern or shorts pulling volume will be rejected.

`;

  const singleWorkoutOutput = `OUTPUT: respond with ONLY a JSON object (no markdown fences, no other
text) matching:
{
  "sessions": [{ "day": 1, "focus": "string", "blocks": [{ "exercise_id": "uuid", "name": "string", "sets": 3, "reps": "8-10", "load_note": "string", "rest_sec": 90, "coaching_note": "string" }] }],
  "progression_notes": "brief guidance for next time this client trains this focus — what to adjust up or down, plain text, 1-2 sentences"
}
This is a single one-off workout, not a multi-week program — produce exactly ONE session in the sessions array (day 1 only). progression_notes should be short: a note for the trainer on what to adjust if they program a similar session again, not a multi-week periodization scheme.`;

  const multiWeekOutput = `OUTPUT: respond with ONLY a JSON object (no markdown fences, no other
text) matching:
{
  "sessions": [{ "day": 1, "focus": "string", "blocks": [{ "exercise_id": "uuid", "name": "string", "sets": 3, "reps": "8-10", "load_note": "string", "rest_sec": 90, "coaching_note": "string" }] }],
  "progression_notes": "week-over-week progression + deload guidance, plain text"
}
Program ONE template week (${input.daysPerWeek} sessions); progression_notes explains how weeks 2-${input.weeks} evolve.`;

  const fullSystem = system + (input.isSingleWorkout ? singleWorkoutOutput : multiWeekOutput);

  const user = `CLIENT
Name: ${client.full_name}
Goals: ${client.goals ?? "General fitness"}
Training history: ${client.training_history ?? "Unknown — assume novice"}
Remote: ${client.is_remote ? "yes — home equipment only" : "no"}

AVAILABLE EQUIPMENT
${equipLines}

WORKOUT TYPE: ${wt.label} · ${input.daysPerWeek} days/week · ${input.weeks} weeks
${input.extraInstructions ? `TRAINER NOTES: ${input.extraInstructions}` : ""}

ALLOWED EXERCISE POOL (the only exercises you may use):
${poolLines}`;

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: fullSystem,
    messages: [{ role: "user", content: user }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  if (!text.trim()) {
    throw new Error(
      `Claude returned no text (stop reason: ${msg.stop_reason}). Try again — if this repeats, reduce days/week or weeks.`
    );
  }

  // Robust extraction: don't assume the response starts/ends exactly at the
  // JSON — pull out everything from the first "{" to the last "}", which
  // tolerates a stray preamble sentence or trailing note despite the
  // instruction above. This model doesn't support response prefill, so we
  // can't structurally force JSON-only output the stronger way.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  const clean =
    firstBrace === -1 || lastBrace === -1
      ? text.trim()
      : text.slice(firstBrace, lastBrace + 1);

  let parsed: Omit<PlanJson, "exclusions">;
  try {
    parsed = JSON.parse(clean) as Omit<PlanJson, "exclusions">;
  } catch {
    console.error("Failed to parse Claude's response as JSON. Raw output:\n", text);
    throw new Error(
      msg.stop_reason === "max_tokens"
        ? "The generated plan was too long and got cut off. Try fewer days per week."
        : "Claude's response wasn't valid JSON. Please try generating again."
    );
  }

  return {
    plan: {
      ...parsed,
      exclusions: excluded.map((e) => ({
        exercise_name: e.exercise_name,
        limitation_tag: e.limitation_tag,
        reason: e.reason,
        prefer_instead: e.prefer_instead,
      })),
    },
    allowedPool: usable,
    exclusions: excluded,
  };
}

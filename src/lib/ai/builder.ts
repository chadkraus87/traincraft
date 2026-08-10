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
import { GeneratedPlanSchema } from "@/lib/ai/plan-schema";

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
  recentPerformance?: string;
  recentNotes?: string;
  extraInstructions?: string;
}

export interface BuildOutput {
  plan: PlanJson;
  allowedPool: Exercise[];
  exclusions: Exclusion[];
}

/**
 * The client section of the prompt — everything about the person that the
 * model is told.
 *
 * Extracted and exported so it can be asserted directly. The client's name
 * is deliberately absent: it served no programming purpose (the model writes
 * the same plan either way) and it was the only directly identifying field
 * leaving our infrastructure for a third-party API, attached to that
 * person's injuries and training history. Sending health information about
 * an unnamed individual is a materially different disclosure from sending it
 * about a named one.
 *
 * This is easy to undo by accident — a name reads like helpful context when
 * someone is improving prompt quality — so tests/builder-guard.test.ts
 * asserts it stays out.
 */
export function clientBrief(client: Client): string {
  return `CLIENT
Goals: ${client.goals ?? "General fitness"}
Training history: ${client.training_history ?? "Unknown — assume novice"}
Remote: ${client.is_remote ? "yes — home equipment only" : "no"}`;
}

export async function buildWorkout(input: BuildInput): Promise<BuildOutput> {
  const { client, limitations, equipment, pool, workoutType } = input;

  // 1. Deterministic safety + equipment gates (never delegated to the LLM)
  const { allowed, excluded, unrecognized } = filterForLimitations(pool, limitations);

  // Refuse to generate at all when a logged limitation has no rule behind
  // it. We cannot filter for an injury we don't have a definition of, and
  // producing a plan anyway would hand the trainer something that looks
  // fully screened but isn't. Better to stop with an actionable message than
  // to ship a confidently unsafe plan.
  if (unrecognized.length > 0) {
    throw new Error(
      `This client has ${unrecognized.length > 1 ? "limitations" : "a limitation"} the safety engine doesn't recognize: ${unrecognized.join(", ")}. ` +
        `No exercises can be screened against ${unrecognized.length > 1 ? "them" : "it"}, so generation is blocked. ` +
        `Re-log the limitation using one of the supported injury types on the client's page.`
    );
  }

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

  const user = `${clientBrief(client)}

AVAILABLE EQUIPMENT
${equipLines}

WORKOUT TYPE: ${wt.label} · ${input.daysPerWeek} days/week · ${input.weeks} weeks
${input.extraInstructions ? `TRAINER NOTES: ${input.extraInstructions}` : ""}
${input.recentPerformance ? `\nRECENT LOGGED PERFORMANCE for this client (use this to ground load/rep suggestions in reality instead of guessing — if an exercise below was recently logged, base its load_note on what they actually did, progressing sensibly from it):\n${input.recentPerformance}` : ""}
${input.recentNotes ? `\nRECENT TRAINER NOTES on this client (context only — sleep, nutrition, how they're feeling; use judgment about whether it should affect today's session):\n${input.recentNotes}` : ""}

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

  let raw: unknown;
  try {
    raw = JSON.parse(clean);
  } catch {
    console.error("Failed to parse Claude's response as JSON. Raw output:\n", text);
    throw new Error(
      msg.stop_reason === "max_tokens"
        ? "The generated plan was too long and got cut off. Try fewer days per week."
        : "Claude's response wasn't valid JSON. Please try generating again."
    );
  }

  // Parsing as JSON is not the same as being a plan. Validate the structure
  // before anything downstream trusts the numbers in it — a string "3" in a
  // sets field silently breaks every volume calculation in the QA validator.
  const result = GeneratedPlanSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.error("Claude returned a structurally invalid plan:", detail, "\nRaw output:\n", text);
    throw new Error(
      `The generated plan came back malformed (${detail}). Please try generating again.`
    );
  }
  const parsed = result.data;

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

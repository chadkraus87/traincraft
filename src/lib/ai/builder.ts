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

  // 2. Prompt: pool is the ONLY allowed exercise set; ids must be echoed back
  const poolLines = usable
    .map(
      (e) =>
        `- id:${e.id} | ${e.name} | pattern:${e.pattern} | muscles:${e.muscle_groups.join(
          ","
        )} | equip:${e.equipment_types.join(",")} | ${e.difficulty}${
          e.unilateral ? " | unilateral" : ""
        }`
    )
    .join("\n");

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

OUTPUT: your response will be completed starting from an opening "{" —
continue directly into the JSON object with no other text before or after,
matching:
{
  "sessions": [{ "day": 1, "focus": "string", "blocks": [{ "exercise_id": "uuid", "name": "string", "sets": 3, "reps": "8-10", "load_note": "string", "rest_sec": 90, "coaching_note": "string" }] }],
  "progression_notes": "week-over-week progression + deload guidance, plain text"
}
Program ONE template week (${input.daysPerWeek} sessions); progression_notes explains how weeks 2-${input.weeks} evolve.`;

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

  // Prefill: starting Claude's own reply with "{" makes it structurally
  // continue a JSON object rather than write free text — this is a
  // stronger guarantee than an instruction, it can't add a preamble
  // sentence before something it's already begun. Also cuts response
  // time, since no throwaway preamble tokens get generated.
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system,
    messages: [
      { role: "user", content: user },
      { role: "assistant", content: "{" },
    ],
  });

  const continuation = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  if (!continuation.trim()) {
    throw new Error(
      `Claude returned no text (stop reason: ${msg.stop_reason}). Try again — if this repeats, reduce days/week or weeks.`
    );
  }

  // Reconstitute the full JSON: our prefill "{" plus Claude's continuation.
  const full = "{" + continuation;

  // Safety net: trim anything after the last closing brace, in case a
  // trailing note slipped in despite the prefill.
  const lastBrace = full.lastIndexOf("}");
  const clean = lastBrace === -1 ? full : full.slice(0, lastBrace + 1);

  let parsed: Omit<PlanJson, "exclusions">;
  try {
    parsed = JSON.parse(clean) as Omit<PlanJson, "exclusions">;
  } catch {
    console.error("Failed to parse Claude's response as JSON. Raw output:\n", full);
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

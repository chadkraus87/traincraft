/**
 * Runtime shape check for model-generated plans.
 *
 * builder.ts used to do `JSON.parse(text) as PlanJson` — a cast, which is a
 * promise to the type checker and nothing at all at runtime. Anything that
 * parsed as JSON flowed straight into the validator and then into the
 * database. The failure modes were not theoretical:
 *
 *   · `sets: "3"` (a string) made `blocks.reduce((n, b) => n + b.sets, 0)`
 *     concatenate instead of add, so "0" + "3" + "4" = "034" → 34. The
 *     volume and pull:push checks then reported confident, wrong numbers.
 *   · `sets: 0` or a negative value passed every check and could offset a
 *     genuinely excessive session back under the volume ceiling.
 *   · A missing `blocks` array threw a TypeError inside validatePlan, which
 *     surfaced as an opaque 500 rather than a retry.
 *
 * Bounds are deliberately generous — this is a structural guard, not a
 * second opinion on programming. Judgments about whether a plan is *good*
 * belong in validatePlan; this only establishes that it is well-formed
 * enough to be judged at all.
 */
import { z } from "zod";

export const PlanBlockSchema = z.object({
  exercise_id: z.string().min(1),
  name: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  // Free-form on purpose: "8-10", "30s", "AMRAP", "8/side" are all valid.
  reps: z.union([z.string(), z.number()]).transform(String),
  load_note: z.union([z.string(), z.number()]).transform(String).default(""),
  rest_sec: z.number().int().min(0).max(600).default(60),
  coaching_note: z.string().optional(),
});

export const PlanSessionSchema = z.object({
  day: z.number().int().min(1).max(7),
  focus: z.string().min(1),
  blocks: z.array(PlanBlockSchema).min(1),
});

export const GeneratedPlanSchema = z
  .object({
    sessions: z.array(PlanSessionSchema).min(1),
    progression_notes: z.string().default(""),
  })
  .superRefine((plan, ctx) => {
    // Duplicate day numbers were completely unchecked: session_count only
    // compared array length, so [1, 1, 3] passed as three sessions and the
    // client received two "Day 1" workouts.
    const days = plan.sessions.map((s) => s.day);
    if (new Set(days).size !== days.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `duplicate day numbers: [${days.join(", ")}]`,
        path: ["sessions"],
      });
    }
  });

export type GeneratedPlan = z.infer<typeof GeneratedPlanSchema>;

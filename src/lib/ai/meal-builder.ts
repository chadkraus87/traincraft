/**
 * AI MEAL PLAN BUILDER. The model sees only the screened food pool and the
 * numeric targets — never the client's name, allergies, or health history.
 * Allergy safety is already done by the time the prompt is written; the model
 * can't undo it because it can only reference foods it was shown, and QA
 * re-checks every food against the full library anyway.
 *
 * Output is forced through a tool call so the response is schema-shaped JSON
 * rather than prose to be scraped, then validated with zod before use.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Food, MealPlanJson } from "@/lib/nutrition/meals";
import type { MacroTargets } from "@/lib/nutrition/macros";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const Selection = z.object({
  days: z.array(z.object({
    day: z.number().int().min(1).max(7),
    meals: z.array(z.object({
      items: z.array(z.object({ fdc_id: z.number().int(), grams: z.number().positive().max(2000) })).min(1).max(8),
    })).min(1).max(5),
  })).min(1).max(7),
});

const TOOL: Anthropic.Tool = {
  name: "submit_meal_plan",
  description: "Submit the meal plan. Every food must be an fdc_id from the provided pool.",
  input_schema: {
    type: "object",
    properties: {
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "integer" },
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { fdc_id: { type: "integer" }, grams: { type: "number" } },
                      required: ["fdc_id", "grams"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          },
          required: ["day", "meals"],
        },
      },
    },
    required: ["days"],
  },
};

export interface MealBuildInput {
  pool: Food[];
  targets: MacroTargets;
  diet: string;
  days: number;
  mealsPerDay: number;
  feedback?: string;
}

export function mealName(index: number, count: number): string {
  const names: Record<number, string[]> = {
    2: ["Meal 1", "Meal 2"],
    3: ["Breakfast", "Lunch", "Dinner"],
    4: ["Breakfast", "Lunch", "Snack", "Dinner"],
    5: ["Breakfast", "Snack", "Lunch", "Snack", "Dinner"],
  };
  return names[count]?.[index] ?? `Meal ${index + 1}`;
}

/** Exported so tests can assert nothing identifying reaches the prompt. */
/** Protein per 100 kcal — how much protein a food buys per unit of budget. */
const proteinDensity = (f: Food) => (Number(f.kcal) > 0 ? (Number(f.protein_g) / Number(f.kcal)) * 100 : 0);

export function mealPrompt(i: MealBuildInput): string {
  const poolLines = i.pool
    .map((f) =>
      `${f.fdc_id} | ${f.name} | ${f.category} | serving ${Number(f.serving_g)} g (${f.serving_desc}), max ${Number(f.max_serving_g)} g | per 100 g: ${Number(f.kcal)} kcal, P ${Number(f.protein_g)}, F ${Number(f.fat_g)}, C ${Number(f.carbs_g)}`
    )
    .join("\n");
  return `DAILY TARGETS: ${i.targets.calories} kcal · protein ${i.targets.proteinG} g · fat ${i.targets.fatG} g · carbs ${i.targets.carbsG} g
DIET: ${i.diet === "none" ? "no restriction" : i.diet}
PLAN: ${i.days} day${i.days > 1 ? "s" : ""}, exactly ${i.mealsPerDay} meals per day, days numbered 1-${i.days}.
${i.feedback ? `\nPREVIOUS ATTEMPT FAILED QA — fix these exactly: ${i.feedback}\n` : ""}
MOST PROTEIN-EFFICIENT FOODS in this pool (most protein per calorie). Anchor every meal on one of these and size it FIRST, then spend the remaining calories on everything else — this is the only way to reach the protein target without overshooting calories:
${i.pool.filter((f) => proteinDensity(f) >= 8).sort((a, b) => proteinDensity(b) - proteinDensity(a)).slice(0, 12)
  .map((f) => `  ${f.fdc_id} | ${f.name} | ${Math.round(proteinDensity(f) * 10) / 10} g protein per 100 kcal | max ${Number(f.max_serving_g)} g`).join("\n")}

FOOD POOL (fdc_id | name | category | portion bounds | nutrition). Use ONLY these fdc_ids:
${poolLines}`;
}

// These mirror the deterministic QA checks. The model is told the rules it
// will be judged against, because a plan that fails QA becomes a draft the
// trainer can't send — and a feature that always drafts teaches trainers to
// ignore the warning, which is its own harm.
const SYSTEM = `You build practical, everyday meal plans for a personal trainer's healthy adult client.
- Use only foods from the pool, referenced by fdc_id. Never invent a food.
- Each day should land within 5% of the calorie target and meet the protein target. Add up each day using the per-100 g values before submitting.
- Protein is the hardest constraint. Pick each meal's protein source first and size it to reach the daily protein target, then fill the remaining calories. A plan that misses protein is rejected.
- Keep every portion at or below its max. Build meals people actually eat together.
- Every day needs at least two vegetables and at least one fruit.
- Keep each meal between 10% and 50% of the day's calories, and spread protein across meals.
- Stay under 2300 mg sodium a day, keep saturated fat under 10% of calories, and keep sweeteners (honey) under 10% of calories.
- Include enough fibre: at least 14 g per 1000 kcal, and no more than 70 g in a day.
- Use at least six different foods every day, and vary them across days. Only the listed foods — no sauces, toppings or extras.
Submit the plan with the submit_meal_plan tool.`;

export async function buildMealPlan(i: MealBuildInput): Promise<MealPlanJson> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content: mealPrompt(i) }],
  });

  const block = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block || msg.stop_reason === "max_tokens") {
    throw new Error(
      msg.stop_reason === "max_tokens"
        ? "The meal plan was too long and got cut off. Try fewer days or meals."
        : `Claude didn't return a meal plan (stop reason: ${msg.stop_reason}). Try again.`
    );
  }
  const parsed = Selection.safeParse(block.input);
  if (!parsed.success) {
    const detail = parsed.error.issues.slice(0, 3).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ");
    throw new Error(`The meal plan came back malformed (${detail}). Try again.`);
  }

  // fdc_id → library id, from the screened pool only. An id the model made up
  // keeps a sentinel that can never match a real food, so QA fails it.
  const byFdc = new Map(i.pool.map((f) => [f.fdc_id, f.id]));
  // Meal names come from code, and the model writes no notes. Nothing it
  // writes as free text reaches the client: the model is never told their
  // allergies, so a name like "satay bowl" or a tip like "add peanut butter"
  // could contradict the screening the plan is built on.
  return {
    days: parsed.data.days.map((d) => ({
      day: d.day,
      meals: d.meals.map((m, mi) => ({
        name: mealName(mi, d.meals.length),
        items: m.items.map((it) => ({ food_id: byFdc.get(it.fdc_id) ?? `unscreened:${it.fdc_id}`, grams: it.grams })),
      })),
    })),
  };
}

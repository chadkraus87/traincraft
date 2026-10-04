/**
 * Meal plans: food screening, portion scaling, and QA. All deterministic.
 *
 * Same shape as the exercise pipeline: screen the library for this client →
 * the model picks foods and rough portions from the screened pool only →
 * code scales portions and computes every number → QA re-derives everything
 * from the library and the client's profile → persist. The model's own
 * arithmetic is never trusted and never shown.
 */
import { ALLERGENS, type NutritionProfile } from "@/lib/nutrition/gates";
import type { MacroTargets } from "@/lib/nutrition/macros";

export interface Food {
  id: string;
  fdc_id: number;
  name: string;
  category: string;
  animal_class: string;
  serving_g: number;
  serving_desc: string;
  max_serving_g: number;
  allergens: string[];
  contains_gluten: boolean;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  is_active: boolean;
}

export interface MealItem { food_id: string; grams: number }
export interface Meal { name: string; items: MealItem[] }
export interface MealDay { day: number; meals: Meal[] }
export interface MealPlanJson { days: MealDay[] }

export interface QaCheck { name: string; pass: boolean; detail: string }
export interface MealQaReport { passed: boolean; checks: QaCheck[]; attempts: number }

const DIET_ALLOWS: Record<string, readonly string[]> = {
  none: ["meat", "fish", "shellfish", "animal_product", "plant"],
  pescatarian: ["fish", "shellfish", "animal_product", "plant"],
  vegetarian: ["animal_product", "plant"],
  vegan: ["plant"],
};

/**
 * Why this food is unsafe or unsuitable for this client — empty when it's
 * fine. Fails closed on anything it can't interpret: an allergen tag outside
 * the vocabulary, an unknown diet, an unknown animal class. Used both to build
 * the pool and by QA against the full library, so a mistake here can't hide
 * behind pool membership.
 */
export function foodConflicts(food: Food, p: NutritionProfile): string[] {
  const out: string[] = [];
  if (!food.is_active) out.push("no longer in the food library");
  for (const a of food.allergens) {
    if (!(ALLERGENS as readonly string[]).includes(a)) out.push(`unrecognised allergen tag "${a}"`);
    else if (p.allergens.includes(a)) out.push(`contains ${a.replace("_", " ")}`);
  }
  if (p.gluten_free && food.contains_gluten) out.push("contains gluten");
  const allowed = DIET_ALLOWS[p.diet];
  if (!allowed) out.push(`unrecognised diet "${p.diet}"`);
  else if (!allowed.includes(food.animal_class)) out.push(`not ${p.diet}`);
  return out;
}

export function screenFoods(foods: Food[], p: NutritionProfile): Food[] {
  return foods.filter((f) => foodConflicts(f, p).length === 0);
}

const n = (v: number | string) => Number(v);

export function itemMacros(food: Food, grams: number) {
  const k = grams / 100;
  return { kcal: n(food.kcal) * k, protein: n(food.protein_g) * k, fat: n(food.fat_g) * k, carbs: n(food.carbs_g) * k };
}

export function dayTotals(day: MealDay, byId: Map<string, Food>) {
  const t = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  for (const meal of day.meals) {
    for (const item of meal.items) {
      const f = byId.get(item.food_id);
      if (!f) continue; // an unknown food fails pool_membership; totals just skip it
      const m = itemMacros(f, item.grams);
      t.kcal += m.kcal; t.protein += m.protein; t.fat += m.fat; t.carbs += m.carbs;
    }
  }
  return t;
}

/**
 * Scales each day's portions toward the calorie target. The model is good at
 * choosing sensible meals and bad at arithmetic, so it proposes and code
 * scales. The factor is bounded so a badly-built day gets flagged by QA rather
 * than rescued into absurd portions, and no item exceeds its per-meal maximum.
 */
export function scalePortions(plan: MealPlanJson, byId: Map<string, Food>, targetKcal: number): MealPlanJson {
  return {
    ...plan,
    days: plan.days.map((day) => {
      const kcal = dayTotals(day, byId).kcal;
      const factor = kcal > 0 ? Math.min(1.25, Math.max(0.8, targetKcal / kcal)) : 1;
      return {
        ...day,
        meals: day.meals.map((meal) => ({
          ...meal,
          items: meal.items.map((item) => {
            const f = byId.get(item.food_id);
            if (!f) return item;
            const grams = Math.round((item.grams * factor) / 5) * 5;
            return { ...item, grams: Math.min(n(f.max_serving_g), Math.max(5, grams)) };
          }),
        })),
      };
    }),
  };
}

export const MEAL_QA_LABELS: Record<string, string> = {
  structure: "Days and meals",
  pool_membership: "Foods from the screened library",
  allergens: "Allergies and diet",
  portions: "Portion sizes",
  calories: "Daily calories",
  protein: "Daily protein",
  variety: "Variety",
};

/** Checks that must never be traded away when choosing between attempts. */
export const GATING_MEAL_CHECKS = ["pool_membership", "allergens"];

const r = (x: number) => Math.round(x);

/**
 * Re-derives every verdict from the library and the client's profile as they
 * are now. `library` is the full food table, not the screened pool: the
 * allergen check has to be able to see a food the pool would have hidden.
 */
export function validateMealPlan(
  plan: MealPlanJson,
  library: Food[],
  profile: NutritionProfile,
  targets: Pick<MacroTargets, "calories" | "proteinG" | "minCalories">,
  days: number,
  mealsPerDay: number,
  attempts: number
): MealQaReport {
  const byId = new Map(library.map((f) => [f.id, f]));
  const pool = new Set(screenFoods(library, profile).map((f) => f.id));
  const items = plan.days.flatMap((d) => d.meals.flatMap((m) => m.items));
  const checks: QaCheck[] = [];
  const add = (name: string, bad: string[], ok: string) =>
    checks.push({ name, pass: bad.length === 0, detail: bad.length ? bad.slice(0, 5).join("; ") : ok });

  const dayNums = plan.days.map((d) => d.day).sort((a, b) => a - b).join(",");
  const expected = Array.from({ length: days }, (_, i) => i + 1).join(",");
  add("structure", [
    ...(dayNums !== expected ? [`expected days ${expected}, got ${dayNums || "none"}`] : []),
    ...plan.days.filter((d) => d.meals.length !== mealsPerDay).map((d) => `day ${d.day} has ${d.meals.length} meals, expected ${mealsPerDay}`),
    ...plan.days.flatMap((d) => d.meals.filter((m) => m.items.length === 0).map((m) => `day ${d.day} ${m.name} is empty`)),
  ], `${days} day${days > 1 ? "s" : ""} × ${mealsPerDay} meals`);

  add("pool_membership",
    [...new Set(items.filter((i) => !pool.has(i.food_id)).map((i) => byId.get(i.food_id)?.name ?? `unknown food ${i.food_id}`))],
    "every food is in the client's screened library");

  // The profile's own vocabulary, checked here rather than trusted from the
  // gate: an allergy string that matches no food tag would otherwise pass.
  const profileBad = [
    ...profile.allergens.filter((a) => !(ALLERGENS as readonly string[]).includes(a)).map((a) => `unrecognised client allergy "${a}"`),
    ...(DIET_ALLOWS[profile.diet] ? [] : [`unrecognised diet "${profile.diet}"`]),
  ];
  add("allergens",
    [...profileBad, ...new Set(items.flatMap((i) => {
      const f = byId.get(i.food_id);
      if (!f) return [`unknown food ${i.food_id} can't be screened`];
      return foodConflicts(f, profile).map((c) => `${f.name}: ${c}`);
    }))],
    "no food conflicts with the client's allergies, gluten-free status or diet");

  // Summed per food per meal, so listing a food twice can't double its maximum.
  add("portions",
    plan.days.flatMap((d) => d.meals.flatMap((m) => {
      const grams = new Map<string, number>();
      for (const i of m.items) grams.set(i.food_id, (grams.get(i.food_id) ?? 0) + (i.grams > 0 ? i.grams : NaN));
      return [...grams].flatMap(([id, g]) => {
        const f = byId.get(id);
        if (!f) return [];
        return !(g > 0) || g > n(f.max_serving_g) ? [`day ${d.day} ${m.name}, ${f.name}: ${g} g (max ${n(f.max_serving_g)} g)`] : [];
      });
    })),
    "every portion is within its per-meal maximum");

  // Asymmetric window, and never below the deficit floor: going under a
  // target that may already sit at the floor is worse than going over it.
  // Non-finite targets make every bound NaN, and NaN comparisons are false —
  // so they're rejected outright rather than silently passing.
  const finite = [targets.calories, targets.proteinG, targets.minCalories].every((x) => Number.isFinite(x)) && targets.calories > 0;
  const lo = finite ? Math.max(targets.calories * 0.95, targets.minCalories) : NaN;
  const hi = finite ? targets.calories * 1.1 : NaN;
  const totals = plan.days.map((d) => ({ day: d.day, ...dayTotals(d, byId) }));
  add("calories",
    !finite ? ["the plan's calorie targets are missing or invalid"] : totals.filter((t) => t.kcal < lo || t.kcal > hi).map((t) => `day ${t.day}: ${r(t.kcal)} kcal (target ${targets.calories}, allowed ${r(lo)}–${r(hi)})`),
    `every day within ${r(lo)}–${r(hi)} kcal`);

  add("protein",
    !finite ? ["the plan's protein target is missing or invalid"] : totals.filter((t) => t.protein < targets.proteinG * 0.9).map((t) => `day ${t.day}: ${r(t.protein)} g (target ${targets.proteinG} g, minimum ${r(targets.proteinG * 0.9)} g)`),
    `every day at least ${r(targets.proteinG * 0.9)} g protein`);

  // Counted per day, not across the plan. Flattened, a 7-day plan built from
  // the same six foods repeated seven times passed — which is the opposite of
  // what this check is named for.
  const minDistinct = Math.min(6, pool.size);
  const perDay = plan.days.map((d) => ({ day: d.day, n: new Set(d.meals.flatMap((m) => m.items.map((i) => i.food_id))).size }));
  add("variety",
    perDay.filter((d) => d.n < minDistinct).map((d) => `day ${d.day}: only ${d.n} different foods (minimum ${minDistinct})`),
    `at least ${minDistinct} different foods each day`);

  return { passed: checks.every((c) => c.pass), checks, attempts };
}

/** Never trade away a gating check; otherwise take the retry only if strictly better. */
export function isBetterMealAttempt(retry: MealQaReport, first: MealQaReport): boolean {
  const gateOk = (q: MealQaReport) => GATING_MEAL_CHECKS.every((c) => q.checks.find((x) => x.name === c)?.pass === true);
  if (!gateOk(retry)) return false;
  if (!gateOk(first) || retry.passed) return true;
  const passes = (q: MealQaReport) => q.checks.filter((c) => c.pass).length;
  return passes(retry) > passes(first);
}

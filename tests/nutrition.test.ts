/** TEST · Macro calculator and nutrition scope-of-practice gates. */
import { calculateTargets } from "../src/lib/nutrition/macros";
import { nutritionGate, MEDICAL_NUTRITION_TAGS, NUTRITION_NEUTRAL_TAGS, MEDICATIONS, type NutritionGateInput } from "../src/lib/nutrition/gates";
import type { ScreeningRow } from "../src/lib/intake/screening";
import type { NutritionProfile } from "../src/lib/nutrition/gates";
import { screenFoods, validateMealPlan, scalePortions, dayTotals, isBetterMealAttempt, type Food, type MealPlanJson, type MealQaReport } from "../src/lib/nutrition/meals";
import { judgeMealPlan, type MealPlanRow } from "../src/lib/nutrition/context";
import { mealPrompt, mealName } from "../src/lib/ai/meal-builder";
import { LIMITATION_TAGS } from "../src/lib/safety/rules";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS " : "FAIL "} ${name}${cond || !detail ? "" : " — " + detail}`);
  if (!cond) failures++;
}

// ── Mifflin-St Jeor, against hand-worked values ─────────────────────────
// Male, 30y, 80 kg, 180 cm: 10(80) + 6.25(180) − 5(30) + 5 = 1780
{
  const t = calculateTargets({ sex: "male", age: 30, weightLb: 80 / 0.45359237, heightIn: 180 / 2.54, activity: "sedentary", goal: "maintain", deficitAllowed: true });
  check("male BMR matches Mifflin-St Jeor (1780)", t.bmr === 1780, String(t.bmr));
  check("sedentary maintenance is BMR × 1.2", t.maintenance === Math.round((1780 * 1.2) / 10) * 10, String(t.maintenance));
}
// Female, 30y, 60 kg, 165 cm: 600 + 1031.25 − 150 − 161 = 1320.25
{
  const t = calculateTargets({ sex: "female", age: 30, weightLb: 60 / 0.45359237, heightIn: 165 / 2.54, activity: "moderate", goal: "maintain", deficitAllowed: true });
  check("female BMR matches Mifflin-St Jeor (1320)", t.bmr === 1320, String(t.bmr));
}

// ── Safety floors ───────────────────────────────────────────────────────
{
  // Small, older, sedentary: a 20% cut would land near 950 kcal.
  const t = calculateTargets({ sex: "female", age: 60, weightLb: 110, heightIn: 60, activity: "sedentary", goal: "lose", deficitAllowed: true });
  check("a deficit never goes below the sex-specific floor", t.calories >= 1200, String(t.calories));
  check("a floored target says it was adjusted", t.adjusted && t.notes.length > 0);
}
{
  const t = calculateTargets({ sex: "male", age: 25, weightLb: 400, heightIn: 70, activity: "sedentary", goal: "lose", deficitAllowed: true });
  check("a deficit never goes below the client's own BMR", t.calories >= t.bmr, `${t.calories} < ${t.bmr}`);
}
{
  const t = calculateTargets({ sex: "female", age: 30, weightLb: 150, heightIn: 66, activity: "light", goal: "lose", deficitAllowed: false });
  check("when a deficit isn't allowed, 'lose' becomes maintenance", t.calories === t.maintenance, `${t.calories} vs ${t.maintenance}`);
}
{
  const t = calculateTargets({ sex: "male", age: 35, weightLb: 190, heightIn: 71, activity: "moderate", goal: "gain", deficitAllowed: true });
  const kcalFromMacros = t.proteinG * 4 + t.fatG * 9 + t.carbsG * 4;
  check("macros add back up to the calorie target (within rounding)", Math.abs(kcalFromMacros - t.calories) <= 40, `${kcalFromMacros} vs ${t.calories}`);
}

// ── Scope-of-practice gates ─────────────────────────────────────────────
const screening: ScreeningRow = {
  screened_on: "2026-09-01", currently_active: true, known_cardiovascular_disease: false,
  known_metabolic_disease: false, known_renal_disease: false, has_symptoms: false,
  eating_disorder_history: false, consent_data_storage: true, waiver_signed: true, clearance_obtained_on: null,
};
const base: NutritionGateInput = {
  screening, screeningAllowed: true, limitationTags: [], age: 35, bmi: 24, hasBasics: true,
  profile: { activity_level: "moderate", goal: "lose", diet: "none", allergens: [], gluten_free: false, other_allergy: false, severe_allergy: false, life_stage: "none", medications: [], other_medication: false },
};
const g = (over: Partial<NutritionGateInput>) => nutritionGate({ ...base, ...over });
const withProfile = (p: Partial<NonNullable<NutritionGateInput["profile"]>>) => g({ profile: { ...base.profile!, ...p } });

{
  const r = g({});
  check("a healthy, screened, complete client gets targets, deficit and meal plans", r.targets && r.deficit && r.mealPlans);
}
{
  const r = g({ screening: { ...screening, eating_disorder_history: true } });
  check("eating disorder history blocks targets, deficit and meal plans", !r.targets && !r.deficit && !r.mealPlans);
  check("that block refers to a dietitian", r.reasons.some((x) => /dietitian/i.test(x)));
}
for (const flag of ["known_metabolic_disease", "known_renal_disease", "known_cardiovascular_disease"] as const) {
  const r = g({ screening: { ...screening, [flag]: true } });
  check(`${flag}: targets allowed, but no deficit or meal plan`, r.targets && !r.deficit && !r.mealPlans);
}
for (const tag of ["pregnancy_2nd_3rd_trimester", "hypertension_uncontrolled", "osteoporosis"]) {
  const r = g({ limitationTags: [tag] });
  check(`${tag} limitation blocks deficit and meal plans`, r.targets && !r.deficit && !r.mealPlans);
}
check("an ordinary injury doesn't restrict nutrition", g({ limitationTags: ["low_back_pain"] }).mealPlans);
check("a minor gets no deficit or meal plan", (() => { const r = g({ age: 16 }); return !r.deficit && !r.mealPlans; })());
check("an underweight BMI gets no deficit or meal plan", (() => { const r = g({ bmi: 17.9 }); return !r.deficit && !r.mealPlans; })());

check("an allergy outside the nine blocks meal plans", !withProfile({ other_allergy: true }).mealPlans);
check("an allergy outside the nine still allows targets", withProfile({ other_allergy: true }).targets);
check("a severe allergy blocks meal plans", !withProfile({ severe_allergy: true }).mealPlans);
check("an unrecognised allergen string fails closed", !withProfile({ allergens: ["mustard"] }).mealPlans);
check("a tracked allergen alone does not block meal plans", withProfile({ allergens: ["peanut", "sesame"] }).mealPlans);

check("no profile blocks everything", (() => { const r = g({ profile: null }); return !r.targets && !r.mealPlans; })());
check("missing basics blocks everything", (() => { const r = g({ hasBasics: false }); return !r.targets && !r.mealPlans; })());
check("an incomplete screening blocks everything", (() => { const r = g({ screeningAllowed: false }); return !r.targets && !r.mealPlans; })());

// ── Meal plans: screening, scaling, QA ──────────────────────────────────
{
  const food = (id: string, o: Partial<Food> = {}): Food => ({
    id, fdc_id: Number(id.replace(/\D/g, "")) || 1, name: id, category: "protein", animal_class: "plant",
    serving_g: 100, serving_desc: "100 g", max_serving_g: 300, allergens: [], contains_gluten: false,
    kcal: 100, protein_g: 10, fat_g: 3, carbs_g: 8, is_active: true, ...o,
  });
  const lib: Food[] = [
    food("f1"), food("f2"), food("f3"), food("f4"), food("f5"), food("f6"),
    food("peanut7", { allergens: ["peanut"] }),
    food("beef8", { animal_class: "meat" }),
    food("oats9", { contains_gluten: true, category: "grain" }),
    food("weird10", { allergens: ["mustard"] }),
    food("old11", { is_active: false }),
    food("fish12", { animal_class: "fish", allergens: ["fish"] }),
  ];
  const prof = (o: Partial<NutritionProfile> = {}): NutritionProfile => ({
    activity_level: "light", goal: "maintain", diet: "none", allergens: [], gluten_free: false,
    other_allergy: false, severe_allergy: false, life_stage: "none", medications: [], other_medication: false, ...o,
  });
  const ids = (p: NutritionProfile) => screenFoods(lib, p).map((f) => f.id);

  check("screen: allergen excluded", !ids(prof({ allergens: ["peanut"] })).includes("peanut7"));
  check("screen: gluten-free excludes gluten", !ids(prof({ gluten_free: true })).includes("oats9"));
  check("screen: vegetarian excludes meat and fish", (() => { const x = ids(prof({ diet: "vegetarian" })); return !x.includes("beef8") && !x.includes("fish12"); })());
  check("screen: pescatarian keeps fish, drops meat", (() => { const x = ids(prof({ diet: "pescatarian" })); return x.includes("fish12") && !x.includes("beef8"); })());
  check("screen: unknown allergen tag on a food fails closed", !ids(prof()).includes("weird10"));
  check("screen: inactive food excluded", !ids(prof()).includes("old11"));
  check("screen: unknown diet fails closed", ids(prof({ diet: "keto" as NutritionProfile["diet"] })).length === 0);
  check("screen: unknown animal class fails closed", screenFoods([food("x1", { animal_class: "insect" })], prof()).length === 0);

  // 2 meals × 3 foods × 200 g of 100 kcal/100 g = 1200 kcal, 120 g protein.
  const meal = (a: string, b: string, c: string, g = 200) => ({ name: "M", items: [a, b, c].map((food_id) => ({ food_id, grams: g })) });
  const good: MealPlanJson = { days: [{ day: 1, meals: [meal("f1", "f2", "f3"), meal("f4", "f5", "f6")] }] };
  const T = { calories: 1200, proteinG: 120, minCalories: 0 };
  const qa = (plan: MealPlanJson, p = prof(), t = T) => validateMealPlan(plan, lib, p, t, 1, 2, 1);
  const failed = (plan: MealPlanJson, name: string, p = prof(), t = T) => qa(plan, p, t).checks.find((c) => c.name === name)?.pass === false;

  check("qa: a good plan passes", qa(good).passed, JSON.stringify(qa(good).checks.filter((c) => !c.pass)));
  check("qa: food outside the pool fails pool_membership", failed({ ...good, days: [{ day: 1, meals: [meal("f1", "f2", "unscreened:999"), meal("f4", "f5", "f6")] }] }, "pool_membership"));
  check("qa: allergen in plan fails allergens even though profile changed after build",
    failed({ ...good, days: [{ day: 1, meals: [meal("f1", "f2", "peanut7"), meal("f4", "f5", "f6")] }] }, "allergens", prof({ allergens: ["peanut"] })));
  check("qa: unknown food fails allergens (can't be screened)", failed({ ...good, days: [{ day: 1, meals: [meal("f1", "f2", "nope"), meal("f4", "f5", "f6")] }] }, "allergens"));
  check("qa: 5% under target fails calories", failed(good, "calories", prof(), { calories: 1270, proteinG: 100, minCalories: 0 }));
  check("qa: >10% over target fails calories", failed(good, "calories", prof(), { calories: 1080, proteinG: 100, minCalories: 0 }));
  check("qa: protein under 90% fails", failed(good, "protein", prof(), { calories: 1200, proteinG: 140, minCalories: 0 }));
  check("qa: portion over max fails", failed({ ...good, days: [{ day: 1, meals: [meal("f1", "f2", "f3", 400), meal("f4", "f5", "f6")] }] }, "portions"));
  check("qa: wrong meal count fails structure", failed({ ...good, days: [{ day: 1, meals: [meal("f1", "f2", "f3")] }] }, "structure"));
  check("qa: missing day fails structure", validateMealPlan(good, lib, prof(), T, 2, 2, 1).checks.find((c) => c.name === "structure")?.pass === false);
  check("qa: low variety fails", failed({ ...good, days: [{ day: 1, meals: [meal("f1", "f1", "f1"), meal("f1", "f1", "f1")] }] }, "variety"));

  const byId = new Map(lib.map((f) => [f.id, f]));
  const scaled = scalePortions({ ...good, days: [{ day: 1, meals: [meal("f1", "f2", "f3", 180), meal("f4", "f5", "f6", 180)] }] }, byId, 1200);
  check("scale: brings a short day onto target", Math.abs(dayTotals(scaled.days[0], byId).kcal - 1200) <= 30, String(dayTotals(scaled.days[0], byId).kcal));
  const capped = scalePortions({ ...good, days: [{ day: 1, meals: [meal("f1", "f2", "f3", 290), meal("f4", "f5", "f6", 100)] }] }, byId, 5000);
  check("scale: never exceeds max_serving_g", capped.days[0].meals.every((m) => m.items.every((i) => i.grams <= 300)));
  check("scale: factor is bounded (no rescue of a far-off day)", capped.days[0].meals[1].items[0].grams === 125);

  // Reviewer regressions
  check("qa: a day under the deficit floor fails even inside the 5% window",
    failed(good, "calories", prof(), { calories: 1250, proteinG: 100, minCalories: 1210 }));
  check("qa: missing targets fail instead of NaN-passing",
    failed(good, "calories", prof(), {} as typeof T) && failed(good, "protein", prof(), {} as typeof T));
  check("qa: listing a food twice in a meal can't double its max",
    failed({ days: [{ day: 1, meals: [{ name: "M", items: [{ food_id: "f1", grams: 200 }, { food_id: "f1", grams: 200 }, { food_id: "f2", grams: 200 }] }, meal("f4", "f5", "f6")] }] }, "portions"));
  check("qa: an unrecognised client allergy fails allergens on its own",
    failed(good, "allergens", prof({ allergens: ["mustard"] })));
  check("builder: meal names come from code", mealName(0, 4) === "Breakfast" && mealName(3, 4) === "Dinner" && mealName(9, 9) === "Meal 10");

  // Live check uses current targets, not the ones stored on the row.
  const row = { id: "p", client_id: "c", title: "t", days: 1, meals_per_day: 2, status: "final" as const, created_at: "",
    plan: good, qa_report: { passed: true, checks: [], attempts: 1 }, targets: { ...T, calories: 1200 } as unknown as MealPlanRow["targets"] };
  const openGate = { targets: true, deficit: true, mealPlans: true, reasons: [] };
  const cur = (calories: number) => ({ gate: openGate, profile: prof(), targets: { ...T, calories } as unknown as MealPlanRow["targets"] });
  check("live: deliverable when current targets still match", judgeMealPlan(row, cur(1200), lib, false).deliverable);
  check("live: stale stored targets don't keep a plan deliverable", !judgeMealPlan(row, cur(1500), lib, false).deliverable);
  check("live: no current targets means not deliverable", !judgeMealPlan(row, { ...cur(1200), targets: null }, lib, false).deliverable);
  check("live: a draft is never deliverable", !judgeMealPlan({ ...row, status: "draft" }, cur(1200), lib, false).deliverable);
  check("live: a food-library load error blocks", !judgeMealPlan(row, cur(1200), lib, true).deliverable);
  check("live: a newly logged allergy blocks", !judgeMealPlan({ ...row, plan: { days: [{ day: 1, meals: [meal("f1", "f2", "peanut7"), meal("f4", "f5", "f6")] }] } }, { ...cur(1200), profile: prof({ allergens: ["peanut"] }) }, lib, false).deliverable);

  const report = (fails: string[]): MealQaReport => ({ passed: fails.length === 0, attempts: 1,
    checks: ["pool_membership", "allergens", "calories", "protein"].map((name) => ({ name, pass: !fails.includes(name), detail: "" })) });
  check("retry: never trades away allergens", !isBetterMealAttempt(report(["allergens"]), report(["calories", "protein"])));
  check("retry: fixing a gating failure wins", isBetterMealAttempt(report(["calories"]), report(["pool_membership"])));
  check("retry: ties go to the first attempt", !isBetterMealAttempt(report(["protein"]), report(["calories"])));

  const prompt = mealPrompt({ pool: screenFoods(lib, prof()), targets: { bmr: 1, maintenance: 1, calories: 1200, proteinG: 120, fatG: 40, carbsG: 100, minCalories: 0, adjusted: false, notes: [] }, diet: "none", days: 1, mealsPerDay: 2 });
  check("prompt: contains only screened foods", !prompt.includes("weird10") && !prompt.includes("old11") && prompt.includes("f6"));
  check("prompt: carries no allergy or health wording", !/allerg|anaphyla|diabet|eating disorder|pregnan/i.test(prompt));
}

{
  // Floor 1320.25 BMR (female 30y 60kg 165cm) must round UP, never to 1320.
  const t = calculateTargets({ sex: "female", age: 30, weightLb: 60 / 0.45359237, heightIn: 165 / 2.54, activity: "sedentary", goal: "lose", deficitAllowed: true });
  check("a floored target never rounds below BMR", t.calories >= 1320.25 && t.minCalories >= 1320.25, `${t.calories}/${t.minCalories}`);
  check("maintenance has no floor", calculateTargets({ sex: "male", age: 30, weightLb: 180, heightIn: 70, activity: "light", goal: "maintain", deficitAllowed: true }).minCalories === 0);
}
check("every limitation tag is classified for nutrition",
  LIMITATION_TAGS.every((t) => t in MEDICAL_NUTRITION_TAGS || NUTRITION_NEUTRAL_TAGS.has(t)),
  LIMITATION_TAGS.filter((t) => !(t in MEDICAL_NUTRITION_TAGS) && !NUTRITION_NEUTRAL_TAGS.has(t)).join(","));
check("an unclassified limitation tag blocks meal plans", withProfile({}).mealPlans && !g({ limitationTags: ["future_condition"] }).mealPlans);

// ── Clinical review regressions ─────────────────────────────────────────
{
  // Protein capped at the AMDR upper bound, and a carbohydrate floor, so a
  // high-body-weight client can't be handed a ketogenic prescription.
  for (const c of [
    { sex: "male", age: 40, weightLb: 286, heightIn: 69 },
    { sex: "female", age: 50, weightLb: 397, heightIn: 65 },
    { sex: "female", age: 30, weightLb: 130, heightIn: 64 },
    { sex: "male", age: 25, weightLb: 175, heightIn: 71 },
  ] as const) {
    for (const goal of ["lose", "maintain", "gain"] as const) {
      const t = calculateTargets({ ...c, activity: "sedentary", goal, deficitAllowed: true });
      const label = `${c.weightLb}lb ${c.sex} ${goal}`;
      check(`macros: protein at or under 35% of energy (${label})`, t.proteinG * 4 <= t.calories * 0.355, `${Math.round(t.proteinG * 4 / t.calories * 100)}%`);
      check(`macros: carbohydrate floor respected (${label})`, t.carbsG >= Math.min(130, t.calories * 0.45 / 4) - 5, `${t.carbsG} g`);
      const sum = t.proteinG * 4 + t.fatG * 9 + t.carbsG * 4;
      check(`macros: macros reconcile to calories (${label})`, Math.abs(sum - t.calories) / t.calories < 0.03, `${Math.round(sum)} vs ${t.calories}`);
      check(`macros: protein still meaningful (${label})`, t.proteinG >= c.weightLb * 0.45359237 * 1.15, `${t.proteinG} g`);
    }
  }
}
check("a minor gets no calorie targets at all", !g({ age: 16 }).targets);

{
  // Variety is counted per day: the same six foods repeated is not variety.
  const food = (id: string): Food => ({
    id, fdc_id: 1, name: id, category: "protein", animal_class: "plant", serving_g: 100, serving_desc: "x",
    max_serving_g: 300, allergens: [], contains_gluten: false, kcal: 100, protein_g: 10, fat_g: 3, carbs_g: 8, is_active: true,
  });
  const lib2 = ["a", "b", "c", "d", "e", "f", "g", "h"].map(food);
  const p2: NutritionProfile = { activity_level: "light", goal: "maintain", diet: "none", allergens: [], gluten_free: false, other_allergy: false, severe_allergy: false, life_stage: "none", medications: [], other_medication: false };
  const mealOf = (ids: string[]) => ({ name: "M", items: ids.map((food_id) => ({ food_id, grams: 200 })) });
  const sameSixBothDays: MealPlanJson = { days: [1, 2].map((day) => ({ day, meals: [mealOf(["a", "b", "c"]), mealOf(["d", "e", "f"])] })) };
  const T2 = { calories: 1200, proteinG: 120, minCalories: 0 };
  check("variety: six distinct foods every day passes", validateMealPlan(sameSixBothDays, lib2, p2, T2, 2, 2, 1).checks.find((c) => c.name === "variety")?.pass === true);
  const thinDay: MealPlanJson = { days: [
    { day: 1, meals: [mealOf(["a", "b", "c"]), mealOf(["d", "e", "f"])] },
    { day: 2, meals: [mealOf(["a", "a", "a"]), mealOf(["a", "a", "a"])] },
  ] };
  check("variety: a repeated-food day fails even when the plan is varied overall",
    validateMealPlan(thinDay, lib2, p2, T2, 2, 2, 1).checks.find((c) => c.name === "variety")?.pass === false);
}

// ── Medication and life-stage screening ─────────────────────────────────
{
  const unanswered = (p: Partial<NonNullable<NutritionGateInput["profile"]>>) => withProfile(p);

  check("an unanswered pregnancy question blocks deficits and meal plans",
    (() => { const r = unanswered({ life_stage: null }); return !r.deficit && !r.mealPlans; })());
  check("an unanswered pregnancy question still allows targets",
    unanswered({ life_stage: null }).targets);
  check("an unanswered medication question blocks deficits and meal plans",
    (() => { const r = unanswered({ medications: null }); return !r.deficit && !r.mealPlans; })());
  check("an unanswered other-medication question blocks",
    !unanswered({ other_medication: null }).mealPlans);

  for (const stage of ["pregnant", "lactating"] as const) {
    const r = withProfile({ life_stage: stage });
    check(`${stage}: no targets, no deficit, no meal plan`, !r.targets && !r.deficit && !r.mealPlans);
    check(`${stage}: the reason names a dietitian`, r.reasons.some((x) => /registered dietitian/i.test(x)));
  }

  for (const med of MEDICATIONS) {
    const r = withProfile({ medications: [med] });
    check(`${med} blocks deficits and meal plans`, !r.deficit && !r.mealPlans);
    check(`${med} still allows calorie targets`, r.targets);
  }
  check("several medications are all named in the reason",
    (() => { const r = withProfile({ medications: ["anticoagulant", "lithium"] });
      return r.reasons.some((x) => /blood thinner/i.test(x) && /lithium/i.test(x)); })());
  check("an unrecognised medication fails closed",
    !withProfile({ medications: ["something_else"] }).mealPlans);
  check("an off-list medicine blocks via the other-medication flag",
    !withProfile({ other_medication: true }).mealPlans);
  check("a client on no medicines and not pregnant is unaffected",
    (() => { const r = withProfile({ life_stage: "none", medications: [], other_medication: false });
      return r.targets && r.deficit && r.mealPlans; })());
}

console.log(failures === 0 ? "\nALL NUTRITION TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

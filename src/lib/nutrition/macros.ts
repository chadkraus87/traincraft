/**
 * Energy and macronutrient targets. Deterministic arithmetic — no model is
 * involved in producing a number a client will eat to.
 *
 * Mifflin-St Jeor for resting energy, standard activity multipliers for
 * total expenditure. These are population estimates with real individual
 * error (commonly ±10%); the output is a starting point to adjust from
 * observed weight change, and the UI says so.
 *
 * Safety floors are not optional parameters. A deficit is capped at 20% of
 * maintenance and never allowed below the higher of a sex-specific floor or
 * the client's own estimated resting expenditure — eating under BMR for weeks
 * is not something a fitness app should ever suggest on its own authority.
 */

export const ACTIVITY_LEVELS = {
  sedentary: { label: "Sedentary (desk job, little exercise)", factor: 1.2 },
  light: { label: "Lightly active (exercise 1–3 days/week)", factor: 1.375 },
  moderate: { label: "Moderately active (exercise 3–5 days/week)", factor: 1.55 },
  very: { label: "Very active (hard exercise 6–7 days/week)", factor: 1.725 },
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

export const GOALS = {
  lose: { label: "Lose fat", adjust: -0.2 },
  maintain: { label: "Maintain", adjust: 0 },
  gain: { label: "Build muscle", adjust: 0.1 },
} as const;
export type Goal = keyof typeof GOALS;

export interface MacroInput {
  sex: "male" | "female";
  age: number;
  weightLb: number;
  heightIn: number;
  activity: ActivityLevel;
  goal: Goal;
  /** When false the goal is forced to maintenance, whatever was requested. */
  deficitAllowed: boolean;
}

export interface MacroTargets {
  bmr: number;
  maintenance: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** True when a floor or a gate changed what the goal alone would give. */
  /** Lowest daily intake a plan may reach. Set only for a deficit; 0 otherwise. */
  minCalories: number;
  adjusted: boolean;
  notes: string[];
}

const KCAL_FLOOR = { female: 1200, male: 1500 } as const;

export function calculateTargets(i: MacroInput): MacroTargets {
  const kg = i.weightLb * 0.45359237;
  const cm = i.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * i.age + (i.sex === "male" ? 5 : -161);
  const maintenance = bmr * ACTIVITY_LEVELS[i.activity].factor;
  const notes: string[] = [];
  let adjusted = false;

  let goal = i.goal;
  if (goal === "lose" && !i.deficitAllowed) {
    goal = "maintain";
    adjusted = true;
    notes.push("A calorie deficit isn't appropriate for this client, so targets are set to maintenance.");
  }

  let calories = maintenance * (1 + GOALS[goal].adjust);
  // Rounded up, so rounding can never land a floored target under the floor.
  const floor = goal === "lose" ? Math.ceil(Math.max(KCAL_FLOOR[i.sex], bmr) / 10) * 10 : 0;
  if (goal === "lose") {
    if (calories < floor) {
      calories = floor;
      adjusted = true;
      notes.push("Raised to the minimum safe intake for this client.");
    }
  }

  // Protein by body weight: higher in a deficit to preserve lean mass.
  //
  // Capped at 35% of energy, the AMDR upper bound. Dosing on actual body
  // weight alone is fine for an average client and wrong at the top of the
  // range: at BMI 40 it prescribed 47% of energy as protein, and at 180 kg it
  // consumed the whole calorie budget and drove carbohydrate to ~2 g/day — a
  // ketogenic prescription nobody chose, below the 130 g RDA.
  let proteinG = Math.min(kg * (goal === "lose" ? 2.0 : 1.8), (calories * 0.35) / 4);
  // Fat at ~28% of energy, never below 0.6 g/kg for hormonal health.
  let fatG = Math.max((calories * 0.28) / 9, kg * 0.6);

  // Carbohydrate floor: the 130 g/day RDA, or 45% of energy on a small
  // target, whichever is lower. Protein gives way first (down to 1.2 g/kg,
  // the sarcopenia-prevention floor), then fat (down to its own 0.6 g/kg
  // floor). If both floors bind, the target is reported as-is rather than
  // silently returning macros that don't sum to it.
  const carbFloor = Math.min(130, (calories * 0.45) / 4);
  const carbsFrom = (p: number, f: number) => (calories - p * 4 - f * 9) / 4;
  if (carbsFrom(proteinG, fatG) < carbFloor) {
    proteinG = Math.max(kg * 1.2, Math.min(proteinG, (calories - carbFloor * 4 - fatG * 9) / 4));
    if (carbsFrom(proteinG, fatG) < carbFloor) {
      fatG = Math.max(kg * 0.6, Math.min(fatG, (calories - carbFloor * 4 - proteinG * 4) / 9));
    }
    adjusted = true;
    notes.push("Protein and fat were trimmed to leave room for a minimum carbohydrate intake.");
  }
  const carbsG = Math.max(0, carbsFrom(proteinG, fatG));

  const round = (n: number, step: number) => Math.round(n / step) * step;
  return {
    bmr: round(bmr, 10),
    maintenance: round(maintenance, 10),
    calories: Math.max(round(calories, 10), floor),
    minCalories: floor,
    proteinG: round(proteinG, 5),
    fatG: round(fatG, 5),
    carbsG: round(carbsG, 5),
    adjusted,
    notes,
  };
}

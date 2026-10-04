/**
 * What nutrition help is appropriate for this client?
 *
 * The line being drawn is scope of practice. General, non-medical nutrition
 * coaching for a healthy adult is what a certified nutrition coach does.
 * Individualised nutrition for a medical condition is medical nutrition
 * therapy, which several states restrict to licensed dietitians. The app has
 * to stay on the right side of that line on its own, because a trainer under
 * time pressure won't always.
 *
 * Three outputs, each gated separately because the risk differs:
 *   targets      — calorie and macro numbers
 *   deficit      — whether those numbers may be below maintenance
 *   mealPlans    — specific foods and portions generated for the client
 *
 * Fails closed like everything else in the safety path: missing inputs, an
 * unrecognised allergy, or an incomplete screening all block, and every block
 * says why and points at a registered dietitian where that's the answer.
 */
import type { ScreeningRow } from "@/lib/intake/screening";

/** FDA major allergens (FASTER Act, 2023). */
export const ALLERGENS = [
  "milk", "egg", "fish", "shellfish", "tree_nut", "peanut", "wheat", "soy", "sesame",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  milk: "Milk", egg: "Eggs", fish: "Fish", shellfish: "Crustacean shellfish", tree_nut: "Tree nuts",
  peanut: "Peanuts", wheat: "Wheat", soy: "Soy", sesame: "Sesame",
};

export const DIETS = ["none", "vegetarian", "vegan", "pescatarian"] as const;
export type Diet = (typeof DIETS)[number];

/**
 * Drug classes whose interactions the food library can actually cause.
 *
 * Deliberately short. This is a screening question a trainer asks a client,
 * not a pharmacology intake — every entry here is one a non-clinician can
 * answer from a pill bottle, and any of them routes to a dietitian rather
 * than trying to program around the interaction.
 */
export const MEDICATIONS = [
  "anticoagulant", "maoi", "insulin_or_sulfonylurea", "potassium_affecting",
  "lithium", "levothyroxine", "immunosuppressant",
] as const;
export type Medication = (typeof MEDICATIONS)[number];

export const MEDICATION_LABELS: Record<Medication, string> = {
  anticoagulant: "A blood thinner (warfarin, apixaban, clopidogrel)",
  maoi: "An MAOI antidepressant (phenelzine, tranylcypromine, selegiline)",
  insulin_or_sulfonylurea: "Insulin or a sulfonylurea",
  potassium_affecting: "A blood-pressure or heart medicine affecting potassium (ACE inhibitor, ARB, spironolactone)",
  lithium: "Lithium",
  levothyroxine: "Levothyroxine or another thyroid hormone",
  immunosuppressant: "An immunosuppressant (after a transplant, or for an autoimmune condition)",
};

export const LIFE_STAGES = ["none", "pregnant", "lactating"] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  none: "Neither",
  pregnant: "Pregnant",
  lactating: "Breastfeeding",
};

export interface NutritionProfile {
  activity_level: string;
  goal: string;
  diet: Diet;
  allergens: string[];
  gluten_free: boolean;
  /** Any food allergy outside the nine tracked allergens. */
  other_allergy: boolean;
  /** Anaphylaxis history, or carries an epinephrine auto-injector. */
  severe_allergy: boolean;
  /** Null means the question was never asked, which blocks. */
  life_stage: LifeStage | null;
  /** Null means never asked. An empty array is a recorded "none of these". */
  medications: string[] | null;
  /** Any medicine not in the list above. Null means never asked. */
  other_medication: boolean | null;
}

export interface NutritionGateInput {
  screening: ScreeningRow | null;
  screeningAllowed: boolean;
  limitationTags: string[];
  age: number | null;
  bmi: number | null;
  hasBasics: boolean; // sex, birth year, height, and a weight
  profile: NutritionProfile | null;
}

export interface NutritionGate {
  targets: boolean;
  deficit: boolean;
  mealPlans: boolean;
  reasons: string[];
}

const RD = "Refer them to a registered dietitian for individualised nutrition.";

/** Limitation tags whose dietary management is medical nutrition therapy. */
export const MEDICAL_NUTRITION_TAGS: Record<string, string> = {
  pregnancy_2nd_3rd_trimester: "Nutrition during pregnancy",
  hypertension_uncontrolled: "Dietary management of uncontrolled hypertension",
  osteoporosis: "Dietary management of osteoporosis",
};

/**
 * Limitation tags with no dietary management of their own. A tag in neither
 * list blocks meal plans: a new condition added to the safety engine must be
 * classified here before it can reach a meal plan, not slip past unlisted.
 */
export const NUTRITION_NEUTRAL_TAGS = new Set([
  "shoulder_impingement", "rotator_cuff_injury", "low_back_pain", "lumbar_disc_injury",
  "knee_pain_patellofemoral", "acl_recovery", "hip_impingement", "wrist_pain",
  "elbow_tendinopathy", "ankle_instability", "neck_pain",
]);

export function nutritionGate(i: NutritionGateInput): NutritionGate {
  const reasons: string[] = [];
  let targets = true;
  let deficit = true;
  let mealPlans = true;

  const block = (what: { targets?: boolean; deficit?: boolean; mealPlans?: boolean }, reason: string) => {
    if (what.targets) targets = false;
    if (what.deficit) deficit = false;
    if (what.mealPlans) mealPlans = false;
    reasons.push(reason);
  };

  if (!i.screeningAllowed || !i.screening) {
    block({ targets: true, deficit: true, mealPlans: true }, "Complete this client's health screening and consent first.");
  }
  if (!i.hasBasics) {
    block({ targets: true, deficit: true, mealPlans: true }, "Add birth year, height, sex for energy equations, and a weight measurement.");
  }
  if (!i.profile) {
    block({ targets: true, deficit: true, mealPlans: true }, "Fill in the nutrition profile.");
  }

  const s = i.screening;
  if (s?.eating_disorder_history) {
    block({ targets: true, deficit: true, mealPlans: true },
      `Calorie targets and meal plans aren't appropriate with an eating disorder history. ${RD}`);
  }
  if (s && (s.known_metabolic_disease || s.known_renal_disease || s.known_cardiovascular_disease)) {
    block({ deficit: true, mealPlans: true },
      `Diabetes, kidney disease and cardiovascular disease each have their own dietary management. ${RD}`);
  }
  for (const tag of i.limitationTags) {
    const label = MEDICAL_NUTRITION_TAGS[tag];
    if (label) block({ deficit: true, mealPlans: true }, `${label} is medical nutrition therapy. ${RD}`);
    else if (!NUTRITION_NEUTRAL_TAGS.has(tag)) {
      block({ deficit: true, mealPlans: true }, `The limitation "${tag}" hasn't been reviewed for nutrition, so calorie deficits and meal plans are off. ${RD}`);
    }
  }

  if (i.age !== null && i.age < 18) {
    // Targets are blocked too, not just the deficit. Mifflin-St Jeor is an
    // adult equation that doesn't model growth, so the number would be wrong
    // anyway — and putting a calorie figure in front of an adolescent is the
    // highest-risk context there is for disordered eating.
    block({ targets: true, deficit: true, mealPlans: true },
      `Clients under 18 shouldn't be given calorie targets or a meal plan from this app. ${RD}`);
  }
  if (i.bmi !== null && i.bmi < 18.5) {
    block({ deficit: true, mealPlans: true }, `BMI is in the underweight range. ${RD}`);
  }

  const p = i.profile;
  if (p) {
    // Pregnancy and lactation are energy requirements this app does not
    // model: Mifflin-St Jeor has no term for either, and lactation alone adds
    // roughly 500 kcal/day. A number that is wrong in the direction of
    // under-eating is worse than no number, so targets go too.
    if (p.life_stage === null) {
      block({ deficit: true, mealPlans: true },
        "Ask whether this client is pregnant or breastfeeding, and save the nutrition profile again.");
    } else if (p.life_stage !== "none") {
      const what = p.life_stage === "pregnant" ? "Pregnancy" : "Breastfeeding";
      block({ targets: true, deficit: true, mealPlans: true },
        `${what} changes energy and nutrient needs in ways this app doesn't calculate. ${RD}`);
    }

    // The food library contains foods that interact with each of these. A
    // plan can be allergen-clean, hit every macro, pass every check, and
    // still be unsafe alongside the medicine.
    if (p.medications === null || p.other_medication === null) {
      block({ deficit: true, mealPlans: true },
        "Ask which medicines this client takes, and save the nutrition profile again.");
    } else {
      const unknown = p.medications.filter((m) => !(MEDICATIONS as readonly string[]).includes(m));
      if (unknown.length > 0) {
        block({ deficit: true, mealPlans: true },
          "This client's medication record can't be interpreted, so meal plans are off.");
      } else if (p.medications.length > 0) {
        const labels = p.medications
          .map((m) => MEDICATION_LABELS[m as Medication].replace(/ \(.*\)$/, "").toLowerCase())
          .join(", ");
        block({ deficit: true, mealPlans: true },
          `Foods in this library interact with ${labels}. Generated meals and calorie deficits aren't safe to set here. ${RD}`);
      } else if (p.other_medication) {
        block({ deficit: true, mealPlans: true },
          `This client takes a medicine this app can't screen food against. ${RD}`);
      }
    }

    // Allergy safety for meal plans rests on matching tagged foods against
    // tagged allergies. Anything outside that vocabulary can't be matched,
    // so it can't be screened — the same fail-closed rule as an unrecognised
    // injury tag.
    const unknown = p.allergens.filter((a) => !(ALLERGENS as readonly string[]).includes(a));
    if (unknown.length > 0 || p.other_allergy) {
      block({ mealPlans: true },
        "This client has a food allergy outside the nine tracked allergens, which the food library can't screen for. Build meals with them directly.");
    }
    if (p.severe_allergy) {
      block({ mealPlans: true },
        `With a severe food allergy, a generated meal plan isn't a safe basis for what they eat. ${RD}`);
    }
  }

  return { targets, deficit: targets && deficit, mealPlans: targets && mealPlans, reasons };
}

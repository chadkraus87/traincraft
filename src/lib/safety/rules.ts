/**
 * SAFETY RULESET · owned by the Exercise Science Advisor role.
 *
 * This is the single source of truth for:
 *  1. The controlled vocabulary of client limitation tags
 *  2. Which movement patterns / exercise tags each limitation contraindicates
 *  3. Movement-pattern balance requirements per workout type
 *  4. Progressive overload defaults
 *
 * The AI Workout Builder receives these rules in its prompt, AND the QA
 * validator re-checks its output against them deterministically. The LLM is
 * never the last line of defense.
 *
 * Scope note: these are conservative programming heuristics for a trainer-
 * facing tool. They do not replace the trainer's judgment or a clinician's
 * clearance. Exclusion here means "don't auto-program it" — the trainer can
 * always override manually.
 */

// ── 1. Limitation vocabulary ────────────────────────────────────────────
export const LIMITATION_TAGS = [
  "shoulder_impingement",
  "rotator_cuff_injury",
  "low_back_pain",
  "lumbar_disc_injury",
  "knee_pain_patellofemoral",
  "acl_recovery",
  "hip_impingement",
  "wrist_pain",
  "elbow_tendinopathy",
  "ankle_instability",
  "neck_pain",
  "hypertension_uncontrolled",
  "pregnancy_2nd_3rd_trimester",
  "osteoporosis",
] as const;
export type LimitationTag = (typeof LIMITATION_TAGS)[number];

export const LIMITATION_LABELS: Record<LimitationTag, string> = {
  shoulder_impingement: "Shoulder impingement",
  rotator_cuff_injury: "Rotator cuff injury",
  low_back_pain: "Low back pain (non-specific)",
  lumbar_disc_injury: "Lumbar disc injury",
  knee_pain_patellofemoral: "Knee pain (patellofemoral)",
  acl_recovery: "ACL recovery",
  hip_impingement: "Hip impingement (FAI)",
  wrist_pain: "Wrist pain",
  elbow_tendinopathy: "Elbow tendinopathy",
  ankle_instability: "Ankle instability",
  neck_pain: "Neck pain",
  hypertension_uncontrolled: "Uncontrolled hypertension",
  pregnancy_2nd_3rd_trimester: "Pregnancy (2nd/3rd trimester)",
  osteoporosis: "Osteoporosis",
};

// ── 2. Contraindication map ─────────────────────────────────────────────
// Each limitation lists: movement patterns to avoid outright, exercise
// contraindication_tags to exclude, and the clinical rationale (surfaced to
// the trainer whenever an exercise is excluded).
export interface ContraRule {
  avoidPatterns: string[];
  avoidExerciseTags: string[]; // matched against exercises.contraindication_tags
  rationale: string;
  preferInstead?: string;
}

export const CONTRAINDICATIONS: Record<LimitationTag, ContraRule> = {
  shoulder_impingement: {
    // Tag-based, not pattern-based: scapular-plane vertical pressing (landmine)
    // is the recommended substitute and must survive the filter.
    avoidPatterns: [],
    avoidExerciseTags: ["overhead", "behind_neck", "deep_shoulder_flexion"],
    rationale:
      "Overhead pressing narrows the subacromial space and reproduces impingement symptoms.",
    preferInstead: "Landmine or incline pressing in the scapular plane; loaded carries.",
  },
  rotator_cuff_injury: {
    avoidPatterns: ["push_vertical"],
    avoidExerciseTags: ["overhead", "dip", "wide_grip_press", "kipping"],
    rationale:
      "End-range overhead and deep-stretch pressing overload healing cuff tissue.",
    preferInstead: "Neutral-grip floor press, external rotation work, rows.",
  },
  low_back_pain: {
    avoidPatterns: ["core_flexion"],
    avoidExerciseTags: ["heavy_spinal_load", "loaded_flexion", "high_impact"],
    rationale:
      "Loaded spinal flexion and heavy axial compression are the most common symptom triggers; anti-extension/anti-rotation core work is better tolerated.",
    preferInstead: "Hip hinge patterning at moderate load, bird dogs, dead bugs, carries.",
  },
  lumbar_disc_injury: {
    avoidPatterns: ["core_flexion", "hinge"],
    avoidExerciseTags: ["heavy_spinal_load", "loaded_flexion", "loaded_rotation", "high_impact"],
    rationale:
      "Flexion + compression + rotation is the disc-injury mechanism; avoid loading it until cleared.",
    preferInstead: "McGill big-three, sled/carry work, supported single-leg work.",
  },
  knee_pain_patellofemoral: {
    avoidPatterns: [],
    avoidExerciseTags: ["deep_knee_flexion", "high_impact", "knee_dominant_plyo"],
    rationale:
      "Patellofemoral joint stress peaks in deep knee flexion and on impact; keep squatting above the symptomatic range.",
    preferInstead: "Box squats to a high box, hip-dominant work, step-ups in pain-free range.",
  },
  acl_recovery: {
    avoidPatterns: ["conditioning"],
    avoidExerciseTags: ["high_impact", "cutting", "knee_dominant_plyo", "deep_knee_flexion"],
    rationale:
      "Impact, deceleration, and pivoting load the graft before it is remodeled; progress under clinician guidance only.",
    preferInstead: "Closed-chain strength in controlled ranges, hamstring emphasis.",
  },
  hip_impingement: {
    avoidPatterns: [],
    avoidExerciseTags: ["deep_hip_flexion", "wide_stance_squat"],
    rationale:
      "Deep hip flexion, especially with adduction/internal rotation, provokes anterior hip pinching.",
    preferInstead: "Box squats above the pinch point, hinge patterns, split-stance work.",
  },
  wrist_pain: {
    avoidPatterns: [],
    avoidExerciseTags: ["wrist_extension_load", "front_rack"],
    rationale: "Extended-wrist weight bearing (push-ups, front rack) concentrates load on the joint.",
    preferInstead: "Neutral-grip dumbbell work, push-up handles, fist push-ups.",
  },
  elbow_tendinopathy: {
    avoidPatterns: [],
    avoidExerciseTags: ["high_grip_demand", "elbow_extension_overload"],
    rationale: "High grip demand and repeated end-range elbow extension aggravate tendinopathy.",
    preferInstead: "Straps for pulls, tempo work at moderate load, isometrics.",
  },
  ankle_instability: {
    avoidPatterns: [],
    avoidExerciseTags: ["high_impact", "cutting", "single_leg_unstable"],
    rationale: "Impact and lateral cutting risk re-sprain until stability is rebuilt.",
    preferInstead: "Supported single-leg balance, calf/tibialis strength, sled work.",
  },
  neck_pain: {
    avoidPatterns: [],
    avoidExerciseTags: ["overhead", "behind_neck", "neck_load", "bridging_neck"],
    rationale: "Cervical loading and end-range overhead positions commonly reproduce symptoms.",
    preferInstead: "Supported rows, chest-supported work, scap strength.",
  },
  hypertension_uncontrolled: {
    avoidPatterns: [],
    avoidExerciseTags: ["max_isometric", "valsalva_heavy", "inverted"],
    rationale:
      "Heavy Valsalva, maximal isometrics, and head-below-heart positions spike blood pressure; keep loads submaximal, breathing continuous.",
    preferInstead: "Moderate loads at RPE ≤7, higher reps, full exhale each rep.",
  },
  pregnancy_2nd_3rd_trimester: {
    avoidPatterns: ["core_flexion"],
    avoidExerciseTags: ["supine_extended", "prone", "high_impact", "loaded_flexion", "valsalva_heavy"],
    rationale:
      "Extended supine positions can compress the vena cava; prone positions and impact are impractical/unsafe; avoid breath-holding under load.",
    preferInstead: "Incline or standing variations, side-lying core, carries, moderate loads.",
  },
  osteoporosis: {
    avoidPatterns: ["core_flexion"],
    avoidExerciseTags: ["loaded_flexion", "loaded_rotation", "high_impact"],
    rationale:
      "Loaded spinal flexion/rotation raises vertebral fracture risk; moderate progressive loading is beneficial, end-range spine loading is not.",
    preferInstead: "Hinge patterning, carries, moderate-impact loading if cleared.",
  },
};

// ── 3. Movement balance requirements per workout type ───────────────────
// A session/week must satisfy these ratios or QA flags it.
export interface BalanceRule {
  requiredPatterns: string[];         // must appear at least once across the plan week
  pullToPushMin: number;              // pull sets : push sets, minimum ratio
  maxSameMuscleConsecutiveDays: boolean; // no heavy same-muscle work on back-to-back days
}

export const WORKOUT_TYPES: Record<string, { label: string; balance: BalanceRule }> = {
  full_body_strength: {
    label: "Full-body strength",
    balance: {
      requiredPatterns: ["squat", "hinge", "push_horizontal", "pull_horizontal"],
      pullToPushMin: 1.0,
      maxSameMuscleConsecutiveDays: true,
    },
  },
  upper_body: {
    label: "Upper body",
    balance: {
      requiredPatterns: ["push_horizontal", "pull_horizontal", "pull_vertical"],
      pullToPushMin: 1.0,
      maxSameMuscleConsecutiveDays: true,
    },
  },
  lower_body: {
    label: "Lower body",
    balance: {
      requiredPatterns: ["squat", "hinge", "lunge"],
      pullToPushMin: 0,
      maxSameMuscleConsecutiveDays: true,
    },
  },
  fat_loss_conditioning: {
    label: "Fat loss / conditioning",
    balance: {
      requiredPatterns: ["squat", "hinge", "pull_horizontal", "conditioning"],
      pullToPushMin: 1.0,
      maxSameMuscleConsecutiveDays: false,
    },
  },
  beginner_foundations: {
    label: "Beginner foundations",
    balance: {
      requiredPatterns: ["squat", "hinge", "push_horizontal", "pull_horizontal", "core_antiextension"],
      pullToPushMin: 1.0,
      maxSameMuscleConsecutiveDays: true,
    },
  },
};

// ── 4. Progressive overload defaults ────────────────────────────────────
export const PROGRESSION_RULES = {
  weeklyLoadIncreasePct: { min: 2.5, max: 10 },
  deloadEveryNWeeks: 4,
  deloadVolumeCutPct: 40,
  beginnerRepRange: [8, 15] as const,
  strengthRepRange: [3, 8] as const,
  maxNewExercisesPerWeekForBeginners: 2,
  guidance: [
    "Progress ONE variable at a time per exercise per week: load, reps, or sets — never all three.",
    "Weekly load increases stay in the 2.5–10% band; smaller for upper body, larger for lower body.",
    "Every 4th week is a deload: cut set volume ~40%, keep loads moderate.",
    "Beginners earn load with technique: add reps within range before adding weight.",
    "Unilateral work is programmed per side with equal volume left/right.",
  ],
};

// ── Equipment vocabulary ─────────────────────────────────────────────────
// Single source of truth for equipment types, used by the client equipment
// form, the "consider additional equipment" toggle on plan generation, and
// the exercise library seed data.
export const EQUIPMENT_TYPES = [
  "kettlebell",
  "dumbbell",
  "barbell",
  "band",
  "bench",
  "box",
  "pullup_bar",
  "suspension",
  "rack",
  "landmine",
  "yoga_mat",
  "jump_rope",
  "rower",
  "medicine_ball",
  "sandbag",
  "sled",
  "ski_erg",
  "battle_ropes",
  "full_gym",
] as const;

// ── Exercise categories ──────────────────────────────────────────────────
// Used to organize the exercise library by workout style instead of a flat
// list, and as the required field on custom exercises.
export const EXERCISE_CATEGORIES = [
  "Foundational strength",
  "CrossFit",
  "Functional movement",
  "Hyrox",
  "HIIT",
  "Yoga",
  "Mat Pilates",
  "Senior-specific",
] as const;

// ── Equipment groups ─────────────────────────────────────────────────────
// Groups EQUIPMENT_TYPES by kind of gear (not workout style) for the
// clickable equipment picker on the Build a Plan screen. Every entry in
// EQUIPMENT_TYPES must appear in exactly one group here.
export const EQUIPMENT_GROUPS: { label: string; types: string[] }[] = [
  { label: "Free weights", types: ["dumbbell", "barbell", "kettlebell", "sandbag"] },
  { label: "Bodyweight & mat", types: ["yoga_mat", "suspension", "band"] },
  { label: "Rig & stations", types: ["rack", "bench", "box", "pullup_bar", "landmine"] },
  { label: "Cardio & conditioning", types: ["jump_rope", "rower", "ski_erg", "sled", "battle_ropes"] },
  { label: "Other", types: ["medicine_ball", "full_gym"] },
];

// ── Helper: resolve exclusions for a client ─────────────────────────────
export interface ExerciseLike {
  id: string;
  name: string;
  pattern: string;
  contraindication_tags: string[];
  equipment_types: string[];
}

export interface Exclusion {
  exercise_id: string;
  exercise_name: string;
  limitation_tag: LimitationTag;
  reason: string;
  prefer_instead?: string;
}

/** Deterministically split a candidate pool into allowed / excluded for a client. */
export function filterForLimitations<T extends ExerciseLike>(
  pool: T[],
  limitations: LimitationTag[]
): { allowed: T[]; excluded: Exclusion[] } {
  const excluded: Exclusion[] = [];
  const allowed = pool.filter((ex) => {
    for (const tag of limitations) {
      const rule = CONTRAINDICATIONS[tag];
      if (!rule) continue;
      const patternHit = rule.avoidPatterns.includes(ex.pattern);
      const tagHit = ex.contraindication_tags.some((t) =>
        rule.avoidExerciseTags.includes(t)
      );
      if (patternHit || tagHit) {
        excluded.push({
          exercise_id: ex.id,
          exercise_name: ex.name,
          limitation_tag: tag,
          reason: rule.rationale,
          prefer_instead: rule.preferInstead,
        });
        return false;
      }
    }
    return true;
  });
  return { allowed, excluded };
}

/** Equipment gate: exercise usable only if every required type is in inventory. */
export function filterForEquipment<T extends ExerciseLike>(
  pool: T[],
  ownedTypes: string[]
): { usable: T[]; unusable: T[] } {
  const owned = new Set(ownedTypes.map((t) => t.toLowerCase()));
  const fullGym = owned.has("full_gym");
  const usable: T[] = [];
  const unusable: T[] = [];
  for (const ex of pool) {
    const ok =
      fullGym ||
      ex.equipment_types.every(
        (t) => t === "bodyweight" || owned.has(t.toLowerCase())
      );
    (ok ? usable : unusable).push(ex);
  }
  return { usable, unusable };
}

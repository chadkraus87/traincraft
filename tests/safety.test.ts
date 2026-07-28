/**
 * TEST 2 · Safety engine + QA validator unit tests. Plain assertions, no framework.
 */
import { readFileSync } from "fs";
import {
  CONTRAINDICATIONS,
  WORKOUT_TYPES,
  filterForLimitations,
  filterForEquipment,
} from "../src/lib/safety/rules";
import { validatePlan } from "../src/lib/ai/validate";
import type { Exercise, PlanJson } from "../src/lib/types";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS " : "FAIL "} ${name}${cond || !detail ? "" : " — " + detail}`);
  if (!cond) failures++;
}

// ── Tag vocabulary consistency ──────────────────────────────────────────
// Every contraindication_tag used in the seed must be referenced by at least
// one rule's avoidExerciseTags; otherwise it's dead weight that protects no one.
const ruleTags = new Set(
  Object.values(CONTRAINDICATIONS).flatMap((r) => r.avoidExerciseTags)
);
const seedSql =
  readFileSync("supabase/migrations/0002_seed_exercises.sql", "utf8") +
  readFileSync("supabase/migrations/0003_expand_exercise_library.sql", "utf8") +
  readFileSync("supabase/migrations/0005_isolation_and_cardio_machines.sql", "utf8") +
  readFileSync("supabase/migrations/0007_functional_and_conditioning_batch.sql", "utf8") +
  readFileSync("supabase/migrations/0008_ace_style_expansion.sql", "utf8") +
  readFileSync("supabase/migrations/0014_nasm_pes_batch.sql", "utf8");
const seedTagMatches = [...seedSql.matchAll(/'\{([a-z_,]*)\}',\s*(?:true|false)\)/g)];
const seedTags = new Set(
  seedTagMatches.flatMap((m) => (m[1] ? m[1].split(",") : []))
);
const orphanSeedTags = [...seedTags].filter((t) => !ruleTags.has(t));
check(
  "every seed contraindication tag is enforced by a rule",
  orphanSeedTags.length === 0,
  `orphans: ${orphanSeedTags.join(", ")}`
);
const unusedRuleTags = [...ruleTags].filter((t) => !seedTags.has(t));
check(
  "rule tags unused by any seed exercise (informational, ok for custom exercises)",
  true,
  ""
);
if (unusedRuleTags.length) console.log(`  note: rule-only tags: ${unusedRuleTags.join(", ")}`);

// ── Category coverage ────────────────────────────────────────────────
import { EXERCISE_CATEGORIES } from "../src/lib/safety/rules";
const categoryMigration = readFileSync("supabase/migrations/0004_add_exercise_category.sql", "utf8");
const usedCategories = [...categoryMigration.matchAll(/category = '([^']+)'/g)].map((m) => m[1]);
const invalidCategories = usedCategories.filter(
  (c) => !(EXERCISE_CATEGORIES as readonly string[]).includes(c)
);
check(
  "every category assigned in the migration is a recognized category",
  invalidCategories.length === 0,
  `unrecognized: ${invalidCategories.join(", ")}`
);


const mk = (over: Partial<Exercise>): Exercise => ({
  id: crypto.randomUUID(),
  trainer_id: null,
  name: "X",
  description: "",
  pattern: "squat",
  category: "Foundational strength",
  muscle_groups: ["quads"],
  equipment_types: ["bodyweight"],
  difficulty: "beginner",
  cues: null,
  contraindication_tags: [],
  unilateral: false,
  ...over,
});

const ohp = mk({ name: "OHP", pattern: "push_vertical", contraindication_tags: ["overhead"], equipment_types: ["dumbbell"] });
const landmine = mk({ name: "Landmine Press", pattern: "push_vertical", equipment_types: ["barbell", "landmine"] });
const squat = mk({ name: "Goblet Squat", equipment_types: ["kettlebell"] });

{
  const { allowed, excluded } = filterForLimitations([ohp, landmine, squat], ["shoulder_impingement"]);
  check("impingement excludes overhead-tagged OHP", excluded.some((e) => e.exercise_name === "OHP"));
  check("impingement keeps Landmine Press (recommended substitute)", allowed.some((e) => e.name === "Landmine Press"));
  check("exclusion carries clinical rationale", excluded[0]?.reason.length > 20);
  check("exclusion carries substitute suggestion", !!excluded[0]?.prefer_instead);
}
{
  const { allowed } = filterForLimitations([ohp, squat], []);
  check("no limitations → nothing excluded", allowed.length === 2);
}
{
  const { usable } = filterForEquipment([ohp, landmine, squat], ["kettlebell"]);
  check("equipment gate: KB-only client keeps only KB/bodyweight exercises",
    usable.length === 1 && usable[0].name === "Goblet Squat");
}
{
  const { usable } = filterForEquipment([ohp, landmine, squat], ["full_gym"]);
  check("full_gym pseudo-item unlocks everything", usable.length === 3);
}
{
  const { usable } = filterForEquipment([mk({ name: "BW", equipment_types: ["bodyweight"] })], []);
  check("bodyweight exercises need no inventory", usable.length === 1);
}

// ── QA validator: a compliant plan passes ───────────────────────────────
const pool: Exercise[] = [
  mk({ name: "Goblet Squat", pattern: "squat", equipment_types: ["kettlebell"] }),
  mk({ name: "KB Deadlift", pattern: "hinge", equipment_types: ["kettlebell"] }),
  mk({ name: "Push-Up", pattern: "push_horizontal" }),
  mk({ name: "Banded Row", pattern: "pull_horizontal", equipment_types: ["band"] }),
  mk({ name: "Dead Bug", pattern: "core_antiextension" }),
  mk({ name: "Farmer Carry", pattern: "carry", equipment_types: ["kettlebell"] }),
];
const [sq, dl, pu, row, db, fc] = pool;
const block = (e: Exercise, sets = 3) => ({
  exercise_id: e.id, name: e.name, sets, reps: "8-10", load_note: "RPE 7", rest_sec: 90,
});
const goodPlan: PlanJson = {
  sessions: [
    { day: 1, focus: "Full body A", blocks: [block(sq), block(pu), block(row), block(db)] },
    { day: 2, focus: "Full body B", blocks: [block(dl), block(row), block(pu), block(fc)] },
    { day: 3, focus: "Full body C", blocks: [block(sq), block(dl), block(row), block(db)] },
  ],
  progression_notes:
    "Weeks 1-3: add one rep per set each week within the 8-10 range, then add 2.5-5% load and reset reps. Week 4 is a deload: cut sets by roughly 40% and keep loads moderate before repeating the wave.",
  exclusions: [],
};
{
  const qa = validatePlan(goodPlan, pool, [], "full_body_strength", 3);
  check("compliant plan passes all QA checks", qa.passed,
    qa.checks.filter((c) => !c.pass).map((c) => c.name).join(","));
}

// ── QA validator: each failure mode is caught ───────────────────────────
{
  const p = structuredClone(goodPlan);
  p.sessions[0].blocks[0].exercise_id = crypto.randomUUID(); // not in pool
  const qa = validatePlan(p, pool, [], "full_body_strength", 3);
  check("QA catches exercise outside filtered pool",
    !qa.passed && !qa.checks.find((c) => c.name === "pool_membership")!.pass);
}
{
  // Sneak a contraindicated exercise INTO the pool, then program it
  const bad = mk({ name: "Loaded Situp", pattern: "core_flexion", contraindication_tags: ["loaded_flexion"] });
  const p = structuredClone(goodPlan);
  p.sessions[0].blocks.push(block(bad, 3));
  const qa = validatePlan(p, [...pool, bad], ["low_back_pain"], "full_body_strength", 3);
  check("QA re-catches contraindication even if pre-filter is bypassed",
    !qa.checks.find((c) => c.name === "contraindications")!.pass);
}
{
  const p = structuredClone(goodPlan);
  p.sessions.pop();
  const qa = validatePlan(p, pool, [], "full_body_strength", 3);
  check("QA catches wrong session count",
    !qa.checks.find((c) => c.name === "session_count")!.pass);
}
{
  const p = structuredClone(goodPlan);
  // Remove all pulling → breaks both balance and ratio
  for (const s of p.sessions) s.blocks = s.blocks.filter((b) => b.name !== "Banded Row");
  const qa = validatePlan(p, pool, [], "full_body_strength", 3);
  check("QA catches missing required pattern",
    !qa.checks.find((c) => c.name === "movement_balance")!.pass);
  check("QA catches pull:push ratio violation",
    !qa.checks.find((c) => c.name === "pull_push_ratio")!.pass);
}
{
  const p = structuredClone(goodPlan);
  p.sessions[0].blocks = [{ ...block(sq, 30) }, { ...block(dl, 30) }, { ...block(row, 30) }];
  const qa = validatePlan(p, pool, [], "full_body_strength", 3);
  check("QA catches insane set volume (90 sets/session)",
    !qa.checks.find((c) => c.name === "volume_sanity")!.pass);
}
{
  const p = structuredClone(goodPlan);
  p.progression_notes = "add weight";
  const qa = validatePlan(p, pool, [], "full_body_strength", 3);
  check("QA catches missing/thin progression + deload",
    !qa.checks.find((c) => c.name === "progression_defined")!.pass);
}

console.log(failures === 0 ? "\nALL UNIT TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

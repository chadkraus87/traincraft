/**
 * MANUAL VERIFICATION · generates real meal plans against the real food
 * library, using the real model, and reports what QA says.
 *
 * Deliberately NOT part of `npm test`: it spends money on every run and
 * depends on a third-party service, and a test suite that does either of
 * those stops being something anyone runs. Run it by hand with
 * `npm run verify:meal-plan` when the food library, the QA checks or the
 * builder prompt change.
 *
 * It answers one question the unit tests cannot: can the model actually
 * satisfy all of the deterministic checks at once, using these 82 foods?
 * Checks that nothing can pass are worse than no checks — a feature that
 * always produces drafts teaches trainers to ignore the warning.
 *
 * No production data is touched. The food library comes from the migrations
 * applied to a throwaway Postgres, and the client is invented here.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, readdirSync } from "fs";
import { config } from "dotenv";
import { screenFoods, scalePortions, validateMealPlan, isBetterMealAttempt, type Food } from "../src/lib/nutrition/meals";
import { calculateTargets } from "../src/lib/nutrition/macros";
import type { NutritionProfile } from "../src/lib/nutrition/gates";

config({ path: ".env.local" });

const SCENARIOS: { name: string; profile: NutritionProfile; sex: "male" | "female"; age: number; weightLb: number; heightIn: number }[] = [
  {
    name: "Omnivore, cutting",
    sex: "male", age: 34, weightLb: 198, heightIn: 71,
    profile: { activity_level: "moderate", goal: "lose", diet: "none", allergens: [], gluten_free: false,
      other_allergy: false, severe_allergy: false, life_stage: "none", medications: [], other_medication: false },
  },
  {
    // The hard case: the smallest pool the app will still generate from, and
    // the one where B12 and calcium advisories should appear.
    name: "Vegan, dairy + gluten avoidant, maintaining",
    sex: "female", age: 29, weightLb: 142, heightIn: 65,
    profile: { activity_level: "light", goal: "maintain", diet: "vegan", allergens: ["milk"], gluten_free: true,
      other_allergy: false, severe_allergy: false, life_stage: "none", medications: [], other_medication: false },
  },
];

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set — this script makes real API calls.");
    process.exit(1);
  }
  // Imported here, not at the top: the builder's Anthropic client reads the
  // key when its module is evaluated, which would be before dotenv ran.
  const { buildMealPlan } = await import("../src/lib/ai/meal-builder");

  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/tc-pg-verify", user: "postgres", password: "postgres",
    port: 55439, persistent: false, createPostgresUser: isRoot,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("traincraft");
  const db = pg.getPgClient("traincraft");
  await db.connect();
  await db.query(`
    create schema auth;
    create table auth.users (id uuid primary key);
    do $do$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    end $do$;
    create or replace function auth.uid() returns uuid language sql stable as 'select null::uuid';
  `);
  for (const f of readdirSync("supabase/migrations").filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await db.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  const library = (await db.query("select * from foods")).rows as Food[];
  console.log(`Food library: ${library.length} rows, ${library.filter((f) => f.is_active).length} active\n`);

  let anyFailed = false;
  for (const s of SCENARIOS) {
    const targets = calculateTargets({ sex: s.sex, age: s.age, weightLb: s.weightLb, heightIn: s.heightIn,
      activity: s.profile.activity_level as "moderate", goal: s.profile.goal as "lose", deficitAllowed: true });
    const pool = screenFoods(library.filter((f) => f.is_active), s.profile);
    console.log(`── ${s.name}`);
    console.log(`   pool ${pool.length} foods · target ${targets.calories} kcal, ${targets.proteinG} g protein`);

    const days = 3, mealsPerDay = 4;
    const byId = new Map(library.map((f) => [f.id, f]));
    const attempt = async (n: number, feedback?: string) => {
      const plan = scalePortions(await buildMealPlan({ pool, targets, diet: s.profile.diet, days, mealsPerDay, feedback }), byId, targets.calories);
      return { plan, qa: validateMealPlan(plan, library, s.profile, targets, days, mealsPerDay, n) };
    };

    const t0 = Date.now();
    let best = await attempt(1);
    console.log(`   attempt 1: ${best.qa.passed ? "PASSED" : "failed"} — ${best.qa.checks.filter((c) => !c.pass).map((c) => c.name).join(", ") || "all nine checks"}`);
    for (const c of best.qa.checks.filter((c) => !c.pass)) console.log(`      ✗ ${c.name}: ${c.detail}`);

    if (!best.qa.passed) {
      const failures = best.qa.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`).join(" | ");
      const retry = await attempt(2, failures);
      console.log(`   attempt 2: ${retry.qa.passed ? "PASSED" : "failed"} — ${retry.qa.checks.filter((c) => !c.pass).map((c) => c.name).join(", ") || "all nine checks"}`);
      for (const c of retry.qa.checks.filter((c) => !c.pass)) console.log(`      ✗ ${c.name}: ${c.detail}`);
      if (isBetterMealAttempt(retry.qa, best.qa)) best = retry;
    }

    for (const a of best.qa.advisories ?? []) console.log(`   advisory: ${a}`);
    console.log(`   status: ${best.qa.passed ? "final (deliverable)" : "DRAFT (not deliverable)"} after ${Math.round((Date.now() - t0) / 1000)}s`);
    if (!best.qa.passed) anyFailed = true;

    // One day printed in full, so the output is reviewable by a human rather
    // than only by the checks.
    const d = best.plan.days[0];
    for (const m of d.meals) {
      console.log(`   ${m.name}: ${m.items.map((i) => `${byId.get(i.food_id)?.name} ${i.grams}g`).join(", ")}`);
    }
    console.log();
  }

  await db.end();
  await pg.stop();
  console.log(anyFailed
    ? "RESULT: at least one scenario could not clear QA in two attempts — the checks may be unsatisfiable with this library."
    : "RESULT: every scenario produced a deliverable plan.");
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => { console.error("FAIL", e); process.exit(1); });

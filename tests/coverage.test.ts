/**
 * TEST 3 · Contraindication rules actually exclude something, and no
 * (limitation × workout type) combination is impossible to satisfy.
 *
 * This runs against a real database with every migration applied, rather
 * than regex-scraping the seed SQL, because tagging is now spread across
 * INSERT statements in the seed migrations and UPDATE statements in
 * 0018 — only the database knows the final state of a row.
 *
 * Two failure modes are guarded here, and they pull in opposite directions:
 *
 *   UNDER-EXCLUSION — a rule that names tags no exercise carries. It reads
 *   like protection, ships green, and filters nothing. This is how
 *   hip_impingement shipped screening 2 exercises out of 543.
 *
 *   OVER-EXCLUSION — a rule so broad that a required movement pattern has no
 *   survivors. Those plans can never pass QA, so every plan for that client
 *   is permanently flagged as a draft. Trainers stop reading a warning that
 *   is always on, which costs more safety than the broad rule buys.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, readdirSync } from "fs";
import {
  LIMITATION_TAGS,
  CONTRAINDICATIONS,
  WORKOUT_TYPES,
  filterForLimitations,
} from "../src/lib/safety/rules";
import type { Exercise } from "../src/lib/types";

/**
 * Minimum exercises a limitation must exclude from the full library.
 *
 * Not a clinical number — a smoke threshold. A real limitation screens
 * dozens of movements out of 543; anything in single digits means the tags
 * were never applied to the library, not that the injury is permissive.
 */
const COVERAGE_FLOOR = 15;

let failures = 0;
function check(ok: boolean, passMsg: string, failMsg: string) {
  if (ok) console.log(`PASS  ${passMsg}`);
  else {
    console.error(`FAIL  ${failMsg}`);
    failures++;
  }
}

async function main() {
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/tc-pg-coverage",
    user: "postgres",
    password: "postgres",
    port: 55436,
    persistent: false,
    createPostgresUser: isRoot,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("coachrhythm");
  const client = pg.getPgClient("coachrhythm");
  await client.connect();

  await client.query(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid
      language sql stable as 'select null::uuid';
  `);
  for (const f of readdirSync("supabase/migrations").filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await client.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }

  const { rows } = await client.query(
    `select id, name, pattern, contraindication_tags, equipment_types from exercises where is_active`
  );
  const pool = rows as unknown as Exercise[];

  // ── No rule may reference a tag that no exercise carries ──────────────
  const liveTags = new Set(pool.flatMap((e) => e.contraindication_tags));
  const deadTags = [
    ...new Set(Object.values(CONTRAINDICATIONS).flatMap((r) => r.avoidExerciseTags)),
  ].filter((t) => !liveTags.has(t));
  check(
    deadTags.length === 0,
    "every rule tag is carried by at least one exercise",
    `rule tags that match nothing (these rules exclude nothing): ${deadTags.join(", ")}`
  );

  // ── Coverage floor per limitation ─────────────────────────────────────
  for (const tag of LIMITATION_TAGS) {
    const { excluded } = filterForLimitations(pool, [tag]);
    check(
      excluded.length >= COVERAGE_FLOOR,
      `${tag} excludes ${excluded.length}/${pool.length}`,
      `${tag} excludes only ${excluded.length}/${pool.length} — below the floor of ${COVERAGE_FLOOR}. The rule exists but the library isn't tagged for it.`
    );
  }

  // ── Satisfiability: every required pattern must have a survivor ───────
  for (const tag of LIMITATION_TAGS) {
    const { allowed } = filterForLimitations(pool, [tag]);
    for (const [wtKey, wt] of Object.entries(WORKOUT_TYPES)) {
      const missing = wt.balance.requiredPatterns.filter(
        (p) => !allowed.some((e) => e.pattern === p)
      );
      check(
        missing.length === 0,
        `${tag} + ${wtKey} is satisfiable`,
        `${tag} + ${wtKey} is IMPOSSIBLE — no exercise survives for required pattern(s): ${missing.join(", ")}. Every plan for this combination will fail QA and save as a draft.`
      );
    }
  }

  // ── Named modalities must survive their own limitation ────────────────
  //
  // The satisfiability matrix above only checks movement *patterns*, and a
  // whole modality can disappear without emptying a pattern. Migration 0018
  // did exactly that four times over: it left neck-pain clients with zero
  // bridges of any kind, hypertensive and prenatal clients with zero loaded
  // carries, and FAI clients with five abduction exercises and no adduction
  // ones — encoding the very imbalance conservative FAI management exists to
  // correct. Every pattern check still passed.
  //
  // Each pair below is a movement family that is specifically *indicated*
  // for that limitation, so losing it entirely is a signal that tagging has
  // over-reached rather than a sign of caution.
  const MUST_SURVIVE: { tag: string; family: string; match: RegExp }[] = [
    { tag: "neck_pain", family: "bridges", match: /bridge|hip thrust/i },
    { tag: "hypertension_uncontrolled", family: "loaded carries", match: /carry/i },
    { tag: "pregnancy_2nd_3rd_trimester", family: "loaded carries", match: /carry/i },
    { tag: "hip_impingement", family: "adductor work", match: /adduction|adductor/i },
    { tag: "elbow_tendinopathy", family: "wrist loading (the rehab)", match: /wrist (curl|extension)/i },
    { tag: "hypertension_uncontrolled", family: "yoga strength poses", match: /warrior|chair pose/i },
    { tag: "low_back_pain", family: "carries and sleds", match: /carry|sled/i },
    { tag: "lumbar_disc_injury", family: "hinge patterning", match: /bridge|hip hinge|glute/i },
    // Direction of loading is the variable that matters in osteoporosis:
    // flexion-biased work raises vertebral fracture risk, extensor
    // strengthening lowers it. The ruleset avoids core_flexion correctly; if
    // extension disappears too, nothing is left in either direction.
    { tag: "osteoporosis", family: "spinal extensor work", match: /back extension|cobra|bird dog|swimming/i },
  ];
  for (const { tag, family, match } of MUST_SURVIVE) {
    const { allowed } = filterForLimitations(pool, [tag]);
    const survivors = allowed.filter((e) => match.test(e.name));
    check(
      survivors.length > 0,
      `${tag} retains ${family} (${survivors.length} available)`,
      `${tag} excludes ALL ${family}. That family is indicated for this limitation — over-tagging, not caution.`
    );
  }

  // ── Unrecognized limitation tags must fail closed ─────────────────────
  // The regression guard for the worst bug this engine has had: an unknown
  // tag used to be skipped, so a client whose injury was logged under a
  // typo received a completely unfiltered plan while both the filter and
  // the QA re-check reported everything was fine.
  const bogus = filterForLimitations(pool, ["lumbar_pain", "LOW_BACK_PAIN", ""]);
  check(
    bogus.unrecognized.length === 3,
    "unrecognized limitation tags are reported, not silently skipped",
    `expected 3 unrecognized tags, got ${bogus.unrecognized.length}`
  );
  check(
    bogus.excluded.length === 0 && bogus.allowed.length === pool.length,
    "an unrecognized tag excludes nothing (and is surfaced so callers can refuse)",
    "unrecognized tags unexpectedly changed the pool"
  );

  await client.end();
  await pg.stop();

  if (failures > 0) {
    console.error(`\n${failures} COVERAGE FAILURE(S)`);
    process.exit(1);
  }
  console.log("\nALL COVERAGE TESTS PASSED");
}

main().catch((e) => {
  console.error("FAIL ", e.message);
  process.exit(1);
});

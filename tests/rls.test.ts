/**
 * TEST 2 · Row-level security actually isolates two tenants.
 *
 * Until this file existed, no policy in this repo had ever been empirically
 * proven to separate two trainers. The migration test stubbed auth.uid() to
 * return NULL, so every policy evaluated to "no rows" and passed trivially.
 *
 * Two details make this a real test rather than a re-run of that one:
 *
 *   1. auth.uid() reads a session GUC, so each statement can run "as" a
 *      chosen trainer — the same mechanism Supabase uses with the JWT sub
 *      claim.
 *   2. Everything runs as a non-superuser role. Postgres superusers bypass
 *      RLS entirely; testing as `postgres` would report success no matter
 *      how broken the policies were.
 *
 * The app holds clients' injury and medical data, so a cross-tenant leak is
 * the worst failure this codebase can have. These assertions fail the build.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, readdirSync } from "fs";

// Structural type instead of `import type { Client } from "pg"` — pg ships
// no bundled types and this is the only place in the repo that would need
// @types/pg, which isn't worth a devDependency for two method signatures.
type PgClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, never>[] }>;
};

let failures = 0;

function check(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) {
    console.log(`PASS  ${passMsg}`);
  } else {
    console.error(`FAIL  ${failMsg}`);
    failures++;
  }
}

const TRAINER_A = "11111111-1111-1111-1111-111111111111";
const TRAINER_B = "22222222-2222-2222-2222-222222222222";

/** Run the rest of this connection's statements as the given trainer. */
async function actAs(client: PgClient, trainerId: string) {
  await client.query("select set_config('request.jwt.claims.sub', $1, false)", [trainerId]);
}

/** Returns true when the statement was rejected (by RLS or a constraint). */
async function rejects(client: PgClient, sql: string, params: unknown[] = []): Promise<boolean> {
  try {
    await client.query(sql, params);
    return false;
  } catch {
    // A failed statement aborts the transaction block in some drivers;
    // roll back defensively so later assertions aren't poisoned by it.
    await client.query("rollback").catch(() => {});
    return true;
  }
}

async function main() {
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/tc-pg-rls",
    user: "postgres",
    password: "postgres",
    port: 55433,
    persistent: false,
    createPostgresUser: isRoot,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("coachrhythm");

  const admin = pg.getPgClient("coachrhythm");
  await admin.connect();

  // auth.uid() resolves from a session setting instead of being hardcoded
  // NULL, which is what makes per-tenant assertions possible at all.
  await admin.query(`
    create schema auth;
    create table auth.users (id uuid primary key);
    -- Supabase provisions these roles; the embedded Postgres used for tests
    -- does not, so migrations that grant to them would fail here for a
    -- reason that has nothing to do with the migration.
    do $do$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    end $do$;
    create or replace function auth.uid() returns uuid
      language sql stable as
      $$ select nullif(current_setting('request.jwt.claims.sub', true), '')::uuid $$;
  `);

  for (const f of readdirSync("supabase/migrations").filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort()) {
    await admin.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }

  await admin.query(`insert into auth.users (id) values ($1), ($2)`, [TRAINER_A, TRAINER_B]);

  // Non-superuser, no BYPASSRLS — otherwise the policies are never consulted.
  await admin.query(`
    create role app_user nologin;
    grant usage on schema public to app_user;
    grant select, insert, update, delete on all tables in schema public to app_user;
    -- Supabase runs a signed-in request as the "authenticated" role, so the
    -- test principal has to inherit it or grants written against it aren't
    -- being exercised at all. Without this, delete_own_account would appear
    -- to be correctly locked down when in fact it was untested.
    grant authenticated to app_user;
  `);

  const db = pg.getPgClient("coachrhythm");
  await db.connect();
  await db.query("set role app_user");

  // ── Seed: each trainer gets one client and one custom exercise ─────────
  await actAs(db, TRAINER_A);
  const { rows: aClient } = await db.query(
    `insert into clients (trainer_id, full_name) values ($1, 'Client A') returning id`,
    [TRAINER_A]
  );
  const clientA = aClient[0].id;
  const { rows: aEx } = await db.query(
    `insert into exercises (trainer_id, name, description, pattern, muscle_groups, equipment_types)
     values ($1, 'A Secret Lift', 'private', 'squat', '{quads}', '{bodyweight}') returning id`,
    [TRAINER_A]
  );
  const exerciseA = aEx[0].id;
  const { rows: aPlan } = await db.query(
    `insert into workout_plans (trainer_id, client_id, title, workout_type, plan)
     values ($1, $2, 'A Plan', 'full_body_strength', '{}'::jsonb) returning id`,
    [TRAINER_A, clientA]
  );
  const planA = aPlan[0].id;

  await actAs(db, TRAINER_B);
  await db.query(
    `insert into clients (trainer_id, full_name) values ($1, 'Client B')`,
    [TRAINER_B]
  );

  // ── Read isolation ────────────────────────────────────────────────────
  const bSeesClients = await db.query("select full_name from clients");
  check(
    bSeesClients.rows.length === 1 && bSeesClients.rows[0].full_name === "Client B",
    "trainer B sees only their own clients",
    `trainer B saw ${bSeesClients.rows.length} clients: ${bSeesClients.rows.map((r: Record<string, unknown>) => r.full_name).join(", ")}`
  );

  const bSeesPlans = await db.query("select id from workout_plans");
  check(bSeesPlans.rows.length === 0, "trainer B sees none of A's plans", "trainer B can read A's plans");

  // ── Exercise library: globals shared, custom rows private ─────────────
  const bSeesSecret = await db.query("select id from exercises where id = $1", [exerciseA]);
  check(bSeesSecret.rows.length === 0, "trainer B cannot see A's custom exercise", "A's custom exercise leaked to B");

  const bSeesGlobals = await db.query("select count(*)::int as n from exercises where trainer_id is null");
  check(bSeesGlobals.rows[0].n > 500, "trainer B still sees the shared base library", "base exercise library is not visible");

  // A write blocked by a USING clause is filtered, not rejected — it reports
  // success having touched nothing. Asserting on the error would pass for the
  // wrong reason, so assert on the row count instead.
  const hijack = await db.query(
    "update exercises set name = 'hijacked' where trainer_id is null returning id"
  );
  check(
    hijack.rows.length === 0,
    "trainer B cannot rewrite the shared base library",
    `trainer B modified ${hijack.rows.length} global exercise rows`
  );

  // ── Parent-ownership writes (the 0016 migration) ──────────────────────
  check(
    await rejects(
      db,
      `insert into client_limitations (trainer_id, client_id, tag) values ($1, $2, 'low_back_pain')`,
      [TRAINER_B, clientA]
    ),
    "trainer B cannot attach a limitation to A's client",
    "trainer B wrote a limitation onto another trainer's client"
  );

  check(
    await rejects(
      db,
      `insert into client_equipment (trainer_id, client_id, label, equipment_type)
       values ($1, $2, 'planted', 'barbell')`,
      [TRAINER_B, clientA]
    ),
    "trainer B cannot attach equipment to A's client",
    "trainer B wrote equipment onto another trainer's client"
  );

  check(
    await rejects(
      db,
      `insert into workout_plans (trainer_id, client_id, title, workout_type, plan)
       values ($1, $2, 'injected', 'full_body_strength', '{}'::jsonb)`,
      [TRAINER_B, clientA]
    ),
    "trainer B cannot create a plan for A's client",
    "trainer B created a plan against another trainer's client"
  );

  check(
    await rejects(
      db,
      `insert into deliveries (trainer_id, plan_id, channel, destination)
       values ($1, $2, 'email', 'attacker@example.test')`,
      [TRAINER_B, planA]
    ),
    "trainer B cannot log a delivery against A's plan",
    "trainer B wrote a delivery record onto another trainer's plan"
  );

  // ── Spoofing another trainer's id outright ────────────────────────────
  check(
    await rejects(db, `insert into clients (trainer_id, full_name) values ($1, 'spoofed')`, [TRAINER_A]),
    "trainer B cannot create a row owned by trainer A",
    "trainer B forged a row owned by another trainer"
  );

  // ── Cross-tenant update / delete ──────────────────────────────────────
  const stolen = await db.query("update clients set full_name = 'stolen' where id = $1 returning id", [clientA]);
  check(stolen.rows.length === 0, "trainer B cannot rename A's client", "trainer B updated another trainer's client");

  const wiped = await db.query("delete from clients where id = $1 returning id", [clientA]);
  check(wiped.rows.length === 0, "trainer B cannot delete A's client", "trainer B deleted another trainer's client");

  // ── A can still manage their own custom exercise (0016 DELETE policy) ─
  await actAs(db, TRAINER_A);
  const ownDelete = await db.query("delete from exercises where id = $1 returning id", [exerciseA]);
  check(
    ownDelete.rows.length === 1,
    "trainer A can delete their own custom exercise",
    "trainer A could not delete their own custom exercise (missing DELETE policy)"
  );

  // ── delete_own_account: a SECURITY DEFINER function, so prove its blast
  //    radius. It runs with the definer's privileges and can write to
  //    auth.users, which is exactly the kind of function that becomes a
  //    cross-tenant hole if it ever takes its target from an argument.
  await actAs(db, TRAINER_B);
  await db.query("select public.delete_own_account()");

  // Verified through the admin connection: app_user deliberately has no
  // USAGE on the auth schema, which is itself the correct posture — the only
  // thing that may touch auth.users is the definer function.
  const bGone = await admin.query("select id from auth.users where id = $1", [TRAINER_B]);
  check(bGone.rows.length === 0, "delete_own_account removes the caller's auth user", "trainer B's account survived deletion");

  const aSurvives = await admin.query("select id from auth.users where id = $1", [TRAINER_A]);
  check(aSurvives.rows.length === 1,
    "deleting one account leaves the other trainer untouched",
    "deleting trainer B's account also removed trainer A");

  // The cascade is the whole point — a deletion that leaves health data
  // behind is not a deletion.
  await actAs(db, TRAINER_A);
  const aStillHasData = await db.query("select id from clients");
  check(aStillHasData.rows.length === 1, "trainer A's clients survive B's deletion", "B's deletion took A's data with it");

  const orphaned = await admin.query(
    "select count(*)::int as n from clients where trainer_id = $1", [TRAINER_B]
  );
  check(orphaned.rows[0].n === 0,
    "the deleted trainer's clients cascade away with them",
    `${orphaned.rows[0].n} of trainer B's clients survived — health data outliving the account`);

  // ── Signed out: no session, no data ───────────────────────────────────
  await db.query("select set_config('request.jwt.claims.sub', '', false)");
  const anon = await db.query("select id from clients");
  check(anon.rows.length === 0, "an anonymous session reads no client rows", "anonymous session could read client data");

  const anonDelete = await rejects(db, "select public.delete_own_account()");
  check(anonDelete, "delete_own_account refuses an unauthenticated caller",
    "delete_own_account ran without a session — it should raise, not silently match no rows");

  await db.end();
  await admin.end();
  await pg.stop();

  if (failures > 0) {
    console.error(`\n${failures} RLS ISOLATION FAILURE(S)`);
    process.exit(1);
  }
  console.log("\nALL RLS ISOLATION TESTS PASSED");
}

main().catch((e) => {
  console.error("FAIL ", e.message);
  process.exit(1);
});

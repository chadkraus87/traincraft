/**
 * TEST 1 · Migrations run clean against real Postgres.
 * Supabase provides auth.users + auth.uid(); we stub both so the schema's
 * FKs and RLS policies compile exactly as written.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync } from "fs";

async function main() {
  // createPostgresUser is only needed when running as root (Postgres
  // refuses to start as root without it). On environments that are
  // already non-root — like GitHub Actions' default runner — forcing
  // this on causes it to try creating a "postgres" system user/group
  // that may already exist there, which fails the whole test. Detect
  // instead of hardcoding, so this works correctly in both places.
  const isRoot = typeof process.getuid === "function" && process.getuid() === 0;

  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/tc-pg",
    user: "postgres",
    password: "postgres",
    port: 55432,
    persistent: false,
    createPostgresUser: isRoot,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("traincraft");
  const client = pg.getPgClient("traincraft");
  await client.connect();

  // Stub the Supabase auth schema
  await client.query(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid
      language sql stable as 'select null::uuid';
  `);

  const m1 = readFileSync("supabase/migrations/0001_schema.sql", "utf8");
  const m2 = readFileSync("supabase/migrations/0002_seed_exercises.sql", "utf8");
  const m3 = readFileSync("supabase/migrations/0003_expand_exercise_library.sql", "utf8");
  const m4 = readFileSync("supabase/migrations/0004_add_exercise_category.sql", "utf8");
  const m5 = readFileSync("supabase/migrations/0005_isolation_and_cardio_machines.sql", "utf8");
  const m6 = readFileSync("supabase/migrations/0006_add_single_workout_flag.sql", "utf8");
  const m7 = readFileSync("supabase/migrations/0007_functional_and_conditioning_batch.sql", "utf8");
  const m8 = readFileSync("supabase/migrations/0008_ace_style_expansion.sql", "utf8");
  const m9 = readFileSync("supabase/migrations/0009_exercise_logs.sql", "utf8");
  const m10 = readFileSync("supabase/migrations/0010_client_notes.sql", "utf8");
  const m11 = readFileSync("supabase/migrations/0011_plan_templates.sql", "utf8");
  await client.query(m1);
  console.log("PASS  0001_schema.sql applied");
  await client.query(m2);
  await client.query(m3);
  await client.query(m4);
  await client.query(m5);
  await client.query(m6);
  await client.query(m7);
  await client.query(m8);
  await client.query(m9);
  await client.query(m10);
  await client.query(m11);
  const { rows } = await client.query(
    "select count(*)::int as n, count(distinct pattern)::int as patterns, count(distinct category)::int as categories from exercises"
  );
  console.log(`PASS  0002 through 0011 applied — ${rows[0].n} exercises, ${rows[0].patterns} patterns, ${rows[0].categories} categories`);

  const uncategorized = await client.query("select name from exercises where category is null");
  console.log(uncategorized.rows.length === 0
    ? "PASS  every exercise has a category"
    : `FAIL  uncategorized: ${uncategorized.rows.map((r: { name: string }) => r.name).join(", ")}`);

  // Verify GIN indexes usable + tags well-formed (no empty strings from '{}')
  const bad = await client.query(
    "select name from exercises where '' = any(contraindication_tags) or '' = any(equipment_types)"
  );
  console.log(bad.rows.length === 0
    ? "PASS  no malformed array tags in seed"
    : `FAIL  malformed tags: ${bad.rows.map((r: { name: string }) => r.name).join(", ")}`);

  // RLS is enabled on every app table
  const rls = await client.query(`
    select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and relkind = 'r' and not relrowsecurity
  `);
  console.log(rls.rows.length === 0
    ? "PASS  RLS enabled on all public tables"
    : `FAIL  RLS missing on: ${rls.rows.map((r: { relname: string }) => r.relname).join(", ")}`);

  await client.end();
  await pg.stop();
}

main().catch((e) => { console.error("FAIL ", e.message); process.exit(1); });

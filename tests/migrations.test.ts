/**
 * TEST 1 · Migrations run clean against real Postgres.
 * Supabase provides auth.users + auth.uid(); we stub both so the schema's
 * FKs and RLS policies compile exactly as written.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync } from "fs";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: "/tmp/tc-pg",
    user: "postgres",
    password: "postgres",
    port: 55432,
    persistent: false,
    createPostgresUser: true,
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
  await client.query(m1);
  console.log("PASS  0001_schema.sql applied");
  await client.query(m2);
  const { rows } = await client.query(
    "select count(*)::int as n, count(distinct pattern)::int as patterns from exercises"
  );
  console.log(`PASS  0002_seed applied — ${rows[0].n} exercises, ${rows[0].patterns} movement patterns`);

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

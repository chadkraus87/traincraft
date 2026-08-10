/**
 * TEST 1 · Migrations run clean against real Postgres.
 * Supabase provides auth.users + auth.uid(); we stub both so the schema's
 * FKs and RLS policies compile exactly as written.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, readdirSync } from "fs";

// These assertions used to console.log("FAIL ...") and then exit 0, so CI
// stayed green even with RLS disabled on a public table. Count and enforce.
let failures = 0;
function check(ok: boolean, passMsg: string, failMsg: string) {
  if (ok) console.log(`PASS  ${passMsg}`);
  else { console.error(`FAIL  ${failMsg}`); failures++; }
}

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
    -- Supabase provisions these roles; the embedded Postgres used for tests
    -- does not, so migrations that grant to them would fail here for a
    -- reason that has nothing to do with the migration.
    do $do$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    end $do$;
    create or replace function auth.uid() returns uuid
      language sql stable as 'select null::uuid';
  `);

  // Discovered from disk rather than listed by hand, so a migration added
  // later is covered by this test automatically instead of silently skipped
  // until someone remembers to append it here.
  const files = readdirSync("supabase/migrations")
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();

  for (const f of files) {
    try {
      await client.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
    } catch (e) {
      console.error(`FAIL  ${f} did not apply: ${(e as Error).message}`);
      process.exit(1);
    }
  }
  console.log(`PASS  all ${files.length} migrations applied (${files[0]} … ${files[files.length - 1]})`);

  const { rows } = await client.query(
    "select count(*)::int as n, count(distinct pattern)::int as patterns, count(distinct category)::int as categories from exercises"
  );
  console.log(`PASS  exercise library seeded — ${rows[0].n} exercises, ${rows[0].patterns} patterns, ${rows[0].categories} categories`);

  const uncategorized = await client.query("select name from exercises where category is null");
  check(uncategorized.rows.length === 0,
    "every exercise has a category",
    `uncategorized: ${uncategorized.rows.map((r: { name: string }) => r.name).join(", ")}`);

  // Verify GIN indexes usable + tags well-formed (no empty strings from '{}')
  const bad = await client.query(
    "select name from exercises where '' = any(contraindication_tags) or '' = any(equipment_types)"
  );
  check(bad.rows.length === 0,
    "no malformed array tags in seed",
    `malformed tags: ${bad.rows.map((r: { name: string }) => r.name).join(", ")}`);

  // RLS is enabled on every app table
  const rls = await client.query(`
    select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and relkind = 'r' and not relrowsecurity
  `);
  check(rls.rows.length === 0,
    "RLS enabled on all public tables",
    `RLS missing on: ${rls.rows.map((r: { relname: string }) => r.relname).join(", ")}`);

  // RLS being *enabled* proves nothing without a policy behind it: a table
  // with RLS on and no policy denies everything, which looks safe here but
  // breaks the app. Assert both.
  const policyless = await client.query(`
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  `);
  check(policyless.rows.length === 0,
    "every public table has at least one RLS policy",
    `no policy on: ${policyless.rows.map((r: { relname: string }) => r.relname).join(", ")}`);

  await client.end();
  await pg.stop();

  if (failures > 0) {
    console.error(`\n${failures} SCHEMA CHECK FAILURE(S)`);
    process.exit(1);
  }
}

main().catch((e) => { console.error("FAIL ", e.message); process.exit(1); });

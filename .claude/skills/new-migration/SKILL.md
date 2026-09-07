---
name: new-migration
description: Scaffold the next numbered Supabase migration for this repo, matching its existing RLS and naming conventions, then verify it locally with check:migrations and test:db.
disable-model-invocation: true
---

# New migration

Adds one migration to `supabase/migrations/`. Local only. Never applies
anything to a remote Supabase project without explicit approval from the user
in this conversation (see "Applying it" below).

## 1. Read the conventions before writing anything

Do not write a generic migration from memory. This repo has settled patterns —
find them and match them:

```bash
ls supabase/migrations | tail -5                       # numbering + name style
grep -l -i "create policy" supabase/migrations/*.sql   # which ones carry RLS
```

Then read `supabase/migrations/0001_schema.sql` (the baseline: table shapes,
`trainer_id` columns, `enable row level security`, the `own <thing>` policy
naming, the `touch_updated_at` trigger) and `0016_rls_parent_ownership.sql`
(how ownership is expressed for child tables). Read the two most recent
migrations for current style — including the header comment convention: these
files explain *why* the change exists and what failure it prevents, not just
what it does. Match that.

Confirm before writing:

- the next sequence number, zero-padded to four digits, no gaps
- `NNNN_snake_case_description.sql`
- whether the change needs a policy at all, and if so, which existing policy it
  should mirror rather than a new invented shape

## 2. Write it

Rules that are not negotiable here:

- **Append-only.** Never edit a committed migration. A committed migration is
  blocked by a hook; if the change is wrong, add another migration.
- **Every new table carries `trainer_id`**, `enable row level security`, and a
  policy scoped to `auth.uid()` in the same style as its siblings — usually
  `for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid())`,
  but read the neighbours: exercises split read/insert/update because base
  exercises have a null `trainer_id`, and child tables may derive ownership
  from their parent. Copy the pattern that fits, don't paste the common one.
- **New columns are `not null default …`** where a sensible default exists, so
  existing rows and re-validation never special-case a missing value.
- **Backfills state their limitation** in a comment if they reconstruct data
  rather than record it.
- Never weaken or drop an existing RLS policy as a side effect. If a policy
  must change, say so explicitly to the user first.

## 3. Verify locally

```bash
npm run check:migrations   # numbering is complete, nothing was edited in place
npm run test:db            # schema + two-tenant RLS isolation + tag coverage
```

`tests/rls.test.ts` runs against a real embedded Postgres as a non-superuser
and proves two tenants cannot see each other. If a new table's policy is wrong,
this is what catches it — a green `test:db` is the bar, not "the SQL parsed".

If the migration touches limitation tags or the exercise pool, also run
`npm test` — `tests/coverage.test.ts` enforces the per-limitation exclusion
floor and fails on any rule tag matching zero exercises.

## 4. Applying it

Local verification above is the default and is enough for most work.

**Do not run `apply_migration`, `execute_sql`, `supabase db push`, or anything
else that writes to a hosted Supabase project unless the user has explicitly
approved applying this specific migration in this conversation.** Asking once
covers that migration only, not the next one. When in doubt, stop after step 3
and report the file plus the local test results.

## 5. Report

State the filename, what it changes, which existing policy or migration you
patterned it on, and the verbatim result of each command you ran.

-- Automate the retention schedule the privacy policy promises.
--
-- docs/legal/PRIVACY_POLICY.md § 8 commits to deleting session notes after 18
-- months, workout logs after 24, delivery records after 12, and unlinking
-- usage events from a client after 90 days. Nothing enforced any of it.
-- Publishing a retention schedule you don't run is a misrepresentation, so
-- this makes the promise true before the page goes public.
--
-- One function holds the whole schedule. Later migrations that add retained
-- tables replace it with `create or replace`, so the schedule stays readable
-- in one place instead of spread across several cron jobs.
--
-- It runs across every tenant, which is why it is scheduled inside the
-- database (pg_cron runs as the database owner) rather than from the app:
-- the app deliberately has no service-role key, and no single trainer's
-- session could legitimately purge another trainer's data.

create or replace function public.purge_expired_data()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.client_notes   where created_at   < now() - interval '18 months';
  delete from public.exercise_logs  where performed_at < now() - interval '24 months';
  delete from public.deliveries     where created_at   < now() - interval '12 months';
  -- Usage events are kept as a billing/rate-limit ledger; only the link to a
  -- specific client expires.
  update public.generation_events
     set client_id = null
   where client_id is not null
     and created_at < now() - interval '90 days';
end;
$$;

-- Callable by the scheduler only. It is harmless-looking (it deletes old
-- rows), but nothing outside the database should be able to trigger a
-- cross-tenant delete on demand.
revoke all on function public.purge_expired_data() from public, anon, authenticated;

-- pg_cron exists on Supabase but not in the embedded Postgres the test suite
-- uses. Guarding on availability lets the same migration run in both; the
-- purge function itself is still created and exercised by the tests.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- 03:17 UTC daily. Off the hour so it doesn't pile onto other jobs.
    perform cron.schedule('coachrhythm-retention', '17 3 * * *', 'select public.purge_expired_data()');
  end if;
end $$;

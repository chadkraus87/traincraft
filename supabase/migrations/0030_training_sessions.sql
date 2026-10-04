-- Session scheduling.
--
-- `training_sessions` rather than `sessions`: plans already have sessions
-- (days inside a program) and auth has sessions; a third meaning of the same
-- word would be a bug waiting to happen.
--
-- starts_at is timestamptz and the trainer's IANA time zone lives on their
-- profile. Server rendering happens in UTC, so without a stored zone a 6am
-- session would display as 11am. The browser supplies the zone on first
-- booking; nothing asks the trainer to pick one from a list.

alter table trainer_profiles add column timezone text;

create table training_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes between 5 and 480),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now()
);
create index training_sessions_trainer_time_idx on training_sessions (trainer_id, starts_at);
create index training_sessions_client_idx on training_sessions (client_id, starts_at);

alter table training_sessions enable row level security;
create policy "own training sessions" on training_sessions
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (select 1 from clients c where c.id = training_sessions.client_id and c.trainer_id = auth.uid())
  );

-- Sessions join the retention schedule at 24 months, alongside workout logs.
create or replace function public.purge_expired_data()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.client_notes      where created_at    < now() - interval '18 months';
  delete from public.exercise_logs     where performed_at  < now() - interval '24 months';
  delete from public.client_checkins   where checked_in_on < current_date - interval '24 months';
  delete from public.training_sessions where starts_at     < now() - interval '24 months';
  delete from public.deliveries        where created_at    < now() - interval '12 months';
  update public.generation_events
     set client_id = null
   where client_id is not null
     and created_at < now() - interval '90 days';
end;
$$;
revoke all on function public.purge_expired_data() from public, anon, authenticated;

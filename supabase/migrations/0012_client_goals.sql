-- Structured goals with target dates, distinct from the free-text
-- `goals` field on clients (a quick one-line summary) — this is the
-- detailed, trackable version, surfaced on the dashboard when a target
-- date is approaching or has passed.

create table client_goals (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  description text not null,
  target_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index client_goals_client_idx on client_goals (client_id, target_date);

alter table client_goals enable row level security;

create policy "own client goals" on client_goals
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

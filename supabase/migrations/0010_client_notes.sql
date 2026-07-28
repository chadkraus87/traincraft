-- Lightweight trainer journal per client — for context that isn't tied to
-- a specific exercise (nutrition compliance, sleep, "mentioned their knee
-- has been bothering them outside the gym," etc). Separate from
-- training_history (a one-time background field) and exercise_logs
-- (per-exercise performance) — this is an ongoing running journal.

create table client_notes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index client_notes_client_idx on client_notes (client_id, created_at desc);

alter table client_notes enable row level security;

create policy "own client notes" on client_notes
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

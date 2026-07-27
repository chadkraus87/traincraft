-- Actual-performance logging, so future generations can be grounded in
-- real history instead of generic placeholders ("RPE 7", "25 lb KB").
-- One row per exercise per session the trainer chooses to log — logging
-- is optional, not required, and never blocks anything else in the app.

create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  plan_id uuid references workout_plans(id) on delete set null,
  performed_at timestamptz not null default now(),
  weight_used text,       -- free text: "25 lb", "bodyweight", "20 lb x2"
  reps_completed text,    -- free text: "8,8,7", "10 reps"
  rpe numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index exercise_logs_client_exercise_idx
  on exercise_logs (client_id, exercise_id, performed_at desc);

alter table exercise_logs enable row level security;

create policy "own exercise logs" on exercise_logs
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

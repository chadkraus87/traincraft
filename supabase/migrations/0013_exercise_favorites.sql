-- Trainer-specific favorites over any exercise (base library or custom).
-- A favorite is a personal preference, not tied to the exercise record
-- itself (which may be global/shared), so this is its own join table.

create table exercise_favorites (
  trainer_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trainer_id, exercise_id)
);

alter table exercise_favorites enable row level security;

create policy "own exercise favorites" on exercise_favorites
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

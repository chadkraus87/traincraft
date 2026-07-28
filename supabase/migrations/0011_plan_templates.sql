-- Reusable plan templates. Stores the same PlanJson shape as workout_plans
-- (sessions/blocks/progression_notes), captured from an existing plan.
-- Applying a template to a client is NOT a raw copy — the exact same
-- safety filter and QA validator that runs on generation and manual edits
-- re-checks the template's exercises against the target client's actual
-- limitations and equipment before it's ever saved as a real plan. A
-- template built for one client can safely be applied to a different one;
-- anything unsafe for the new client gets caught by QA, same as any other
-- path through this app.

create table plan_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  workout_type text not null,
  weeks int not null default 4,
  days_per_week int not null default 3,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

alter table plan_templates enable row level security;

create policy "own plan templates" on plan_templates
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

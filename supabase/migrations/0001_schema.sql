-- TrainCraft schema · owned by Product/Systems Architect
-- Single-trainer today; trainer_id + RLS everywhere so multi-tenant is a config change later.

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────
create type difficulty as enum ('beginner', 'intermediate', 'advanced');
create type movement_pattern as enum (
  'squat', 'hinge', 'lunge',
  'push_horizontal', 'push_vertical',
  'pull_horizontal', 'pull_vertical',
  'core_antiextension', 'core_antirotation', 'core_flexion',
  'carry', 'conditioning', 'mobility'
);
create type plan_status as enum ('draft', 'final');
create type delivery_channel as enum ('email', 'sms', 'pdf');
create type delivery_status as enum ('queued', 'sent', 'failed');

-- ── Clients ──────────────────────────────────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,                          -- E.164 for SMS, e.g. +15125550100
  goals text,                          -- free text: "fat loss, first pull-up"
  training_history text,              -- background + trainer notes
  is_remote boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Injuries / limitations use a controlled tag vocabulary so the safety
-- engine can match deterministically. Tag list lives in src/lib/safety/rules.ts.
create table client_limitations (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  tag text not null,                   -- e.g. 'shoulder_impingement', 'low_back_pain'
  detail text,                         -- trainer's free-text context
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Equipment inventory (mainly for remote clients; gym clients can be
-- marked with the 'full_gym' pseudo-item).
create table client_equipment (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,                 -- "25 lb kettlebell"
  equipment_type text not null,        -- controlled: kettlebell, dumbbell, band, ...
  quantity int not null default 1,
  weight_lb numeric,                   -- null for bands/bodyweight items
  created_at timestamptz not null default now()
);

-- ── Exercise library ─────────────────────────────────────────────────────
-- Base library rows have trainer_id NULL (global). Custom rows carry the
-- trainer's id. Both are queried identically by the Workout Builder.
create table exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references auth.users(id) on delete cascade,  -- null = base library
  name text not null,
  description text not null,
  pattern movement_pattern not null,
  muscle_groups text[] not null,       -- ['glutes','hamstrings']
  equipment_types text[] not null,     -- ['kettlebell'] or ['bodyweight']
  difficulty difficulty not null default 'beginner',
  cues text,                           -- coaching cues, newline-separated
  contraindication_tags text[] not null default '{}',
    -- limitation tags this exercise conflicts with, e.g. '{shoulder_impingement}'
  unilateral boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index exercises_pattern_idx on exercises (pattern);
create index exercises_equipment_idx on exercises using gin (equipment_types);
create index exercises_contra_idx on exercises using gin (contraindication_tags);

-- ── Plans ────────────────────────────────────────────────────────────────
create table workout_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  workout_type text not null,          -- 'full_body_strength', 'upper', ...
  weeks int not null default 4,
  days_per_week int not null default 3,
  status plan_status not null default 'draft',
  -- Structured plan JSON produced by the Builder and validated by QA:
  -- { sessions: [{ day, focus, blocks: [{ exercise_id, name, sets, reps,
  --   load_note, rest_sec, coaching_note }] }],
  --   progression_notes, exclusions: [{ exercise_name, limitation_tag, reason }] }
  plan jsonb not null,
  qa_report jsonb,                     -- validator output stored for audit
  created_at timestamptz not null default now()
);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references workout_plans(id) on delete cascade,
  channel delivery_channel not null,
  destination text not null,           -- email addr or phone
  status delivery_status not null default 'queued',
  provider_id text,                    -- Resend/Twilio message id
  error text,
  created_at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table clients enable row level security;
alter table client_limitations enable row level security;
alter table client_equipment enable row level security;
alter table exercises enable row level security;
alter table workout_plans enable row level security;
alter table deliveries enable row level security;

create policy "own clients" on clients
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy "own limitations" on client_limitations
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy "own equipment" on client_equipment
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy "read base + own exercises" on exercises
  for select using (trainer_id is null or trainer_id = auth.uid());
create policy "write own exercises" on exercises
  for insert with check (trainer_id = auth.uid());
create policy "update own exercises" on exercises
  for update using (trainer_id = auth.uid());
create policy "own plans" on workout_plans
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());
create policy "own deliveries" on deliveries
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- updated_at trigger
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger clients_touch before update on clients
  for each row execute function touch_updated_at();

-- Per-trainer branding, so PDFs stop carrying a single hard-coded coach.
--
-- Two distinct layers of identity now exist and must not be conflated:
--   · PRODUCT branding — "CoachRhythm" — is the app itself. It is global,
--     lives in code, and is the same for every trainer.
--   · TRAINER branding — business name, coach name, credentials — belongs
--     to whoever is signed in, and is what a client actually sees on their
--     plan. That is what this table holds.
--
-- Every column is nullable: a trainer who never opens the settings screen
-- still gets working PDFs that fall back to CoachRhythm product branding
-- (see BRAND_FALLBACK in src/lib/brand.ts). Nothing here is required to
-- generate a plan.

create table trainer_profiles (
  trainer_id uuid primary key references auth.users(id) on delete cascade,
  business_name text,                  -- "Chad Kraus Fitness Coaching"
  coach_name text,                     -- "Chad Kraus" — the by-line on a plan
  credentials text,                    -- "CPT | PES | CNC | VCS"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trainer_profiles enable row level security;

-- A trainer reads and writes exactly one row: their own. Note this is
-- keyed on trainer_id as the PK, so the policy doubles as the guarantee
-- that nobody can create a second profile pointing at someone else.
create policy "own trainer profile" on trainer_profiles
  for all using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create trigger trainer_profiles_touch before update on trainer_profiles
  for each row execute function touch_updated_at();

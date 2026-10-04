-- Nutrition: client profiles, a closed food library, and meal plans.
--
-- The meal-plan design mirrors the exercise pipeline on purpose. The model
-- never writes a food: it chooses from `foods`, a closed library of whole or
-- minimally processed foods with USDA nutrient values, and every calorie and
-- gram on a plan is computed in code from those values. Allergen safety comes
-- from matching tagged foods against tagged allergies — something a keyword
-- scan of free-text recipes cannot do reliably.
--
-- Allergens use the nine FDA major allergens (FASTER Act). Array columns are
-- constrained to that vocabulary so an allergy spelled any other way cannot
-- be stored and then silently fail to match.

create table nutrition_profiles (
  client_id uuid primary key references clients(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'very')),
  goal text not null check (goal in ('lose', 'maintain', 'gain')),
  diet text not null default 'none' check (diet in ('none', 'vegetarian', 'vegan', 'pescatarian')),
  allergens text[] not null default '{}'
    check (allergens <@ array['milk','egg','fish','shellfish','tree_nut','peanut','wheat','soy','sesame']::text[]),
  gluten_free boolean not null default false,
  other_allergy boolean not null default false,
  severe_allergy boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table nutrition_profiles enable row level security;
create policy "own nutrition profiles" on nutrition_profiles
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (select 1 from clients c where c.id = nutrition_profiles.client_id and c.trainer_id = auth.uid())
  );
create trigger nutrition_profiles_touch before update on nutrition_profiles
  for each row execute function touch_updated_at();

-- Shared reference data. Nutrient values are per 100 g, from USDA FoodData
-- Central (SR Legacy), which is public domain; fdc_id records provenance.
create table foods (
  id uuid primary key default gen_random_uuid(),
  fdc_id int not null unique,
  name text not null,
  usda_description text not null,
  category text not null check (category in (
    'protein', 'legume', 'dairy', 'dairy_alternative', 'grain', 'starchy_vegetable',
    'vegetable', 'fruit', 'fat', 'sweetener'
  )),
  animal_class text not null check (animal_class in ('meat', 'fish', 'shellfish', 'animal_product', 'plant')),
  serving_g numeric(6,1) not null check (serving_g > 0),
  serving_desc text not null,
  max_serving_g numeric(6,1) not null check (max_serving_g >= serving_g),
  allergens text[] not null default '{}'
    check (allergens <@ array['milk','egg','fish','shellfish','tree_nut','peanut','wheat','soy','sesame']::text[]),
  contains_gluten boolean not null,
  kcal numeric(6,1) not null check (kcal >= 0),
  protein_g numeric(6,2) not null check (protein_g >= 0),
  fat_g numeric(6,2) not null check (fat_g >= 0),
  carbs_g numeric(6,2) not null check (carbs_g >= 0),
  fiber_g numeric(6,2),
  sodium_mg numeric(7,1),
  is_active boolean not null default true
);

alter table foods enable row level security;
-- Readable by any signed-in trainer; writable by no one through the API.
-- This is the list meal-plan safety is built on, so it only changes through
-- a reviewed migration.
create policy "read food library" on foods for select to authenticated using (true);

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  days int not null check (days between 1 and 7),
  meals_per_day int not null check (meals_per_day between 2 and 5),
  -- The targets the plan was built against, frozen at generation time so the
  -- QA verdict can be reproduced even after the client's profile changes.
  targets jsonb not null,
  plan jsonb not null,
  qa_report jsonb not null,
  status text not null check (status in ('final', 'draft')),
  created_at timestamptz not null default now()
);
create index meal_plans_client_idx on meal_plans (client_id, created_at desc);

alter table meal_plans enable row level security;
create policy "own meal plans" on meal_plans
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (select 1 from clients c where c.id = meal_plans.client_id and c.trainer_id = auth.uid())
  );

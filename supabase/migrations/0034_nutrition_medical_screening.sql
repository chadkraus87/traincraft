-- Medication and life-stage screening for nutrition.
--
-- The clinical review found two intake gaps that no amount of pipeline
-- correctness could close, because the app was never told the facts:
--
--   Medications. The food library holds foods with real drug interactions —
--   vitamin K against warfarin, potassium against ACE inhibitors and
--   potassium-sparing diuretics, aged cheese against MAOIs, calcium against
--   levothyroxine. A plan can be allergen-clean, hit its macros, pass every
--   check, and still put someone in hospital.
--
--   Pregnancy and lactation. These were visible only through the *exercise*
--   limitation tag pregnancy_2nd_3rd_trimester, so they were recorded only
--   when a trainer happened to think of it as an exercise limitation, and
--   only for the 2nd and 3rd trimesters. A first-trimester or lactating
--   client passed every nutrition gate and could be given a deficit.
--
-- All three columns are NULLABLE ON PURPOSE and have no default. A default
-- would answer an unasked question on behalf of every profile that predates
-- this migration. Null means "not asked", and the gate treats it the same as
-- a yes — the same fail-closed rule an unrecognised allergen or an
-- unclassified limitation tag already gets.
alter table nutrition_profiles
  add column life_stage text check (life_stage in ('none', 'pregnant', 'lactating')),
  add column medications text[]
    check (medications <@ array[
      'anticoagulant', 'maoi', 'insulin_or_sulfonylurea', 'potassium_affecting',
      'lithium', 'levothyroxine', 'immunosuppressant'
    ]::text[]),
  add column other_medication boolean;

comment on column nutrition_profiles.life_stage is
  'Null means the question has not been answered, which blocks deficits and meal plans.';
comment on column nutrition_profiles.medications is
  'Drug classes with known food interactions. Null means not asked; any entry blocks deficits and meal plans.';

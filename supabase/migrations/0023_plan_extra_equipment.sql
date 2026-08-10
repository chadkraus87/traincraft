-- Remember the ad-hoc equipment a plan was generated with.
--
-- The "consider additional equipment" toggle on the generate screen is
-- deliberately ephemeral: it widens the pool for one generation without
-- writing anything to the client's saved inventory. That was a reasonable
-- call — a trainer borrowing a barbell for one session shouldn't permanently
-- change the client's record.
--
-- But it left the resulting plan unreproducible. Re-validating it later sees
-- only the client's *saved* equipment, so every exercise that depended on the
-- borrowed gear falls outside the pool, pool_membership fails, and with it
-- every movement-pattern check. On a real plan here that surfaced as 25
-- exercises reported as "outside the safety-filtered pool" and all four
-- required patterns missing — on a plan that was correct when it was built.
--
-- That is the alarm-fatigue failure mode: a warning that fires on healthy
-- plans teaches trainers to dismiss warnings. Storing what the plan was
-- generated with makes re-validation ask the same question the generator
-- asked, instead of a stricter one.
--
-- Empty array rather than null so re-validation never has to special-case a
-- missing value; plans predating this column read as "no extra equipment",
-- which is the correct assumption for anything generated without the toggle.

alter table workout_plans
  add column extra_equipment_types text[] not null default '{}';

comment on column workout_plans.extra_equipment_types is
  'Ad-hoc equipment selected for this generation only, not saved to the client. Replayed when the plan is re-validated so a correct plan does not later appear to fail.';

-- Backfill plans that predate the column by reconstructing it from their own
-- contents. Every one of them passed QA when it was built, which means the
-- equipment its exercises require must have been available at the time. So
-- for each existing plan we take the equipment its programmed exercises
-- actually need, subtract what the client has saved, and record the
-- remainder as what must have been borrowed.
--
-- This is a reconstruction, not a record, and it has one honest limitation:
-- it cannot distinguish "the trainer used the extra-equipment toggle" from
-- "the client genuinely got rid of a barbell since." Both look identical
-- from here. It resolves in favour of not alarming, because the alternative
-- is every historical plan showing a permanent, unfixable safety warning —
-- and a warning that is always on is a warning trainers stop reading. Real
-- contraindication changes are unaffected; those are a different check.
--
-- Only ever widens by equipment the plan's own exercises call for, so it
-- cannot silently permit anything the plan didn't already contain.
with plan_equipment as (
  select p.id as plan_id,
         p.client_id,
         unnest(e.equipment_types) as equipment_type
  from workout_plans p
  cross join lateral jsonb_array_elements(p.plan -> 'sessions') as session
  cross join lateral jsonb_array_elements(session -> 'blocks') as block
  join exercises e
    -- Guard the cast: a plan may contain a fabricated non-UUID exercise_id
    -- from a failed generation, and this backfill must not error on one.
    on block ->> 'exercise_id' ~ '^[0-9a-fA-F-]{36}$'
   and e.id = (block ->> 'exercise_id')::uuid
),
borrowed as (
  select pe.plan_id, array_agg(distinct pe.equipment_type) as extras
  from plan_equipment pe
  where pe.equipment_type <> 'bodyweight'
    and not exists (
      select 1 from client_equipment ce
      where ce.client_id = pe.client_id
        and ce.equipment_type = pe.equipment_type
    )
  group by pe.plan_id
)
update workout_plans wp
   set extra_equipment_types = b.extras
  from borrowed b
 where wp.id = b.plan_id;

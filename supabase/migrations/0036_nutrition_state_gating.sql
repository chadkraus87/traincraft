-- Gate nutrition on where the trainer practises.
--
-- The pre-launch legal review's highest-ranked exposure: nutrition licensure
-- is not uniform across the US. Some states restrict nutrition assessment and
-- individualised dietary plans to licensed practitioners REGARDLESS of whether
-- the client has any medical condition; others protect only the titles
-- "dietitian" and "nutritionist" and leave the conduct open. CoachRhythm's
-- existing gates are drawn around medical nutrition therapy — the right line
-- in a title-protection state and the wrong line in an exclusive-licensure
-- one. And the app offered the feature identically to both, because it never
-- asked where the trainer practises.
--
-- Two columns and one table:
--
--   trainer_profiles.practice_state — where this trainer practises. Required
--     before any nutrition output. There is no sensible default.
--
--   trainer_profiles.nutrition_credential — the trainer attests they hold a
--     licence, registration or certification that permits them to provide
--     nutrition services in their state. A licensed dietitian is not the
--     person these statutes restrict, so this is a lawful route past the state
--     gate rather than a bypass of it. Self-reported and unverified, like the
--     other attestations; recorded with a date so there is a record of what was
--     claimed and when.
--
--   nutrition_state_policy — one row per state, carrying a posture that only a
--     lawyer should set, with room for the citation and who reviewed it.
--
-- EVERY STATE SHIPS AS 'unreviewed', AND 'unreviewed' BLOCKS. That is not an
-- oversight; it is the only honest starting position, because no attorney has
-- classified any of them yet. Nutrition is therefore unavailable to a trainer
-- without a credential attestation until counsel fills this table in. Flipping
-- a state to 'permitted' is a one-row migration, and it should carry the
-- citation and the reviewer's name in the same statement.

alter table trainer_profiles
  add column practice_state text check (practice_state ~ '^[A-Z]{2}$'),
  add column nutrition_credential boolean,
  add column nutrition_credential_attested_on date;

comment on column trainer_profiles.practice_state is
  'US state or territory where the trainer practises. Null blocks all nutrition output.';
comment on column trainer_profiles.nutrition_credential is
  'Trainer-attested licence/registration permitting nutrition services. Unverified.';

create table nutrition_state_policy (
  state text primary key check (state ~ '^[A-Z]{2}$'),
  -- permitted  — counsel has confirmed an unlicensed trainer may provide this
  -- restricted — counsel has confirmed they may not
  -- unreviewed — nobody has looked yet; treated as restricted
  posture text not null default 'unreviewed'
    check (posture in ('permitted', 'restricted', 'unreviewed')),
  note text,
  -- The statute or board guidance the posture rests on.
  source text,
  reviewed_by text,
  reviewed_on date
);

alter table nutrition_state_policy enable row level security;
-- Readable by any signed-in trainer so the UI can explain itself; writable by
-- no one through the API. Like the food library, this is something meal-plan
-- safety rests on, so it changes only through a reviewed migration.
create policy "read nutrition state policy" on nutrition_state_policy
  for select to authenticated using (true);

insert into nutrition_state_policy (state) values
  ('AL'),('AK'),('AZ'),('AR'),('CA'),('CO'),('CT'),('DE'),('DC'),('FL'),
  ('GA'),('HI'),('ID'),('IL'),('IN'),('IA'),('KS'),('KY'),('LA'),('ME'),
  ('MD'),('MA'),('MI'),('MN'),('MS'),('MO'),('MT'),('NE'),('NV'),('NH'),
  ('NJ'),('NM'),('NY'),('NC'),('ND'),('OH'),('OK'),('OR'),('PA'),('RI'),
  ('SC'),('SD'),('TN'),('TX'),('UT'),('VT'),('VA'),('WA'),('WV'),('WI'),
  ('WY'),('PR'),('VI'),('GU'),('AS'),('MP');

-- Progress over time: body measurements and check-ins.
--
-- The measurement chart has existed as a fillable PDF since launch, but
-- nothing it collected was ever stored, so there was no way to see a trend.
-- client_measurements mirrors the chart's fields exactly (circumferences in
-- inches, skinfolds in millimetres) so entering a completed chart is a
-- straight transcription.
--
-- Every value is optional — a trainer who only tracks weight shouldn't have
-- to fill in skinfolds — and range-checked, so a typo like 1800 lb fails
-- loudly instead of wrecking every chart built on the series.
--
-- Check-ins are structured 1–5 scores with no free text. Narrative about how
-- a client is doing already has a home in client_notes; a second free-text
-- field here would just be another place for health narrative to accumulate.
--
-- Unlike screenings, both tables are editable: these are working data, not
-- attestations, and a mistyped measurement should be fixable.

create table client_measurements (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  measured_on date not null default current_date,

  weight_lb numeric(5,1) check (weight_lb between 40 and 1000),
  body_fat_pct numeric(4,1) check (body_fat_pct between 2 and 75),
  resting_hr int check (resting_hr between 25 and 220),

  neck_in numeric(4,1) check (neck_in between 5 and 40),
  upper_arm_in numeric(4,1) check (upper_arm_in between 5 and 40),
  chest_in numeric(4,1) check (chest_in between 15 and 90),
  waist_in numeric(4,1) check (waist_in between 15 and 90),
  hip_in numeric(4,1) check (hip_in between 15 and 90),
  thigh_in numeric(4,1) check (thigh_in between 8 and 60),

  sf_biceps_mm numeric(4,1) check (sf_biceps_mm between 1 and 90),
  sf_triceps_mm numeric(4,1) check (sf_triceps_mm between 1 and 90),
  sf_chest_mm numeric(4,1) check (sf_chest_mm between 1 and 90),
  sf_subscapular_mm numeric(4,1) check (sf_subscapular_mm between 1 and 90),
  sf_abdomen_mm numeric(4,1) check (sf_abdomen_mm between 1 and 90),
  sf_iliac_crest_mm numeric(4,1) check (sf_iliac_crest_mm between 1 and 90),
  sf_thigh_mm numeric(4,1) check (sf_thigh_mm between 1 and 90),
  sf_calf_mm numeric(4,1) check (sf_calf_mm between 1 and 90),

  created_at timestamptz not null default now()
);
create index client_measurements_client_idx on client_measurements (client_id, measured_on);

create table client_checkins (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  checked_in_on date not null default current_date,
  energy smallint not null check (energy between 1 and 5),
  sleep_quality smallint not null check (sleep_quality between 1 and 5),
  soreness smallint not null check (soreness between 1 and 5),
  stress smallint not null check (stress between 1 and 5),
  adherence smallint not null check (adherence between 1 and 5),
  created_at timestamptz not null default now()
);
create index client_checkins_client_idx on client_checkins (client_id, checked_in_on);

alter table client_measurements enable row level security;
alter table client_checkins enable row level security;

create policy "own client measurements" on client_measurements
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (select 1 from clients c where c.id = client_measurements.client_id and c.trainer_id = auth.uid())
  );

create policy "own client checkins" on client_checkins
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (select 1 from clients c where c.id = client_checkins.client_id and c.trainer_id = auth.uid())
  );

-- Check-ins join the retention schedule at the same 24 months as workout
-- logs: both are session-level observations whose value decays. Measurements
-- are the progress history itself and are kept for the life of the client
-- record, like limitations.
create or replace function public.purge_expired_data()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.client_notes    where created_at     < now() - interval '18 months';
  delete from public.exercise_logs   where performed_at   < now() - interval '24 months';
  delete from public.client_checkins where checked_in_on  < current_date - interval '24 months';
  delete from public.deliveries      where created_at     < now() - interval '12 months';
  update public.generation_events
     set client_id = null
   where client_id is not null
     and created_at < now() - interval '90 days';
end;
$$;
revoke all on function public.purge_expired_data() from public, anon, authenticated;

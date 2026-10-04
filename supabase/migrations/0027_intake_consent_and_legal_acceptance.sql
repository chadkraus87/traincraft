-- Pre-participation screening, client consent, and trainer terms acceptance.
--
-- Three records that turn legal assumptions into evidence:
--
--   legal_acceptances — the trainer affirmatively accepted a specific version
--     of the Terms, Privacy Policy and DPA, and attested to being a fitness
--     professional who does not provide medical care. The HIPAA analysis rests
--     on that attestation; a signup form that never asked was assuming it.
--
--   client_screenings — pre-participation health screening modelled on the
--     ACSM screening algorithm (questions written in-house, not a copy of any
--     published form), plus the trainer's attestation that this client
--     consented to their health information being stored here and signed the
--     trainer's own waiver. The Terms push the consent obligation onto the
--     trainer; this is where that obligation becomes a timestamped fact.
--
--   clients.birth_year / height_in / sex_for_calculations — inputs the energy
--     equations need. Birth year rather than date of birth: the equations need
--     age in years, and a full DOB is a stronger identifier for no benefit.
--     Sex is labelled for what it is used for and nothing else.
--
-- Both audit tables are append-only: select and insert policies, no update or
-- delete. A consent record the recorded party can quietly edit is not a
-- record. A mistaken screening is corrected by screening again; the newest
-- row is the current one.

alter table clients
  add column birth_year int check (birth_year between 1900 and 2100),
  add column height_in numeric(4,1) check (height_in between 36 and 96),
  add column sex_for_calculations text check (sex_for_calculations in ('male', 'female'));

comment on column clients.sex_for_calculations is
  'Used only to select the sex-specific constant in energy expenditure equations.';

create table legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  dpa_version text not null,
  -- CHECK (true) on each attestation: the row cannot exist unless every
  -- statement was affirmed, so "accepted" can never mean "clicked past".
  attested_fitness_professional boolean not null check (attested_fitness_professional),
  attested_no_medical_services boolean not null check (attested_no_medical_services),
  attested_us_based boolean not null check (attested_us_based),
  attested_age_18 boolean not null check (attested_age_18),
  accepted_at timestamptz not null default now()
);
create index legal_acceptances_trainer_idx on legal_acceptances (trainer_id, accepted_at desc);

alter table legal_acceptances enable row level security;
create policy "read own acceptances" on legal_acceptances
  for select using (trainer_id = auth.uid());
create policy "record own acceptance" on legal_acceptances
  for insert with check (trainer_id = auth.uid());

create table client_screenings (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  screened_on date not null default current_date,

  -- ACSM pre-participation inputs
  currently_active boolean not null,
  known_cardiovascular_disease boolean not null,
  known_metabolic_disease boolean not null,
  known_renal_disease boolean not null,
  has_symptoms boolean not null,
  -- Nutrition gate. Asked once here rather than on a separate nutrition form
  -- so there is a single health intake, not two partial ones.
  eating_disorder_history boolean not null,

  consent_data_storage boolean not null check (consent_data_storage),
  waiver_signed boolean not null,
  -- Recorded by the trainer when a provider has cleared the client. The date
  -- only — the clearance letter itself stays with the trainer.
  clearance_obtained_on date,

  created_at timestamptz not null default now()
);
create index client_screenings_client_idx on client_screenings (client_id, created_at desc);

alter table client_screenings enable row level security;
create policy "read own screenings" on client_screenings
  for select using (trainer_id = auth.uid());
create policy "record own screenings" on client_screenings
  for insert with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_screenings.client_id and c.trainer_id = auth.uid()
    )
  );

-- Per-trainer generation quota.
--
-- /api/generate makes one or two Claude calls per request against a single
-- shared ANTHROPIC_API_KEY. With signup open to the public, an unbounded
-- endpoint means any account can loop it and spend the operator's budget
-- until generation stops working for paying trainers. There was no limit of
-- any kind.
--
-- A table rather than an in-memory counter because the app runs on
-- serverless functions: instances are recycled and requests fan out across
-- them, so process-local state cannot enforce a shared quota. This is a
-- deliberate trade of one indexed insert + one count per generation for a
-- limit that actually holds. If generation volume ever makes that count hot,
-- move it to Redis (Upstash) — the shape of the check stays the same.
--
-- Rows are an audit trail as well as a counter: they record what was asked
-- for, which is useful when a trainer reports a runaway bill or a support
-- question about a plan that failed.

create table generation_events (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  workout_type text,
  weeks int,
  days_per_week int,
  created_at timestamptz not null default now()
);

-- The quota query is always "this trainer, since this timestamp".
create index generation_events_trainer_time_idx
  on generation_events (trainer_id, created_at desc);

alter table generation_events enable row level security;

-- Readable by the owning trainer (so a usage screen can show their own
-- consumption) and insertable by them. Deliberately no update or delete
-- policy: a quota ledger a user can rewrite is not a quota, and RLS
-- default-denies any operation without a matching policy.
create policy "read own generation events" on generation_events
  for select using (trainer_id = auth.uid());
create policy "log own generation events" on generation_events
  for insert with check (trainer_id = auth.uid());

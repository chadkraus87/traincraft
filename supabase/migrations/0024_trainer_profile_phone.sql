-- Optional contact phone on the trainer profile.
--
-- Distinct from clients.phone, which is how a trainer reaches their client.
-- This is the trainer's own business number, for their branding block — some
-- coaches want it on the plan their client receives.
--
-- Free text rather than a formatted or validated column: trainers write
-- numbers as they'd want a client to read them, including extensions and
-- international formats, and this value is only ever displayed.

alter table trainer_profiles add column phone text;

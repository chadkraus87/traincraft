-- Replace the free-text limitation detail with a structured field.
--
-- `detail` was a bare text column next to an injury tag, prompted in the UI
-- with "Context (e.g. left side, flares with overhead work)". In practice a
-- field shaped like that collects clinical narrative — diagnoses, imaging
-- findings, medications, surgery dates, the name of the treating physician.
-- That is the single most sensitive category of data this application could
-- hold, and it is the category that most clearly triggers Washington's My
-- Health My Data Act and California's CMIA.
--
-- Nothing read it. filterForLimitations matches on the tag alone; the QA
-- validator never sees it; it is not in the generation prompt. It carried
-- the highest legal exposure in the schema in exchange for no function.
--
-- The genuinely useful part of "left side" is kept, as a constrained value
-- rather than prose. A trainer can still record which side is affected, and
-- cannot accidentally record that the client is on Percocet.
--
-- Safe to drop outright: zero rows in this table carry a detail value.
-- Verified before writing this migration rather than assumed. Were that not
-- true, this would need a migrate-then-drop, because dropping a column is
-- not a data-deletion strategy — it leaves the values in table history until
-- the next vacuum, and in any backup taken before it ran.

alter table client_limitations add column side text;

alter table client_limitations
  add constraint client_limitations_side_check
  check (side is null or side in ('left', 'right', 'bilateral'));

comment on column client_limitations.side is
  'Which side is affected, where that is meaningful. Deliberately constrained: this replaced a free-text field that collected clinical narrative the app never used.';

alter table client_limitations drop column detail;

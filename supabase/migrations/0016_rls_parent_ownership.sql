-- Tighten RLS so a child row cannot reference a parent the caller doesn't own.
--
-- Every policy written so far checks only `trainer_id = auth.uid()`. That
-- stops a trainer reading another trainer's rows, but it does NOT stop them
-- *writing* a row that points at someone else's client:
--
--   insert into client_limitations (trainer_id, client_id, tag)
--   values (auth.uid(), '<another trainer''s client id>', 'low_back_pain');
--
-- The trainer_id check passes — the row genuinely belongs to the caller. The
-- result is a row the victim can never see or delete, attached to their
-- client. Two things make that worse than untidy:
--
--   1. Several queries in the app scope by client_id alone and rely on RLS
--      to re-add the trainer filter. Generation reads limitations that way.
--   2. The success/failure of the insert is a reliable oracle for whether a
--      given UUID exists, letting someone enumerate another tenant's ids.
--
-- Adding the parent check makes ownership transitive: you may only attach a
-- row to a client you own, a plan you own, or an exercise you can see.
--
-- Policies are dropped and recreated rather than altered because Postgres
-- has no `alter policy ... add with check`. This is additive to the schema —
-- no existing migration is modified.

-- ── client_limitations ───────────────────────────────────────────────────
drop policy "own limitations" on client_limitations;
create policy "own limitations" on client_limitations
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_limitations.client_id and c.trainer_id = auth.uid()
    )
  );

-- ── client_equipment ─────────────────────────────────────────────────────
drop policy "own equipment" on client_equipment;
create policy "own equipment" on client_equipment
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_equipment.client_id and c.trainer_id = auth.uid()
    )
  );

-- ── workout_plans ────────────────────────────────────────────────────────
drop policy "own plans" on workout_plans;
create policy "own plans" on workout_plans
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = workout_plans.client_id and c.trainer_id = auth.uid()
    )
  );

-- ── deliveries ───────────────────────────────────────────────────────────
drop policy "own deliveries" on deliveries;
create policy "own deliveries" on deliveries
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from workout_plans p
      where p.id = deliveries.plan_id and p.trainer_id = auth.uid()
    )
  );

-- ── client_notes ─────────────────────────────────────────────────────────
drop policy "own client notes" on client_notes;
create policy "own client notes" on client_notes
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_notes.client_id and c.trainer_id = auth.uid()
    )
  );

-- ── client_goals ─────────────────────────────────────────────────────────
drop policy "own client goals" on client_goals;
create policy "own client goals" on client_goals
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = client_goals.client_id and c.trainer_id = auth.uid()
    )
  );

-- ── exercise_logs ────────────────────────────────────────────────────────
-- plan_id is nullable (a log can be recorded outside any plan), so that leg
-- is only enforced when a plan is actually referenced.
drop policy "own exercise logs" on exercise_logs;
create policy "own exercise logs" on exercise_logs
  for all
  using (trainer_id = auth.uid())
  with check (
    trainer_id = auth.uid()
    and exists (
      select 1 from clients c
      where c.id = exercise_logs.client_id and c.trainer_id = auth.uid()
    )
    and (
      exercise_logs.plan_id is null
      or exists (
        select 1 from workout_plans p
        where p.id = exercise_logs.plan_id and p.trainer_id = auth.uid()
      )
    )
  );

-- ── exercises: explicit UPDATE check + the missing DELETE policy ─────────
-- The UPDATE policy relied on Postgres's implicit "USING doubles as the
-- check" fallback. Correct, but by accident — state it outright so a future
-- edit can't quietly widen it.
drop policy "update own exercises" on exercises;
create policy "update own exercises" on exercises
  for update
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- There was no DELETE policy at all, so RLS default-denied every delete and
-- a trainer could not remove a custom exercise they had created themselves.
-- Scoped to owned rows, so the shared base library (trainer_id is null)
-- stays undeletable by anyone.
create policy "delete own exercises" on exercises
  for delete using (trainer_id = auth.uid());

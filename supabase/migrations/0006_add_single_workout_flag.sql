-- Distinguish single-session "Build a Workout" outputs from multi-week
-- "Build a Plan" outputs. Both reuse the same workout_plans table and
-- PlanJson shape (a single workout is just weeks=1, one session) — this
-- flag exists purely so the UI can label things correctly.

alter table workout_plans add column is_single_workout boolean not null default false;

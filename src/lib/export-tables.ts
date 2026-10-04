/**
 * Every tenant-scoped table that belongs in a trainer's export.
 *
 * The export backs a promise in the Privacy Policy ("download everything in
 * your account") and in the DPA, and it is the only route by which a client —
 * who has no account here — can actually receive a copy of the health data
 * held about them. It had drifted: eleven tables, including the entire health
 * screening and all nutrition data, had been added without being exported.
 *
 * tests/rls.test.ts proves this list covers every table carrying a trainer_id,
 * so adding a tenant table without deciding about it fails the suite rather
 * than silently shrinking what a trainer can take with them.
 */
export const EXPORT_TABLES = [
  "trainer_profiles",
  "clients",
  "client_limitations",
  "client_equipment",
  "client_goals",
  "client_notes",
  "client_screenings",
  "client_measurements",
  "client_checkins",
  "training_sessions",
  "nutrition_profiles",
  "meal_plans",
  "workout_plans",
  "plan_templates",
  "exercise_logs",
  "exercise_favorites",
  "deliveries",
  "legal_acceptances",
] as const;

/** Tenant-scoped tables deliberately left out, and why. */
export const EXPORT_EXCLUDED: Record<string, string> = {
  generation_events:
    "A usage and rate-limit ledger rather than client data. Its link to a client is removed after 90 days.",
  exercises:
    "The shared exercise library is identical for every deployment. A trainer's own custom exercises ARE exported, under custom_exercises.",
};

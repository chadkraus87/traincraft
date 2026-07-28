# TrainCraft — Client & Workout Management for Personal Trainers

![CI](https://github.com/chadkraus87/traincraft/actions/workflows/ci.yml/badge.svg)

Single-trainer app: manage clients (goals, injuries, home equipment), generate
safe AI workout plans or single workouts, and deliver them by PDF or your
device's own mail/share flow. The client never logs in — they receive plans.
Public signup is disabled; this app is built for one trainer's account, not
open registration.

## Stack
Next.js 15 (App Router, server actions) · Supabase (Postgres, Auth, RLS) ·
Claude (`claude-sonnet-4-6`) for programming · @react-pdf/renderer · Tailwind
· Barlow Condensed (Google Fonts).

Auth is email + password (Supabase Auth), signup disabled both in the app UI
and at the Supabase project level — the only account is the trainer's own.
No email or SMS credential is stored server-side anywhere in this app — a
deliberate choice since the repo is public and a server-held credential
would be a shared liability for anyone who forks and redeploys it.

## Safety architecture (the important part)
The LLM is never the last line of defense:

1. **Deterministic pre-filter** (`src/lib/safety/rules.ts`): client
   limitations (14-tag controlled vocabulary) + equipment inventory strip
   contraindicated and unavailable exercises from the pool before Claude
   sees anything.
2. **Constrained generation** (`src/lib/ai/builder.ts`): Claude programs
   only from the filtered pool, echoing exercise UUIDs, under the Advisor's
   progression and balance rules. Branches for multi-week plans vs. a
   single one-off workout.
3. **Deterministic QA** (`src/lib/ai/validate.ts`): pool membership,
   contraindication re-check, movement balance, pull:push ratio, volume
   sanity, progression + deload — all plain code. One automatic retry with
   failure feedback; still-failing plans save as flagged drafts with the
   full QA report visible, never silently "done."
4. Every exclusion is surfaced to the trainer *and* on the client's PDF
   with the clinical rationale ("Spotter's notes").
5. **Safety holds through manual editing.** The plan editor's
   add/swap-exercise picker only ever offers exercises already filtered for
   that client's limitations and equipment — and every save re-runs the
   full QA validator server-side against freshly queried data, never
   trusting anything from the browser.

## Features

- **Clients**: add, edit, delete. Per-client injuries/limitations (14-tag
  controlled vocabulary + free-text detail, can be marked resolved) and
  equipment inventory (25 equipment types across 5 groups).
- **Exercise library**: 400 exercises across 8 categories — Foundational
  strength, CrossFit, Functional movement, Hyrox, HIIT, Yoga, Mat Pilates,
  and Senior-specific — plus trainer-added custom exercises, all usable
  identically by the Workout Builder. Library UI groups exercises by
  category in collapsible sections (collapsed by default), filterable by
  category and movement pattern.
- **Build a Plan**: multi-week program generation (client, workout type,
  weeks, days/week, trainer notes, equipment toggle).
- **Build a Workout**: single one-off session generation for a client —
  same safety pipeline as Build a Plan, without the weeks/days setup.
  Reuses the same underlying plan infrastructure via an `is_single_workout`
  flag (forced server-side, never trusted from the client).
- **Plans/workouts**: view, edit, delete.
  - **Full manual editing**: swap, add, or remove any exercise; edit
    sets/reps/load/rest/coaching notes inline; add a custom exercise via
    the library (opens in a new tab); freeform trainer notes field.
  - **Editable QA review**: every automatic check (pass or fail) can carry
    a trainer note; failed checks can be dismissed with a reason; a
    "confirm reviewed" checkbox lets the trainer explicitly sign off,
    flipping the plan to final status. This only edits the review record —
    it can't change what's actually in the plan.
  - **"Consider additional equipment" toggle** on both generation flows:
    pick from all 25 equipment types (grouped, checkbox UI, hidden behind
    a toggle) for this one plan/workout only — never saved to the client's
    permanent equipment list.
- **Delivery**: PDF export always available. "Email to client" uses the
  Web Share API on mobile (hands the PDF to the OS share sheet — sent from
  whatever account the trainer is already using) with a desktop fallback
  that downloads the PDF and opens the default mail app with the client's
  address and a short message pre-filled. No server-side email credential
  is used or stored for this. A trainer-confirmed "mark as sent" logs to
  the existing `deliveries` table — explicitly self-attested, since the
  app has no way to detect whether a share-sheet or mailto send actually
  completed.
- **Progress tracking**: optional per-exercise logging (weight, reps, RPE,
  notes) right on the plan view. Recent logs feed back into future
  generations — the builder prompt includes a client's real recent
  performance so load suggestions are grounded in what actually happened
  last time, not a generic placeholder.
- **Training history**: per-client view grouping logged sets by exercise,
  with a best-effort trend indicator when weight is expressed numerically.
- **Trainer notes**: an ongoing per-client journal (nutrition, sleep,
  how they're feeling) separate from the one-time training-history field.
  Recent notes also feed into the generation prompt as context.
- **Plan templates**: save any multi-week plan's structure for reuse.
  Applying a template to a client — even a different one than it was
  built for — re-runs the full safety filter and QA validator against
  that client's real limitations and equipment; nothing unsafe carries
  over silently. No AI call, so it's instant and free.
- **"Needs a new plan" dashboard callout**: surfaces any client who
  hasn't had a new plan in 4+ weeks, computed from existing data, no new
  schema required.
- **Data export**: one-click JSON backup of everything a trainer owns —
  clients, plans, logs, notes, templates, custom exercises.
- **Dashboard**: QA-pass-rate ring, active client count, plans-built-this-
  week, recent plans list, ambient background artwork.

## Setup
1. Create a Supabase project. Run the migrations **in order**, as separate
   queries, in the SQL editor (or `supabase db push`):
   `0001_schema.sql` → `0002_seed_exercises.sql` →
   `0003_expand_exercise_library.sql` → `0004_add_exercise_category.sql` →
   `0005_isolation_and_cardio_machines.sql` →
   `0006_add_single_workout_flag.sql` →
   `0007_functional_and_conditioning_batch.sql` →
   `0008_ace_style_expansion.sql` → `0009_exercise_logs.sql` →
   `0010_client_notes.sql` → `0011_plan_templates.sql`.
2. In Supabase → Authentication → Sign In / Providers → Email:
   - Leave **Confirm email** off (account creation completes without a
     click-to-confirm step).
   - Turn **off** "Allow new users to sign up" once your trainer account
     exists — the app has no signup UI, but disabling it at the Supabase
     level closes the door to direct API calls too.
3. Copy `.env.example` → `.env.local` and fill in keys. Only two secrets
   are needed:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: from
     your Supabase project settings.
   - `ANTHROPIC_API_KEY`: from console.anthropic.com, with billing enabled.

   Nothing else is required — no email provider, no SMS provider. Plan
   delivery happens entirely on the trainer's own device.
4. `npm install && npm run dev`

## SMS delivery (removed)
Text delivery was built and worked, but was removed to avoid the recurring
cost of a Twilio phone number and the multi-week A2P 10DLC carrier
registration wait. To bring it back: restore the Twilio branch from git
history, add the Twilio env vars, and restore the "Text to client" button
in `src/components/DeliverButtons.tsx`.

## Tests
- `npm run check:migrations` — verifies supabase/migrations/ has no
  numbering gaps. Self-updating: doesn't hardcode which files should
  exist, just checks the sequence from 0001 to the highest number present
  is complete. Catches migrations that were run directly in Supabase's
  SQL Editor but never committed to git — this has happened twice on this
  project already. Runs first in CI, before the slower database test, so
  a gap fails fast and cheap.
- `npm test` — safety engine + QA validator unit tests, PDF render with
  content verification, builder pool-guard, and an audit that every
  contraindication tag used across all exercise-seed migrations is
  actually enforced by a rule. Runs in CI on every push.
- `npm run test:db` — applies all migrations to an embedded real
  Postgres instance (auth schema stubbed) and verifies seed integrity,
  category coverage, and RLS coverage. Runs in CI on every push.
- `npm run test:e2e` — real browser end-to-end test (Playwright) covering
  the actual user path: sign in, generate a plan against the real safety
  pipeline and real Claude API, edit it, confirm QA review, verify the PDF
  link. **Not run in CI** — it needs real Supabase + Anthropic credentials
  and a real signed-in test account, which would mean putting live
  credentials in GitHub Actions secrets. Run it locally against your dev
  environment:
  ```
  E2E_EMAIL=you@example.com E2E_PASSWORD=yourpassword npm run test:e2e
  ```
  It creates a clearly-named throwaway client ("E2E Test Client …") and a
  real plan (using real Anthropic credit), then deletes both at the end.
  If it fails partway through, check for leftover "E2E Test Client"
  entries and delete manually. Wiring this into CI would require a
  dedicated test Supabase project so it never touches real data — a
  reasonable next step, not done here to avoid needing a second Supabase
  project just for testing.
- Ad hoc verification scripts (not part of `npm test`, run manually when
  adding large exercise batches): a real-database duplicate-name check
  across the full library, and an equipment-coverage audit confirming
  every equipment type used in exercise data is available in the picker
  and vice versa.

## Directory map
- `supabase/migrations/` — schema, seed library (400 exercises across 5
  migrations), category column, single-workout flag
- `src/lib/safety/rules.ts` — Advisor's ruleset: limitation vocabulary,
  contraindication map, exercise categories, equipment types/groups
  (including the `equipmentLabel()` helper for display names like
  "suspension (TRX)"), balance + progression rules
- `src/lib/ai/` — builder (Claude, branches for plan vs. single workout) +
  QA validator
- `src/app/api/generate` — orchestration: filter → generate → QA → retry
  → persist, for both plans and single workouts
- `src/app/api/plans/[id]/pdf` — PDF export
- `src/components/DeliverButtons.tsx` — client-side share/mailto delivery
- `src/components/PlanEditor.tsx` — manual plan editing with re-validation
- `src/components/QaReportEditor.tsx` — editable QA review workflow
- `src/components/GenerateForm.tsx` / `BuildWorkoutForm.tsx` — the two
  generation entry points
- `src/app/{clients,exercises,plans,workouts}` — trainer UI
- `src/middleware.ts` — refreshes the Supabase session cookie on every
  request

See `docs/DECISIONS.md` for open-decision answers, assumptions, and known
limits.

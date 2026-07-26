# TrainCraft — Client & Workout Management for Personal Trainers

Single-trainer app: manage clients (goals, injuries, home equipment), generate
safe AI workout plans, and deliver them by PDF or your device's own mail/share
flow. The client never logs in — they receive plans. Public signup is
disabled; this app is built for one trainer's account, not open registration.

## Stack
Next.js 15 (App Router, server actions) · Supabase (Postgres, Auth, RLS) ·
Claude (`claude-sonnet-4-6`) for programming · @react-pdf/renderer · Tailwind
· Barlow Condensed (Google Fonts).

Auth is email + password (Supabase Auth), signup disabled both in the app UI
and at the Supabase project level — the only account is the trainer's own.
No email or SMS credential is stored server-side anywhere in this app (see
Delivery, below) — a deliberate choice since the repo is public and a
server-held credential would be a shared liability for anyone who forks and
redeploys it.

## Safety architecture (the important part)
The LLM is never the last line of defense:

1. **Deterministic pre-filter** (`src/lib/safety/rules.ts`): client
   limitations (controlled tag vocabulary) + equipment inventory strip
   contraindicated and unavailable exercises from the pool before Claude
   sees anything.
2. **Constrained generation** (`src/lib/ai/builder.ts`): Claude programs
   only from the filtered pool, echoing exercise UUIDs, under the Advisor's
   progression and balance rules.
3. **Deterministic QA** (`src/lib/ai/validate.ts`): pool membership,
   contraindication re-check, movement balance, pull:push ratio, volume
   sanity, progression + deload — all plain code. One automatic retry with
   failure feedback; still-failing plans save as flagged drafts with the
   full QA report visible, never silently "done."
4. Every exclusion is surfaced to the trainer *and* on the client's PDF
   with the clinical rationale ("Spotter's notes").
5. **Safety holds even through manual editing.** The plan editor's
   add/swap-exercise picker only ever offers exercises already filtered for
   that client's limitations and equipment — and every save re-runs the
   full QA validator server-side against freshly queried data, never
   trusting anything from the browser. A manual edit that breaks movement
   balance or reintroduces a contraindicated exercise gets caught exactly
   like a bad AI generation would.

## Features

- **Clients**: add, edit, delete. Per-client injuries/limitations (14-tag
  controlled vocabulary + free-text detail, can be marked resolved) and
  equipment inventory (23 equipment types across 5 groups).
- **Exercise library**: 120 exercises across 8 categories — Foundational
  strength, CrossFit, Functional movement, Hyrox, HIIT, Yoga, Mat Pilates,
  and Senior-specific — plus trainer-added custom exercises, all usable
  identically by the Workout Builder. Library UI groups exercises by
  category in collapsible sections, filterable by category and movement
  pattern.
- **Plans**: generate, view, edit, delete.
  - **Full manual editing**: swap, add, or remove any exercise from a
    generated plan; edit sets/reps/load/rest/coaching notes inline; add a
    custom exercise via the library (opens in a new tab); freeform trainer
    notes field on every plan.
  - **Editable QA review**: every automatic check (pass or fail) can carry
    a trainer note; failed checks can be dismissed with a reason; a
    "confirm reviewed" checkbox lets the trainer explicitly sign off,
    which flips the plan to final status. This only edits the review
    record — it can't change what's actually in the plan, so it can't be
    used to paper over a real safety problem.
  - **"Consider additional equipment" toggle** on generation: pick from
    all 23 equipment types (grouped, checkbox UI) for this one plan only —
    never saved to the client's permanent equipment list.
- **Delivery**: PDF export always available. "Email to client" uses the
  Web Share API on mobile (hands the PDF to the OS share sheet — Mail,
  Gmail, Messages, etc., sent from whatever account the trainer is
  already using on their device) with a desktop fallback that downloads
  the PDF and opens the default mail app with the client's address and a
  short message pre-filled. No server-side email credential is used or
  stored for this — see Setup, below.
- **Dashboard**: QA-pass-rate ring, active client count, plans-built-this-week,
  recent plans list.

## Setup
1. Create a Supabase project. Run the migrations in order in the SQL editor
   (or `supabase db push`): `0001_schema.sql`, `0002_seed_exercises.sql`,
   `0003_expand_exercise_library.sql`, `0004_add_exercise_category.sql`,
   `0005_isolation_and_cardio_machines.sql`.
2. In Supabase → Authentication → Sign In / Providers → Email:
   - Leave **Confirm email** off (account creation completes without a
     click-to-confirm step).
   - Turn **off** "Allow new users to sign up" once your one trainer
     account exists — this app has no signup UI left, but disabling it at
     the Supabase level closes the door even to direct API calls.
3. Copy `.env.example` → `.env.local` and fill in keys. Only two secrets
   are needed:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: from
     your Supabase project settings.
   - `ANTHROPIC_API_KEY`: from console.anthropic.com, with billing enabled.

   Nothing else is required — no email provider, no SMS provider. Plan
   delivery happens entirely on the trainer's own device (see Features).
4. `npm install && npm run dev`

## SMS delivery (removed)
Text delivery was built and worked, but was removed to avoid the recurring
cost of a Twilio phone number (~$1.15/mo) and the multi-week A2P 10DLC
carrier registration wait. To bring it back: restore the Twilio branch from
git history, add `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` /
`TWILIO_FROM_NUMBER`, and restore the "Text to client" button in
`src/components/DeliverButtons.tsx`.

## Tests
- `npm test` — safety engine + QA validator unit tests, PDF render with
  content verification, builder pool-guard, and an audit that every
  contraindication tag used in the seed data is actually enforced by a
  rule (across all exercise-seed migrations, not just the original batch).
- `npm run test:db` — applies all five migrations to an embedded real
  Postgres instance (auth schema stubbed) and verifies seed integrity,
  category coverage, and RLS coverage.

## Directory map
- `supabase/migrations/` — schema, seed library (120 exercises across 5
  migrations), category column
- `src/lib/safety/rules.ts` — Advisor's ruleset: limitation vocabulary,
  contraindication map, exercise categories, equipment types/groups,
  balance + progression rules
- `src/lib/ai/` — builder (Claude) + QA validator
- `src/app/api/generate` — orchestration: filter → generate → QA → retry
  → persist
- `src/app/api/plans/[id]/pdf` — PDF export
- `src/components/DeliverButtons.tsx` — client-side share/mailto delivery
- `src/components/PlanEditor.tsx` — manual plan editing with re-validation
- `src/components/QaReportEditor.tsx` — editable QA review workflow
- `src/app/{clients,exercises,plans}` — trainer UI
- `src/middleware.ts` — refreshes the Supabase session cookie on every
  request

See `docs/DECISIONS.md` for open-decision answers, assumptions, and known
limits.

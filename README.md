# TrainCraft — Client & Workout Management for Personal Trainers

Single-trainer app: manage clients (goals, injuries, home equipment), generate
safe AI workout plans, and deliver them by PDF or email. The client never
logs in — they receive plans.

## Stack
Next.js 15 (App Router, server actions) · Supabase (Postgres, Auth, RLS) ·
Claude (`claude-sonnet-4-6`) for programming · @react-pdf/renderer · Gmail
SMTP via nodemailer (email) · Tailwind.

Auth is email + password (Supabase Auth), not magic links — password auth
proved more reliable in practice and avoids email-deliverability edge cases
around redirect links.

## Safety architecture (the important part)
The LLM is never the last line of defense:

1. **Deterministic pre-filter** (`src/lib/safety/rules.ts`): client limitations
   (controlled tag vocabulary) + equipment inventory strip contraindicated and
   unavailable exercises from the pool **before** Claude sees anything.
2. **Constrained generation** (`src/lib/ai/builder.ts`): Claude programs only
   from the filtered pool, echoing exercise UUIDs, under the Advisor's
   progression and balance rules.
3. **Deterministic QA** (`src/lib/ai/validate.ts`): pool membership,
   contraindication re-check, movement balance, pull:push ratio, volume sanity,
   progression + deload — all plain code. One automatic retry with failure
   feedback; still-failing plans save as flagged **drafts** with the full QA
   report visible, never silently "done."
4. Every exclusion is surfaced to the trainer *and* on the client's PDF with
   the clinical rationale ("Spotter's notes").

## Features
- **Clients**: add, edit, delete. Per-client injuries/limitations (controlled
  vocabulary + free-text detail, can be marked resolved) and equipment
  inventory.
- **Exercise library**: 46-exercise base library plus trainer-added custom
  exercises, both usable identically by the Workout Builder.
- **Plans**: generate, view, delete. PDF export, email delivery to the
  client's address on file.

## Setup
1. Create a Supabase project. Run `supabase/migrations/0001_schema.sql` then
   `0002_seed_exercises.sql` in the SQL editor (or `supabase db push`).
2. In Supabase → Authentication → Sign In / Providers → Email: leave
   **Confirm email** off so account creation completes without a click-to-
   confirm step (the app relies on this).
3. Copy `.env.example` → `.env.local` and fill in keys.
   - `ANTHROPIC_API_KEY`: from console.anthropic.com, with billing enabled.
   - `GMAIL_USER` / `GMAIL_APP_PASSWORD`: a Google **App Password**, not your
     regular password. Requires 2-Step Verification enabled on the account.
     Generate at myaccount.google.com/apppasswords. Gmail's free-tier sending
     cap is 500/day — far more than one trainer needs.
4. `npm install && npm run dev`

## SMS delivery (currently removed)
Text delivery was built and worked, but was removed to avoid the recurring
cost of a Twilio phone number (~$1.15/mo) and the multi-week A2P 10DLC
carrier registration wait. To bring it back: restore the Twilio branch from
git history (see the "Remove SMS delivery option" commit), add
`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER`, and restore
the "Text to client" button in `src/components/DeliverButtons.tsx`.

## Tests
- `npm test` — safety engine + QA validator unit tests, PDF render with
  content verification, builder pool-guard.
- `npm run test:db` — applies both migrations to an embedded real Postgres
  (auth schema stubbed) and verifies seed integrity + RLS coverage.

## Directory map
- `supabase/migrations/` — schema + 46-exercise seed library (built from scratch)
- `src/lib/safety/rules.ts` — Advisor's ruleset: limitation vocab, contraindication map, balance + progression rules
- `src/lib/ai/` — builder (Claude) + QA validator
- `src/lib/email.ts` — Gmail SMTP mailer
- `src/app/api/generate` — orchestration: filter → generate → QA → retry → persist
- `src/app/api/plans/[id]/{pdf,deliver}` — export + delivery
- `src/app/{clients,exercises,plans}` — trainer UI
- `src/middleware.ts` — refreshes the Supabase session cookie on every request

See `docs/DECISIONS.md` for open-decision answers, assumptions, and known limits.

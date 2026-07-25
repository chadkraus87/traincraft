# TrainCraft — Client & Workout Management for Personal Trainers

Single-trainer app: manage clients (goals, injuries, home equipment), generate
safe AI workout plans, and deliver them by PDF, email, or SMS. The client never
logs in — they receive plans.

## Stack
Next.js 15 (App Router, server actions) · Supabase (Postgres, Auth, RLS) ·
Claude (`claude-sonnet-4-6`) for programming · @react-pdf/renderer · Resend
(email) · Twilio (SMS) · Tailwind.

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

## Setup
1. Create a Supabase project. Run `supabase/migrations/0001_schema.sql` then
   `0002_seed_exercises.sql` in the SQL editor (or `supabase db push`).
2. Enable Email (magic link) auth in Supabase. Sign up once — that account is
   the trainer.
3. Copy `.env.example` → `.env.local` and fill in keys.
   - Resend: verify a sending domain, free tier covers 3k emails/mo.
   - Twilio: buy a number and complete **A2P 10DLC registration** (required
     for US SMS; console task, ~$4/mo + ~$0.008/msg).
4. `npm install && npm run dev`

## Tests
- `npm test` — safety engine + QA validator unit tests (19 checks), PDF render
  with content verification, builder pool-guard.
- `npm run test:db` — applies both migrations to an embedded real Postgres
  (auth schema stubbed) and verifies seed integrity + RLS coverage.
Live-credential paths (Claude generation, Resend, Twilio, Supabase auth) need
real keys — exercise them once after setup with a test client.

## Directory map
- `supabase/migrations/` — schema + 46-exercise seed library (built from scratch)
- `src/lib/safety/rules.ts` — Advisor's ruleset: limitation vocab, contraindication map, balance + progression rules
- `src/lib/ai/` — builder (Claude) + QA validator
- `src/app/api/generate` — orchestration: filter → generate → QA → retry → persist
- `src/app/api/plans/[id]/{pdf,deliver}` — export + delivery
- `src/app/{clients,exercises,plans}` — trainer UI

See `docs/DECISIONS.md` for open-decision answers, assumptions, and known limits.

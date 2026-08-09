# CLAUDE.md — TrainCraft

## What this project is
A programming assistant for personal trainers. Turns a client intake — injuries,
available equipment, goals — into a complete training plan, filtered against
contraindications and QA-checked before the trainer sees it.

- Repo: github.com/chadkraus87/traincraft (public)
- Live: https://traincraft-psi.vercel.app

## Architecture
- Next.js 15 (App Router) + TypeScript, Tailwind.
- `src/app/` — routes, layouts, server actions. `src/components/` — UI.
  `src/lib/` — Supabase clients, Claude API calls, domain logic.
- `src/middleware.ts` — auth/session handling. Touch carefully; it runs on every
  request.
- `supabase/migrations/` — 14 versioned migrations. **Never edit an applied
  migration; add a new one.** `npm run check:migrations` guards this.
- **Plan generation (synchronous today):** `POST /api/generate`
  (`src/app/api/generate/route.ts`) runs the full pipeline in a single HTTP
  request. The route sets `export const maxDuration = 120` (Vercel serverless
  budget). Flow: load client, limitations, equipment, and exercise pool →
  deterministic pre-filter (`src/lib/safety/rules.ts`) → synchronous Claude
  generation (`src/lib/ai/builder.ts`) → deterministic QA
  (`src/lib/ai/validate.ts`) → at most one in-request QA retry (a second
  Claude call with QA failure feedback if the first attempt fails QA) → insert
  into `workout_plans`. `status` is `final` when QA passes, `draft` when it
  still fails; the full `qa_report` is stored either way. The trainer UI
  (`GenerateForm`, `BuildWorkoutForm`) blocks on this response—there is no job
  queue or generation-status polling in the app today.

## Non-negotiable rules
1. **Contraindication filtering is a safety feature, not a nicety.** Exercises
   are screened against each client's logged injuries before a plan is produced.
   Never bypass or short-circuit that filter to make generation faster or to get
   a test passing — a wrong plan can injure a real person.
2. **The automated QA pass gates delivery.** Plans clear QA before a trainer sees
   them. Keep that ordering; don't surface unvalidated output.
3. **Preserve the generation safety pipeline.** New or refactored generation
   code must keep the same ordering: pre-filter → Claude programs only from the
   filtered pool → QA → persist. Do not add a second path that skips filtering
   or QA to go faster or simplify tests. If production timeouts, concurrent
   generation, or multi-tenant load make the synchronous route untenable,
   reconsider durable background jobs (e.g. Inngest)—a plausible future
   direction, not implemented in this repository.
4. **RLS in the database, not checks in the client.** Trainer/client data is
   scoped in Postgres policies.
5. **Never commit keys.** `ANTHROPIC_API_KEY` and the Supabase service-role key
   live in Vercel env vars only. The Supabase anon key is public by design and
   fine.

## Commands
```bash
npm run dev
npm run lint
npm run test              # unit
npm run test:db           # database/RLS tests
npm run test:e2e          # Playwright
npm run check:migrations  # verifies migrations are append-only
# CLAUDE.md — CoachRhythm

## What this project is
A programming assistant for personal trainers. Turns a client intake — injuries,
available equipment, goals — into a complete training plan, filtered against
contraindications and QA-checked before the trainer sees it.

- Repo: github.com/chadkraus87/traincraft (public) — repo name still says
  traincraft; the product is CoachRhythm.
- Live: https://traincraft-psi.vercel.app

## Branding has two layers — don't conflate them
- **Product** branding is CoachRhythm. Global, lives in `src/lib/brand.ts`,
  appears on anything the product authors (measurement chart, app chrome).
- **Trainer** branding is whoever is signed in: business name, coach name,
  credentials, from `trainer_profiles` via `src/lib/brand-server.ts`. This is
  what a *client* sees on their plan. Never hard-code a coach's name.

## Multi-tenant
Public signup is open. Every table is scoped by `trainer_id` with RLS, and
`tests/rls.test.ts` proves two-tenant isolation against a real Postgres as a
non-superuser. Auth is enforced in `src/middleware.ts` (allowlist of public
paths) *and* per-page via `requireUser()` — RLS is the second layer, not the
only one.

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
   **Fail closed, always.** An unrecognized limitation tag or an exercise with
   no equipment listed must block or exclude, never pass through. The worst bug
   this codebase has had was `if (!rule) continue` — an unknown tag was skipped,
   so a client got a totally unfiltered plan while the QA re-check, sharing the
   same skip, reported it clean. Both layers failed silently together.
   **A rule is only as good as its tag coverage.** `tests/coverage.test.ts`
   enforces a per-limitation exclusion floor, fails on any rule tag that matches
   zero exercises, and asserts that indicated movement families survive their
   own limitation. Over-tagging is not free caution: excluding the movements a
   condition is rehabilitated with is its own harm, and a limitation that makes
   every plan fail QA teaches trainers to ignore the warning.
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
npm run test              # unit: safety engine, QA validator, PDFs
npm run test:db           # schema + two-tenant RLS isolation + tag coverage
npm run test:e2e          # Playwright
npm run check:migrations  # verifies migrations are append-only
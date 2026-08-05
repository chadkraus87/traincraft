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
- Plan generation runs **asynchronously through Inngest** so long Claude API jobs
  retry cleanly instead of dying to a serverless timeout.

## Non-negotiable rules
1. **Contraindication filtering is a safety feature, not a nicety.** Exercises
   are screened against each client's logged injuries before a plan is produced.
   Never bypass or short-circuit that filter to make generation faster or to get
   a test passing — a wrong plan can injure a real person.
2. **The automated QA pass gates delivery.** Plans clear QA before a trainer sees
   them. Keep that ordering; don't surface unvalidated output.
3. **Long AI work goes through Inngest, never inline in a request handler.**
   Claude plan generation exceeds serverless request budgets. If you add a new
   generation path, make it a job.
4. **RLS in the database, not checks in the client.** Trainer/client data is
   scoped in Postgres policies.
5. **Never commit keys.** `ANTHROPIC_API_KEY`, Supabase service-role, and Inngest
   signing keys live in Vercel env vars only. The Supabase anon key is public by
   design and fine.

## Commands
```
npm run dev
npm run lint
npm run test              # unit
npm run test:db           # database/RLS tests
npm run test:e2e          # Playwright
npm run check:migrations  # verifies migrations are append-only
```
Run `lint` and `test` before committing. Run `test:db` after touching any policy
or migration, and `check:migrations` before pushing schema changes.

## Gotchas
- App Router server/client component boundaries: anything importing the Supabase
  service client must stay server-side.
- Inngest jobs need the dev server running to be exercised locally.

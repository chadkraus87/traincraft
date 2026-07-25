# Decisions, Assumptions, and Known Limits

## Answers to the open decisions
| Decision | Answer | Implementation |
|---|---|---|
| Multi-tenant vs single-trainer | Single trainer | Every table still carries `trainer_id` + RLS policies, so multi-tenant later = onboarding flow, zero schema change. |
| Client logins | Recipients only | No client auth surface. Plans reach clients as PDF or email. |
| Base library | Built from scratch | 46 exercises seeded via migration, every one tagged with movement pattern + contraindication tags from the controlled vocabulary. |
| Trainer auth method | Email + password | Started as Supabase magic links; switched to password auth after repeated redirect/session issues in practice. Requires `src/middleware.ts` to keep the session cookie refreshed on every request. |
| Email provider | Gmail SMTP (via the trainer's own account) | Originally built on Resend, which requires verifying a real domain to email anyone other than yourself. The trainer preferred sending from his existing Gmail address over buying a domain, so delivery was rewritten onto Gmail SMTP with a Google App Password (`src/lib/email.ts`). Caps at 500 emails/day — a non-issue at this scale. |
| SMS provider | Removed | Twilio was built, worked, and was then removed by trainer choice to avoid the ~$1.15/mo phone number cost and the multi-week carrier (A2P 10DLC) registration wait. See README for how to restore it. |

## Assumptions made
- Trainer = the single Supabase auth user; email+password sign-in, no
  magic links.
- "Full gym" is modeled as a pseudo-equipment item so in-person clients don't
  need itemized inventories.
- Limitations use a fixed 14-tag clinical vocabulary rather than free text, so
  the contraindication engine is deterministic. Free-text detail is stored
  alongside for the trainer's context and passed to the model.
- Plans generate one template week + written week-over-week progression, not
  N fully-materialized weeks (cheaper, and matches how coaches actually write
  blocks). Materializing per-week loads is a v2 item.
- Exclusion = "don't auto-program"; trainers can still hand-build anything.
  The tool advises, the trainer decides.

## Agent handoffs (as executed)
1. **Architect** → schema, RLS, pipeline shape (filter → LLM → QA → persist).
2. **Exercise Science Advisor** → `rules.ts`: limitation vocabulary,
   contraindication map with rationales + substitutes, balance rules per
   workout type, progression defaults.
3. **Backend** → encoded the ruleset into builder + validator + routes;
   the LLM only ever sees a pre-cleaned pool.
4. **Frontend** → trainer UI; exclusions surfaced as amber "Spotter's notes."
5. **QA** → typecheck + production build pass; smoke test of the safety engine
   caught and fixed a real defect (Landmine Press wrongly excluded for
   shoulder impingement) before ship.

## Post-launch changes (real-world troubleshooting during rollout)
- Magic-link auth was replaced with email+password after repeated sign-in
  failures traced to a missing session-refresh middleware and Supabase's
  built-in email rate limits.
- Client edit and delete were added (not in original scope).
- Plan delete was added (not in original scope).
- Email delivery was rewritten from Resend to Gmail SMTP (trainer preference,
  avoids domain purchase — see table above).
- SMS delivery was built, verified working, then removed by trainer choice
  to avoid recurring cost before real client volume justified it.

## Known limits / v2 backlog
- No plan editing UI (regenerate with trainer notes instead). Add inline
  block editing + swap-exercise picker.
- Loads are prescriptive text ("25 lb KB", "RPE 7"), not computed from the
  client's tracked lifts. Add per-exercise load history.
- Custom exercises trust the trainer's safety tagging; a Claude-assisted
  "suggest tags" step would reduce missed contraindications.
- Deliveries are synchronous; fine at one-trainer scale, queue them if this
  goes multi-tenant.
- The contraindication map is conservative programming heuristics, not
  medical clearance — stated in-app and on the PDF footer.
- SMS delivery is fully removed, not just disabled; restoring it means
  re-adding the Twilio branch, not flipping a flag.

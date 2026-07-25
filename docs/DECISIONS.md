# Decisions, Assumptions, and Known Limits

## Answers to the open decisions
| Decision | Answer | Implementation |
|---|---|---|
| Multi-tenant vs single-trainer | Single trainer | Every table still carries `trainer_id` + RLS policies, so multi-tenant later = onboarding flow, zero schema change. |
| Client logins | Recipients only | No client auth surface. Plans reach clients as PDF / email / SMS. |
| Base library | Built from scratch | 46 exercises seeded via migration, every one tagged with movement pattern + contraindication tags from the controlled vocabulary. |
| Email/SMS provider | **Resend** (email), **Twilio** (SMS) | Resend: cheapest + simplest (free 3k/mo, one API call, native attachments). Twilio SMS: ~$0.008/msg; cheapest *reliable* US option. SMS sends a summary + "full plan in your email" since MMS/attachment costs aren't worth it for v1. |

## Assumptions made
- Trainer = the single Supabase auth user; magic-link sign-in.
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
   shoulder impingement by an over-broad pattern rule — now tag-based).

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

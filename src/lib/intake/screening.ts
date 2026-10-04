/**
 * Pre-participation screening → can this client be programmed?
 *
 * Follows the structure of the ACSM pre-participation screening algorithm:
 * current activity, known cardiovascular/metabolic/renal disease, and signs
 * or symptoms decide whether medical clearance comes first. Questions are
 * written in-house; no published form is reproduced.
 *
 * This is a gate, and like the contraindication filter it fails closed: no
 * screening, a stale screening, missing consent, or a clearance that hasn't
 * been recorded all block programming. The trainer can always resolve it —
 * screen the client, record the clearance — but the software won't generate
 * a plan for someone it has no basis to believe is safe to exercise.
 */

export interface ScreeningRow {
  screened_on: string; // YYYY-MM-DD
  currently_active: boolean;
  known_cardiovascular_disease: boolean;
  known_metabolic_disease: boolean;
  known_renal_disease: boolean;
  has_symptoms: boolean;
  eating_disorder_history: boolean;
  consent_data_storage: boolean;
  waiver_signed: boolean;
  clearance_obtained_on: string | null;
}

export type ClearanceNeed = "not_needed" | "recommended" | "required_before_exercise";

/** Re-screening interval. ACSM treats clearance as valid for 12 months. */
const SCREENING_VALID_DAYS = 365;

export function clearanceNeed(s: ScreeningRow): ClearanceNeed {
  // Symptoms suggestive of disease: stop and get clearance, whether or not
  // the client is currently active. The strictest branch of the algorithm.
  if (s.has_symptoms) return "required_before_exercise";
  const knownDisease =
    s.known_cardiovascular_disease || s.known_metabolic_disease || s.known_renal_disease;
  // ponytail: ACSM lets an active, asymptomatic client with known disease
  // continue moderate work and only clear before vigorous. Plans here don't
  // carry an intensity class to branch on, so this treats it as clearance-first.
  if (knownDisease) return "recommended";
  return "not_needed";
}

export interface ProgrammingGate {
  allowed: boolean;
  reasons: string[];
  need: ClearanceNeed | null;
}

function daysBetween(fromIso: string, to: Date): number {
  return Math.floor((to.getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) / 86_400_000);
}

/**
 * Is a date "in the past 12 months"? Written to fail closed on every odd
 * input: NaN (an unparseable or 'infinity' date), a negative span (a date in
 * the future — a mistyped 2062 for 2026 would otherwise count as valid for
 * decades), or anything over a year.
 */
function withinPastYear(iso: string | null, today: Date): boolean {
  if (!iso) return false;
  const days = daysBetween(iso, today);
  return Number.isFinite(days) && days >= 0 && days <= SCREENING_VALID_DAYS;
}

export function programmingGate(s: ScreeningRow | null, today = new Date()): ProgrammingGate {
  if (!s) {
    return {
      allowed: false,
      need: null,
      reasons: ["Complete this client's health screening and consent before building a plan."],
    };
  }

  const reasons: string[] = [];
  const need = clearanceNeed(s);

  if (!withinPastYear(s.screened_on, today)) {
    reasons.push("This client's health screening is over a year old or has an invalid date. Screen them again.");
  }
  if (!s.consent_data_storage) {
    reasons.push("The client hasn't consented to their health information being stored.");
  }
  if (!s.waiver_signed) {
    reasons.push("The client hasn't signed your waiver.");
  }
  if (need !== "not_needed") {
    // A clearance only covers what the provider knew about. For a known,
    // stable condition ACSM accepts clearance from the past 12 months. But
    // symptoms reported in this screening can't have been evaluated by a
    // clearance dated before it, so that case needs a newer one.
    const cleared =
      withinPastYear(s.clearance_obtained_on, today) &&
      (need !== "required_before_exercise" || s.clearance_obtained_on! >= s.screened_on);
    if (!cleared) {
      reasons.push(
        need === "required_before_exercise"
          ? "The screening reported symptoms. The client needs medical clearance before exercising — record it once obtained."
          : "The screening reported a known cardiovascular, metabolic or kidney condition. Record medical clearance before programming."
      );
    }
  }

  return { allowed: reasons.length === 0, reasons, need };
}

/** Newest screening for a client, or null. RLS scopes it to the caller. */
export async function loadProgrammingGate(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  clientId: string
): Promise<ProgrammingGate> {
  const { data, error } = await supabase
    .from("client_screenings")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Still blocks — but says why, rather than telling the trainer to fill in
  // a screening they may already have completed.
  if (error) {
    return { allowed: false, need: null, reasons: ["Couldn't load this client's screening. Try again."] };
  }
  return programmingGate(data as ScreeningRow | null);
}

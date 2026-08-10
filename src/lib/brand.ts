/**
 * Branding, in two layers that must not be conflated.
 *
 * PRODUCT (this file's PRODUCT const) is CoachRhythm — the app. It is the
 * same for every trainer, lives in code, and is what appears on anything
 * the product itself authors: the measurement chart, the app chrome, the
 * "made with" line.
 *
 * TRAINER (TrainerBrand) is whoever is signed in — their business name,
 * their name, their credentials. It comes from the trainer_profiles table
 * and is what a *client* sees on their own workout plan. A client should
 * see their coach's name on their program, not ours.
 *
 * Every trainer field is optional. A trainer who never opens Settings still
 * gets correct, non-embarrassing PDFs: resolveTrainerBrand fills the gaps
 * with product branding rather than emitting "undefined" or a blank header.
 */

export const PRODUCT = {
  name: "CoachRhythm",
  tagline: "Manage Clients. Build Smarter Workouts. Get Results.",
  /** Public path; server-side PDF code resolves this against process.cwd(). */
  logoFile: "coach-rhythm-logo.png",
} as const;

export interface TrainerProfileRow {
  business_name: string | null;
  coach_name: string | null;
  credentials: string | null;
  phone: string | null;
}

export interface TrainerBrand {
  /** Footer / business line. */
  businessName: string;
  /** By-line on a plan: "Programmed by {coachName}". */
  coachName: string;
  /** e.g. "CPT | PES | CNC | VCS". Empty string when unset — callers must
   *  treat it as optional and skip rendering the line entirely. */
  credentials: string;
  /** Business contact number. Empty string when unset — callers must skip
   *  rendering it rather than printing a bare separator. */
  phone: string;
  /** True when the trainer has set nothing, so PDFs are showing product
   *  branding as a stand-in. Lets the UI nudge them to fill it in. */
  isDefault: boolean;
}

export function resolveTrainerBrand(profile: TrainerProfileRow | null | undefined): TrainerBrand {
  const business = profile?.business_name?.trim() || "";
  const coach = profile?.coach_name?.trim() || "";
  const creds = profile?.credentials?.trim() || "";
  const phone = profile?.phone?.trim() || "";

  return {
    businessName: business || PRODUCT.name,
    // Falling back to the business name before the product name keeps the
    // by-line sensible for a trainer who filled in only one of the two.
    coachName: coach || business || PRODUCT.name,
    credentials: creds,
    phone,
    isDefault: !business && !coach && !creds && !phone,
  };
}

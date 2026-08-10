/**
 * Server-side loader for the signed-in trainer's branding.
 *
 * Kept separate from brand.ts so that module stays pure and safe to import
 * from client components — this one pulls in the server Supabase client and
 * must never reach the browser bundle. That boundary is enforced for us:
 * supabaseServer uses next/headers, which Next.js refuses to bundle into a
 * client component.
 */
import { supabaseServer } from "@/lib/supabase/server";
import { resolveTrainerBrand, type TrainerBrand, type TrainerProfileRow } from "@/lib/brand";

/**
 * Returns the branding for the given trainer, falling back to CoachRhythm
 * product branding when they haven't set a profile up.
 *
 * RLS scopes trainer_profiles to the caller, so this can only ever read the
 * signed-in trainer's own row; trainerId is used only to make that explicit
 * at the call site. A missing row is the normal case for a new signup, not
 * an error.
 */
export async function getTrainerBrand(trainerId: string): Promise<TrainerBrand> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("trainer_profiles")
    .select("business_name, coach_name, credentials, phone")
    .eq("trainer_id", trainerId)
    .maybeSingle();

  return resolveTrainerBrand(data as TrainerProfileRow | null);
}

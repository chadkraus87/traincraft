"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Saves the signed-in trainer's branding.
 *
 * trainer_id is taken from the session, never from the form — otherwise a
 * crafted POST could write a row keyed to someone else. (The RLS policy's
 * WITH CHECK would reject that anyway; this just means we never depend on
 * the policy to catch a bug we could have avoided outright.)
 */
export interface SaveResult {
  ok: boolean;
  message: string;
}

export async function saveTrainerProfile(form: FormData): Promise<SaveResult> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Empty inputs are stored as NULL rather than "", so resolveTrainerBrand's
  // fallback logic sees a genuinely unset field instead of a blank string
  // that would render as an empty header line.
  const clean = (key: string) => {
    const v = String(form.get(key) ?? "").trim();
    return v.length > 0 ? v.slice(0, 120) : null;
  };

  const { error } = await supabase.from("trainer_profiles").upsert(
    {
      trainer_id: user.id,
      business_name: clean("business_name"),
      coach_name: clean("coach_name"),
      credentials: clean("credentials"),
      phone: clean("phone"),
    },
    { onConflict: "trainer_id" }
  );
  // Returned rather than thrown so the form can show the failure in place.
  // An unhandled server-action throw in production renders a generic error
  // screen and loses whatever the trainer had typed.
  if (error) return { ok: false, message: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Branding saved." };
}

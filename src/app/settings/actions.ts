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

/**
 * Deletes the trainer's account and everything in it.
 *
 * The heavy lifting is a database function rather than a cascade of deletes
 * here: one statement against auth.users, and every foreign key in the
 * schema cascades from it. Doing it in application code would mean
 * maintaining a list of tables that silently goes stale the next time one is
 * added — and the table someone forgets is the one holding health data.
 *
 * Signing out afterwards is not cosmetic. The user record is gone but the
 * browser still holds a JWT that stays syntactically valid until it expires,
 * and every request it makes would resolve to a trainer who no longer exists.
 */
export async function deleteOwnAccount(): Promise<{ ok: boolean; message: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { ok: false, message: error.message };

  await supabase.auth.signOut();
  return { ok: true, message: "Account deleted." };
}

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { LEGAL_VERSIONS } from "@/lib/legal";

/**
 * Has this trainer accepted the current versions of every legal document?
 *
 * Checked on page load rather than only at signup, which covers three cases
 * with one mechanism: new accounts, accounts that predate clickwrap, and
 * everyone after a version bump.
 */
export async function hasAcceptedCurrentTerms(supabase: SupabaseClient, userId: string): Promise<boolean> {
  // ponytail: one indexed query per page render. Cache the accepted version
  // in a JWT claim if this ever shows up in latency.
  const { data } = await supabase
    .from("legal_acceptances")
    .select("id")
    .eq("trainer_id", userId)
    .eq("terms_version", LEGAL_VERSIONS.terms)
    .eq("privacy_version", LEGAL_VERSIONS.privacy)
    .eq("dpa_version", LEGAL_VERSIONS.dpa)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * Returns the signed-in user, or redirects to /login.
 *
 * The middleware already blocks unauthenticated requests, so in normal
 * operation this never redirects. It exists so that authorization does not
 * depend on a single matcher regex in a single file — a route that slips
 * outside the matcher, or a future change to it, still fails closed here.
 *
 * Use this in pages and route handlers. In server actions prefer
 * requireUserOrThrow, since a redirect from an action is awkward to handle
 * on the client.
 */
export async function requireUser(opts: { skipTerms?: boolean } = {}): Promise<User> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!opts.skipTerms && !(await hasAcceptedCurrentTerms(supabase, user.id))) {
    redirect("/accept-terms");
  }
  return user;
}

/** Server-action variant: throws instead of redirecting. */
export async function requireUserOrThrow(): Promise<User> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

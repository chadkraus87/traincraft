import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

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
export async function requireUser(): Promise<User> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
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

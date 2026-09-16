import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes reachable without a session. Everything else redirects to /login.
 *
 * Deliberately an allowlist, not a blocklist: a new page added tomorrow is
 * protected by default, and forgetting to register it fails closed (an
 * unnecessary login prompt) rather than open (an unauthenticated page).
 */
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/callback",
  // Terms, privacy policy and DPA must be readable before signing in — that
  // is the point of publishing them.
  "/legal",
  // Sentry's browser tunnel. Error reports POST here from pages that may
  // already have a broken session — gating it would mean the errors most
  // worth seeing are the ones that never arrive. It accepts only Sentry
  // envelopes and returns no application data.
  "/monitoring",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This call refreshes the session cookie as a side effect, which is why it
  // must run on every request — but the returned user is now actually used.
  // Previously the result was discarded, so the whole application shell
  // rendered for signed-out visitors and row-level security was the only
  // thing keeping tenant data out of the response. RLS is still the
  // authority on *data*; this is the layer that decides who gets a page.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    // API callers get an honest status code, not a redirect to an HTML page.
    // Redirecting them means a fetch() whose session expired mid-session
    // receives 200 OK with a login page in the body, and the UI tries to
    // JSON.parse it — surfacing as a nonsense parse error instead of "you're
    // signed out". The route handlers all return 401 themselves; this is so
    // they actually get the chance to.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    // Only same-origin relative paths are ever echoed back, so this cannot
    // be turned into an open redirect by a crafted ?next= value.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // A signed-in user hitting the auth pages should land in the app, not be
  // shown a login form they don't need.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const home = request.nextUrl.clone();
    const next = searchParams.get("next");
    home.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

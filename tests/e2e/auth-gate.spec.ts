import { test, expect } from "@playwright/test";

/**
 * The signed-out half of the app. Deliberately requires no credentials, so
 * unlike core-flow.spec.ts this runs anywhere, including CI.
 *
 * Worth its own file because this was the single worst security hole in the
 * app: middleware called supabase.auth.getUser() and threw the result away.
 * Every page rendered for anonymous visitors, and row-level security
 * returning zero rows was the only thing keeping tenant data out of the
 * response. One missing policy would have turned that into a full breach
 * with nothing in front of it.
 *
 * These assertions are about *reaching* the page, not about what data it
 * shows — a redirect is the observable proof the gate ran.
 */

const PROTECTED_PATHS = [
  "/",
  "/clients",
  "/clients/new",
  "/exercises",
  "/plans/new",
  "/plans/compare",
  "/workouts/new",
  "/settings",
];

for (const path of PROTECTED_PATHS) {
  test(`signed out: ${path} redirects to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
}

test("signed out: the intended destination is preserved for after sign-in", async ({ page }) => {
  await page.goto("/clients");
  // Only same-origin relative paths are echoed back, so this can't be turned
  // into an open redirect by a crafted ?next= value.
  await expect(page).toHaveURL(/\/login\?next=%2Fclients|\/login\?next=\/clients/);
});

test("signed out: login and signup are reachable", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: /create an account/i })).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  // Scoped to the card: the signed-out header nav also renders a "Sign in"
  // link, so an unscoped role query matches two elements and fails strict mode.
  await expect(page.locator(".card").getByRole("link", { name: /sign in/i })).toBeVisible();
});

test("signed out: signup enforces a password floor before submitting", async ({ page }) => {
  await page.goto("/signup");
  const submit = page.getByRole("button", { name: "Create account" });

  await page.getByPlaceholder("you@example.com").fill("nobody@example.test");
  await page.getByPlaceholder("At least 8 characters").fill("short");
  await expect(submit).toBeDisabled();

  await page.getByPlaceholder("At least 8 characters").fill("a-longer-passphrase");
  await expect(submit).toBeEnabled();
});

test("api routes reject anonymous callers with 401, not a redirect", async ({ request }) => {
  // A browser redirect is fine for pages; an API returning HTML to a fetch()
  // caller is not. These should answer honestly.
  const generate = await request.post("/api/generate", { data: {} });
  expect(generate.status()).toBe(401);

  const exportRes = await request.get("/api/export");
  expect(exportRes.status()).toBe(401);
});

test("security headers are present on a page response", async ({ page }) => {
  const response = await page.goto("/login");
  const headers = response!.headers();

  // The session cookie is JS-readable, so any XSS is account takeover and
  // the CSP is the backstop. Assert the load-bearing directives specifically
  // rather than just that a policy exists.
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

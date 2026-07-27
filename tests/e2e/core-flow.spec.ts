import { test, expect } from "@playwright/test";

/**
 * Covers the real user-facing path this app exists for: sign in, generate
 * a plan against the real safety pipeline and real Claude API, edit it by
 * hand, confirm QA review, and confirm the PDF link works. This is the
 * one thing the unit/DB tests can't prove — that the actual UI wires
 * everything together correctly for a real person clicking through it.
 *
 * REQUIRES real credentials — see README "End-to-end tests" for setup.
 * This creates a real, clearly-named throwaway client and plan under
 * whatever Supabase project E2E_BASE_URL points at, and deletes both at
 * the end. If the test fails partway through, it may leave that test data
 * behind — check for "E2E Test Client" entries if that happens.
 */

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "E2E_EMAIL / E2E_PASSWORD not set — see README");

const testClientName = `E2E Test Client ${Date.now()}`;

test("sign in → generate a plan → edit → confirm QA → PDF link", async ({ page }) => {
  // Sign in
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(EMAIL!);
  await page.getByPlaceholder("Your password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");

  // Create a throwaway client
  await page.goto("/clients");
  // full_name input has no placeholder, no visible <label> element — target by name attribute
  await page.locator('input[name="full_name"]').fill(testClientName);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText(testClientName)).toBeVisible();

  // Open the new client, generate a plan for them
  await page.getByText(testClientName).click();
  await page.getByRole("link", { name: "Build a plan" }).click();
  await expect(page.getByRole("heading", { name: "Build a plan" })).toBeVisible();

  await page.getByRole("button", { name: "Generate plan" }).click();

  // Real AI generation — this genuinely takes a while
  await expect(page).toHaveURL(/\/plans\/[a-f0-9-]+/, { timeout: 100_000 });

  // The plan page loaded with a QA report and sessions
  await expect(page.getByText(/QA review|Needs your review/)).toBeVisible();
  await expect(page.getByText(/Day 1/)).toBeVisible();

  // Edit mode toggles
  await page.getByRole("button", { name: "Edit plan" }).click();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  // Confirm QA review
  const confirmCheckbox = page.getByLabel("I've reviewed this and confirm it's safe to send");
  if (await confirmCheckbox.isVisible()) {
    await confirmCheckbox.check();
    await page.getByRole("button", { name: "Save review" }).click();
  }

  // PDF link exists and points at the right route
  const pdfLink = page.getByRole("link", { name: "Download PDF" });
  await expect(pdfLink).toHaveAttribute("href", /\/api\/plans\/.+\/pdf/);

  // Clean up: delete the plan, then the client
  await page.getByRole("button", { name: "Delete plan" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+/);

  await page.getByRole("button", { name: "Delete client" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL("/clients");
  await expect(page.getByText(testClientName)).not.toBeVisible();
});

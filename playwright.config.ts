import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Runs against a REAL Supabase project and REAL Anthropic API
 * — there's no test-database isolation here, since that would require a
 * second dedicated Supabase project. See README "End-to-end tests" section
 * for exactly what this needs to run and why it's not wired into CI by
 * default.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000, // real AI generation can take 30-60s
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Screenshots are a design tool, not a gate, so they stay out of the default
  // run. `npm run screenshots` sets SCREENSHOTS=1 to include them.
  testIgnore: [
    "**/global-setup.ts",
    "**/personas.ts",
    ...(process.env.SCREENSHOTS === "1" ? [] : ["**/screenshots.spec.ts"]),
  ],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "de-CH",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

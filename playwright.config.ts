import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["checks/e2e/**/*.spec.ts", "tests/e2e/**/*.spec.ts"],
  workers: 1,
  webServer: { command: "node checks/e2e/start.mjs", url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 120_000 },
  use: { baseURL: "http://127.0.0.1:3100", channel: "chrome", actionTimeout: 10_000, trace: "retain-on-failure", contextOptions: { reducedMotion: "reduce" } },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "tablet", use: { ...devices["iPad Mini"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});

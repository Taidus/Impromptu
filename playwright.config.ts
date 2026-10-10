import { defineConfig, devices } from "@playwright/test";

// Dedicated port so a local `next dev` on :3000 is never reused or clobbered.
// Each worktree can run e2e on its own port (E2E_PORT), so parallel runs never
// share a server. Never reuse a running server: it could be another worktree's build.
const port = process.env.E2E_PORT ?? "3100";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: process.env.CI ? `npm run start -- -p ${port}` : `npm run build && npm run start -- -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

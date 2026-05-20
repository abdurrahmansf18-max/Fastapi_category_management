import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3011",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-small",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "android",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-api-server.mjs",
      url: "http://127.0.0.1:8765/__health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3011",
      url: "http://127.0.0.1:3011",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_INTERNAL_API_BASE: "http://127.0.0.1:8765",
        NEXT_BACKEND_ORIGIN: "http://127.0.0.1:8765",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3011",
      },
    },
  ],
});

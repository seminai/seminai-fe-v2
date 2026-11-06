import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["seo-migration.spec.ts", "seo-skills.spec.ts"],
  workers: 1,
  use: {
    baseURL: process.env.SEO_STATIC_BASE ?? "http://127.0.0.1:8765",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.SEO_CHROME_PATH
      ? { executablePath: process.env.SEO_CHROME_PATH }
      : { channel: "chrome" },
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/seo-results.json" }],
  ],
});

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:4187",
    browserName: "chromium",
  },
  webServer: {
    command: "npm run build && node scripts/serve-site.mjs 4187",
    port: 4187,
    reuseExistingServer: false,
  },
});

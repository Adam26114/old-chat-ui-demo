import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    fullyParallel: false,
    workers: 1,
    reporter: "list",
    use: { baseURL: "http://127.0.0.1:4180", trace: "retain-on-failure", actionTimeout: 5000 },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],
    webServer: [
        { command: "node tests/server.mjs", url: "http://127.0.0.1:4181/health", reuseExistingServer: false },
        { command: "npx vite --config tests/vite.config.ts --mode development.ui --host 127.0.0.1 --port 4180 --strictPort", url: "http://127.0.0.1:4180/tests/fixtures/index.html", reuseExistingServer: false },
    ],
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Load .env into process.env before any test code runs
    setupFiles: ["dotenv/config"],
    // Tests hit real YouTube APIs, so give them generous timeouts
    testTimeout: 30_000,
    hookTimeout: 15_000,
    // Generate test reports after test run
    reporters: ["default", "junit", "json"],
    outputFile: {
      junit: "test-report/junit.xml",
      json: "test-report/results.json",
    },
  },
});

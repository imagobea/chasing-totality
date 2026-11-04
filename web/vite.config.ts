import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Where the API lives; compose points this at the api container
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The browser calls /api/health, the API serves /health (same rule as nginx.conf)
      "/api/": {
        target: API_TARGET,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    // One project per layer: unit tests are pure logic, integration tests render React in jsdom.
    // tests/e2e/ has no project yet, so tests put there don't run until one is added.
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["tests/unit/**/*.test.{ts,tsx}"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "jsdom",
          include: ["tests/integration/**/*.test.{ts,tsx}"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      // Every source file, tested or not, so untested ones show up as gaps
      include: ["src/**/*.{ts,tsx}"],
      // json-summary feeds the CI job summary
      reporter: ["text", "html", "json-summary"],
    },
  },
});

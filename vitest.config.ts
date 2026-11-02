import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Root tests only, one project per layer; web/ has its own config and tests. tests/e2e/ has no
    // project yet, so tests put there don't run until one is added.
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      { extends: true, test: { name: "integration", include: ["tests/integration/**/*.test.ts"] } },
    ],
    coverage: {
      provider: "v8",
      // Every source file, tested or not, so untested ones show up as gaps
      include: ["src/**/*.ts", "scripts/**/*.ts"],
      // json-summary feeds the CI job summary
      reporter: ["text", "html", "json-summary"],
    },
  },
});

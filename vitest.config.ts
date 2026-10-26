import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Root tests only; web/ has its own config and tests
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Every source file, tested or not, so untested ones show up as gaps
      include: ["src/**/*.ts", "scripts/**/*.ts"],
      // json-summary feeds the CI job summary
      reporter: ["text", "html", "json-summary"],
    },
  },
});

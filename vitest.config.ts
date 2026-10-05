import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Root tests only; web/ has its own config and tests
    include: ["test/**/*.test.ts"],
  },
});

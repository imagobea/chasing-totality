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
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});

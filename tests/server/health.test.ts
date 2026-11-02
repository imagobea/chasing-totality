import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/server/app.js";

describe("GET /health", () => {
  it("answers 200 with status ok", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });
});

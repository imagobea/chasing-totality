import { describe, expect, it, onTestFinished } from "vitest";
import { buildApp } from "../../../src/server/app.js";

// An app with routes that fail on purpose, so these tests don't depend on how the real ones fail
function appWithFailingRoutes() {
  const app = buildApp();
  onTestFinished(() => app.close());

  app.get(
    "/integer",
    { schema: { querystring: { type: "object", properties: { n: { type: "integer" } } } } },
    async () => ({}),
  );
  app.get("/not-found", async () => {
    throw Object.assign(new Error("No such thing"), { statusCode: 404 });
  });
  app.get("/unavailable", async () => {
    throw Object.assign(new Error("Upstream is down"), { statusCode: 503 });
  });
  app.get("/crash", async () => {
    throw new Error("Cannot read /srv/secret/file");
  });

  return app;
}

describe("errorHandler", () => {
  it("answers 422 with the validation message for a request that fails its schema", async () => {
    const app = appWithFailingRoutes();
    const res = await app.inject({ method: "GET", url: "/integer?n=abc" });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ statusCode: 422, message: "querystring/n must be integer" });
  });

  it("keeps the status and message of a client error", async () => {
    const app = appWithFailingRoutes();
    const res = await app.inject({ method: "GET", url: "/not-found" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ statusCode: 404, message: "No such thing" });
  });

  it.each([
    ["an error without a status", "/crash", 500, "Internal Server Error"],
    ["a server error", "/unavailable", 503, "Service Unavailable"],
  ])("answers %s generically", async (_, url, statusCode, message) => {
    const app = appWithFailingRoutes();
    const res = await app.inject({ method: "GET", url });
    expect(res.statusCode).toBe(statusCode);
    expect(res.json()).toEqual({ statusCode, error: message, message });
  });
});

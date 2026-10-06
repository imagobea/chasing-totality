import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiStatus } from "../src/ApiStatus.js";

function mockFetch(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ApiStatus", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a loading message while waiting for the API", () => {
    // A request that never answers keeps the component in its first state
    mockFetch(() => new Promise(() => {}));
    render(<ApiStatus />);
    expect(screen.getByText("API: checking…")).toBeTruthy();
  });

  it("shows ok when the health check answers ok", async () => {
    const fetchMock = mockFetch(async () => ({
      ok: true,
      json: async () => ({ status: "ok" }),
    }));
    render(<ApiStatus />);
    expect(await screen.findByText("API: ok")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/health");
  });

  it("shows unreachable when the request fails", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    render(<ApiStatus />);
    expect(await screen.findByText("API: unreachable")).toBeTruthy();
  });

  it("shows unreachable when the API answers with an error status", async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));
    render(<ApiStatus />);
    expect(await screen.findByText("API: unreachable")).toBeTruthy();
  });
});

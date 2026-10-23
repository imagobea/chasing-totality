import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiStatus } from "../../src/components/ApiStatus.js";

const OK = { ok: true, json: async () => ({ status: "ok" }) };

function mockFetch(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Lets pending fetch promises settle and React apply the result
async function flush() {
  await act(async () => {});
}

describe("ApiStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows a checking label while waiting for the API", () => {
    // A request that never answers keeps the component in its first state
    mockFetch(() => new Promise(() => {}));
    render(<ApiStatus />);
    expect(screen.getByText("API …")).toBeTruthy();
  });

  it("shows OK when the health check answers ok", async () => {
    const fetchMock = mockFetch(async () => OK);
    render(<ApiStatus />);
    await flush();
    expect(screen.getByText("API OK")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/health");
  });

  it("shows DOWN when the request fails", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    render(<ApiStatus />);
    await flush();
    expect(screen.getByText("API DOWN")).toBeTruthy();
  });

  it("shows DOWN when the API answers with an error status", async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));
    render(<ApiStatus />);
    await flush();
    expect(screen.getByText("API DOWN")).toBeTruthy();
  });

  it("checks again every 30 s and shows the latest answer", async () => {
    const fetchMock = mockFetch(async () => OK);
    render(<ApiStatus />);
    await flush();
    expect(fetchMock).toHaveBeenCalledOnce();

    fetchMock.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("API DOWN")).toBeTruthy();
  });

  it("stops checking once unmounted", async () => {
    const fetchMock = mockFetch(async () => OK);
    const { unmount } = render(<ApiStatus />);
    await flush();
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

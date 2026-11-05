import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.js";

// The map has its own tests and needs WebGL, so a stand-in shows the eclipse it was given
vi.mock("../../src/map/EclipseMap.js", () => ({
  EclipseMap: ({ date }: { date: string | null }) => (
    <div role="region" aria-label="Map">
      {date}
    </div>
  ),
}));

// Answers /api/eclipses with the given handler and the health check with ok
function mockApi(eclipses: () => Promise<unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url === "/api/eclipses" ? eclipses() : { ok: true, json: async () => ({ status: "ok" }) },
    ),
  );
}

function map() {
  return screen.getByRole("region", { name: "Map" });
}

function picker() {
  return screen.getByRole<HTMLSelectElement>("combobox", { name: /eclipse/i });
}

describe("App", () => {
  beforeEach(() => {
    // Only Date, so waitFor's timers still run; a fixed today keeps the tests' dates upcoming or past
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 21, 9));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("selects the first upcoming eclipse once the dates arrive", async () => {
    mockApi(async () => ({
      ok: true,
      json: async () => ["2026-08-12", "2027-08-02", "2028-07-22"],
    }));
    render(<App />);
    expect(picker().disabled).toBe(true);
    await waitFor(() => expect(picker().value).toBe("2027-08-02"));
    expect(picker().disabled).toBe(false);
  });

  it("selects an eclipse happening today", async () => {
    vi.setSystemTime(new Date(2026, 9, 14, 9));
    mockApi(async () => ({ ok: true, json: async () => ["2026-10-14", "2027-08-02"] }));
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    expect(picker().value).toBe("2026-10-14");
    expect(screen.getByText("T−0 D")).toBeTruthy();
  });

  it("selects the first eclipse once every eclipse is past", async () => {
    vi.setSystemTime(new Date(2028, 7, 1, 9));
    mockApi(async () => ({ ok: true, json: async () => ["2027-08-02", "2028-07-22"] }));
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    expect(picker().value).toBe("2027-08-02");
    expect(screen.getByText("T−0 D")).toBeTruthy();
  });

  it("selects the eclipse the user picks", async () => {
    mockApi(async () => ({ ok: true, json: async () => ["2027-08-02", "2028-07-22"] }));
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    expect(picker().value).toBe("2028-07-22");
    expect(screen.getByText("T−640 D")).toBeTruthy();
    expect(map().textContent).toBe("2028-07-22");
  });

  it("leaves the picker and countdown empty when the dates can't be fetched", async () => {
    mockApi(async () => ({ ok: false, json: async () => ({}) }));
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/eclipses"));
    // Lets the failed request settle; an uncaught rejection would also fail the run
    await act(async () => {});
    expect(picker().disabled).toBe(true);
    expect(screen.getByRole("option", { name: "—" })).toBeTruthy();
    expect(screen.getByText("T−— D")).toBeTruthy();
  });
});

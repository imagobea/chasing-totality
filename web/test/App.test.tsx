import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";

// The map has its own tests and needs WebGL, so it is left out here
vi.mock("../src/EclipseMap.js", () => ({ EclipseMap: () => null }));

// Answers /api/eclipses with the given handler and the health check with ok
function mockApi(eclipses: () => Promise<unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url === "/api/eclipses" ? eclipses() : { ok: true, json: async () => ({ status: "ok" }) },
    ),
  );
}

function picker() {
  return screen.getByRole<HTMLSelectElement>("combobox", { name: /eclipse/i });
}

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("selects the first eclipse once the dates arrive", async () => {
    mockApi(async () => ({ ok: true, json: async () => ["2027-08-02", "2028-07-22"] }));
    render(<App />);
    expect(picker().disabled).toBe(true);
    await waitFor(() => expect(picker().value).toBe("2027-08-02"));
    expect(picker().disabled).toBe(false);
  });

  it("selects the eclipse the user picks", async () => {
    mockApi(async () => ({ ok: true, json: async () => ["2027-08-02", "2028-07-22"] }));
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    expect(picker().value).toBe("2028-07-22");
  });

  it("leaves the picker empty when the dates can't be fetched", async () => {
    mockApi(async () => ({ ok: false, json: async () => ({}) }));
    render(<App />);
    // Both requests have settled by then; an uncaught rejection would also fail the run
    await screen.findByText("API OK");
    expect(picker().disabled).toBe(true);
    expect(screen.getByRole("option", { name: "—" })).toBeTruthy();
  });
});

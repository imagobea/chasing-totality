import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Airports } from "../../src/api/airports.js";
import type { Isolines } from "../../src/api/eclipses.js";
import { App } from "../../src/App.js";
import { airports } from "../helpers/airports.js";

// The map has its own tests and needs WebGL, so a stand-in shows the bbox of the isolines it was
// given, which tells the eclipses apart, and the IATA codes of its airports
vi.mock("../../src/map/EclipseMap.js", () => ({
  EclipseMap: ({
    isolines,
    airports,
  }: {
    isolines: Isolines | null;
    airports: Airports | null;
  }) => (
    <div role="region" aria-label="Map">
      <p aria-label="Isolines">{isolines?.bbox.join(",")}</p>
      <p aria-label="Airports">{airports?.features.map(({ id }) => id).join(",")}</p>
    </div>
  ),
}));

// What the API serves for each date's isolines
const ISOLINES: Record<string, Isolines> = {
  "2027-08-02": { type: "FeatureCollection", bbox: [-46, -14, 92, 38], features: [] },
  "2028-07-22": { type: "FeatureCollection", bbox: [74, -52, 182, -9], features: [] },
};

// What the API serves for the airports around each date's path, by bbox
const AIRPORTS: Record<string, Airports> = {
  "-49,-17,95,41": airports("AGP", "LXR"),
  "71,-55,185,-6": airports("SYD"),
};

const ISOLINES_URL = /^\/api\/eclipses\/(.+)\/isolines$/;
const AIRPORTS_URL = /^\/api\/airports\?bbox=(.+)$/;

// The answer to a fetch that succeeds with the given body
function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

// The given body, or not found when there is none, as the API answers
function okOrNotFound(body: unknown) {
  return body === undefined ? { ok: false, status: 404 } : ok(body);
}

// Answers /api/eclipses with the given handler, each date's isolines and each bbox's airports
// with the given handlers or ISOLINES and AIRPORTS, and the health check with ok
function mockApi(
  eclipses: () => Promise<unknown>,
  {
    isolines = async (date) => okOrNotFound(ISOLINES[date]),
    airports = async (bbox) => okOrNotFound(AIRPORTS[bbox]),
  }: {
    isolines?: (date: string) => Promise<unknown>;
    airports?: (bbox: string) => Promise<unknown>;
  } = {},
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/eclipses") return eclipses();
      const date = ISOLINES_URL.exec(url)?.[1];
      if (date) return isolines(date);
      const bbox = AIRPORTS_URL.exec(url)?.[1];
      return bbox ? airports(bbox) : ok({ status: "ok" });
    }),
  );
}

// The bbox of the isolines on the map
function mapIsolines() {
  return within(screen.getByRole("region", { name: "Map" })).getByLabelText("Isolines").textContent;
}

// The IATA codes of the airports on the map
function mapAirports() {
  return within(screen.getByRole("region", { name: "Map" })).getByLabelText("Airports").textContent;
}

// The airports' source line in the layers panel
function airportsSourceLine() {
  const group = within(screen.getByRole("region", { name: "Airports" }));
  return group.getByRole("paragraph").textContent;
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
    vi.restoreAllMocks();
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
    // There are no isolines for this eclipse
    vi.spyOn(console, "warn").mockImplementation(() => {});
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
  });

  it("shows the selected eclipse's isolines on the map", async () => {
    mockApi(async () => ok(["2027-08-02", "2028-07-22"]));
    render(<App />);
    await waitFor(() => expect(mapIsolines()).toBe(ISOLINES["2027-08-02"]!.bbox.join(",")));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapIsolines()).toBe(ISOLINES["2028-07-22"]!.bbox.join(",")));
  });

  it("ignores isolines that arrive after another date was picked", async () => {
    let answer2027: (answer: unknown) => void = () => {};
    mockApi(async () => ok(["2027-08-02", "2028-07-22"]), {
      isolines: (date) =>
        date === "2027-08-02"
          ? new Promise((resolve) => (answer2027 = resolve))
          : Promise.resolve(ok(ISOLINES[date])),
    });
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapIsolines()).toBe(ISOLINES["2028-07-22"]!.bbox.join(",")));
    await act(async () => answer2027(ok(ISOLINES["2027-08-02"])));
    expect(mapIsolines()).toBe(ISOLINES["2028-07-22"]!.bbox.join(","));
  });

  it("warns and leaves the map as it is when the isolines can't be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockApi(async () => ok(["2027-08-02", "2028-07-22"]), {
      isolines: async (date) =>
        date === "2027-08-02" ? ok(ISOLINES[date]) : { ok: false, status: 500 },
    });
    render(<App />);
    await waitFor(() => expect(mapIsolines()).toBe(ISOLINES["2027-08-02"]!.bbox.join(",")));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    expect(mapIsolines()).toBe(ISOLINES["2027-08-02"]!.bbox.join(","));
  });

  it("shows the airports around the selected eclipse's path on the map", async () => {
    mockApi(async () => ok(["2027-08-02", "2028-07-22"]));
    render(<App />);
    await waitFor(() => expect(mapAirports()).toBe("AGP,LXR"));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapAirports()).toBe("SYD"));
  });

  it("credits the airports' source in the layers panel once they arrive", async () => {
    mockApi(async () => ok(["2027-08-02"]));
    render(<App />);
    expect(airportsSourceLine()).toBe("—");
    await waitFor(() => expect(airportsSourceLine()).toBe("OurAirports, 25 Oct 2026"));
  });

  it("ignores airports that arrive after another eclipse's isolines", async () => {
    let answer2027: (answer: unknown) => void = () => {};
    mockApi(async () => ok(["2027-08-02", "2028-07-22"]), {
      airports: (bbox) =>
        bbox === "-49,-17,95,41"
          ? new Promise((resolve) => (answer2027 = resolve))
          : Promise.resolve(ok(AIRPORTS[bbox])),
    });
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapAirports()).toBe("SYD"));
    await act(async () => answer2027(ok(AIRPORTS["-49,-17,95,41"])));
    expect(mapAirports()).toBe("SYD");
  });

  it("warns and shows no airports when they can't be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockApi(async () => ok(["2027-08-02", "2028-07-22"]), {
      airports: async (bbox) =>
        bbox === "-49,-17,95,41" ? ok(AIRPORTS[bbox]) : { ok: false, status: 500 },
    });
    render(<App />);
    await waitFor(() => expect(mapAirports()).toBe("AGP,LXR"));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    expect(mapAirports()).toBe("");
    expect(airportsSourceLine()).toBe("—");
  });

  it("shows the layers panel over the map", () => {
    mockApi(async () => ok([]));
    render(<App />);
    expect(screen.getByRole("complementary", { name: "Layers" })).toBeTruthy();
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
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(ISOLINES_URL));
    expect(fetch).not.toHaveBeenCalledWith(expect.stringMatching(AIRPORTS_URL));
  });
});

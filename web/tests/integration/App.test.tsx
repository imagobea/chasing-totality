import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Advisories } from "../../src/api/advisories.js";
import type { Airports } from "../../src/api/airports.js";
import type { Bbox, Isolines } from "../../src/api/eclipses.js";
import { App } from "../../src/App.js";
import { advisories } from "../helpers/advisories.js";
import { airports } from "../helpers/airports.js";
import { isolines } from "../helpers/isolines.js";

// The map has its own tests and needs WebGL, so a stand-in shows the bbox it fits, the names of the
// isolines it was given, which tell the eclipses apart, the IATA codes of its airports and its
// advisories' states while they show
vi.mock("../../src/map/EclipseMap.js", () => ({
  EclipseMap: ({
    bbox,
    isolines,
    airports,
    advisories,
    showAdvisories,
  }: {
    bbox: Bbox | null;
    isolines: Isolines | null;
    airports: Airports | null;
    advisories: Advisories | null;
    showAdvisories: boolean;
  }) => (
    <div role="region" aria-label="Map">
      <p aria-label="Fit">{bbox?.join(",")}</p>
      <p aria-label="Isolines">
        {isolines?.features.map(({ properties }) => properties.name).join(",")}
      </p>
      <p aria-label="Airports">{airports?.features.map(({ id }) => id).join(",")}</p>
      <p aria-label="Advisories">
        {showAdvisories && advisories?.features.map(({ properties }) => properties.state).join(",")}
      </p>
    </div>
  ),
}));

// The bbox around each date's path, as the eclipse list gives it
const BBOXES: Record<string, Bbox> = {
  "2027-08-02": [-46, -14, 92, 38],
  "2028-07-22": [74, -52, 182, -9],
};

// A bbox for the other dates the tests list
const OTHER_BBOX: Bbox = [0, 0, 10, 10];

// What the API serves for each date's isolines
const ISOLINES: Record<string, Isolines> = {
  "2027-08-02": isolines(0, 60, 120),
  "2028-07-22": isolines(0, 60),
};

// The airports' bbox around each date's path, as App asks for it: 3° each way, rounded outwards
const AIRPORTS_BBOX_2027 = "-49,-17,95,41";
const AIRPORTS_BBOX_2028 = "71,-55,185,-6";

// What the API serves for the airports around each date's path, by bbox
const AIRPORTS: Record<string, Airports> = {
  [AIRPORTS_BBOX_2027]: airports("AGP", "LXR"),
  [AIRPORTS_BBOX_2028]: airports("SYD"),
};

// What the API serves for every place's advisory
const ADVISORIES = advisories("whole", "parts", "none");

const ISOLINES_URL = /^\/api\/eclipses\/(.+)\/isolines$/;
const AIRPORTS_URL = /^\/api\/airports\?bbox=(.+)$/;

// The answer to a fetch that succeeds with the given body
function ok(body: unknown) {
  return { ok: true, json: async () => body };
}

// The answer to /api/eclipses listing the given dates, each with its bbox
function eclipseList(...dates: string[]) {
  return ok(dates.map((date) => ({ date, bbox: BBOXES[date] ?? OTHER_BBOX })));
}

// The given body, or not found when there is none, as the API answers
function okOrNotFound(body: unknown) {
  return body === undefined ? { ok: false, status: 404 } : ok(body);
}

// Answers /api/eclipses with the given handler, each date's isolines, each bbox's airports and
// the advisories with the given handlers or ISOLINES, AIRPORTS and ADVISORIES, and the health
// check with ok
function mockApi(
  eclipses: () => Promise<unknown>,
  {
    isolines = async (date) => okOrNotFound(ISOLINES[date]),
    airports = async (bbox) => okOrNotFound(AIRPORTS[bbox]),
    advisories = async () => ok(ADVISORIES),
  }: {
    isolines?: (date: string) => Promise<unknown>;
    airports?: (bbox: string) => Promise<unknown>;
    advisories?: () => Promise<unknown>;
  } = {},
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url === "/api/eclipses") return eclipses();
      if (url === "/api/advisories") return advisories();
      const date = ISOLINES_URL.exec(url)?.[1];
      if (date) return isolines(date);
      const bbox = AIRPORTS_URL.exec(url)?.[1];
      return bbox ? airports(bbox) : ok({ status: "ok" });
    }),
  );
}

// How the map stand-in shows a date's isolines
function shownIsolines(date: string) {
  return ISOLINES[date]!.features.map(({ properties }) => properties.name).join(",");
}

// The bbox the map fits
function mapFit() {
  return within(screen.getByRole("region", { name: "Map" })).getByLabelText("Fit").textContent;
}

// The names of the isolines on the map
function mapIsolines() {
  return within(screen.getByRole("region", { name: "Map" })).getByLabelText("Isolines").textContent;
}

// The IATA codes of the airports on the map
function mapAirports() {
  return within(screen.getByRole("region", { name: "Map" })).getByLabelText("Airports").textContent;
}

// The states of the advisories on the map
function mapAdvisories() {
  return within(screen.getByRole("region", { name: "Map" })).getByLabelText("Advisories")
    .textContent;
}

// The airports' source line in the layers panel
function airportsSourceLine() {
  const group = within(screen.getByRole("region", { name: "Airports" }));
  return group.getByRole("paragraph").textContent;
}

// The advisories' source line in the layers panel, above the credit once they arrive
function advisoriesSourceLine() {
  const group = within(screen.getByRole("region", { name: "Travel advisories" }));
  return group.getAllByRole("paragraph")[0]?.textContent;
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
    mockApi(async () => eclipseList("2026-08-12", "2027-08-02", "2028-07-22"));
    render(<App />);
    expect(picker().disabled).toBe(true);
    await waitFor(() => expect(picker().value).toBe("2027-08-02"));
    expect(picker().disabled).toBe(false);
  });

  it("selects an eclipse happening today", async () => {
    vi.setSystemTime(new Date(2026, 9, 14, 9));
    // There are no isolines for this eclipse
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockApi(async () => eclipseList("2026-10-14", "2027-08-02"));
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    expect(picker().value).toBe("2026-10-14");
    expect(screen.getByText("T−0 D")).toBeTruthy();
  });

  it("selects the first eclipse once every eclipse is past", async () => {
    vi.setSystemTime(new Date(2028, 7, 1, 9));
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"));
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    expect(picker().value).toBe("2027-08-02");
    expect(screen.getByText("T−0 D")).toBeTruthy();
  });

  it("selects the eclipse the user picks", async () => {
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"));
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    expect(picker().value).toBe("2028-07-22");
    expect(screen.getByText("T−640 D")).toBeTruthy();
  });

  it("shows the selected eclipse's isolines on the map", async () => {
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"));
    render(<App />);
    await waitFor(() => expect(mapIsolines()).toBe(shownIsolines("2027-08-02")));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapIsolines()).toBe(shownIsolines("2028-07-22")));
  });

  it("fits the map to each eclipse picked without waiting for its isolines", async () => {
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"), {
      isolines: () => new Promise(() => {}),
    });
    render(<App />);
    await waitFor(() => expect(mapFit()).toBe(BBOXES["2027-08-02"]!.join(",")));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    expect(mapFit()).toBe(BBOXES["2028-07-22"]!.join(","));
    expect(mapIsolines()).toBe("");
  });

  it("clears the previous eclipse's isolines as soon as another is picked", async () => {
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"), {
      isolines: (date) =>
        date === "2027-08-02" ? Promise.resolve(ok(ISOLINES[date])) : new Promise(() => {}),
    });
    render(<App />);
    await waitFor(() => expect(mapIsolines()).toBe(shownIsolines("2027-08-02")));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapIsolines()).toBe(""));
  });

  it("ignores isolines that arrive after another date was picked", async () => {
    let answer2027: (answer: unknown) => void = () => {};
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"), {
      isolines: (date) =>
        date === "2027-08-02"
          ? new Promise((resolve) => (answer2027 = resolve))
          : Promise.resolve(ok(ISOLINES[date])),
    });
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapIsolines()).toBe(shownIsolines("2028-07-22")));
    await act(async () => answer2027(ok(ISOLINES["2027-08-02"])));
    expect(mapIsolines()).toBe(shownIsolines("2028-07-22"));
  });

  it("warns and shows no isolines when they can't be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"), {
      isolines: async (date) =>
        date === "2027-08-02" ? ok(ISOLINES[date]) : { ok: false, status: 500 },
    });
    render(<App />);
    await waitFor(() => expect(mapIsolines()).toBe(shownIsolines("2027-08-02")));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    expect(mapIsolines()).toBe("");
  });

  it("asks for no airports while a past eclipse is selected", async () => {
    mockApi(async () => eclipseList("2026-08-12", "2027-08-02"), {
      isolines: () => new Promise(() => {}),
    });
    render(<App />);
    await waitFor(() => expect(mapAirports()).toBe("AGP,LXR"));
    fireEvent.change(picker(), { target: { value: "2026-08-12" } });
    await waitFor(() => expect(mapAirports()).toBe(""));
    // Only the upcoming eclipse's airports were asked for
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => AIRPORTS_URL.test(String(url)))).toEqual([
      [`/api/airports?bbox=${AIRPORTS_BBOX_2027}`],
    ]);
  });

  it("shows the airports around the selected eclipse's path on the map", async () => {
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"));
    render(<App />);
    await waitFor(() => expect(mapAirports()).toBe("AGP,LXR"));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapAirports()).toBe("SYD"));
  });

  it("asks for the airports without waiting for the isolines", async () => {
    mockApi(async () => eclipseList("2027-08-02"), { isolines: () => new Promise(() => {}) });
    render(<App />);
    await waitFor(() => expect(mapAirports()).toBe("AGP,LXR"));
    expect(mapIsolines()).toBe("");
  });

  it("credits the airports' source in the layers panel once they arrive", async () => {
    mockApi(async () => eclipseList("2027-08-02"));
    render(<App />);
    expect(airportsSourceLine()).toBe("—");
    await waitFor(() => expect(airportsSourceLine()).toBe("OurAirports, 25 OCT 2026"));
  });

  it("clears the previous eclipse's airports as soon as another is picked", async () => {
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"), {
      airports: (bbox) =>
        bbox === AIRPORTS_BBOX_2027 ? Promise.resolve(ok(AIRPORTS[bbox])) : new Promise(() => {}),
    });
    render(<App />);
    await waitFor(() => expect(mapAirports()).toBe("AGP,LXR"));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapAirports()).toBe(""));
    expect(airportsSourceLine()).toBe("—");
  });

  it("ignores airports that arrive after another eclipse was picked", async () => {
    let answer2027: (answer: unknown) => void = () => {};
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"), {
      airports: (bbox) =>
        bbox === AIRPORTS_BBOX_2027
          ? new Promise((resolve) => (answer2027 = resolve))
          : Promise.resolve(ok(AIRPORTS[bbox])),
    });
    render(<App />);
    await waitFor(() => expect(picker().disabled).toBe(false));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapAirports()).toBe("SYD"));
    await act(async () => answer2027(ok(AIRPORTS[AIRPORTS_BBOX_2027])));
    expect(mapAirports()).toBe("SYD");
  });

  it("warns and shows no airports when they can't be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"), {
      airports: async (bbox) =>
        bbox === AIRPORTS_BBOX_2027 ? ok(AIRPORTS[bbox]) : { ok: false, status: 500 },
    });
    render(<App />);
    await waitFor(() => expect(mapAirports()).toBe("AGP,LXR"));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    expect(mapAirports()).toBe("");
    expect(airportsSourceLine()).toBe("—");
  });

  it("hides the advisories while a past eclipse is selected, without fetching them again", async () => {
    mockApi(async () => eclipseList("2026-08-12", "2027-08-02"), {
      isolines: () => new Promise(() => {}),
    });
    render(<App />);
    await waitFor(() => expect(mapAdvisories()).toBe("whole,parts,none"));
    fireEvent.change(picker(), { target: { value: "2026-08-12" } });
    expect(mapAdvisories()).toBe("");
    fireEvent.change(picker(), { target: { value: "2027-08-02" } });
    expect(mapAdvisories()).toBe("whole,parts,none");
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/advisories")).toHaveLength(
      1,
    );
  });

  it("shows every place's advisory on the map, fetched once whatever the eclipse", async () => {
    mockApi(async () => eclipseList("2027-08-02", "2028-07-22"));
    render(<App />);
    await waitFor(() => expect(mapAdvisories()).toBe("whole,parts,none"));
    fireEvent.change(picker(), { target: { value: "2028-07-22" } });
    await waitFor(() => expect(mapIsolines()).toBe(shownIsolines("2028-07-22")));
    expect(mapAdvisories()).toBe("whole,parts,none");
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/advisories")).toHaveLength(
      1,
    );
  });

  it("credits the advisories' source in the layers panel once they arrive", async () => {
    mockApi(async () => eclipseList("2027-08-02"));
    render(<App />);
    expect(advisoriesSourceLine()).toBe("—");
    await waitFor(() => expect(advisoriesSourceLine()).toBe("UK FCDO travel advice, 16 NOV 2026"));
  });

  it("warns and shows no advisories when they can't be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockApi(async () => eclipseList("2027-08-02"), {
      advisories: async () => ({ ok: false, status: 500 }),
    });
    render(<App />);
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    expect(mapAdvisories()).toBe("");
    expect(advisoriesSourceLine()).toBe("—");
  });

  it("shows the layers panel over the map", () => {
    mockApi(async () => eclipseList());
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

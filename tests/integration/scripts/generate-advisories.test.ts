import { writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FcdoPage as Page,
  NaturalEarthShape as Shape,
  Position,
} from "../../../scripts/generate-advisories.js";

// The script writes its snapshot with writeFileSync; the mock keeps it off disk for the tests to
// read
vi.mock("node:fs", () => ({ writeFileSync: vi.fn() }));

type World = { pages: Page[]; shapes: Shape[] };

// The parts of fetch the script uses, with init so the tests can read the request options
type Fetch = (
  url: string,
  init?: RequestInit,
) => Promise<Pick<Response, "status" | "statusText" | "json">>;

type Feature = {
  id: number;
  properties: {
    state: string;
    match: string | null;
    naturalEarth: { NAME: string };
    fcdo: { country: { slug: string }; url: string };
  };
  geometry: { coordinates: unknown };
};

const RETRIEVED = "2026-11-16";
const INDEX_URL = "https://www.gov.uk/api/content/foreign-travel-advice";
// The pages and shapes the script's matching exceptions name: without them, every run fails
// with a stale exception. Each is [slug, page name, shapes, page text, synonyms].
const EXCEPTIONS: [string, string, string[], string?, string[]?][] = [
  ["myanmar", "Myanmar (Burma)", ["Myanmar"]],
  ["pitcairn-island", "Pitcairn Island", ["Pitcairn Is."]],
  [
    "st-helena-ascension-and-tristan-da-cunha",
    "St Helena, Ascension and Tristan da Cunha",
    ["Saint Helena"],
  ],
  [
    "antarctica-british-antarctic-territory",
    "Antarctica/British Antarctic Territory",
    ["Antarctica"],
  ],
  ["bonaire-st-eustatius-saba", "Bonaire/St Eustatius/Saba", ["Caribbean Netherlands"]],
  ["st-pierre-and-miquelon", "St Pierre & Miquelon", ["St. Pierre and Miquelon"]],
  [
    "cook-islands-tokelau-and-niue",
    "Cook Islands, Tokelau and Niue",
    ["Cook Is.", "Tokelau", "Niue"],
  ],
  ["st-lucia", "St Lucia", ["Saint Lucia"]],
  ["st-vincent-and-the-grenadines", "St Vincent and the Grenadines", ["St. Vin. and Gren."]],
  ["cape-verde", "Cape Verde", ["Cabo Verde"]],
  [
    "south-georgia-and-south-sandwich-islands",
    "South Georgia and the South Sandwich Islands",
    ["S. Geo. and the Is."],
  ],
  ["somalia", "Somalia", ["Somalia", "Somaliland"], "Somaliland"],
  ["cyprus", "Cyprus", ["Cyprus", "N. Cyprus"], "the north of Cyprus"],
  ["denmark", "Denmark", ["Denmark", "Faeroe Is."], "Faroe Islands"],
  [
    "usa",
    "USA",
    ["United States of America", "U.S. Virgin Is.", "N. Mariana Is."],
    "US Virgin Islands and Northern Mariana Islands",
    ["United States"],
  ],
  ["tanzania", "Tanzania", ["Tanzania", "Zanzibar"], "Zanzibar"],
  ["italy", "Italy", ["Italy", "Vatican"], "Vatican"],
  ["papua-new-guinea", "Papua New Guinea", ["Papua New Guinea", "Bougainville"], "Bougainville"],
  ["norway", "Norway", ["Norway", "Svalbard Is."], "Svalbard"],
  ["kiribati", "Kiribati", ["Kiribati", "Christmas I."], "", ["Christmas Island"]],
  ["gibraltar", "Gibraltar", []],
];
// Natural Earth's long names, where the tests rely on them
const LONG_NAMES: Record<string, string> = {
  "United States of America": "United States",
  "Christmas I.": "Christmas Island",
};

let nextId = 1;

// One FCDO page, with no advisory unless overridden
function page(
  slug: string,
  name: string,
  {
    synonyms = [],
    alertStatus = [],
    text = "",
    ...overrides
  }: Partial<Page> & { synonyms?: string[]; alertStatus?: string[]; text?: string } = {},
): Page {
  return {
    base_path: `/foreign-travel-advice/${slug}`,
    public_updated_at: "2026-06-04T15:57:41+01:00",
    details: {
      country: { name, slug, synonyms },
      alert_status: alertStatus,
      reviewed_at: "2026-06-04T14:57:41Z",
      change_description: " Latest update: summary of advice ",
      parts: [{ title: "Warnings and insurance", body: `<p>${text}</p>` }],
    },
    ...overrides,
  };
}

// One Natural Earth shape, a 1° square unless given coordinates
function shape(
  name: string,
  overrides: Partial<Shape["properties"]> = {},
  coordinates?: Position[][],
): Shape {
  const id = nextId++;
  return {
    type: "Feature",
    properties: {
      NE_ID: id,
      NAME: name,
      NAME_LONG: LONG_NAMES[name] ?? name,
      ADMIN: name,
      ADM0_A3: "XXX",
      NOTE_BRK: null,
      ...overrides,
    },
    geometry: {
      type: "Polygon",
      coordinates: coordinates ?? [
        [
          [id, 0],
          [id + 1, 0],
          [id + 1, 1],
          [id, 1],
          [id, 0],
        ],
      ],
    },
  };
}

// The exceptions' pages and shapes, plus Spain as a plain match
function world(): World {
  const pages = EXCEPTIONS.map(([slug, name, , text, synonyms]) =>
    page(slug, name, { text, synonyms }),
  );
  const shapes = EXCEPTIONS.flatMap(([, , names]) => names.map((name) => shape(name)));
  return { pages: [...pages, page("spain", "Spain")], shapes: [...shapes, shape("Spain")] };
}

// What fetch answers: the index, each page and Natural Earth from the world, or the given statuses
// for a URL in turn, 0 being a network error
function stubFetch({ pages, shapes }: World, statuses: Record<string, number[]> = {}) {
  const answer = (status: number, body?: unknown) => ({
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
  });
  const fetch = vi.fn<Fetch>(async (url) => {
    const status = statuses[url]?.shift();
    if (status === 0) throw new TypeError("fetch failed");
    if (status && status !== 200) return answer(status);
    if (url === INDEX_URL) {
      return answer(200, { links: { children: pages.map((p) => ({ base_path: p.base_path })) } });
    }
    if (url.includes("natural-earth-vector")) {
      return answer(200, { type: "FeatureCollection", features: shapes });
    }
    const found = pages.find((p) => url === `https://www.gov.uk/api/content${p.base_path}`);
    return found ? answer(200, found) : answer(404);
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

// Runs the script, letting its waits pass
async function run() {
  vi.resetModules();
  let settled = false;
  const script = import("../../../scripts/generate-advisories.js").finally(() => (settled = true));
  script.catch(() => {});
  while (!settled) await vi.advanceTimersByTimeAsync(1000);
  await script;
}

// Runs the script against the world and returns the snapshot it would write
async function generate(data: World, statuses?: Record<string, number[]>) {
  stubFetch(data, statuses);
  await run();
  const [, text] = vi.mocked(writeFileSync).mock.lastCall ?? [];
  return JSON.parse(String(text)) as { features: Feature[] } & Record<string, unknown>;
}

async function features(data: World): Promise<Feature[]> {
  return (await generate(data)).features;
}

function byName(all: Feature[], name: string): Feature | undefined {
  return all.find((feature) => feature.properties.naturalEarth.NAME === name);
}

// A fresh world, changed by the edit
function worldWith(edit: (data: World) => void): World {
  const data = world();
  edit(data);
  return data;
}

// A fresh world with one page changed
function withPage(slug: string, change: (p: Page) => Page): World {
  return worldWith((data) => {
    data.pages = data.pages.map((p) => (p.details.country.slug === slug ? change(p) : p));
  });
}

beforeEach(() => {
  nextId = 1;
  vi.useFakeTimers({ toFake: ["Date", "setTimeout"] });
  vi.setSystemTime(RETRIEVED);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(writeFileSync).mockClear();
});

describe("generate-advisories", () => {
  // Validation: every stop condition fails the run and writes nothing
  it.each([
    ["the index answers 404", { [INDEX_URL]: [404] }, /404/],
    [
      "a page still answers 503 after the retries",
      { [`${INDEX_URL}/spain`]: [503, 503, 503, 503] },
      /503/,
    ],
    ["a page redirects", { [`${INDEX_URL}/spain`]: [303] }, /303/],
  ])("fails when %s", async (_, statuses, error) => {
    await expect(generate(world(), statuses)).rejects.toThrow(error);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the index lists no pages",
      worldWith((w) => {
        w.pages = [];
      }),
      /no pages/,
    ],
    [
      "the index lists a page twice",
      worldWith((w) => w.pages.push(page("spain", "Spain"))),
      /twice/,
    ],
    [
      "a page is withdrawn",
      withPage("spain", (p) => ({ ...p, withdrawn_notice: { explanation: "Gone" } })),
      /withdrawn/,
    ],
    [
      "a page has an unknown alert status",
      withPage("spain", () => page("spain", "Spain", { alertStatus: ["avoid_some_travel"] })),
      /avoid_some_travel/,
    ],
    [
      "a page known not to be drawn has an unknown alert status",
      withPage("gibraltar", () =>
        page("gibraltar", "Gibraltar", { alertStatus: ["avoid_some_travel"] }),
      ),
      /avoid_some_travel/,
    ],
    [
      "Natural Earth has no shapes",
      worldWith((w) => {
        w.shapes = [];
      }),
      /no shapes/,
    ],
    [
      "a page matches no shape",
      worldWith((w) => w.pages.push(page("atlantis", "Atlantis"))),
      /atlantis/,
    ],
    [
      "an exception names a page that no longer exists",
      worldWith((w) => {
        w.pages = w.pages.filter((p) => p.details.country.slug !== "myanmar");
      }),
      /myanmar/,
    ],
    [
      "an exception names a shape that no longer exists",
      worldWith((w) => {
        w.shapes = w.shapes.filter((s) => s.properties.NAME !== "Tokelau");
      }),
      /Tokelau/,
    ],
    [
      "an exception repeats a name match",
      worldWith((w) => {
        w.shapes = w.shapes.map((s) =>
          s.properties.NAME === "Saint Lucia" ? shape("Saint Lucia", { NAME_LONG: "St Lucia" }) : s,
        );
      }),
      /already matched/,
    ],
    [
      "a page no longer mentions a place it covers",
      withPage("somalia", () => page("somalia", "Somalia")),
      /Somaliland/,
    ],
    [
      "a blocked synonym no longer matches",
      withPage("kiribati", () => page("kiribati", "Kiribati")),
      /Christmas/,
    ],
    [
      "a page known not to be drawn now matches a shape",
      worldWith((w) => w.shapes.push(shape("Gibraltar"))),
      /gibraltar/,
    ],
    [
      "a shape is claimed by two pages",
      worldWith((w) => w.pages.push(page("somaliland", "Somaliland"))),
      /claimed/,
    ],
    [
      "a ring collapses once rounded",
      worldWith((w) => {
        w.shapes = w.shapes.filter((s) => s.properties.NAME !== "Spain");
        w.shapes.push(
          shape("Spain", {}, [
            [
              [0, 0],
              [0.0001, 0],
              [0.0001, 0.0001],
              [0, 0],
            ],
          ]),
        );
      }),
      /collapses/,
    ],
  ])("fails when %s", async (_, data, error) => {
    await expect(generate(data)).rejects.toThrow(error);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  // Fetching
  it("retries a failed request with a warning, then carries on", async () => {
    const retried = await generate(world(), { [`${INDEX_URL}/spain`]: [0, 503, 429] });
    expect(byName(retried.features, "Spain")).toBeDefined();
    expect(vi.mocked(console.warn).mock.calls.map(([message]) => message)).toEqual([
      expect.stringMatching(/\/spain failed \(.+\), retrying in 2 s \(1 of 3\)$/),
      expect.stringMatching(/\/spain answered 503, retrying in 2 s \(2 of 3\)$/),
      expect.stringMatching(/\/spain answered 429, retrying in 2 s \(3 of 3\)$/),
    ]);
  });

  it("requests one page at a time, at most 5 a second, with a generic client name and no redirects", async () => {
    const times: number[] = [];
    const fetch = stubFetch(world());
    const answer = fetch.getMockImplementation()!;
    fetch.mockImplementation(async (url: string) => {
      times.push(Date.now());
      return answer(url);
    });
    await run();

    const gaps = times.slice(1).map((time, i) => time - times[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(200);
    for (const [, init] of fetch.mock.calls) {
      expect(init).toEqual({
        headers: { "User-Agent": "advisories-snapshot" },
        redirect: "manual",
      });
    }
  });

  // State
  it.each([
    [[], "none"],
    [["avoid_all_travel_to_whole_country"], "whole"],
    [["avoid_all_but_essential_travel_to_whole_country"], "whole"],
    [["avoid_all_travel_to_parts"], "parts"],
    [["avoid_all_but_essential_travel_to_parts"], "parts"],
    [["avoid_all_travel_to_parts", "avoid_all_but_essential_travel_to_whole_country"], "whole"],
  ])("reads %j as %s", async (alertStatus, state) => {
    const all = await features(withPage("spain", () => page("spain", "Spain", { alertStatus })));
    expect(byName(all, "Spain")?.properties.state).toBe(state);
  });

  // Matching
  it("matches a page by name, long name or the shapes of a split country", async () => {
    const data = worldWith((w) => {
      w.pages.push(
        page("eswatini", "Eswatini"),
        page("bosnia-and-herzegovina", "Bosnia and Herzegovina"),
        page("belgium", "Belgium"),
      );
      w.shapes.push(
        shape("eSwatini"),
        shape("Bosnia and Herz.", { NAME_LONG: "Bosnia and Herzegovina" }),
        shape("Flemish", { ADMIN: "Belgium" }),
        shape("Walloon", { ADMIN: "Belgium" }),
      );
    });
    const all = await features(data);
    for (const name of ["eSwatini", "Bosnia and Herz.", "Flemish", "Walloon"]) {
      expect(byName(all, name)?.properties.match).toBeNull();
    }
  });

  it("matches a synonym that renames the page's own shape as a direct match", async () => {
    const all = await features(world());
    expect(byName(all, "United States of America")?.properties.fcdo.country.slug).toBe("usa");
    expect(byName(all, "United States of America")?.properties.match).toBeNull();
  });

  it("claims a separate shape a synonym names", async () => {
    const data = worldWith((w) => {
      w.pages
        .find((p) => p.details.country.slug === "usa")!
        .details.country.synonyms.push("Puerto Rico");
      w.shapes.push(shape("Puerto Rico"));
    });
    expect(byName(await features(data), "Puerto Rico")?.properties.match).toBe(
      "synonym__usa__puerto_rico",
    );
  });

  it("claims the shapes aliases and coverage aliases name", async () => {
    const all = await features(world());
    expect(byName(all, "Tokelau")?.properties.match).toBe(
      "alias__cook_islands_tokelau_and_niue__tokelau",
    );
    expect(byName(all, "U.S. Virgin Is.")?.properties.match).toBe(
      "coverage_alias__usa__u_s_virgin_is",
    );
    expect(byName(all, "Somaliland")?.properties.fcdo.country.slug).toBe("somalia");
  });

  it("leaves out blocked synonyms, pages known not to be drawn and shapes with no page", async () => {
    const all = await features(worldWith((w) => w.shapes.push(shape("England"))));
    expect(byName(all, "Christmas I.")).toBeUndefined();
    expect(byName(all, "England")).toBeUndefined();
    expect(all.some((f) => f.properties.fcdo.country.slug === "gibraltar")).toBe(false);
  });

  // Snapshot
  it("rounds coordinates to 3 decimals and drops repeated points", async () => {
    const data = worldWith((w) => {
      w.shapes = w.shapes.filter((s) => s.properties.NAME !== "Spain");
      w.shapes.push(
        shape("Spain", {}, [
          [
            [-5.60441, 36.01],
            [-5.60449, 36.01],
            [-4.4, 36.7],
            [-3.7, 40.4],
            [-5.60441, 36.01],
          ],
        ]),
      );
    });
    expect(byName(await features(data), "Spain")?.geometry.coordinates).toEqual([
      [
        [-5.604, 36.01],
        [-4.4, 36.7],
        [-3.7, 40.4],
        [-5.604, 36.01],
      ],
    ]);
  });

  it("writes a feature per matched shape, keyed by NE_ID and sorted by it", async () => {
    // Spain's page comes first and its shape last, so page order isn't NE_ID order
    const snapshot = await generate(worldWith((w) => w.pages.unshift(w.pages.pop()!)));
    const ids = snapshot.features.map((f) => f.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(snapshot.sources).toHaveLength(2);
    expect(snapshot.retrieved).toBe(RETRIEVED);
    const spain = byName(snapshot.features, "Spain");
    expect(spain).toEqual({
      type: "Feature",
      id: spain?.id,
      properties: {
        state: "none",
        match: null,
        naturalEarth: { NE_ID: spain?.id, NAME: "Spain", ADM0_A3: "XXX", NOTE_BRK: null },
        fcdo: {
          country: { name: "Spain", slug: "spain" },
          alert_status: [],
          public_updated_at: "2026-06-04T15:57:41+01:00",
          reviewed_at: "2026-06-04T14:57:41Z",
          change_description: "Latest update: summary of advice",
          url: "https://www.gov.uk/foreign-travel-advice/spain",
        },
      },
      geometry: spain?.geometry,
    });
  });

  // Run summary
  it("reports download time, matches by how, counts per state and shapes with no page", async () => {
    await generate(worldWith((w) => w.shapes.push(shape("England"))));
    const [summary] = vi.mocked(console.log).mock.lastCall ?? [];
    expect(String(summary).split("\n")).toEqual([
      expect.stringMatching(/^Pages: 22 scanned in \d+\.\d s, 1 known not drawn \(gibraltar\)$/),
      "States per page: none 22",
      "Shapes per match: alias 13, direct 10, coverage_alias 9",
      "Shapes with no page (2): Christmas I., England",
      expect.stringMatching(/^Wrote .*advisories\.geojson$/),
    ]);
  });
});

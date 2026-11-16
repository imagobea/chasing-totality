// Generates data/advisories.geojson, the travel advisories the API serves: the UK FCDO's advice for
// each country or territory, drawn on Natural Earth's shapes. The FCDO's index is the master list;
// Natural Earth only supplies shapes. Any failure stops the run before anything is written, so a
// broken source can't replace the committed snapshot. Decisions are in
// docs/plans/082-advisory-sources-and-geometry-plan.md.
//
// Run: pnpm data:advisories

import { writeFileSync } from "node:fs";

// The FCDO fields we use from GOV.UK's Content API; the full schema is published in alphagov's
// publishing-api repo (content_schemas/dist/formats/travel_advice)
type FcdoCountry = { name: string; slug: string; synonyms: string[] };

type FcdoPage = {
  base_path: string;
  public_updated_at: string;
  withdrawn_notice?: Record<string, unknown>;
  details: {
    country: FcdoCountry;
    alert_status: string[];
    reviewed_at: string;
    change_description: string;
    parts: { title: string; body: string }[];
  };
};

type FcdoIndex = { links: { children: { base_path: string }[] } };

type Position = [longitude: number, latitude: number];

type Geometry =
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

type NaturalEarthShape = {
  properties: {
    NE_ID: number;
    NAME: string;
    NAME_LONG: string;
    ADMIN: string;
    ADM0_A3: string;
    NOTE_BRK: string | null;
  };
  geometry: Geometry;
};

type State = "whole" | "parts" | "none";

// How a shape was matched to a page, when not by name: see Matching exceptions in the plan
type How = "synonym" | "alias" | "coverage_alias";

type Match = { shape: NaturalEarthShape; page: FcdoPage; how: How | null };

type Find = (name: string) => NaturalEarthShape | undefined;

type AdvisoryFeature = {
  type: "Feature";
  id: number;
  properties: {
    state: State;
    match: string | null;
    naturalEarth: Omit<NaturalEarthShape["properties"], "NAME_LONG" | "ADMIN">;
    fcdo: {
      country: Omit<FcdoCountry, "synonyms">;
      alert_status: string[];
      public_updated_at: string;
      reviewed_at: string;
      change_description: string;
      url: string;
    };
  };
  geometry: Geometry;
};

type AdvisoriesSnapshot = {
  type: "FeatureCollection";
  sources: Record<string, string>[];
  retrieved: string;
  features: AdvisoryFeature[];
};

// Sources
const CONTENT_API = "https://www.gov.uk/api/content";
const INDEX_PATH = "/foreign-travel-advice";
const PAGE_URL = "https://www.gov.uk";
const NATURAL_EARTH_COMMIT = "f1890d9f152c896d250a77557a5751a93d494776"; // tag v5.1.2
const NATURAL_EARTH_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_COMMIT}/geojson/ne_50m_admin_0_map_units.geojson`;
const SOURCES: Record<string, string>[] = [
  {
    name: "UK FCDO travel advice",
    url: "https://www.gov.uk/foreign-travel-advice",
    licence: "Open Government Licence v3.0",
    licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    attribution:
      "Contains public sector information licensed under the Open Government Licence v3.0.",
  },
  {
    name: "Natural Earth",
    url: "https://www.naturalearthdata.com",
    version: "5.1.2",
    licence: "Public domain",
  },
];
const OUTPUT = new URL("../data/advisories.geojson", import.meta.url);

// Polite fetching: one request at a time, ~5 a second, under the Content API's limit of 10
const USER_AGENT = "advisories-snapshot";
const REQUEST_GAP_MS = 200;
const RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const RETRYABLE = [429, 500, 502, 503, 504]; // any other status fails at once

// 3 decimals is ~110 m, far finer than Natural Earth's 1:50m borders
const COORDINATE_DECIMALS = 3;

// FCDO alert_status values; "avoid all" and "all but essential" count as one level
const STATES: Record<string, Exclude<State, "none">> = {
  avoid_all_travel_to_whole_country: "whole",
  avoid_all_but_essential_travel_to_whole_country: "whole",
  avoid_all_travel_to_parts: "parts",
  avoid_all_but_essential_travel_to_parts: "parts",
};

// Matching exceptions, keyed by FCDO slug, with shapes by Natural Earth NAME. See the plan's
// table: each one is checked on every run, and a stale one stops it.
const ALIASES: Record<string, string[]> = {
  myanmar: ["Myanmar"],
  "pitcairn-island": ["Pitcairn Is."],
  "st-helena-ascension-and-tristan-da-cunha": ["Saint Helena"],
  "antarctica-british-antarctic-territory": ["Antarctica"],
  "bonaire-st-eustatius-saba": ["Caribbean Netherlands"],
  "st-pierre-and-miquelon": ["St. Pierre and Miquelon"],
  "cook-islands-tokelau-and-niue": ["Cook Is.", "Tokelau", "Niue"],
  "st-lucia": ["Saint Lucia"],
  "st-vincent-and-the-grenadines": ["St. Vin. and Gren."],
  "cape-verde": ["Cabo Verde"],
  "south-georgia-and-south-sandwich-islands": ["S. Geo. and the Is."],
};
// Extra shapes a page covers, each with the text the page must still contain
const COVERAGE_ALIASES: Record<string, { shape: string; mentions: string }[]> = {
  somalia: [{ shape: "Somaliland", mentions: "Somaliland" }],
  cyprus: [{ shape: "N. Cyprus", mentions: "north of Cyprus" }],
  denmark: [{ shape: "Faeroe Is.", mentions: "Faroe Islands" }],
  usa: [
    { shape: "U.S. Virgin Is.", mentions: "US Virgin Islands" },
    { shape: "N. Mariana Is.", mentions: "Northern Mariana Islands" },
  ],
  tanzania: [{ shape: "Zanzibar", mentions: "Zanzibar" }],
  italy: [{ shape: "Vatican", mentions: "Vatican" }],
  "papua-new-guinea": [{ shape: "Bougainville", mentions: "Bougainville" }],
  norway: [{ shape: "Svalbard Is.", mentions: "Svalbard" }],
};
// Synonym matches to ignore: Kiribati's Christmas Island is Kiritimati, not Australia's island
const BLOCKED: Record<string, string[]> = { kiribati: ["Christmas I."] };
// Pages with no shape at 1:50m
const KNOWN_NOT_DRAWN = ["gibraltar"];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// GETs JSON one request at a time, retrying a few times; fails on anything but a 200. Redirects
// count as failures too: a moved page is worth a look before it's trusted.
async function fetchJson<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    // Every request waits its turn; a retry waits longer
    await wait(attempt ? RETRY_DELAY_MS : REQUEST_GAP_MS);

    let response: Response;
    try {
      response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "manual" });
    } catch (error) {
      // A network error is worth retrying, like a busy server
      if (attempt < RETRIES) continue;
      throw new Error(`${url} failed: ${error}`, { cause: error });
    }

    if (response.status === 200) return (await response.json()) as T;
    if (!RETRYABLE.includes(response.status) || attempt >= RETRIES) {
      throw new Error(`${url} answered ${response.status} ${response.statusText}`);
    }
  }
}

// The index's page paths, then each page, in index order. Fails if the index is empty or lists a
// page twice, or if a page is withdrawn.
async function fetchPages(): Promise<FcdoPage[]> {
  const index = await fetchJson<FcdoIndex>(`${CONTENT_API}${INDEX_PATH}`);
  const paths = index.links.children.map((child) => child.base_path);
  if (!paths.length) throw new Error("The FCDO index lists no pages");
  if (new Set(paths).size !== paths.length) throw new Error("The FCDO index lists a page twice");

  // One after the other, never in parallel, to stay polite
  const pages: FcdoPage[] = [];
  for (const path of paths) {
    const page = await fetchJson<FcdoPage>(`${CONTENT_API}${path}`);
    if (page.withdrawn_notice && Object.keys(page.withdrawn_notice).length) {
      throw new Error(`${path} is withdrawn`);
    }
    pages.push(page);
  }
  return pages;
}

// Natural Earth's shapes at the pinned release
async function fetchShapes(): Promise<NaturalEarthShape[]> {
  const { features } = await fetchJson<{ features: NaturalEarthShape[] }>(NATURAL_EARTH_URL);
  if (!features?.length) throw new Error("Natural Earth has no shapes");
  return features;
}

// Lowercase snake_case without accents: "St-Barthélemy" reads st_barthelemy
function snakeCase(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// Looks shapes up by NAME or NAME_LONG in snake_case, so "Eswatini" finds "eSwatini"
function shapeFinder(shapes: NaturalEarthShape[]): Find {
  const byName = new Map<string, NaturalEarthShape>();
  for (const shape of shapes) {
    byName.set(snakeCase(shape.properties.NAME_LONG), shape);
    // Set last, so a shape's own NAME wins over another's NAME_LONG
    byName.set(snakeCase(shape.properties.NAME), shape);
  }
  return (name) => byName.get(snakeCase(name));
}

// The shape named like the page or, failing that, every part of a country Natural Earth splits up
// (ADMIN: Belgium's three regions)
function ownShapes(page: FcdoPage, shapes: NaturalEarthShape[], find: Find): NaturalEarthShape[] {
  const { name } = page.details.country;
  const own = find(name);
  if (own) return [own];

  return shapes.filter((shape) => snakeCase(shape.properties.ADMIN) === snakeCase(name));
}

// The shapes a page's synonyms name, less blocked ones. Fails if a blocked one no longer matches.
function synonymShapes(page: FcdoPage, find: Find): NaturalEarthShape[] {
  const { slug, synonyms } = page.details.country;
  // Most synonyms are cities, regions or misspellings, and name no shape
  const named = synonyms.map(find).filter((shape) => !!shape);

  const blocked = BLOCKED[slug] ?? [];
  for (const name of blocked) {
    if (!named.some((shape) => shape.properties.NAME === name)) {
      throw new Error(`${slug} no longer has a synonym for ${name} to block`);
    }
  }

  return named.filter((shape) => !blocked.includes(shape.properties.NAME));
}

// The shapes a page's aliases and coverage aliases name. Fails if one has no shape, or if the page
// no longer mentions a place it covers.
function exceptionShapes(page: FcdoPage, find: Find): { shape: NaturalEarthShape; how: How }[] {
  const { slug } = page.details.country;
  const named = (name: string) => {
    const shape = find(name);
    if (!shape) throw new Error(`Exception for ${slug} names ${name}, which has no shape`);
    return shape;
  };

  const aliased = (ALIASES[slug] ?? []).map((name) => ({
    shape: named(name),
    how: "alias" as const,
  }));

  // A coverage alias holds only while the page's text still names the place
  const text = page.details.parts.map((part) => part.body).join(" ");
  const covered = (COVERAGE_ALIASES[slug] ?? []).map(({ shape, mentions }) => {
    if (!text.includes(mentions)) throw new Error(`${slug} no longer mentions ${mentions}`);
    return { shape: named(shape), how: "coverage_alias" as const };
  });

  return [...aliased, ...covered];
}

// One page's shapes: its own, then its synonyms', then its exceptions'. Fails on an exception that
// repeats a match, or on a page with no shape that isn't known not to be drawn.
function matchPage(page: FcdoPage, shapes: NaturalEarthShape[], find: Find): Match[] {
  const { name, slug } = page.details.country;
  const matches: Match[] = [];
  const has = (shape: NaturalEarthShape) => matches.some((match) => match.shape === shape);

  for (const shape of ownShapes(page, shapes, find)) {
    matches.push({ shape, page, how: null });
  }

  // With no own shape, the first synonym's is the page's own (USA's "United States"); any other
  // is a separate shape the page covers (USA's "Puerto Rico")
  for (const shape of synonymShapes(page, find)) {
    if (!has(shape)) matches.push({ shape, page, how: matches.length ? "synonym" : null });
  }

  // An exception that finds a shape already matched is stale
  for (const { shape, how } of exceptionShapes(page, find)) {
    if (has(shape)) {
      throw new Error(`Exception for ${slug} names ${shape.properties.NAME}, already matched`);
    }
    matches.push({ shape, page, how });
  }

  const notDrawn = KNOWN_NOT_DRAWN.includes(slug);
  if (!matches.length && !notDrawn) throw new Error(`${slug} (${name}) matches no shape`);
  if (matches.length && notDrawn) throw new Error(`${slug} is known not drawn, but has a shape`);
  return matches;
}

// Pairs each page with its shapes. Fails on an exception for a page that no longer exists, or on a
// shape claimed by two pages.
function matchShapes(pages: FcdoPage[], shapes: NaturalEarthShape[]): Match[] {
  const slugs = new Set(pages.map((page) => page.details.country.slug));
  const excepted = [ALIASES, COVERAGE_ALIASES, BLOCKED].flatMap(Object.keys);
  for (const slug of [...excepted, ...KNOWN_NOT_DRAWN]) {
    if (!slugs.has(slug)) throw new Error(`Exception for ${slug}, which has no page`);
  }

  const find = shapeFinder(shapes);
  const matches = pages.flatMap((page) => matchPage(page, shapes, find));

  const claimedBy = new Map<NaturalEarthShape, string>();
  for (const { shape, page } of matches) {
    const { slug } = page.details.country;
    const other = claimedBy.get(shape);
    if (other) throw new Error(`${shape.properties.NAME} is claimed by ${other} and ${slug}`);
    claimedBy.set(shape, slug);
  }

  return matches;
}

// Our state from the FCDO's alert_status: whole beats parts. Fails on an unknown value.
function stateOf(alertStatus: string[]): State {
  const unknown = alertStatus.filter((status) => !Object.hasOwn(STATES, status));
  if (unknown.length) throw new Error(`Unknown FCDO alert status ${unknown.join(", ")}`);

  const states = alertStatus.map((status) => STATES[status]);
  if (states.includes("whole")) return "whole";
  return states.includes("parts") ? "parts" : "none";
}

// `<how>__<page slug>__<shape name>` in snake_case, or null for a direct match
function matchLabel(match: Match): string | null {
  if (!match.how) return null;

  const { slug } = match.page.details.country;
  return [match.how, snakeCase(slug), snakeCase(match.shape.properties.NAME)].join("__");
}

// Rounds coordinates and drops repeated points. Fails if a ring collapses.
function roundGeometry(shape: NaturalEarthShape): Geometry {
  const round = (value: number) => Number(value.toFixed(COORDINATE_DECIMALS));
  const ring = (points: Position[]) => {
    const rounded = points
      .map(([lon, lat]): Position => [round(lon), round(lat)])
      .filter((point, i, all) => !i || point[0] !== all[i - 1][0] || point[1] !== all[i - 1][1]);
    // A closed ring needs 3 distinct points and the first one again
    if (rounded.length < 4) throw new Error(`A ring of ${shape.properties.NAME} collapses`);
    return rounded;
  };

  const { geometry } = shape;
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(ring) };
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polygon) => polygon.map(ring)),
  };
}

// One shape with our fields, then Natural Earth's and the FCDO's under their own names
function toFeature(match: Match): AdvisoryFeature {
  const { shape, page } = match;
  const { NE_ID, NAME, ADM0_A3, NOTE_BRK } = shape.properties;
  const { country, alert_status, reviewed_at, change_description } = page.details;

  return {
    type: "Feature",
    id: NE_ID,
    properties: {
      state: stateOf(alert_status),
      match: matchLabel(match),
      naturalEarth: { NE_ID, NAME, ADM0_A3, NOTE_BRK },
      fcdo: {
        country: { name: country.name, slug: country.slug },
        alert_status,
        public_updated_at: page.public_updated_at,
        reviewed_at,
        change_description: change_description.trim(),
        // The page people read, not the API
        url: `${PAGE_URL}${page.base_path}`,
      },
    },
    geometry: roundGeometry(shape),
  };
}

// One feature per matched shape, sorted by NE_ID
function toAdvisoriesGeoJson(matches: Match[], retrieved: string): AdvisoriesSnapshot {
  const features = matches.map(toFeature).sort((a, b) => a.id - b.id);
  return { type: "FeatureCollection", sources: SOURCES, retrieved, features };
}

// Pages scanned and matched by how, counts per state, and shapes with no page, for review
function runSummary(pages: FcdoPage[], shapes: NaturalEarthShape[], matches: Match[]): string {
  // "a 2, b 1", in order of first appearance
  const count = <T>(items: T[], key: (item: T) => string) => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
    return [...counts].map(([name, n]) => `${name} ${n}`).join(", ");
  };

  const matched = new Set(matches.map((match) => match.shape));
  const noPage = shapes.filter((shape) => !matched.has(shape)).map((s) => s.properties.NAME);

  return [
    `Pages: ${pages.length} scanned, ${KNOWN_NOT_DRAWN.length} known not drawn (${KNOWN_NOT_DRAWN.join(", ")})`,
    `States per page: ${count(pages, (page) => stateOf(page.details.alert_status))}`,
    `Shapes per match: ${count(matches, (match) => match.how ?? "direct")}`,
    `Shapes with no page (${noPage.length}): ${noPage.sort().join(", ")}`,
  ].join("\n");
}

async function main() {
  // Step 1: fetch every FCDO page in the index, dated in UTC whatever the local time zone
  const retrieved = new Date().toISOString().slice(0, 10);
  const pages = await fetchPages();

  // Step 2: download Natural Earth's shapes
  const shapes = await fetchShapes();

  // Step 3: match each page to its shapes
  const matches = matchShapes(pages, shapes);

  // Step 4: build the snapshot, with each shape's state and rounded coordinates
  const snapshot = toAdvisoriesGeoJson(matches, retrieved);

  // Step 5: write the snapshot over the committed one, then report the run for review
  writeFileSync(OUTPUT, `${JSON.stringify(snapshot)}\n`);
  console.log(`${runSummary(pages, shapes, matches)}\nWrote ${OUTPUT.pathname}`);
}

await main();

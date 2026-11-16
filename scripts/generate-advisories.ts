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
    ADM0_A3: string;
    NOTE_BRK: string | null;
  };
  geometry: Geometry;
};

type State = "whole" | "parts" | "none";

// How a shape was matched to a page, when not by name: see Matching exceptions in the plan
type How = "synonym" | "alias" | "coverage_alias";

type Match = { shape: NaturalEarthShape; page: FcdoPage; how: How | null };

type AdvisoryFeature = {
  type: "Feature";
  id: number;
  properties: {
    state: State;
    match: string | null;
    naturalEarth: NaturalEarthShape["properties"];
    fcdo: {
      country: FcdoCountry;
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

const CONTENT_API = "https://www.gov.uk/api/content";
const INDEX_PATH = "/foreign-travel-advice";
const PAGE_URL = "https://www.gov.uk";
const NATURAL_EARTH_COMMIT = "f1890d9f152c896d250a77557a5751a93d494776"; // tag v5.1.2
const NATURAL_EARTH_URL = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NATURAL_EARTH_COMMIT}/geojson/ne_50m_admin_0_map_units.geojson`;
const OUTPUT = new URL("../data/advisories.geojson", import.meta.url);
const SOURCES = [
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
// Polite fetching: one request at a time, ~5 a second, under the Content API's limit of 10
const USER_AGENT = "advisories-snapshot";
const REQUEST_GAP_MS = 200;
const RETRIES = 3;
const RETRY_DELAY_MS = 2000;
// 3 decimals is ~110 m, far finer than Natural Earth's 1:50m borders
const COORDINATE_DECIMALS = 3;
// FCDO alert_status values; "avoid all" and "all but essential" count as one level
const STATES: Record<string, Exclude<State, "none">> = {
  avoid_all_travel_to_whole_country: "whole",
  avoid_all_but_essential_travel_to_whole_country: "whole",
  avoid_all_travel_to_parts: "parts",
  avoid_all_but_essential_travel_to_parts: "parts",
};
// Matching exceptions, keyed by FCDO slug. Shapes are Natural Earth NAMEs.
const ALIASES: Record<string, string[]> = {
  myanmar: ["Myanmar"],
  "pitcairn-island": ["Pitcairn Is."],
  "st-helena-ascension-and-tristan-da-cunha": ["Saint Helena"],
  "antarctica-british-antarctic-territory": ["Antarctica"],
  "bonaire-st-eustatius-saba": ["Caribbean Netherlands"],
  "st-pierre-and-miquelon": ["St. Pierre and Miquelon"],
  "cook-islands-tokelau-and-niue": ["Cook Is.", "Tokelau", "Niue"],
  "st-martin-and-st-barthelemy": ["St-Martin", "St-Barthélemy"],
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
};
// Synonym matches to ignore: Kiribati's Christmas Island is Kiritimati, not Australia's island
const BLOCKED: Record<string, string[]> = { kiribati: ["Christmas I."] };
// Pages with no shape at 1:50m
const KNOWN_NOT_DRAWN = ["gibraltar"];

// GETs JSON one request at a time, retrying a few times; fails on anything but a 200
async function fetchJson<T>(url: string): Promise<T> {
  throw new Error("Not implemented");
}

// The index's page paths, then each page, in index order. Fails if a page is withdrawn or the
// count differs from the index.
async function fetchPages(): Promise<FcdoPage[]> {
  throw new Error("Not implemented");
}

// Our state from the FCDO's alert_status: whole beats parts. Fails on an unknown value.
function stateOf(alertStatus: string[]): State {
  throw new Error("Not implemented");
}

// Natural Earth's shapes at the pinned release
async function fetchShapes(): Promise<NaturalEarthShape[]> {
  throw new Error("Not implemented");
}

// Pairs each page with its shapes: by name or synonym, then the exceptions. Fails on an unmatched
// page, a stale alias, a coverage alias the page no longer mentions, or a shape claimed twice.
function matchShapes(pages: FcdoPage[], shapes: NaturalEarthShape[]): Match[] {
  throw new Error("Not implemented");
}

// `<how>__<page slug>__<shape name>` in snake_case, or null for a match by name
function matchLabel(match: Match): string | null {
  throw new Error("Not implemented");
}

// Rounds coordinates and drops repeated points. Fails if a ring collapses.
function roundGeometry(geometry: Geometry): Geometry {
  throw new Error("Not implemented");
}

// One feature per matched shape, sorted by NE_ID
function toAdvisoriesGeoJson(matches: Match[], retrieved: string): AdvisoriesSnapshot {
  throw new Error("Not implemented");
}

// Pages scanned and matched by how, counts per state, and shapes with no page, for review
function runSummary(pages: FcdoPage[], shapes: NaturalEarthShape[], matches: Match[]): string {
  throw new Error("Not implemented");
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

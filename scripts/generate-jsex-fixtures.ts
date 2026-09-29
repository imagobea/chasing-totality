// Generates test/fixtures/jsex-2027.json: local circumstances of the 2027-08-02 eclipse at a set
// of points, computed by NASA's Javascript Solar Eclipse Explorer (JSEX), to test our engine
// against.
//
// JSEX is GPL-2.0-or-later, so it is not part of this repo: this script downloads it at a pinned
// commit, runs it in an isolated node:vm context, and only its output is committed. JSEX is
// written for a browser form, so the form is stubbed with each point's coordinates.
//
// Run: pnpm spike:fixtures

import { readFileSync, writeFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { along, pastLimit } from "../test/geo.js";
import { parseNasaPath, type LatLon } from "../test/nasaPath.js";

const JSEX_COMMIT = "dbbd677c00e215c33d3d47a1aa920a6fbc2ff982";
const JSEX_URL = `https://raw.githubusercontent.com/ebradyjobory/eclipse-explorer/${JSEX_COMMIT}/JSEX`;
const ECLIPSE_JULIAN_DATE = 2461619.922108; // identifies 2027-08-02 in SE2001.js
const ELEMENTS_PER_ECLIPSE = 28; // JSEX's layout of each eclipse in the elements array
const OUTPUT = new URL("../test/fixtures/jsex-2027.json", import.meta.url);

type Point = LatLon & { name: string; altitudeMeters: number };

// JSEX's local event types (mid[39]).
const TYPES = ["none", "partial", "annular", "total"] as const;

const points = [...cities(), ...pointsAroundThePath()];
const jsex = await loadJsex();
const results = points.map((point) => ({ ...point, ...jsex.circumstances(point) }));

writeFileSync(
  OUTPUT,
  `${JSON.stringify({ source: `${JSEX_URL}/program.js`, generatedBy: "scripts/generate-jsex-fixtures.ts", points: results }, null, 2)}\n`,
);
console.log(`Wrote ${results.length} points to ${OUTPUT.pathname}`);

function cities(): Point[] {
  return [
    // Inside the path
    { name: "Tarifa", lat: 36.013, lon: -5.604 },
    { name: "Cádiz", lat: 36.529, lon: -6.292 },
    { name: "Málaga", lat: 36.721, lon: -4.421 },
    { name: "Tangier", lat: 35.767, lon: -5.8 },
    { name: "Tétouan", lat: 35.578, lon: -5.368 },
    { name: "Oran", lat: 35.697, lon: -0.633 },
    { name: "Benghazi", lat: 32.119, lon: 20.086 },
    { name: "Luxor", lat: 25.687, lon: 32.639 },
    { name: "Jeddah", lat: 21.485, lon: 39.192 },
    { name: "Mecca", lat: 21.389, lon: 39.858 },
    // Just outside the path: partial eclipse only
    { name: "Seville", lat: 37.389, lon: -5.984 },
    { name: "Aswan", lat: 24.089, lon: 32.899 },
    { name: "Madrid", lat: 40.417, lon: -3.704 },
    { name: "Cairo", lat: 30.044, lon: 31.236 },
  ].map((city) => ({ ...city, altitudeMeters: 0 }));
}

// Points across the path at a few NASA table rows over Spain and North Africa: the central
// line, halfway to each limit, and 1 km either side of each limit, where duration is most
// sensitive.
function pointsAroundThePath(): Point[] {
  const rows = parseNasaPath(
    readFileSync(new URL("../test/fixtures/SE2027Aug02Tpath.txt", import.meta.url), "utf8"),
  );
  return ["08:48", "09:04", "09:28", "10:00", "10:24"].flatMap((time) => {
    const row = rows.find((r) => r.time === time);
    if (!row?.north || !row.south) throw new Error(`NASA row ${time} is missing a limit`);
    const { central, north, south } = row;
    const point = (name: string, at: LatLon, altitudeMeters = 0): Point => ({
      name: `${time} ${name}`,
      ...at,
      altitudeMeters,
    });
    return [
      point("central line", central),
      point("halfway to north limit", along(central, north, 0.5)),
      point("halfway to south limit", along(central, south, 0.5)),
      point("north limit, 1 km inside", pastLimit(central, north, -1)),
      point("north limit, 1 km outside", pastLimit(central, north, 1)),
      point("south limit, 1 km inside", pastLimit(central, south, -1)),
      point("south limit, 1 km outside", pastLimit(central, south, 1)),
      point("halfway to north limit, 2000 m altitude", along(central, north, 0.5), 2000),
    ];
  });
}

async function loadJsex() {
  const [program, elementsFile] = await Promise.all(
    ["program.js", "SE2001.js"].map(async (file) => {
      const response = await fetch(`${JSEX_URL}/${file}`);
      if (!response.ok) throw new Error(`Cannot download ${file}: HTTP ${response.status}`);
      return response.text();
    }),
  );

  const form = stubForm();
  const context = createContext({ document: { eclipseform: form } });
  runInContext(program, context);

  // Once loaded, SE2001.js calls recalculate() → SE2001() → calculatefor(elements of all its
  // eclipses), which would render the page; capture the elements instead.
  let elements: number[] = [];
  context.calculatefor = (all: number[]) => (elements = all);
  context.currenttimeperiod = "SE2001";
  runInContext(elementsFile, context);
  const index = elements.indexOf(ECLIPSE_JULIAN_DATE);
  if (index < 0 || index % ELEMENTS_PER_ECLIPSE !== 0) {
    throw new Error("2027-08-02 not found in SE2001.js");
  }
  const [t0 = 0, , , , deltaT = 0] = elements.slice(index + 1, index + 6);

  return {
    circumstances({ lat, lon, altitudeMeters }: Point) {
      form.set(lat, lon, altitudeMeters);
      runInContext("readform()", context);
      context.obsvconst[6] = index;
      runInContext("getall(elements)", Object.assign(context, { elements }));

      const { mid, c2, c3 } = context as unknown as Record<"mid" | "c2" | "c3", number[]>;
      const type = TYPES[mid[39] ?? 0] ?? "none";
      const central = type === "total" || type === "annular";
      return {
        type,
        // t is in hours from t0, in TDT.
        mid: t0 + (mid[1] ?? 0) - deltaT / 3600,
        durationSeconds: central ? ((c3[1] ?? 0) - (c2[1] ?? 0)) * 3600 : 0,
      };
    },
  };
}

// The subset of JSEX's HTML form that readform() reads. Coordinates go in as decimal degrees,
// with the hemisphere in the select fields: JSEX uses north and west positive.
function stubForm() {
  const field = (value = "0") => ({ value });
  const select = (value = "1") => ({ selectedIndex: 0, options: [{ value }] });
  const form = {
    latd: field(), // degrees
    latm: field(), // minutes, left at 0
    lats: field(), // seconds, left at 0
    latx: select(), // 1 north, -1 south
    lond: field(),
    lonm: field(),
    lons: field(),
    lonx: select(), // 1 west, -1 east
    alt: field(), // meters
    tzh: select("0"), // time zone: UT
    tzm: select("0"),
    tzx: select("1"),
    set(lat: number, lon: number, altitudeMeters: number) {
      form.latd.value = String(Math.abs(lat));
      form.latx.options[0] = { value: lat < 0 ? "-1" : "1" };
      form.lond.value = String(Math.abs(lon));
      form.lonx.options[0] = { value: lon > 0 ? "-1" : "1" };
      form.alt.value = String(altitudeMeters);
    },
  };
  return form;
}

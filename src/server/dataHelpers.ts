import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// The airports snapshot, as far as the server reads it; properties are passed through as is
export type AirportsSnapshot = {
  type: "FeatureCollection";
  source: { name: string; url: string; licence: string };
  // YYYY-MM-DD
  retrieved: string;
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [longitude: number, latitude: number] };
    properties: Record<string, unknown>;
  }[];
};

// A data file named after its eclipse, e.g. 2027-08-02.geojson, capturing the date
const DATA_FILE = /^(\d{4}-\d{2}-\d{2})\.geojson$/;
// A snapshot's retrieval date
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// An advisory's level, from the UK's travel advice: avoid all or all but essential travel to the
// whole place, to parts of it, or neither
const ADVISORY_STATES = ["whole", "parts", "none"];

// A broken or missing data file, named, with what is wrong with it
export class DataError extends Error {
  constructor(
    readonly file: string,
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`${file}: ${reason}`, options);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A data source with a name, url and licence, as snapshots credit them
function isSource(value: unknown): boolean {
  return (
    isObject(value) && ["name", "url", "licence"].every((key) => typeof value[key] === "string")
  );
}

// Check a snapshot's retrieval date, YYYY-MM-DD
function checkRetrieved(retrieved: unknown, file: string): void {
  if (typeof retrieved !== "string" || !DATE.test(retrieved)) {
    throw new DataError(file, `invalid retrieved date: ${JSON.stringify(retrieved)}`);
  }
}

// List the files in a directory, or throw a DataError if it fails
async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (error) {
    throw new DataError(dir, `cannot list folder (${(error as NodeJS.ErrnoException).code})`, {
      cause: error,
    });
  }
}

// Read a file and parse it as JSON, or throw a DataError if it fails
async function readJson(file: string): Promise<{ bytes: Buffer; json: unknown }> {
  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch (error) {
    throw new DataError(file, `cannot read (${(error as NodeJS.ErrnoException).code})`, {
      cause: error,
    });
  }
  try {
    return { bytes, json: JSON.parse(bytes.toString("utf8")) };
  } catch (error) {
    throw new DataError(file, `invalid JSON (${(error as Error).message})`, { cause: error });
  }
}

// Check that the isolines JSON is valid
function checkIsolines(json: unknown, file: string): void {
  // The top-level object must be a FeatureCollection with a bbox and features
  if (!isObject(json) || json.type !== "FeatureCollection") {
    throw new DataError(file, "not a FeatureCollection");
  }
  const { bbox, features } = json;

  // The bbox must be an array of four finite numbers
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) {
    throw new DataError(file, `invalid bbox: ${JSON.stringify(bbox)}`);
  }

  // There must be at least one feature
  if (!Array.isArray(features) || features.length === 0) {
    throw new DataError(file, "no features");
  }

  // Each feature must have a properties object with a finite durationSeconds
  for (const [i, feature] of (features as unknown[]).entries()) {
    const props = isObject(feature) ? feature.properties : undefined;
    if (!isObject(props) || !Number.isFinite(props.durationSeconds)) {
      throw new DataError(file, `feature ${i} missing durationSeconds`);
    }
  }
}

// Check that the airports JSON is a snapshot of points with its source and retrieval date
function checkAirports(json: unknown, file: string): asserts json is AirportsSnapshot {
  if (!isObject(json) || json.type !== "FeatureCollection") {
    throw new DataError(file, "not a FeatureCollection");
  }
  const { source, retrieved, features } = json;

  // Where the airports come from
  if (!isSource(source)) {
    throw new DataError(file, "source needs a name, url and licence");
  }

  // The day they were retrieved
  checkRetrieved(retrieved, file);

  if (!Array.isArray(features) || features.length === 0) {
    throw new DataError(file, "no features");
  }

  // Each feature must be a point with a finite longitude and latitude
  for (const [i, feature] of (features as unknown[]).entries()) {
    const geometry = isObject(feature) ? feature.geometry : undefined;
    const coordinates = isObject(geometry) ? geometry.coordinates : undefined;
    if (
      !isObject(geometry) ||
      geometry.type !== "Point" ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2 ||
      !coordinates.every(Number.isFinite)
    ) {
      throw new DataError(file, `feature ${i} is not a point`);
    }
  }
}

// Check that the advisories JSON is a snapshot of places with a known state and a polygon shape,
// with its sources and retrieval date
function checkAdvisories(json: unknown, file: string): void {
  if (!isObject(json) || json.type !== "FeatureCollection") {
    throw new DataError(file, "not a FeatureCollection");
  }
  const { sources, retrieved, features } = json;

  // Where the advisories and the shapes come from
  if (!Array.isArray(sources) || sources.length === 0 || !sources.every(isSource)) {
    throw new DataError(file, "sources need a name, url and licence each");
  }

  // Each labelled with the group of place fields it supplies
  if (!sources.every((source) => typeof source.fields === "string")) {
    throw new DataError(file, "sources need the fields they supply each");
  }

  // The day they were retrieved
  checkRetrieved(retrieved, file);

  if (!Array.isArray(features) || features.length === 0) {
    throw new DataError(file, "no features");
  }

  // Each feature must have a known state and a polygon shape
  for (const [i, feature] of (features as unknown[]).entries()) {
    const props = isObject(feature) ? feature.properties : undefined;
    const state = isObject(props) ? props.state : undefined;
    if (typeof state !== "string" || !ADVISORY_STATES.includes(state)) {
      throw new DataError(file, `feature ${i} has an unknown state: ${JSON.stringify(state)}`);
    }
    const geometry = isObject(feature) ? feature.geometry : undefined;
    if (!isObject(geometry) || !["Polygon", "MultiPolygon"].includes(String(geometry.type))) {
      throw new DataError(file, `feature ${i} is not a polygon`);
    }
  }
}

// The isolines snapshots, keyed by eclipse date, as their bytes, since the route sends them as is
export async function loadIsolines(dataDir: string): Promise<Map<string, Buffer>> {
  const isolinesMap = new Map<string, Buffer>();

  // Sorted, so the eclipses are kept in date order whatever order the folder lists them in
  const files = (await listDir(dataDir)).sort();
  // There must be at least one eclipse, or the server won't start
  if (files.length === 0) {
    throw new DataError(dataDir, "empty folder");
  }

  // Each file must be named after its eclipse, e.g. 2027-08-02.geojson,
  // and contain valid isolines. We assume dates are real calendar dates.
  for (const file of files) {
    const date = DATA_FILE.exec(file)?.[1];
    if (!date) {
      throw new DataError(dataDir, `invalid file name ${file}`);
    }

    // The full path, so every error names the file the same way
    const path = join(dataDir, file);
    const fileContents = await readJson(path);
    checkIsolines(fileContents.json, path);

    // Keyed by date, which is what the routes are asked for
    isolinesMap.set(date, fileContents.bytes);
  }

  return isolinesMap;
}

// The airports snapshot as its JSON, since the route filters its points by bbox
export async function loadAirports(airportsFile: string): Promise<AirportsSnapshot> {
  const { json } = await readJson(airportsFile);
  checkAirports(json, airportsFile);
  return json;
}

// The advisories snapshot as its bytes, since the route sends it as is
export async function loadAdvisories(advisoriesFile: string): Promise<Buffer> {
  const { bytes, json } = await readJson(advisoriesFile);
  checkAdvisories(json, advisoriesFile);
  return bytes;
}

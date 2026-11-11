import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

// A data file named after its eclipse, e.g. 2027-08-02.geojson
const DATA_FILE = /^\d{4}-\d{2}-\d{2}\.geojson$/;
const EXTENSION = ".geojson";

// define DataError class to handle errors related to data loading
class DataError extends Error {
  constructor(
    readonly file: string,
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`${file}: ${reason}`, options);
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
  const isObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  // The top-level object must be a FeatureCollection with a bbox and features
  if (!isObject(json) || json.type !== "FeatureCollection") {
    throw new DataError(file, "not a FeatureCollection");
  }
  const { bbox, features } = json;

  // The bbox must be an array of four finite numbers
  if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) {
    throw new DataError(file, `invalid bbox: ${JSON.stringify(bbox)}`);
  }

  // The features must be an array of objects
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

export async function loadIsolines(dataDir: string): Promise<Map<string, Buffer>> {
  const isolinesMap = new Map<string, Buffer>();

  const files = await listDir(dataDir);
  // There must be at least one file, or the server won't start.
  // We assume no stray files in the dataDir, so a missing file is a broken build.
  if (files.length === 0) {
    throw new DataError(dataDir, "no <date>.geojson files found");
  }

  // Each file must be named after its eclipse, e.g. 2027-08-02.geojson,
  // and contain valid isolines. We assume dates are real calendar dates.
  for (const file of files) {
    if (!DATA_FILE.test(file)) {
      throw new DataError(dataDir, `invalid file name ${file}`);
    }

    const fileContents = await readJson(join(dataDir, file));
    checkIsolines(fileContents.json, file);

    // Keyed by date, which is what the routes are asked for
    isolinesMap.set(basename(file, EXTENSION), fileContents.bytes);
  }

  return isolinesMap;
}

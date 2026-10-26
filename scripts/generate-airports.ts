// Generates data/airports.geojson, the airports the API serves, from OurAirports' airports CSV.
// Airports rarely change, so the snapshot is committed and refreshed by rerunning this by hand.
//
// Run: pnpm data:airports

import { writeFileSync } from "node:fs";

type Airport = {
  iata: string;
  name: string;
  municipality: string;
  country: string;
  size: "large" | "medium";
};

type AirportFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Airport;
};

type AirportsSnapshot = {
  type: "FeatureCollection";
  source: { name: string; url: string; licence: string };
  retrieved: string;
  features: AirportFeature[];
};

const OURAIRPORTS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const OUTPUT = new URL("../data/airports.geojson", import.meta.url);
const SOURCE = {
  name: "OurAirports",
  url: "https://ourairports.com/data/",
  licence: "Public domain",
};
const SIZES: Record<string, Airport["size"]> = { large_airport: "large", medium_airport: "medium" };
const IATA = /^[A-Z]{3}$/;
const REQUIRED_COLUMNS = [
  "type",
  "name",
  "latitude_deg",
  "longitude_deg",
  "iso_country",
  "municipality",
  "scheduled_service",
  "iata_code",
];
// 4 decimals is ~11 m, plenty for an airport icon
const COORDINATE_DECIMALS = 4;

async function download(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OurAirports answered ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// RFC 4180: fields may be quoted, with "" for a quote and commas or newlines inside. Each row
// becomes a record keyed by the header's column names
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) rows.push([...row, field]);

  const [header = [], ...records] = rows;
  return records.map((values) =>
    Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""])),
  );
}

function round(value: number): number {
  return Number(value.toFixed(COORDINATE_DECIMALS));
}

// parseFloat, not Number, so a blank cell reads as NaN rather than 0
function coordinates(row: Record<string, string>): [longitude: number, latitude: number] {
  return [round(parseFloat(row.longitude_deg)), round(parseFloat(row.latitude_deg))];
}

// Large and medium airports with scheduled service, an IATA code and coordinates, sorted by IATA
// code. Fails rather than return none, so a broken download can't replace the committed snapshot
function toAirportsGeoJson(rows: Record<string, string>[], retrieved: string): AirportsSnapshot {
  const missing = rows.length ? REQUIRED_COLUMNS.filter((column) => !(column in rows[0])) : [];
  if (missing.length) throw new Error(`OurAirports CSV has no ${missing.join(", ")} column`);

  const features = rows
    .filter(
      (row) =>
        row.type in SIZES &&
        row.scheduled_service === "yes" &&
        IATA.test(row.iata_code) &&
        coordinates(row).every(Number.isFinite),
    )
    .map((row): AirportFeature => ({
      type: "Feature",
      id: row.iata_code,
      geometry: {
        type: "Point",
        coordinates: coordinates(row),
      },
      properties: {
        iata: row.iata_code,
        name: row.name,
        municipality: row.municipality,
        country: row.iso_country,
        size: SIZES[row.type],
      },
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!features.length) throw new Error("OurAirports CSV has no airports to keep");

  return { type: "FeatureCollection", source: SOURCE, retrieved, features };
}

async function main() {
  // Get the current date as the retrieval date
  const retrieved = new Date().toISOString().slice(0, 10);

  const csvText = await download(OURAIRPORTS_CSV_URL);
  const rows = parseCsv(csvText);
  const snapshot = toAirportsGeoJson(rows, retrieved);

  writeFileSync(OUTPUT, `${JSON.stringify(snapshot)}\n`);
  console.log(`Wrote ${snapshot.features.length} airports to ${OUTPUT.pathname}`);
}

await main();

// Parser for NASA's eclipse path tables (e.g. fixtures/SE2027Aug02Tpath.txt), used as a test oracle.
// Each row is one instant: where the northern limit, southern limit and central line of the
// shadow's path are at that time, plus how long totality lasts on the central line.

export type LatLon = { lat: number; lon: number }; // degrees, north- and east-positive

export type PathRow = {
  time: string; // "HH:MM" UT, or "Limits" for the sunrise/sunset ends of the path
  north: LatLon | null; // null when the limit is off the Earth at that time
  south: LatLon | null;
  central: LatLon;
  durationSeconds: number; // on the central line
};

const ROW = /^ (Limits|\d\d:\d\d) /;

export function parseNasaPath(text: string): PathRow[] {
  return text
    .split("\n")
    .filter((line) => ROW.test(line))
    .map((line) => ({
      time: line.slice(1, 7).trim(),
      // Fixed-width columns, as NASA publishes them.
      north: parseLatLon(line.slice(9, 27)),
      south: parseLatLon(line.slice(29, 47)),
      central: parseLatLon(line.slice(49, 67)) ?? fail(line),
      durationSeconds: parseDuration(line.trim().split(/\s+/).at(-1) ?? ""),
    }));
}

// "28 48.0N 044 56.6W" (degrees, decimal minutes) -> { lat: 28.8, lon: -44.943 }
function parseLatLon(field: string): LatLon | null {
  const coords = field.match(/^(\d+) (\d+\.\d)([NS]) (\d+) (\d+\.\d)([EW])$/);
  if (!coords) return /^[\s-]+$/.test(field) ? null : fail(field);
  const [, latD, latM, ns, lonD, lonM, ew] = coords;
  return {
    lat: (Number(latD) + Number(latM) / 60) * (ns === "S" ? -1 : 1),
    lon: (Number(lonD) + Number(lonM) / 60) * (ew === "W" ? -1 : 1),
  };
}

// "03m06.1s" -> 186.1
function parseDuration(field: string): number {
  const [, minutes, seconds] = field.match(/^(\d+)m(\d+\.\d)s$/) ?? fail(field);
  return Number(minutes) * 60 + Number(seconds);
}

function fail(input: string): never {
  throw new Error(`Cannot parse NASA path table: "${input}"`);
}

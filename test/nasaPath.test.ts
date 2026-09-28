import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNasaPath } from "./nasaPath.js";

const rows = parseNasaPath(
  readFileSync(new URL("./fixtures/SE2027Aug02Tpath.txt", import.meta.url), "utf8"),
);

describe("parseNasaPath", () => {
  it("reads both path ends and every 2-minute row (08:26–11:48 UT)", () => {
    expect(rows).toHaveLength(104);
    expect(rows.map((r) => r.time)).toEqual([
      "Limits",
      ...Array.from({ length: 102 }, (_, i) => {
        const minutes = 8 * 60 + 26 + 2 * i;
        return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      }),
      "Limits",
    ]);
  });

  it("converts degrees/minutes to signed decimal degrees and the duration to seconds", () => {
    // 10:00   27 51.4N 031 44.0E  25 55.3N 030 18.2E  26 53.3N 031 00.8E ... 06m23.2s
    const row = rows.find((r) => r.time === "10:00");
    expect(row?.north?.lat).toBeCloseTo(27 + 51.4 / 60, 9);
    expect(row?.north?.lon).toBeCloseTo(31 + 44.0 / 60, 9);
    expect(row?.central).toEqual({ lat: 26 + 53.3 / 60, lon: 31 + 0.8 / 60 });
    expect(row?.durationSeconds).toBeCloseTo(383.2, 9);
  });

  it("makes south latitudes and west longitudes negative", () => {
    // Limits  28 48.0N 044 56.6W ...
    expect(rows[0]?.north?.lon).toBeCloseTo(-(44 + 56.6 / 60), 9);
    // Limits  11 38.0S 090 50.3E ...
    expect(rows.at(-1)?.north?.lat).toBeCloseTo(-(11 + 38.0 / 60), 9);
  });

  it("gives null for a limit that is off the Earth", () => {
    // 11:48      -         -      11 02.4S 083 31.9E ...
    const row = rows.find((r) => r.time === "11:48");
    expect(row?.north).toBeNull();
    expect(row?.south?.lat).toBeCloseTo(-(11 + 2.4 / 60), 9);
  });

  describe("with malformed input", () => {
    const row = " 10:00   27 51.4N 031 44.0E  25 55.3N 030 18.2E  26 53.3N 031 00.8E  1.079  81 177  257  06m23.2s";

    it("ignores lines that are not table rows", () => {
      expect(parseNasaPath("# comment\n  Time   Latitude Longitude\n\n")).toEqual([]);
    });

    it("throws on bad limit coordinates", () => {
      expect(() => parseNasaPath(row.replace("27 51.4N", "27 51.4X"))).toThrow(/27 51.4X/);
    });

    it("throws when the central line is missing", () => {
      expect(() => parseNasaPath(row.replace("26 53.3N 031 00.8E", "   -         -     "))).toThrow(
        /Cannot parse/,
      );
    });

    it("throws on bad duration", () => {
      expect(() => parseNasaPath(row.replace("06m23.2s", "6:23.2"))).toThrow(/6:23.2/);
    });
  });
});

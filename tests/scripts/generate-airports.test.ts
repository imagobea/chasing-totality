import { writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The script writes its snapshot with writeFileSync; the mock keeps it off disk for the tests to read
vi.mock("node:fs", () => ({ writeFileSync: vi.fn() }));

const RETRIEVED = "2026-10-25";

// One OurAirports row, a commercial airport unless overridden
function row(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    id: "1",
    type: "large_airport",
    name: "Málaga-Costa del Sol Airport",
    latitude_deg: "36.6749",
    longitude_deg: "-4.49911",
    iso_country: "ES",
    municipality: "Málaga",
    scheduled_service: "yes",
    iata_code: "AGP",
    ...overrides,
  };
}

// OurAirports quotes every field, with "" for a quote inside one
function csv(...rows: Record<string, string>[]): string {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = rows.map((record) => Object.values(record).map(quote).join(","));
  return [
    Object.keys(rows[0] ?? row())
      .map(quote)
      .join(","),
    ...lines,
  ].join("\n");
}

// Runs the script with fetch answering the given CSV and returns the snapshot it would write
async function generate(body: string, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );
  vi.resetModules();
  await import("../../scripts/generate-airports.js");
  const [, text] = vi.mocked(writeFileSync).mock.lastCall ?? [];
  return JSON.parse(String(text));
}

async function iataCodes(...rows: Record<string, string>[]): Promise<string[]> {
  const snapshot = await generate(csv(...rows));
  return snapshot.features.map((feature: { id: string }) => feature.id);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(RETRIEVED);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.mocked(writeFileSync).mockClear();
});

describe("generate-airports", () => {
  it("keeps large and medium airports with scheduled service and an IATA code", async () => {
    expect(await iataCodes(row(), row({ type: "medium_airport", iata_code: "XRY" }))).toEqual([
      "AGP",
      "XRY",
    ]);
  });

  it.each([
    ["small airports", { type: "small_airport" }],
    ["heliports", { type: "heliport" }],
    ["closed airports", { type: "closed" }],
    ["airports without scheduled service", { scheduled_service: "no" }],
    ["airports without an IATA code", { iata_code: "" }],
    ["malformed IATA codes", { iata_code: "0A" }],
    ["airports without a latitude", { latitude_deg: "" }],
    ["airports with a malformed longitude", { longitude_deg: "west" }],
  ])("leaves out %s", async (_, overrides) => {
    // Next to an airport it keeps, since a snapshot with none fails
    expect(await iataCodes(row({ iata_code: "XRY" }), row(overrides))).toEqual(["XRY"]);
  });

  it("sorts by IATA code", async () => {
    expect(
      await iataCodes(
        row({ iata_code: "TNG" }),
        row({ iata_code: "AGP" }),
        row({ iata_code: "LXR" }),
      ),
    ).toEqual(["AGP", "LXR", "TNG"]);
  });

  it("writes a GeoJSON point per airport, keyed by IATA code", async () => {
    expect(await generate(csv(row()))).toEqual({
      type: "FeatureCollection",
      source: {
        name: "OurAirports",
        url: "https://ourairports.com/data/",
        licence: "Public domain",
      },
      retrieved: RETRIEVED,
      features: [
        {
          type: "Feature",
          id: "AGP",
          geometry: { type: "Point", coordinates: [-4.4991, 36.6749] },
          properties: {
            iata: "AGP",
            name: "Málaga-Costa del Sol Airport",
            municipality: "Málaga",
            country: "ES",
            size: "large",
          },
        },
      ],
    });
  });

  it("reads quoted fields with commas, escaped quotes and newlines", async () => {
    const snapshot = await generate(csv(row({ name: 'Aeropuerto "El Prat",\nBarcelona' })));
    expect(snapshot.features[0].properties.name).toBe('Aeropuerto "El Prat",\nBarcelona');
  });

  it("handles CRLF line endings and a trailing newline", async () => {
    expect(await generate(`${csv(row()).replaceAll("\n", "\r\n")}\r\n`)).toEqual(
      await generate(csv(row())),
    );
  });

  it.each([
    ["an empty file", ""],
    ["a header only", csv()],
    ["no airports to keep", csv(row({ scheduled_service: "no" }))],
  ])("fails and writes nothing for %s", async (_, body) => {
    await expect(generate(body)).rejects.toThrow(/no airports/);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("fails when a column it needs is missing", async () => {
    const withoutIata = row();
    delete withoutIata.iata_code;
    await expect(generate(csv(withoutIata))).rejects.toThrow(/iata_code/);
  });

  it("fails when the download fails", async () => {
    await expect(generate("", 503)).rejects.toThrow(/503/);
  });
});

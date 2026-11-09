import { readFileSync } from "node:fs";
import { featureFilter } from "@maplibre/maplibre-gl-style-spec";
import type {
  LayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { describe, expect, it } from "vitest";
import type { Isolines } from "../../../src/api/eclipses.js";
import {
  DURATION_BANDS_LAYERS,
  durationBands,
  ISOLINES_LAYERS,
  isolinesSource,
} from "../../../src/map/isolines.js";
import { fillToken } from "../../helpers/fillToken.js";
import { isolines } from "../../helpers/isolines.js";

// Every layer, in the order they're drawn
const LAYERS = [...DURATION_BANDS_LAYERS, ...ISOLINES_LAYERS];

// One of the layers, by its id, typed as the caller expects it
function layer<T extends LayerSpecification = LayerSpecification>(id: string): T | undefined {
  return LAYERS.find((layer) => layer.id === id) as T | undefined;
}

// The committed isolines for 2027, as the API serves them
const ISOLINES_2027 = new URL("../../../../data/isolines/2027-08-02.geojson", import.meta.url);

// The isolines a layer draws, by name, out of a 30 s limit and isolines at 60 s and 90 s
function drawn(id: string): string[] {
  const filter = layer<LineLayerSpecification | SymbolLayerSpecification>(id)?.filter;
  const passes = featureFilter(filter, id).filter;
  return isolinesSource(isolines(30, 60, 90))
    .data.features.filter((feature) =>
      passes({ zoom: 0 }, { type: "MultiPolygon", properties: feature.properties }),
    )
    .map((feature) => feature.properties.name);
}

describe("isolines layers", () => {
  it("gives every layer its own id", () => {
    const ids = LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each([
    [0, "--color-path-fill-0"],
    [30, "--color-path-fill-0"],
    [59, "--color-path-fill-0"],
    [60, "--color-path-fill-1"],
    [119, "--color-path-fill-1"],
    [120, "--color-path-fill-2"],
    [359, "--color-path-fill-5"],
    [360, "--color-path-fill-6"],
    [419, "--color-path-fill-6"],
    [420, "--color-path-fill-7"],
    [480, "--color-path-fill-7"],
  ])("fills %i s with %s", (durationSeconds, token) => {
    expect(fillToken(durationSeconds)).toBe(token);
  });

  it("fills each band with its own class, a minute apart from the limit", () => {
    const bands = durationBands(isolines(30, 60, 90, 120, 180, 240, 300, 360, 420, 450));
    expect(bands.map((band) => fillToken(band.properties.durationSeconds))).toEqual([
      "--color-path-fill-0",
      "--color-path-fill-1",
      "--color-path-fill-2",
      "--color-path-fill-3",
      "--color-path-fill-4",
      "--color-path-fill-5",
      "--color-path-fill-6",
      "--color-path-fill-7",
    ]);
  });

  it("fills 2027's bands with one class per minute, up to 6 min", () => {
    const bands = durationBands(JSON.parse(readFileSync(ISOLINES_2027, "utf8")) as Isolines);
    expect(bands.map((band) => fillToken(band.properties.durationSeconds))).toEqual([
      "--color-path-fill-0",
      "--color-path-fill-1",
      "--color-path-fill-2",
      "--color-path-fill-3",
      "--color-path-fill-4",
      "--color-path-fill-5",
      "--color-path-fill-6",
    ]);
  });

  it("draws the inner isolines and the limit apart", () => {
    expect(drawn("isolines-line")).toEqual(["60s", "90s"]);
    expect(drawn("isolines-limit")).toEqual(["30s"]);
  });

  it("labels each isoline with its name", () => {
    const label = layer<SymbolLayerSpecification>("isolines-label");
    expect(label?.layout?.["text-field"]).toEqual(["get", "name"]);
  });

  it("labels the limit and whole-minute isolines only", () => {
    expect(drawn("isolines-label")).toEqual(["30s", "60s"]);
  });
});

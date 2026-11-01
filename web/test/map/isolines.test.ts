import type {
  ExpressionSpecification,
  FillLayerSpecification,
  LayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { describe, expect, it } from "vitest";
import type { Isolines } from "../../src/api/eclipses.js";
import {
  durationBands,
  ISOLINES_LAYERS,
  ISOLINES_SOURCE_ID,
  isolinesSource,
} from "../../src/map/isolines.js";
import { theme } from "../../src/theme.js";

// A square centred on 0, 0 reaching `half` degrees each way
function square(half: number): [number, number][][][] {
  return [
    [
      [
        [-half, -half],
        [half, -half],
        [half, half],
        [-half, half],
        [-half, -half],
      ],
    ],
  ];
}

// Nested squares, as the API serves isolines: the longer the duration, the smaller the square
function isolines(...durationsSeconds: number[]): Isolines {
  return {
    type: "FeatureCollection",
    bbox: [-10, -10, 10, 10],
    features: durationsSeconds.map((durationSeconds, i) => ({
      type: "Feature",
      properties: { durationSeconds, name: `${durationSeconds}s` },
      geometry: { type: "MultiPolygon", coordinates: square(durationsSeconds.length - i) },
    })),
  };
}

const fill = ISOLINES_LAYERS.find(
  (layer): layer is FillLayerSpecification => layer.type === "fill",
);

// One of the isolines layers, by its id
function layer(id: string): LayerSpecification | undefined {
  return ISOLINES_LAYERS.find((layer) => layer.id === id);
}

// The fill colour MapLibre picks for a band of this duration, read off the step expression
function fillColor(durationSeconds: number): unknown {
  const [, , base, ...stops] = fill?.paint?.["fill-color"] as ExpressionSpecification;
  let color = base;
  for (let i = 0; i < stops.length; i += 2) {
    if (durationSeconds >= (stops[i] as number)) color = stops[i + 1];
  }
  return color;
}

describe("isolines", () => {
  it("gives every layer its own id", () => {
    const ids = ISOLINES_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws every layer from the isolines source", () => {
    for (const layer of ISOLINES_LAYERS) {
      expect(layer).toHaveProperty("source", ISOLINES_SOURCE_ID);
    }
  });

  it("labels each isoline with its name", () => {
    const label = ISOLINES_LAYERS.find(
      (layer): layer is SymbolLayerSpecification => layer.type === "symbol",
    );
    expect(label?.layout?.["text-field"]).toEqual(["get", "name"]);
  });

  it("draws fills, then inner isolines, then the limit, then labels", () => {
    expect(ISOLINES_LAYERS.map((layer) => layer.id)).toEqual([
      "isolines-fill",
      "isolines-line",
      "isolines-limit",
      "isolines-label",
    ]);
  });

  it("fills the bands, and draws the inner isolines and the limit apart", () => {
    expect(layer("isolines-fill")).toHaveProperty("filter", ["==", ["get", "kind"], "band"]);
    expect(layer("isolines-line")).toHaveProperty("filter", ["!", ["has", "kind"]]);
    expect(layer("isolines-limit")).toHaveProperty("filter", ["==", ["get", "kind"], "limit"]);
  });

  it("labels whole-minute isolines only, the limit included", () => {
    expect(layer("isolines-label")).toHaveProperty("filter", [
      "all",
      ["!=", ["get", "kind"], "band"],
      ["==", ["%", ["get", "durationSeconds"], 60], 0],
    ]);
  });

  it("colours each band by its whole minute of totality", () => {
    expect(fillColor(0)).toBe(theme["--color-path-fill-0"]);
    expect(fillColor(30)).toBe(theme["--color-path-fill-0"]);
    expect(fillColor(60)).toBe(theme["--color-path-fill-1"]);
    expect(fillColor(330)).toBe(theme["--color-path-fill-5"]);
    expect(fillColor(360)).toBe(theme["--color-path-fill-6"]);
    expect(fillColor(420)).toBe(theme["--color-path-fill-6"]);
  });
});

describe("durationBands", () => {
  it("makes one band per whole minute, skipping the half minutes", () => {
    const bands = durationBands(isolines(0, 30, 60, 90, 120));
    expect(bands.map((band) => band.properties)).toEqual([
      { kind: "band", durationSeconds: 0 },
      { kind: "band", durationSeconds: 60 },
      { kind: "band", durationSeconds: 120 },
    ]);
  });

  it("cuts the next minute's isoline out of each band, so bands don't overlap", () => {
    const [first] = durationBands(isolines(0, 60));
    // Outer ring of the 0 s square, with the 60 s square as its hole
    expect(first?.geometry.coordinates).toHaveLength(1);
    expect(first?.geometry.coordinates[0]).toHaveLength(2);
  });

  it("keeps the longest minute's isoline whole", () => {
    const bands = durationBands(isolines(0, 60));
    expect(bands.at(-1)?.geometry.coordinates).toEqual(square(1));
  });

  it("starts the first band at the limit when the limit isn't a whole minute", () => {
    const bands = durationBands(isolines(30, 60, 90));
    expect(bands.map((band) => band.properties.durationSeconds)).toEqual([30, 60]);
    expect(fillColor(30)).toBe(theme["--color-path-fill-0"]);
  });

  it("makes no bands without isolines", () => {
    expect(durationBands(isolines())).toEqual([]);
  });
});

describe("isolinesSource", () => {
  it("serves the bands under the isolines it is given", () => {
    const given = isolines(0, 30, 60);
    const { data } = isolinesSource(given);
    expect(data.bbox).toEqual(given.bbox);
    expect(data.features.slice(0, 2)).toEqual(durationBands(given));
    expect(data.features).toHaveLength(2 + given.features.length);
  });

  it("tags the limit, the isoline with the shortest duration, and leaves the others as given", () => {
    const given = isolines(30, 60, 90);
    const [limit, ...inner] = isolinesSource(given).data.features.slice(2);
    expect(limit?.properties).toEqual({ durationSeconds: 30, name: "30s", kind: "limit" });
    expect(inner).toEqual(given.features.slice(1));
  });
});

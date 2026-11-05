import { featureFilter } from "@maplibre/maplibre-gl-style-spec";
import type {
  LayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { describe, expect, it } from "vitest";
import {
  DURATION_BANDS_LAYERS,
  ISOLINES_LAYERS,
  isolinesSource,
} from "../../../src/map/isolines.js";
import { isolines } from "../../helpers/isolines.js";

// Every layer, in the order they're drawn
const LAYERS = [...DURATION_BANDS_LAYERS, ...ISOLINES_LAYERS];

// One of the layers, by its id, typed as the caller expects it
function layer<T extends LayerSpecification = LayerSpecification>(id: string): T | undefined {
  return LAYERS.find((layer) => layer.id === id) as T | undefined;
}

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

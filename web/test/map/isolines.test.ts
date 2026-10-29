import type { SymbolLayerSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import type { Isolines } from "../../src/api/eclipses.js";
import { ISOLINES_LAYERS, ISOLINES_SOURCE_ID, isolinesSource } from "../../src/map/isolines.js";

describe("isolines", () => {
  it("draws the isolines it is given", () => {
    const isolines: Isolines = {
      type: "FeatureCollection",
      bbox: [-46, -14, 92, 38],
      features: [],
    };
    expect(isolinesSource(isolines).data).toBe(isolines);
  });

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
});

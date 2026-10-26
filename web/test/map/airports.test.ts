import type { LayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import {
  AIRPORT_ICON_ID,
  AIRPORT_ICON_OPTIONS,
  AIRPORTS_LAYERS,
  AIRPORTS_SOURCE_ID,
  airportsSource,
} from "../../src/map/airports.js";
import { theme } from "../../src/theme.js";

function layerOfType<T extends LayerSpecification>(type: T["type"]): T {
  return AIRPORTS_LAYERS.find((layer): layer is T => layer.type === type)!;
}

describe("airports", () => {
  it("reads the airports around the 2027 path from the API", () => {
    expect(airportsSource().data).toBe("/api/airports?bbox=-13,12,48,40");
  });

  it("gives every layer its own id", () => {
    const ids = AIRPORTS_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws every layer from the airports source", () => {
    for (const layer of AIRPORTS_LAYERS) {
      expect(layer).toHaveProperty("source", AIRPORTS_SOURCE_ID);
    }
  });

  it("draws the airport icon in the travel colour", () => {
    const symbol = layerOfType<SymbolLayerSpecification>("symbol");
    expect(symbol.layout?.["icon-image"]).toBe(AIRPORT_ICON_ID);
    expect(symbol.paint?.["icon-color"]).toBe(theme["--color-travel"]);
  });

  // MapLibre ignores icon-color on any other image
  it("registers the icon as SDF, so it takes the colour", () => {
    expect(AIRPORT_ICON_OPTIONS.sdf).toBe(true);
  });

  it("labels each airport with its IATA code in the travel colour", () => {
    const label = layerOfType<SymbolLayerSpecification>("symbol");
    expect(label.layout?.["text-field"]).toEqual(["get", "iata"]);
    expect(label.paint?.["text-color"]).toBe(theme["--color-travel"]);
  });
});

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
  it("reads the airports within 3° of the eclipse's path from the API", () => {
    expect(airportsSource([-46, -14, 92, 38]).data).toBe("/api/airports?bbox=-49,-17,95,41");
  });

  // Whole degrees keep float noise out of the URL: 3.0000000000000004 - 3 would read 4.4e-16
  it("rounds the box outwards to whole degrees", () => {
    expect(airportsSource([3.0000000000000004, -14.36, 91.83, 37.84]).data).toBe(
      "/api/airports?bbox=0,-18,95,41",
    );
  });

  it("carries on past 180° like the path", () => {
    expect(airportsSource([74, -52, 182, -9]).data).toBe("/api/airports?bbox=71,-55,185,-6");
  });

  it("stops at the poles", () => {
    expect(airportsSource([0, -89, 10, 89]).data).toBe("/api/airports?bbox=-3,-90,13,90");
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

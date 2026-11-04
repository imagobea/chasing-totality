import type { SymbolLayerSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { AIRPORT_ICON_ID, AIRPORTS_LAYERS, airportsSource } from "../../../src/map/airports.js";

describe("airports", () => {
  it("shows each airport with its icon and IATA code", () => {
    const symbol = AIRPORTS_LAYERS.find((layer) => layer.type === "symbol") as
      SymbolLayerSpecification | undefined;
    expect(symbol?.layout?.["icon-image"]).toBe(AIRPORT_ICON_ID);
    expect(symbol?.layout?.["text-field"]).toEqual(["get", "iata"]);
  });

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
});

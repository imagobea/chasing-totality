import type { SymbolLayerSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { AIRPORT_ICON_ID, AIRPORTS_LAYERS } from "../../../src/map/airports.js";

describe("airports", () => {
  it("shows each airport with its icon and IATA code", () => {
    const symbol = AIRPORTS_LAYERS.find((layer) => layer.type === "symbol") as
      SymbolLayerSpecification | undefined;
    expect(symbol?.layout?.["icon-image"]).toBe(AIRPORT_ICON_ID);
    expect(symbol?.layout?.["text-field"]).toEqual(["get", "iata"]);
  });
});

import type { LayerSpecification, MapLibreMap } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { AIRPORTS_LAYERS } from "../../../src/map/airports.js";
import { DURATION_BANDS_LAYERS, ISOLINES_LAYERS } from "../../../src/map/isolines.js";
import { beforeId } from "../../../src/map/layerOrder.js";

// Our layers, bottom to top: bands, inner isolines, limit, then labels and airports on top
const [BANDS] = DURATION_BANDS_LAYERS;
const [LINE, LIMIT, LABEL] = ISOLINES_LAYERS;
const [AIRPORTS] = AIRPORTS_LAYERS;

// The base map's own layers, a fill under its first label
const BASE_LAYERS = [
  { id: "water", type: "fill" },
  { id: "place", type: "symbol" },
  { id: "road-label", type: "symbol" },
];

// A map holding the given layers of ours, over a base map with the given layers
function mapWith(ours: LayerSpecification[], base = BASE_LAYERS) {
  const ids = ours.map(({ id }) => id);
  return {
    getLayer: (id: string) => (ids.includes(id) ? {} : undefined),
    getStyle: () => ({ layers: [...base, ...ours] }),
  } as unknown as MapLibreMap;
}

describe("beforeId", () => {
  it("puts a layer outside the stack on top", () => {
    const layer: LayerSpecification = { id: "other", type: "fill", source: "other" };
    expect(beforeId(mapWith([BANDS!]), layer)).toBeUndefined();
  });

  it.each([
    ["the one right above it", [LINE!, LIMIT!], LINE!.id],
    ["the next one when the one right above it is missing", [LIMIT!], LIMIT!.id],
  ])("puts a fill or line under %s of ours", (_, ours, expected) => {
    expect(beforeId(mapWith(ours), BANDS!)).toBe(expected);
  });

  it("puts a fill or line under the base map's first label when none of ours is above it", () => {
    expect(beforeId(mapWith([BANDS!, LINE!]), LIMIT!)).toBe("place");
  });

  it("puts a fill or line under the base map's labels, not under our symbols", () => {
    expect(beforeId(mapWith([LABEL!, AIRPORTS!]), LINE!)).toBe("place");
  });

  it("puts a fill or line on top when the base map has no labels", () => {
    expect(beforeId(mapWith([], [{ id: "water", type: "fill" }]), LINE!)).toBeUndefined();
  });

  it("puts a symbol under ours above it", () => {
    expect(beforeId(mapWith([AIRPORTS!]), LABEL!)).toBe(AIRPORTS!.id);
  });

  it("puts a symbol on top, above the base map's labels, when none of ours is above it", () => {
    expect(beforeId(mapWith([BANDS!, LINE!, LIMIT!]), LABEL!)).toBeUndefined();
    expect(beforeId(mapWith([LABEL!]), AIRPORTS!)).toBeUndefined();
  });
});

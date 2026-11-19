import { expression, featureFilter } from "@maplibre/maplibre-gl-style-spec";
import type { FillLayerSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { ADVISORIES_LAYERS, hatchImageId } from "../../../src/map/advisories.js";

// A place in the given state, as the map reads it
function place(state: string) {
  return { type: "Polygon" as const, properties: { state } };
}

describe("advisories layers", () => {
  it.each(ADVISORIES_LAYERS.map((layer) => [layer.id, layer]))(
    "%s draws places advised against, in whole or in parts, but not the rest",
    (id, layer) => {
      const { filter } = featureFilter("filter" in layer ? layer.filter : undefined, id);
      expect(["whole", "parts", "none"].map((state) => filter({ zoom: 5 }, place(state)))).toEqual([
        true,
        true,
        false,
      ]);
    },
  );

  it.each(["whole", "parts"] as const)("hatches a place in %s with that state's hatch", (state) => {
    const fill = ADVISORIES_LAYERS.find(
      (layer): layer is FillLayerSpecification => layer.type === "fill",
    );
    const pattern = expression.createExpression(
      fill?.paint?.["fill-pattern"],
      "layers[0].paint.fill-pattern",
    );
    if (pattern.result !== "success") throw new Error("invalid fill-pattern");
    expect(pattern.value.evaluate({ zoom: 5 }, place(state))).toBe(hatchImageId(state));
  });
});

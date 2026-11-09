// The map's duration fill, read back as token names so tests name classes, not colours

import { createExpression } from "@maplibre/maplibre-gl-style-spec";
import type { FillLayerSpecification } from "maplibre-gl";
import { DURATION_BANDS_LAYERS } from "../../src/map/isolines.js";
import { theme } from "../../src/theme.js";

// The colour token the bands' fill gives a duration
export function fillToken(durationSeconds: number): string | undefined {
  const layer = DURATION_BANDS_LAYERS.find(({ id }) => id === "isolines-fill") as
    FillLayerSpecification | undefined;
  const expression = createExpression(layer?.paint?.["fill-color"], "fill-color");
  if (expression.result !== "success") throw new Error("The fill colour doesn't parse");
  const color: unknown = expression.value.evaluate(
    { zoom: 0 },
    { type: "MultiPolygon", properties: { durationSeconds } },
  );
  return Object.keys(theme).find(
    (token) =>
      token.startsWith("--color-path-fill-") && theme[token as keyof typeof theme] === color,
  );
}

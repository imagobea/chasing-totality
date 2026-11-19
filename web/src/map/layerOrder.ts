// Where each of our layers goes in the map's layer stack, as in DESIGN.md

import type { LayerSpecification, MapLibreMap } from "maplibre-gl";
import { ADVISORIES_LAYERS } from "./advisories.js";
import { AIRPORTS_LAYERS } from "./airports.js";
import { DURATION_BANDS_LAYERS, ISOLINES_LAYERS } from "./isolines.js";

// What the order needs from the map: which layers it has, and the base map's labels
type LayeredMap = Pick<MapLibreMap, "getLayer" | "getStyle">;

// Our layers, bottom to top. Fills and lines go under the base map's labels, symbols on top.
const LAYER_STACK: LayerSpecification[] = [
  ...ADVISORIES_LAYERS, // bottom
  ...DURATION_BANDS_LAYERS,
  ...ISOLINES_LAYERS,
  ...AIRPORTS_LAYERS,
];

// Labels and icons, which go on top of the base map's labels
function isSymbol(layer: LayerSpecification): boolean {
  return layer.type === "symbol";
}

// The layer to add the given one under: the first of ours above it in its group that is already
// on the map. Failing that, fills and lines go under the base map's first label, and symbols, or
// layers outside the stack, on top.
export function beforeId(map: LayeredMap, layer: LayerSpecification): string | undefined {
  const index = LAYER_STACK.findIndex(({ id }) => id === layer.id);
  if (index === -1) return undefined;

  const above = LAYER_STACK.slice(index + 1).find(
    (other) => isSymbol(other) === isSymbol(layer) && map.getLayer(other.id),
  );
  if (above) return above.id;
  if (isSymbol(layer)) return undefined;
  return map.getStyle().layers.find(isSymbol)?.id;
}

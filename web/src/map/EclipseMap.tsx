import { type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import {
  AttributionControl,
  type GeoJSONSource,
  type GeoJSONSourceSpecification,
  type LayerSpecification,
  MapLibreMap,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { fetchIsolines } from "../api/eclipses.js";
import type { Coordinates } from "../utils.js";
import {
  AIRPORT_ICON_ID,
  AIRPORT_ICON_OPTIONS,
  AIRPORTS_LAYERS,
  AIRPORTS_SOURCE_ID,
  airportsSource,
  loadAirportIcon,
} from "./airports.js";
import { ISOLINES_LAYERS, ISOLINES_SOURCE_ID, isolinesSource } from "./isolines.js";

type EclipseMapProps = {
  date: string | null;
  // Called with the mouse position as it moves, and null when it leaves the map
  onCursorMove: (cursor: Coordinates | null) => void;
  // Where to put the attribution, outside the map
  attributionRef: RefObject<HTMLElement | null>;
};

// The worker URL as per MapLibre documentation at https://maplibre.org/maplibre-gl-js/docs/#esm
setWorkerUrl(workerUrl);

// Styles as per OpenFreeMap documentation at https://openfreemap.org/quick_start/
// TODO: careful - map style is chosen here, not by the theme!!
const MAP_STYLE = "https://tiles.openfreemap.org/styles/fiord";

// Added the first time with its layers, on top or under the layer beforeId picks; swapped in
// place afterwards
function showSource(
  map: MapLibreMap,
  id: string,
  source: GeoJSONSourceSpecification,
  layers: LayerSpecification[],
  beforeId: (layer: LayerSpecification) => string | undefined = () => undefined,
) {
  const existing = map.getSource<GeoJSONSource>(id);
  if (existing) {
    existing.setData(source.data);
    return;
  }

  map.addSource(id, source);
  for (const layer of layers) map.addLayer(layer, beforeId(layer));
}

// The base map's first label layer
function firstSymbolId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
}

export function EclipseMap({ date, onCursorMove, attributionRef }: EclipseMapProps) {
  // Set once the style has loaded and our images are in, since sources and layers can only be
  // added after that
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Always calls the latest callback, without recreating the map when it changes
  const reportCursor = useEffectEvent((cursor: Coordinates | null) => onCursorMove(cursor));

  // One map for the component's lifetime, whatever the date
  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainerRef.current!,
      style: MAP_STYLE,
      attributionControl: false,
    });
    // Ignore the icon if the map goes away before it loads
    let removed = false;
    map.on("load", () => {
      loadAirportIcon()
        .then((icon) => {
          if (!removed) map.addImage(AIRPORT_ICON_ID, icon, AIRPORT_ICON_OPTIONS);
        })
        // Without the icon, airports show their IATA codes only
        .catch((error) => console.warn("Airport icon not loaded", error))
        .finally(() => {
          if (!removed) setMap(map);
        });
    });
    // Wrapped, so panning past the antimeridian still reads -180 to 180
    map.on("mousemove", (event) => reportCursor(event.lngLat.wrap()));
    map.on("mouseout", () => reportCursor(null));

    // MapLibre's own control, so the credits follow the style and sources. Mounted by hand
    // through its public onAdd/onRemove, because it goes outside the map
    const attribution = new AttributionControl({
      compact: false,
      // Passing options replaces MapLibre's defaults, so its own credit goes back in by hand
      customAttribution: '<a href="https://maplibre.org/" target="_blank">MapLibre</a>',
    });
    attributionRef.current!.append(attribution.onAdd(map));

    return () => {
      removed = true;
      attribution.onRemove();
      map.remove();
      setMap(null);
    };
    // A ref object stays the same across renders, so the map is still created once
  }, [attributionRef]);

  // The selected eclipse's isolines and the airports around them, with the map fitted to its
  // whole path; the user is then free to pan and zoom
  useEffect(() => {
    if (!map || date === null) return;

    // Ignore the isolines if another date is picked or the map goes away before they arrive
    let active = true;
    fetchIsolines(date)
      .then((isolines) => {
        if (!active) return;
        // Fills and outlines go under the base map's labels; our labels go on top
        showSource(map, ISOLINES_SOURCE_ID, isolinesSource(isolines), ISOLINES_LAYERS, (layer) =>
          layer.type === "symbol" ? undefined : firstSymbolId(map),
        );
        // Last, so on top of everything, the base map's labels included
        showSource(map, AIRPORTS_SOURCE_ID, airportsSource(isolines.bbox), AIRPORTS_LAYERS);
        map.fitBounds(isolines.bbox);
      })
      // The map keeps whatever it was showing
      .catch((error) => console.warn(`Isolines for ${date} not loaded`, error));
    return () => {
      active = false;
    };
  }, [map, date]);

  return (
    <div
      ref={mapContainerRef}
      className="eclipse-map"
      role="region"
      aria-label="Map of the eclipse path and totality duration"
    />
  );
}

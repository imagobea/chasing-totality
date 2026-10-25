import { type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import { AttributionControl, type GeoJSONSource, MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
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
// TODO: centre and zoom suit 2027-08-02 only; another eclipse needs its own view (e.g. fitBounds)
const MAP_CENTER: [number, number] = [5, 36.5];
const MAP_ZOOM = 5;

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
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
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
        .catch(() => {})
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

  // The selected eclipse's isolines: added the first time, swapped in place afterwards
  useEffect(() => {
    if (!map || date === null) return;

    const source = isolinesSource(date);
    const existing = map.getSource<GeoJSONSource>(ISOLINES_SOURCE_ID);
    if (existing) {
      existing.setData(source.data);
      return;
    }

    // Fills and outlines go under the base map's labels; our labels go on top, but under the
    // airports if those are already there
    const firstSymbolId = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
    const airportsId = AIRPORTS_LAYERS.find((layer) => map.getLayer(layer.id))?.id;
    map.addSource(ISOLINES_SOURCE_ID, source);
    for (const layer of ISOLINES_LAYERS) {
      map.addLayer(layer, layer.type === "symbol" ? airportsId : firstSymbolId);
    }
  }, [map, date]);

  // The airports, whatever the date, on top of everything, the base map's labels included
  useEffect(() => {
    if (!map) return;

    map.addSource(AIRPORTS_SOURCE_ID, airportsSource());
    for (const layer of AIRPORTS_LAYERS) map.addLayer(layer);
  }, [map]);

  return (
    <div
      ref={mapContainerRef}
      className="eclipse-map"
      role="region"
      aria-label="Map of the eclipse path and totality duration"
    />
  );
}

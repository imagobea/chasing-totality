import { type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import { AttributionControl, type GeoJSONSource, MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { Coordinates } from "./coordinates.js";
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Set once the style has loaded, since sources and layers can only be added after that
  const [map, setMap] = useState<MapLibreMap | null>(null);
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
    map.on("load", () => setMap(map));
    // Wrapped, so panning past the antimeridian still reads -180 to 180
    map.on("mousemove", (event) => reportCursor(event.lngLat.wrap()));
    map.on("mouseout", () => reportCursor(null));

    // MapLibre's own control, so the credits follow the style and sources. Mounted by hand
    // through its public onAdd/onRemove, because it goes outside the map
    const attribution = new AttributionControl({ compact: false });
    attributionRef.current!.append(attribution.onAdd(map));

    return () => {
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

    // Fills and outlines go under the base map's labels; our labels stay on top
    const firstSymbolId = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
    map.addSource(ISOLINES_SOURCE_ID, source);
    for (const layer of ISOLINES_LAYERS) {
      map.addLayer(layer, layer.type === "symbol" ? undefined : firstSymbolId);
    }
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

import { useEffect, useRef, useState } from "react";
import { type GeoJSONSource, MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { ISOLINES_LAYERS, ISOLINES_SOURCE_ID, isolinesSource } from "./isolines.js";

type EclipseMapProps = {
  date: string | null;
};

// The worker URL as per MapLibre documentation at https://maplibre.org/maplibre-gl-js/docs/#esm
setWorkerUrl(workerUrl);

// Styles as per OpenFreeMap documentation at https://openfreemap.org/quick_start/
// TODO: careful - map style is chosen here, not by the theme!!
const MAP_STYLE = "https://tiles.openfreemap.org/styles/fiord";
// TODO: centre and zoom suit 2027-08-02 only; another eclipse needs its own view (e.g. fitBounds)
const MAP_CENTER: [number, number] = [5, 36.5];
const MAP_ZOOM = 5;

export function EclipseMap({ date }: EclipseMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // Sources and layers can only be added once the style has loaded
  const [styleLoaded, setStyleLoaded] = useState(false);

  // One map for the component's lifetime, whatever the date
  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainerRef.current!,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });
    mapRef.current = map;
    map.on("load", () => setStyleLoaded(true));

    return () => {
      map.remove();
      mapRef.current = null;
      setStyleLoaded(false);
    };
  }, []);

  // The selected eclipse's isolines: added the first time, swapped in place afterwards
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded || date === null) return;

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
  }, [date, styleLoaded]);

  return (
    <div
      ref={mapContainerRef}
      className="eclipse-map"
      role="region"
      aria-label="Map of the eclipse path and totality duration"
    />
  );
}

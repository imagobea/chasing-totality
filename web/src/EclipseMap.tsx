import { useEffect, useRef } from "react";
import { MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { ISOLINES_LAYERS, ISOLINES_SOURCE, ISOLINES_SOURCE_ID } from "./isolines.js";

// The worker URL as per MapLibre documentation at https://maplibre.org/maplibre-gl-js/docs/#esm
setWorkerUrl(workerUrl);

// Styles as per OpenFreeMap documentation at https://openfreemap.org/quick_start/
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const MAP_CENTER: [number, number] = [5, 36.5];
const MAP_ZOOM = 5;

export function EclipseMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainerRef.current!,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });

    // Sources and layers can only be added once the style has loaded
    map.on("load", () => {
      // Fills and outlines go under the base map's labels; our labels stay on top
      const firstSymbolId = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      map.addSource(ISOLINES_SOURCE_ID, ISOLINES_SOURCE);
      for (const layer of ISOLINES_LAYERS) {
        map.addLayer(layer, layer.type === "symbol" ? undefined : firstSymbolId);
      }
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "400px" }} />;
}

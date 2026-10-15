import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// The worker URL as per MapLibre documentation at https://maplibre.org/maplibre-gl-js/docs/#esm
setWorkerUrl(workerUrl);

// Styles as per OpenFreeMap documentation at https://openfreemap.org/quick_start/
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const MAP_CENTER: [number, number] = [35.5, 19.5];
const MAP_ZOOM = 2.5;

export function EclipseMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainerRef.current!,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "400px" }} />;
}

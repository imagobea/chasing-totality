import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

export function EclipseMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainerRef.current!,
      style: "https://demotiles.maplibre.org/style.json", // check vals and turn into consts
      center: [0, 0],
      zoom: 1,
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "400px" }} />;
}

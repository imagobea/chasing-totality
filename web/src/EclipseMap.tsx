import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl, type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// The worker URL as per MapLibre documentation at https://maplibre.org/maplibre-gl-js/docs/#esm
setWorkerUrl(workerUrl);

// Styles as per OpenFreeMap documentation at https://openfreemap.org/quick_start/
const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright";
const MAP_CENTER: [number, number] = [5, 36.5];
const MAP_ZOOM = 5;

// The URL for the isolines data for the 2027-08-02 eclipse
const MAP_ISOLINES_URL = "/api/eclipses/2027-08-02/isolines";

// Common styles shared between the isolines fill and line layers
const MAP_LAYER_COLOR: ExpressionSpecification = ["interpolate", ["linear"], ["get", "durationSeconds"], 0, "#fdd49e", 360, "#b30000"];

export function EclipseMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainerRef.current!,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
    });

    map.on("load", () => {
      map.addSource("isolines", {
        type: "geojson",
        data: MAP_ISOLINES_URL,
      });
      map.addLayer({
        id: "isolines-fill",
        type: "fill",
        source: "isolines",
        paint: {
          "fill-color": MAP_LAYER_COLOR,
          "fill-opacity": 0.2,
        },
      });
      map.addLayer({
        id: "isolines-line",
        type: "line",
        source: "isolines",
        paint: {
          "line-color": MAP_LAYER_COLOR,
          "line-width": 1,
        },
      });

    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "400px" }} />;
}

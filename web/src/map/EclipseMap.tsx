import { type RefObject, useEffect, useRef, useState } from "react";
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
import type { FeatureCollection } from "geojson";
import type { Advisories } from "../api/advisories.js";
import type { Airports } from "../api/airports.js";
import type { Isolines } from "../api/eclipses.js";
import {
  ADVISORIES_LAYERS,
  ADVISORIES_SOURCE_ID,
  advisoriesSource,
  hatchImages,
} from "./advisories.js";
import {
  AIRPORT_ICON_ID,
  AIRPORT_ICON_OPTIONS,
  AIRPORTS_LAYERS,
  AIRPORTS_SOURCE_ID,
  airportsSource,
  loadAirportIcon,
} from "./airports.js";
import {
  DURATION_BANDS_LAYERS,
  DURATION_BANDS_SOURCE_ID,
  durationBandsSource,
  ISOLINES_LAYERS,
  ISOLINES_SOURCE_ID,
  isolinesSource,
} from "./isolines.js";
import { beforeId } from "./layerOrder.js";
import type { MapStatusStore } from "./mapStatus.js";

type EclipseMapProps = {
  // The selected eclipse's isolines, null until they arrive
  isolines: Isolines | null;
  // The airports around the eclipse's path, null until they arrive or when they can't be had
  airports: Airports | null;
  // Every place's travel advisory, null until they arrive or when they can't be had
  advisories: Advisories | null;
  // Where the map writes the mouse position as it moves (null when it leaves the map) and the zoom
  // once loaded and as it changes
  mapStatus: MapStatusStore;
  // Where to put the attribution, outside the map
  attributionRef: RefObject<HTMLElement | null>;
};

// The worker URL as per MapLibre documentation at https://maplibre.org/maplibre-gl-js/docs/#esm
setWorkerUrl(workerUrl);

// Styles as per OpenFreeMap documentation at https://openfreemap.org/quick_start/
// TODO: careful - map style is chosen here, not by the theme!!
const MAP_STYLE = "https://tiles.openfreemap.org/styles/fiord";

// What the airports source shows when there are no airports
const NO_AIRPORTS: FeatureCollection = { type: "FeatureCollection", features: [] };

// Added the first time with its layers, each in its place in the layer stack; swapped in place
// afterwards
function showSource(
  map: MapLibreMap,
  id: string,
  source: GeoJSONSourceSpecification,
  layers: LayerSpecification[],
) {
  const existing = map.getSource<GeoJSONSource>(id);
  if (existing) {
    existing.setData(source.data);
    return;
  }

  map.addSource(id, source);
  for (const layer of layers) map.addLayer(layer, beforeId(map, layer));
}

export function EclipseMap({
  isolines,
  airports,
  advisories,
  mapStatus,
  attributionRef,
}: EclipseMapProps) {
  // Set once the style has loaded and our images are in, since sources and layers can only be
  // added after that
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // One map for the component's lifetime, whatever the date
  useEffect(() => {
    const map = new MapLibreMap({
      container: mapContainerRef.current!,
      style: MAP_STYLE,
      attributionControl: false,
    });
    // A globe, so paths far from the equator keep their true shape and size. Set on every style
    // load, since the projection belongs to the style.
    map.on("style.load", () => map.setProjection({ type: "globe" }));
    // Ignore the icon if the map goes away before it loads
    let removed = false;
    map.on("load", () => {
      mapStatus.set({ zoom: map.getZoom() });
      // Drawn here, so the advisories' hatches are in before the map counts as ready
      for (const [id, pattern] of hatchImages(devicePixelRatio)) {
        map.addImage(id, pattern, { pixelRatio: devicePixelRatio });
      }
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
    map.on("mousemove", (event) => mapStatus.set({ cursor: event.lngLat.wrap() }));
    map.on("mouseout", () => mapStatus.set({ cursor: null }));
    map.on("zoom", () => mapStatus.set({ zoom: map.getZoom() }));

    // MapLibre's own control, so the credits follow the style and sources. Mounted by hand
    // through its public onAdd/onRemove, because it goes outside the map.
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
    // A ref object and the store stay the same across renders, so the map is still created once
  }, [attributionRef, mapStatus]);

  // The eclipse's isolines, with the map fitted to its whole path; the user is then free to pan
  // and zoom
  useEffect(() => {
    if (!map || isolines === null) return;

    showSource(map, ISOLINES_SOURCE_ID, isolinesSource(isolines), ISOLINES_LAYERS);
    // Cutting the bands can throw on odd geometry, and the isolines are still worth showing
    // without them
    try {
      showSource(
        map,
        DURATION_BANDS_SOURCE_ID,
        durationBandsSource(isolines),
        DURATION_BANDS_LAYERS,
      );
    } catch (error) {
      console.warn("Duration bands not shown", error);
    }
    map.fitBounds(isolines.bbox);
  }, [map, isolines]);

  // The airports, cleared when there are none
  useEffect(() => {
    if (!map) return;

    if (airports === null) {
      map.getSource<GeoJSONSource>(AIRPORTS_SOURCE_ID)?.setData(NO_AIRPORTS);
      return;
    }
    showSource(map, AIRPORTS_SOURCE_ID, airportsSource(airports), AIRPORTS_LAYERS);
  }, [map, airports]);

  // The advisories, once they arrive; they don't change with the eclipse
  useEffect(() => {
    if (!map || advisories === null) return;
    showSource(map, ADVISORIES_SOURCE_ID, advisoriesSource(advisories), ADVISORIES_LAYERS);
  }, [map, advisories]);

  return (
    <div
      ref={mapContainerRef}
      className="eclipse-map"
      role="region"
      aria-label="Map of the eclipse path and totality duration"
    />
  );
}

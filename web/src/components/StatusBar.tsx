import { type RefObject, useSyncExternalStore } from "react";
import { EDGE_NOTE_MINZOOM } from "../map/constants.js";
import type { MapStatusStore } from "../map/mapStatus.js";
import { formatCoordinates } from "../utils.js";

type StatusBarProps = {
  // The cursor and zoom the map reports
  mapStatus: MapStatusStore;
  // Where the map mounts its attribution control
  attributionRef: RefObject<HTMLDivElement | null>;
};

export function StatusBar({ mapStatus, attributionRef }: StatusBarProps) {
  const { cursor, zoom } = useSyncExternalStore(mapStatus.subscribe, mapStatus.get);
  const shownZoom = zoom === null ? null : zoom.toFixed(1);
  // Going by the zoom as shown, so "Zoom 10.0" always comes with the note
  const showEdgeNote = shownZoom !== null && Number(shownZoom) >= EDGE_NOTE_MINZOOM;

  return (
    <footer className="status-bar">
      <p className="readout">
        <span className="cursor">Cursor · {cursor ? formatCoordinates(cursor) : "—"} · </span>
        Zoom {shownZoom ?? "—"}
        {showEdgeNote && " · Edges ±2 km"}
      </p>
      <div ref={attributionRef} className="attribution" />
    </footer>
  );
}

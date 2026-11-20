import { type RefObject, useSyncExternalStore } from "react";
import type { MapStatusStore } from "../map/mapStatus.js";
import { formatCoordinates } from "../utils.js";

type StatusBarProps = {
  // The cursor and zoom the map reports, read here so only the status bar re-renders as they change
  mapStatus: MapStatusStore;
  // Where the map mounts its attribution control
  attributionRef: RefObject<HTMLDivElement | null>;
};

export function StatusBar({ mapStatus, attributionRef }: StatusBarProps) {
  const { cursor, zoom } = useSyncExternalStore(mapStatus.subscribe, mapStatus.get);

  return (
    <footer className="status-bar">
      <p className="readout">
        <span className="cursor">Cursor · {cursor ? formatCoordinates(cursor) : "—"} · </span>
        Zoom {zoom === null ? "—" : zoom.toFixed(1)}
      </p>
      <div ref={attributionRef} className="attribution" />
    </footer>
  );
}

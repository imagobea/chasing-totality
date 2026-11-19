import type { RefObject } from "react";
import { type Coordinates, formatCoordinates } from "../utils.js";

type StatusBarProps = {
  cursor: Coordinates | null;
  // The map's zoom, null until the map has loaded
  zoom: number | null;
  // Where the map mounts its attribution control
  attributionRef: RefObject<HTMLDivElement | null>;
};

export function StatusBar({ cursor, zoom, attributionRef }: StatusBarProps) {
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

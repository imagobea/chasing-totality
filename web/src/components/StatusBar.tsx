import type { RefObject } from "react";
import { type Coordinates, formatCoordinates } from "../utils.js";

type StatusBarProps = {
  cursor: Coordinates | null;
  // Where the map mounts its attribution control
  attributionRef: RefObject<HTMLDivElement | null>;
};

export function StatusBar({ cursor, attributionRef }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <p className="cursor">Cursor · {cursor ? formatCoordinates(cursor) : "—"}</p>
      <div ref={attributionRef} className="attribution" />
    </footer>
  );
}

// What the map reports for the status bar, kept out of React state so only its readers re-render
import type { Coordinates } from "../utils.js";

export type MapStatus = {
  // Where the mouse is on the map, null when it's off the map
  cursor: Coordinates | null;
  // The map's zoom, null until the map has loaded
  zoom: number | null;
};

export type MapStatusStore = {
  get: () => MapStatus;
  // Replaces the status with a new object, so React sees the change
  set: (change: Partial<MapStatus>) => void;
  // Returns a function that stops the calls
  subscribe: (listener: () => void) => () => void;
};

// Shaped for useSyncExternalStore: the writer sets, readers subscribe and get
export function createMapStatusStore(): MapStatusStore {
  let status: MapStatus = { cursor: null, zoom: null };
  const listeners = new Set<() => void>();
  return {
    get: () => status,
    set: (change) => {
      status = { ...status, ...change };
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

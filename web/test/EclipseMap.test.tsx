import { cleanup, render } from "@testing-library/react";
import { MapLibreMap } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EclipseMap } from "../src/EclipseMap.js";
import { ISOLINES_LAYERS, ISOLINES_SOURCE, ISOLINES_SOURCE_ID } from "../src/isolines.js";

// jsdom has no WebGL, so MapLibre is replaced by a map that only records calls
const map = vi.hoisted(() => ({
  on: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("maplibre-gl", () => ({
  // A function, not an arrow, so the component can call it with new
  MapLibreMap: vi.fn(function () {
    return map;
  }),
  setWorkerUrl: vi.fn(),
}));

// Runs the callback the component registered for the style's load event
function fireLoad() {
  const [, onLoad] = map.on.mock.calls.find(([event]) => event === "load")!;
  onLoad();
}

describe("EclipseMap", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates one map in its container", () => {
    const { container } = render(<EclipseMap />);
    expect(MapLibreMap).toHaveBeenCalledOnce();
    expect(MapLibreMap).toHaveBeenCalledWith(
      expect.objectContaining({ container: container.firstChild }),
    );
  });

  it("adds nothing until the style has loaded", () => {
    render(<EclipseMap />);
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds the isolines source and layers once the style has loaded", () => {
    render(<EclipseMap />);
    fireLoad();
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, ISOLINES_SOURCE);
    expect(map.addLayer.mock.calls.map(([layer]) => layer)).toEqual(ISOLINES_LAYERS);
  });

  it("removes the map when unmounted", () => {
    const { unmount } = render(<EclipseMap />);
    unmount();
    expect(map.remove).toHaveBeenCalledOnce();
  });
});

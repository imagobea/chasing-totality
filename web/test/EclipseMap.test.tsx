import { act, cleanup, render } from "@testing-library/react";
import { MapLibreMap } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EclipseMap } from "../src/EclipseMap.js";
import { ISOLINES_LAYERS, ISOLINES_SOURCE_ID, isolinesSource } from "../src/isolines.js";

// jsdom has no WebGL, so MapLibre is replaced by a map that only records calls
const map = vi.hoisted(() => ({
  on: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  getSource: vi.fn(),
  getStyle: vi.fn(() => ({ layers: [] })),
  remove: vi.fn(),
}));

// The isolines source once it has been added
const source = vi.hoisted(() => ({ setData: vi.fn() }));

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
  act(() => onLoad());
}

describe("EclipseMap", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    map.getSource.mockReset();
  });

  it("creates one map in its container", () => {
    const { container } = render(<EclipseMap date="2027-08-02" />);
    expect(MapLibreMap).toHaveBeenCalledOnce();
    expect(MapLibreMap).toHaveBeenCalledWith(
      expect.objectContaining({ container: container.firstChild }),
    );
  });

  it("adds nothing until the style has loaded", () => {
    render(<EclipseMap date="2027-08-02" />);
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds nothing without a date", () => {
    render(<EclipseMap date={null} />);
    fireLoad();
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds the date's isolines once the style has loaded", () => {
    render(<EclipseMap date="2027-08-02" />);
    fireLoad();
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource("2027-08-02"));
    expect(map.addLayer.mock.calls.map(([layer]) => layer)).toEqual(ISOLINES_LAYERS);
  });

  it("adds the isolines when the first date arrives after the style", () => {
    const { rerender } = render(<EclipseMap date={null} />);
    fireLoad();
    rerender(<EclipseMap date="2027-08-02" />);
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource("2027-08-02"));
  });

  it("swaps the data on the same map when the date changes", () => {
    const { rerender } = render(<EclipseMap date="2027-08-02" />);
    fireLoad();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap date="2028-07-22" />);
    expect(source.setData).toHaveBeenCalledWith(isolinesSource("2028-07-22").data);
    expect(map.addSource).toHaveBeenCalledOnce();
    expect(map.addLayer).toHaveBeenCalledTimes(ISOLINES_LAYERS.length);
    expect(MapLibreMap).toHaveBeenCalledOnce();
  });

  it("removes the map when unmounted", () => {
    const { unmount } = render(<EclipseMap date="2027-08-02" />);
    unmount();
    expect(map.remove).toHaveBeenCalledOnce();
  });
});

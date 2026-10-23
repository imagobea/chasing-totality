import { act, cleanup, render } from "@testing-library/react";
import { AttributionControl, MapLibreMap } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EclipseMap } from "../src/map/EclipseMap.js";
import { ISOLINES_LAYERS, ISOLINES_SOURCE_ID, isolinesSource } from "../src/map/isolines.js";

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

// The attribution control, whose element stands in for MapLibre's credits
const attribution = vi.hoisted(() => {
  const element = document.createElement("details");
  return { element, onAdd: vi.fn(() => element), onRemove: vi.fn() };
});

vi.mock("maplibre-gl", () => ({
  // A function, not an arrow, so the component can call it with new
  MapLibreMap: vi.fn(function () {
    return map;
  }),
  AttributionControl: vi.fn(function () {
    return attribution;
  }),
  setWorkerUrl: vi.fn(),
}));

// Runs the callback the component registered for a map event
function fire(event: string, payload?: unknown) {
  const [, listener] = map.on.mock.calls.find(([name]) => name === event)!;
  act(() => listener(payload));
}

// The props App passes, with a fresh slot for the attribution
function mapProps(date: string | null) {
  return {
    date,
    onCursorMove: vi.fn(),
    attributionRef: { current: document.createElement("div") },
  };
}

describe("EclipseMap", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    map.getSource.mockReset();
  });

  it("creates one map in its container", () => {
    const { container } = render(<EclipseMap {...mapProps("2027-08-02")} />);
    expect(MapLibreMap).toHaveBeenCalledOnce();
    expect(MapLibreMap).toHaveBeenCalledWith(
      expect.objectContaining({ container: container.firstChild }),
    );
  });

  it("adds nothing until the style has loaded", () => {
    render(<EclipseMap {...mapProps("2027-08-02")} />);
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds nothing without a date", () => {
    render(<EclipseMap {...mapProps(null)} />);
    fire("load");
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds the date's isolines once the style has loaded", () => {
    render(<EclipseMap {...mapProps("2027-08-02")} />);
    fire("load");
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource("2027-08-02"));
    expect(map.addLayer.mock.calls.map(([layer]) => layer)).toEqual(ISOLINES_LAYERS);
  });

  it("adds the isolines when the first date arrives after the style", () => {
    const props = mapProps(null);
    const { rerender } = render(<EclipseMap {...props} />);
    fire("load");
    rerender(<EclipseMap {...props} date="2027-08-02" />);
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource("2027-08-02"));
  });

  it("swaps the data on the same map when the date changes", () => {
    const props = mapProps("2027-08-02");
    const { rerender } = render(<EclipseMap {...props} />);
    fire("load");
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} date="2028-07-22" />);
    expect(source.setData).toHaveBeenCalledWith(isolinesSource("2028-07-22").data);
    expect(map.addSource).toHaveBeenCalledOnce();
    expect(map.addLayer).toHaveBeenCalledTimes(ISOLINES_LAYERS.length);
    expect(MapLibreMap).toHaveBeenCalledOnce();
  });

  it("reports the wrapped cursor position, and null when it leaves the map", () => {
    const onCursorMove = vi.fn();
    render(<EclipseMap {...mapProps(null)} onCursorMove={onCursorMove} />);
    const wrapped = { lng: -170, lat: 36 };
    fire("mousemove", { lngLat: { wrap: () => wrapped } });
    expect(onCursorMove).toHaveBeenLastCalledWith(wrapped);
    fire("mouseout");
    expect(onCursorMove).toHaveBeenLastCalledWith(null);
  });

  it("puts the attribution in the given slot", () => {
    const props = mapProps(null);
    render(<EclipseMap {...props} />);
    expect(MapLibreMap).toHaveBeenCalledWith(
      expect.objectContaining({ attributionControl: false }),
    );
    expect(AttributionControl).toHaveBeenCalledWith({
      compact: false,
      customAttribution: expect.stringContaining("MapLibre"),
    });
    expect(attribution.onAdd).toHaveBeenCalledWith(map);
    expect(props.attributionRef.current.contains(attribution.element)).toBe(true);
  });

  it("takes the attribution out of its slot when unmounted", () => {
    const { unmount } = render(<EclipseMap {...mapProps(null)} />);
    unmount();
    expect(attribution.onRemove).toHaveBeenCalledOnce();
  });

  it("removes the map when unmounted", () => {
    const { unmount } = render(<EclipseMap {...mapProps("2027-08-02")} />);
    unmount();
    expect(map.remove).toHaveBeenCalledOnce();
  });
});

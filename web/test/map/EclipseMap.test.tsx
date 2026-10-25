import { act, cleanup, render } from "@testing-library/react";
import { AttributionControl, MapLibreMap } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AIRPORT_ICON_ID,
  AIRPORT_ICON_OPTIONS,
  AIRPORTS_LAYERS,
  AIRPORTS_SOURCE_ID,
  airportsSource,
  loadAirportIcon,
} from "../../src/map/airports.js";
import { EclipseMap } from "../../src/map/EclipseMap.js";
import { ISOLINES_LAYERS, ISOLINES_SOURCE_ID, isolinesSource } from "../../src/map/isolines.js";

// jsdom has no WebGL, so MapLibre is replaced by a map that only records calls
const map = vi.hoisted(() => ({
  on: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  addImage: vi.fn(),
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

// jsdom can't draw images, so the airport icon is a stand-in that loads at once
const icon = vi.hoisted(() => ({ stands: "for the airport icon" }));
vi.mock("../../src/map/airports.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/map/airports.js")>()),
  loadAirportIcon: vi.fn(async () => icon),
}));

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

// The layers added from one source, in the order they were added
function layersFrom(sourceId: string) {
  return map.addLayer.mock.calls
    .map(([layer]) => layer)
    .filter((layer) => layer.source === sourceId);
}

// Runs the callback the component registered for a map event
function fire(event: string, payload?: unknown) {
  const [, listener] = map.on.mock.calls.find(([name]) => name === event)!;
  act(() => listener(payload));
}

// Loads the style, then lets the airport icon finish loading
async function loadStyle() {
  fire("load");
  await act(async () => {});
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

  it("adds no isolines without a date", () => {
    render(<EclipseMap {...mapProps(null)} />);
    fire("load");
    expect(map.addSource).not.toHaveBeenCalledWith(ISOLINES_SOURCE_ID, expect.anything());
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual([]);
  });

  it("adds the date's isolines once the style has loaded", () => {
    render(<EclipseMap {...mapProps("2027-08-02")} />);
    fire("load");
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource("2027-08-02"));
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual(ISOLINES_LAYERS);
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
    expect(map.addSource.mock.calls.filter(([id]) => id === ISOLINES_SOURCE_ID)).toHaveLength(1);
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual(ISOLINES_LAYERS);
    expect(MapLibreMap).toHaveBeenCalledOnce();
  });

  it("adds the airports and their icon on top once the style has loaded, even without a date", async () => {
    render(<EclipseMap {...mapProps(null)} />);
    await loadStyle();
    expect(map.addImage).toHaveBeenCalledWith(AIRPORT_ICON_ID, icon, AIRPORT_ICON_OPTIONS);
    expect(map.addSource).toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, airportsSource());
    // No beforeId, so they go above the base map's labels
    const airportCalls = map.addLayer.mock.calls.filter(
      ([layer]) => layer.source === AIRPORTS_SOURCE_ID,
    );
    expect(airportCalls).toEqual(AIRPORTS_LAYERS.map((layer) => [layer]));
  });

  it("adds the airports once, whatever the date", async () => {
    const props = mapProps("2027-08-02");
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} date="2028-07-22" />);
    await act(async () => {});
    expect(map.addImage).toHaveBeenCalledOnce();
    expect(layersFrom(AIRPORTS_SOURCE_ID)).toEqual(AIRPORTS_LAYERS);
  });

  it("adds no airports when the map goes away before their icon loads", async () => {
    const { unmount } = render(<EclipseMap {...mapProps(null)} />);
    fire("load");
    unmount();
    await act(async () => {});
    expect(map.addImage).not.toHaveBeenCalled();
    expect(map.addSource).not.toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, expect.anything());
  });

  it("adds no airports when their icon fails to load", async () => {
    vi.mocked(loadAirportIcon).mockRejectedValueOnce(new Error("not found"));
    render(<EclipseMap {...mapProps(null)} />);
    await loadStyle();
    expect(map.addImage).not.toHaveBeenCalled();
    expect(map.addSource).not.toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, expect.anything());
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

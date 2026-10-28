import { act, cleanup, render } from "@testing-library/react";
import { AttributionControl, MapLibreMap } from "maplibre-gl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIsolines, type Isolines } from "../../src/api/eclipses.js";
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
  getLayer: vi.fn(),
  getStyle: vi.fn(() => ({ layers: [] })),
  fitBounds: vi.fn(),
  remove: vi.fn(),
}));

// The isolines source once it has been added
const source = vi.hoisted(() => ({ setData: vi.fn() }));

// The attribution control, whose element stands in for MapLibre's credits
const attribution = vi.hoisted(() => {
  const element = document.createElement("details");
  return { element, onAdd: vi.fn(() => element), onRemove: vi.fn() };
});

// What the API serves for each date, answered at once unless a test holds it back
const ISOLINES = vi.hoisted((): Record<string, Isolines> => ({
  "2027-08-02": { type: "FeatureCollection", bbox: [-46, -14, 92, 38], features: [] },
  "2028-07-22": { type: "FeatureCollection", bbox: [74, -52, 182, -9], features: [] },
}));
vi.mock("../../src/api/eclipses.js", () => ({
  fetchIsolines: vi.fn(async (date: string) => ISOLINES[date]),
}));

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

// Lets pending promises settle: the airport icon, the isolines
async function settle() {
  await act(async () => {});
}

// Loads the style, then lets the airport icon and the isolines finish loading
async function loadStyle() {
  fire("load");
  await settle();
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
    vi.restoreAllMocks();
    map.getSource.mockReset();
    map.getLayer.mockReset();
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

  it("adds no isolines without a date", async () => {
    render(<EclipseMap {...mapProps(null)} />);
    await loadStyle();
    expect(map.addSource).not.toHaveBeenCalledWith(ISOLINES_SOURCE_ID, expect.anything());
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual([]);
  });

  it("opens with no view of its own", () => {
    render(<EclipseMap {...mapProps(null)} />);
    const [options] = vi.mocked(MapLibreMap).mock.calls[0]!;
    expect(options).not.toHaveProperty("center");
    expect(options).not.toHaveProperty("zoom");
  });

  it("adds the date's isolines once the style has loaded", async () => {
    render(<EclipseMap {...mapProps("2027-08-02")} />);
    await loadStyle();
    expect(fetchIsolines).toHaveBeenCalledWith("2027-08-02");
    expect(map.addSource).toHaveBeenCalledWith(
      ISOLINES_SOURCE_ID,
      isolinesSource(ISOLINES["2027-08-02"]!),
    );
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual(ISOLINES_LAYERS);
  });

  it("adds the isolines when the first date arrives after the style", async () => {
    const props = mapProps(null);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    rerender(<EclipseMap {...props} date="2027-08-02" />);
    await settle();
    expect(map.addSource).toHaveBeenCalledWith(
      ISOLINES_SOURCE_ID,
      isolinesSource(ISOLINES["2027-08-02"]!),
    );
  });

  it("swaps the data on the same map when the date changes", async () => {
    const props = mapProps("2027-08-02");
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} date="2028-07-22" />);
    await settle();
    expect(source.setData).toHaveBeenCalledWith(ISOLINES["2028-07-22"]);
    expect(map.addSource.mock.calls.filter(([id]) => id === ISOLINES_SOURCE_ID)).toHaveLength(1);
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual(ISOLINES_LAYERS);
    expect(MapLibreMap).toHaveBeenCalledOnce();
  });

  it("fits the map to the whole path of each eclipse picked", async () => {
    const props = mapProps("2027-08-02");
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} date="2028-07-22" />);
    await settle();
    expect(map.fitBounds.mock.calls.map(([bbox]) => bbox)).toEqual([
      ISOLINES["2027-08-02"]!.bbox,
      ISOLINES["2028-07-22"]!.bbox,
    ]);
  });

  it("ignores isolines that arrive after another date was picked", async () => {
    let answer2027: (isolines: Isolines) => void = () => {};
    vi.mocked(fetchIsolines).mockImplementationOnce(
      () => new Promise((resolve) => (answer2027 = resolve)),
    );
    const props = mapProps("2027-08-02");
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    rerender(<EclipseMap {...props} date="2028-07-22" />);
    await settle();
    answer2027(ISOLINES["2027-08-02"]!);
    await settle();
    expect(map.addSource).not.toHaveBeenCalledWith(
      ISOLINES_SOURCE_ID,
      isolinesSource(ISOLINES["2027-08-02"]!),
    );
    expect(map.fitBounds.mock.calls.map(([bbox]) => bbox)).toEqual([ISOLINES["2028-07-22"]!.bbox]);
  });

  it("warns and leaves the map as it is when the isolines can't be fetched", async () => {
    const error = new Error("GET /api/eclipses/2027-08-02/isolines answered 500");
    vi.mocked(fetchIsolines).mockRejectedValueOnce(error);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<EclipseMap {...mapProps("2027-08-02")} />);
    await loadStyle();
    expect(warn).toHaveBeenCalledWith(expect.any(String), error);
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual([]);
    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it("registers the airport icon before adding anything", async () => {
    render(<EclipseMap {...mapProps("2027-08-02")} />);
    fire("load");
    expect(map.addSource).not.toHaveBeenCalled();
    await act(async () => {});
    expect(map.addImage).toHaveBeenCalledWith(AIRPORT_ICON_ID, icon, AIRPORT_ICON_OPTIONS);
    expect(map.addImage.mock.invocationCallOrder[0]).toBeLessThan(
      map.addSource.mock.invocationCallOrder[0]!,
    );
  });

  it("adds the airports on top once the style has loaded, even without a date", async () => {
    render(<EclipseMap {...mapProps(null)} />);
    await loadStyle();
    expect(map.addSource).toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, airportsSource());
    // No beforeId, so they go above the base map's labels
    expect(map.addLayer.mock.calls).toEqual(AIRPORTS_LAYERS.map((layer) => [layer]));
  });

  it("puts the isolines labels under the airports when the date arrives after them", async () => {
    const props = mapProps(null);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    const [airports] = AIRPORTS_LAYERS;
    map.getLayer.mockImplementation((id: string) => (id === airports!.id ? airports : undefined));
    rerender(<EclipseMap {...props} date="2027-08-02" />);
    await settle();
    const labels = ISOLINES_LAYERS.filter((layer) => layer.type === "symbol");
    for (const label of labels) {
      expect(map.addLayer).toHaveBeenCalledWith(label, airports!.id);
    }
  });

  it("adds the airports once, whatever the date", async () => {
    const props = mapProps("2027-08-02");
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} date="2028-07-22" />);
    await settle();
    expect(map.addImage).toHaveBeenCalledOnce();
    expect(layersFrom(AIRPORTS_SOURCE_ID)).toEqual(AIRPORTS_LAYERS);
  });

  it("adds nothing when the map goes away before the icon loads", async () => {
    const { unmount } = render(<EclipseMap {...mapProps("2027-08-02")} />);
    fire("load");
    unmount();
    await act(async () => {});
    expect(map.addImage).not.toHaveBeenCalled();
    expect(map.addSource).not.toHaveBeenCalled();
  });

  it("warns and still adds everything, airports without their icon, when the icon fails to load", async () => {
    const error = new Error("not found");
    vi.mocked(loadAirportIcon).mockRejectedValueOnce(error);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<EclipseMap {...mapProps("2027-08-02")} />);
    await loadStyle();
    expect(warn).toHaveBeenCalledWith(expect.any(String), error);
    expect(map.addImage).not.toHaveBeenCalled();
    expect(map.addSource).toHaveBeenCalledWith(
      ISOLINES_SOURCE_ID,
      isolinesSource(ISOLINES["2027-08-02"]!),
    );
    expect(map.addSource).toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, airportsSource());
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

import { act, cleanup, render } from "@testing-library/react";
import { AttributionControl, MapLibreMap } from "maplibre-gl";
import polygonClipping from "polygon-clipping";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Airports } from "../../../src/api/airports.js";
import type { Isolines } from "../../../src/api/eclipses.js";
import {
  AIRPORT_ICON_ID,
  AIRPORT_ICON_OPTIONS,
  AIRPORTS_LAYERS,
  AIRPORTS_SOURCE_ID,
  loadAirportIcon,
} from "../../../src/map/airports.js";
import { EclipseMap } from "../../../src/map/EclipseMap.js";
import {
  DURATION_BANDS_LAYERS,
  DURATION_BANDS_SOURCE_ID,
  durationBandsSource,
  ISOLINES_LAYERS,
  ISOLINES_SOURCE_ID,
  isolinesSource,
} from "../../../src/map/isolines.js";
import { airports } from "../../helpers/airports.js";
import { isolines } from "../../helpers/isolines.js";

// jsdom has no WebGL, so MapLibre is replaced by a map that only records calls
const map = vi.hoisted(() => ({
  on: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  addImage: vi.fn(),
  getSource: vi.fn(),
  getLayer: vi.fn(),
  // The base map's style, down to its first label layer
  getStyle: vi.fn(() => ({ layers: [{ id: "place", type: "symbol" }] })),
  fitBounds: vi.fn(),
  remove: vi.fn(),
  setProjection: vi.fn(),
}));

// A source once it has been added: the duration bands, the isolines or the airports
const source = vi.hoisted(() => ({ setData: vi.fn() }));

// The attribution control, whose element stands in for MapLibre's credits
const attribution = vi.hoisted(() => {
  const element = document.createElement("details");
  return { element, onAdd: vi.fn(() => element), onRemove: vi.fn() };
});

// jsdom can't draw images, so the airport icon is a stand-in that loads at once
const icon = vi.hoisted(() => ({ stands: "for the airport icon" }));
vi.mock("../../../src/map/airports.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/map/airports.js")>()),
  loadAirportIcon: vi.fn(async () => icon),
}));

// The real geometry library, which a test can make fail the way odd geometry does
vi.mock("polygon-clipping", async (importOriginal) => {
  const { default: clipping } = await importOriginal<{ default: typeof polygonClipping }>();
  return { default: { ...clipping, difference: vi.fn(clipping.difference) } };
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

// Two eclipses' isolines, as App passes them
const ISOLINES_2027: Isolines = {
  type: "FeatureCollection",
  bbox: [-46, -14, 92, 38],
  features: [],
};
const ISOLINES_2028: Isolines = {
  type: "FeatureCollection",
  bbox: [74, -52, 182, -9],
  features: [],
};

// The airports around each eclipse's path, as App passes them
const AIRPORTS_2027 = airports("AGP", "LXR");
const AIRPORTS_2028 = airports("SYD");

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
function mapProps(isolines: Isolines | null, airports: Airports | null = null) {
  return {
    isolines,
    airports,
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

  it("adds nothing until the style has loaded", () => {
    render(<EclipseMap {...mapProps(ISOLINES_2027)} />);
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds nothing without isolines or airports", async () => {
    render(<EclipseMap {...mapProps(null, null)} />);
    await loadStyle();
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds nothing when the map goes away before the icon loads", async () => {
    const { unmount } = render(<EclipseMap {...mapProps(ISOLINES_2027)} />);
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
    render(<EclipseMap {...mapProps(ISOLINES_2027, AIRPORTS_2027)} />);
    await loadStyle();
    expect(warn).toHaveBeenCalledWith(expect.any(String), error);
    expect(map.addImage).not.toHaveBeenCalled();
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource(ISOLINES_2027));
    expect(map.addSource).toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, {
      type: "geojson",
      data: AIRPORTS_2027,
    });
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
    // The map's own control is off, so the credits show once
    expect(MapLibreMap).toHaveBeenCalledWith(
      expect.objectContaining({ attributionControl: false }),
    );
    expect(AttributionControl).toHaveBeenCalledWith(
      expect.objectContaining({ customAttribution: expect.stringContaining("MapLibre") }),
    );
    expect(props.attributionRef.current.contains(attribution.element)).toBe(true);
  });

  it("removes the map and its attribution when unmounted", () => {
    const { unmount } = render(<EclipseMap {...mapProps(ISOLINES_2027)} />);
    unmount();
    expect(attribution.onRemove).toHaveBeenCalledOnce();
    expect(map.remove).toHaveBeenCalledOnce();
  });

  it("adds the isolines once the style has loaded", async () => {
    render(<EclipseMap {...mapProps(ISOLINES_2027)} />);
    await loadStyle();
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource(ISOLINES_2027));
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual(ISOLINES_LAYERS);
  });

  it("adds the isolines' outlines under the base map's labels, and the bands under them", async () => {
    render(<EclipseMap {...mapProps(ISOLINES_2027)} />);
    await loadStyle();
    expect(map.addSource).toHaveBeenCalledWith(
      DURATION_BANDS_SOURCE_ID,
      durationBandsSource(ISOLINES_2027),
    );
    const added = map.addLayer.mock.calls.slice(0, ISOLINES_LAYERS.length + 1);
    expect(added).toEqual([
      [ISOLINES_LAYERS[0], "place"],
      [ISOLINES_LAYERS[1], "place"],
      [ISOLINES_LAYERS[2], undefined],
      ...DURATION_BANDS_LAYERS.map((layer) => [layer, ISOLINES_LAYERS[0]!.id]),
    ]);
  });

  it("warns and still shows the isolines and airports when the bands can't be cut", async () => {
    // Two isolines, so there is a band to cut
    const given = isolines(0, 60);
    const error = new Error("Unable to complete output ring");
    vi.mocked(polygonClipping.difference).mockImplementationOnce(() => {
      throw error;
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<EclipseMap {...mapProps(given, AIRPORTS_2027)} />);
    await loadStyle();
    expect(warn).toHaveBeenCalledWith(expect.any(String), error);
    expect(layersFrom(DURATION_BANDS_SOURCE_ID)).toEqual([]);
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual(ISOLINES_LAYERS);
    expect(layersFrom(AIRPORTS_SOURCE_ID)).toEqual(AIRPORTS_LAYERS);
    expect(map.fitBounds).toHaveBeenCalledWith(given.bbox);
  });

  it("adds the airports and their icon on top of everything", async () => {
    render(<EclipseMap {...mapProps(ISOLINES_2027, AIRPORTS_2027)} />);
    await loadStyle();
    // The id the airports layer draws, not the base map's own "airport"
    expect(map.addImage).toHaveBeenCalledWith(AIRPORT_ICON_ID, icon, AIRPORT_ICON_OPTIONS);
    expect(map.addSource).toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, {
      type: "geojson",
      data: AIRPORTS_2027,
    });
    // Last and with no beforeId, so they go above the isolines and the base map's labels
    const added = map.addLayer.mock.calls.slice(-AIRPORTS_LAYERS.length);
    expect(added).toEqual(AIRPORTS_LAYERS.map((layer) => [layer, undefined]));
  });

  it("fits the map to the whole path of each eclipse picked", async () => {
    const props = mapProps(ISOLINES_2027);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} isolines={ISOLINES_2028} />);
    expect(map.fitBounds.mock.calls.map(([bbox]) => bbox)).toEqual([
      ISOLINES_2027.bbox,
      ISOLINES_2028.bbox,
    ]);
  });

  it("adds the isolines when they arrive after the style", async () => {
    const props = mapProps(null);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    rerender(<EclipseMap {...props} isolines={ISOLINES_2027} />);
    expect(map.addSource).toHaveBeenCalledWith(ISOLINES_SOURCE_ID, isolinesSource(ISOLINES_2027));
  });

  it("adds the airports on top of the isolines when they arrive after them", async () => {
    const props = mapProps(ISOLINES_2027);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    expect(map.addSource).not.toHaveBeenCalledWith(AIRPORTS_SOURCE_ID, expect.anything());
    rerender(<EclipseMap {...props} airports={AIRPORTS_2027} />);
    const added = map.addLayer.mock.calls.slice(-AIRPORTS_LAYERS.length);
    expect(added).toEqual(AIRPORTS_LAYERS.map((layer) => [layer, undefined]));
  });

  it("adds the isolines' labels under the airports when the airports arrive first", async () => {
    const props = mapProps(null, AIRPORTS_2027);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getLayer.mockImplementation((id: string) =>
      AIRPORTS_LAYERS.find((layer) => layer.id === id),
    );
    rerender(<EclipseMap {...props} isolines={ISOLINES_2027} />);
    const labels = ISOLINES_LAYERS.filter((layer) => layer.type === "symbol");
    expect(map.addLayer.mock.calls.filter(([layer]) => labels.includes(layer))).toEqual(
      labels.map((layer) => [layer, AIRPORTS_LAYERS[0]!.id]),
    );
  });

  it("clears the airports when there are none, and adds them back when they return", async () => {
    const props = mapProps(ISOLINES_2027, AIRPORTS_2027);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} airports={null} />);
    expect(source.setData).toHaveBeenLastCalledWith({ type: "FeatureCollection", features: [] });
    rerender(<EclipseMap {...props} airports={AIRPORTS_2028} />);
    expect(source.setData).toHaveBeenLastCalledWith(AIRPORTS_2028);
    expect(layersFrom(AIRPORTS_SOURCE_ID)).toEqual(AIRPORTS_LAYERS);
  });

  it("swaps the isolines and airports on the same map when they change", async () => {
    const props = mapProps(ISOLINES_2027, AIRPORTS_2027);
    const { rerender } = render(<EclipseMap {...props} />);
    await loadStyle();
    map.getSource.mockReturnValue(source);
    rerender(<EclipseMap {...props} isolines={ISOLINES_2028} airports={AIRPORTS_2028} />);
    expect(source.setData).toHaveBeenCalledWith(ISOLINES_2028);
    expect(source.setData).toHaveBeenCalledWith(AIRPORTS_2028);
    for (const id of [ISOLINES_SOURCE_ID, AIRPORTS_SOURCE_ID]) {
      expect(map.addSource.mock.calls.filter(([added]) => added === id)).toHaveLength(1);
    }
    expect(layersFrom(ISOLINES_SOURCE_ID)).toEqual(ISOLINES_LAYERS);
    expect(layersFrom(AIRPORTS_SOURCE_ID)).toEqual(AIRPORTS_LAYERS);
    expect(map.addImage).toHaveBeenCalledOnce();
    expect(MapLibreMap).toHaveBeenCalledOnce();
  });
});

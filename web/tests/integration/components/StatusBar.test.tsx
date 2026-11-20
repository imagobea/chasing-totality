import { act, cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBar } from "../../../src/components/StatusBar.js";
import { createMapStatusStore } from "../../../src/map/mapStatus.js";

// The cursor and zoom, as one line of text
function readout() {
  return screen.getByText(/Zoom/).textContent;
}

describe("StatusBar", () => {
  afterEach(cleanup);

  it("shows the cursor's coordinates and the zoom, to one decimal", () => {
    const mapStatus = createMapStatusStore();
    mapStatus.set({ cursor: { lng: -5.6047, lat: 36.0136 }, zoom: 5.83 });
    render(<StatusBar mapStatus={mapStatus} attributionRef={createRef()} />);
    expect(readout()).toBe("Cursor · 36.01° N · 5.60° W · Zoom 5.8");
  });

  it("shows — for the cursor off the map and the zoom before the map loads", () => {
    render(<StatusBar mapStatus={createMapStatusStore()} attributionRef={createRef()} />);
    expect(readout()).toBe("Cursor · — · Zoom —");
  });

  it("follows the cursor and zoom as the map reports them", () => {
    const mapStatus = createMapStatusStore();
    render(<StatusBar mapStatus={mapStatus} attributionRef={createRef()} />);
    act(() => mapStatus.set({ cursor: { lng: -5.6047, lat: 36.0136 }, zoom: 5.83 }));
    expect(readout()).toBe("Cursor · 36.01° N · 5.60° W · Zoom 5.8");
    act(() => mapStatus.set({ cursor: null }));
    expect(readout()).toBe("Cursor · — · Zoom 5.8");
  });

  it("gives the map a place in the footer for the attribution", () => {
    const attributionRef = createRef<HTMLDivElement>();
    render(<StatusBar mapStatus={createMapStatusStore()} attributionRef={attributionRef} />);
    expect(screen.getByRole("contentinfo").contains(attributionRef.current)).toBe(true);
  });
});

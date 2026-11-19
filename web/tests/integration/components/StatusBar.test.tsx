import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBar } from "../../../src/components/StatusBar.js";

// The cursor and zoom, as one line of text
function readout() {
  return screen.getByText(/Zoom/).textContent;
}

describe("StatusBar", () => {
  afterEach(cleanup);

  it("shows the cursor's coordinates and the zoom, to one decimal", () => {
    render(
      <StatusBar
        cursor={{ lng: -5.6047, lat: 36.0136 }}
        zoom={5.83}
        attributionRef={createRef()}
      />,
    );
    expect(readout()).toBe("Cursor · 36.01° N · 5.60° W · Zoom 5.8");
  });

  it("shows — for the cursor off the map and the zoom before the map loads", () => {
    render(<StatusBar cursor={null} zoom={null} attributionRef={createRef()} />);
    expect(readout()).toBe("Cursor · — · Zoom —");
  });

  it("gives the map a place in the footer for the attribution", () => {
    const attributionRef = createRef<HTMLDivElement>();
    render(<StatusBar cursor={null} zoom={null} attributionRef={attributionRef} />);
    expect(screen.getByRole("contentinfo").contains(attributionRef.current)).toBe(true);
  });
});

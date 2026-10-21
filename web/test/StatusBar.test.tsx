import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBar } from "../src/StatusBar.js";

describe("StatusBar", () => {
  afterEach(cleanup);

  it("shows the cursor's coordinates", () => {
    render(<StatusBar cursor={{ lng: 32.64, lat: 25.69 }} attributionRef={createRef()} />);
    expect(screen.getByText("Cursor · 25.69° N · 32.64° E")).toBeTruthy();
  });

  it("shows — when the cursor is off the map", () => {
    render(<StatusBar cursor={null} attributionRef={createRef()} />);
    expect(screen.getByText("Cursor · —")).toBeTruthy();
  });

  it("gives the map a place in the footer for the attribution", () => {
    const attributionRef = createRef<HTMLDivElement>();
    render(<StatusBar cursor={null} attributionRef={attributionRef} />);
    expect(screen.getByRole("contentinfo").contains(attributionRef.current)).toBe(true);
  });
});

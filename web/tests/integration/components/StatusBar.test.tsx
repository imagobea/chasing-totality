import { cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBar } from "../../../src/components/StatusBar.js";

describe("StatusBar", () => {
  afterEach(cleanup);

  it("shows the cursor's coordinates", () => {
    render(<StatusBar cursor={{ lng: -5.6047, lat: 36.0136 }} attributionRef={createRef()} />);
    expect(screen.getByText("Cursor · 36.01° N · 5.60° W")).toBeTruthy();
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

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatCoordinates } from "../src/coordinates.js";

describe("formatCoordinates", () => {
  it("writes latitude then longitude, north and east", () => {
    expect(formatCoordinates({ lng: 32.64, lat: 25.69 })).toBe("25.69° N · 32.64° E");
  });

  it("uses south and west instead of minus signs", () => {
    expect(formatCoordinates({ lng: -5.6047, lat: -36.0136 })).toBe("36.01° S · 5.60° W");
  });
});

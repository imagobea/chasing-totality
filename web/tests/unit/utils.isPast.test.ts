import { describe, expect, it } from "vitest";
import { isPast } from "../../src/utils.js";

describe("isPast", () => {
  it("is false on the eclipse's day, until its last minute", () => {
    expect(isPast("2027-08-02", new Date(2027, 7, 2, 0, 0))).toBe(false);
    expect(isPast("2027-08-02", new Date(2027, 7, 2, 23, 59))).toBe(false);
  });

  it("is true from the first minute of the next local day", () => {
    expect(isPast("2027-08-02", new Date(2027, 7, 3, 0, 0))).toBe(true);
  });
});

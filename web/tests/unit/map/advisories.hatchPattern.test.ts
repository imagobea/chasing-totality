import { describe, expect, it } from "vitest";
import { ADVISORY_HATCHES, hatchPattern } from "../../../src/map/advisories.js";

// Any colour will do: the test only reads the stripes
const COLOR = "#102030";

// How much of the tile the stripes cover, from 0 to 1
function coverage(pattern: ReturnType<typeof hatchPattern>) {
  let total = 0;
  for (let i = 3; i < pattern.data.length; i += 4) total += pattern.data[i]! / 255;
  return total / (pattern.width * pattern.height);
}

describe("hatchPattern", () => {
  it("draws the whole hatch clearly denser than the parts one", () => {
    expect(coverage(hatchPattern(ADVISORY_HATCHES.whole, COLOR, 1))).toBeGreaterThan(
      2 * coverage(hatchPattern(ADVISORY_HATCHES.parts, COLOR, 1)),
    );
  });
});

import { describe, expect, it } from "vitest";
import { unwrapPath } from "../../../../src/engine/isolines/area.js";
import { row } from "../../../helpers/pathRow.js";

describe("unwrapPath", () => {
  it("leaves rows that don't cross the 180° meridian as they are", () => {
    const rows = [row([0, -100]), row([10, -5]), row([20, 90])];
    expect(unwrapPath(rows)).toEqual(rows);
  });

  it("carries the central line and limits on past 180, keeping everything else", () => {
    const [first, crossed] = unwrapPath([
      row([-40, 179]),
      row([-45, -179], [-44, 179], [-46, -178]),
    ]);
    expect(first).toEqual(row([-40, 179]));
    expect(crossed).toEqual(row([-45, 181], [-44, 179], [-46, 182]));
  });

  it("keeps a limit that's off the Earth off it", () => {
    expect(unwrapPath([row([0, 179], null, null)])).toEqual([row([0, 179], null, null)]);
  });
});

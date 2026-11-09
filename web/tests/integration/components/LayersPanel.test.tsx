import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LayersPanel } from "../../../src/components/LayersPanel.js";
import { fillToken } from "../../helpers/fillToken.js";

// Each duration class's row, longest first, with a duration inside it
const DURATION_ROWS: [label: string, durationSeconds: number][] = [
  ["≥ 7 min", 450],
  ["6 – 7 min", 390],
  ["5 – 6 min", 330],
  ["4 – 5 min", 270],
  ["3 – 4 min", 210],
  ["2 – 3 min", 150],
  ["1 – 2 min", 90],
  ["< 1 min", 30],
];

function durationGroup() {
  return within(screen.getByRole("region", { name: "Totality duration" }));
}

// The token a row's swatch is painted with
function swatchToken(row: HTMLElement): string | undefined {
  const color = row.querySelector<HTMLElement>(".swatch")?.style.getPropertyValue("--swatch");
  return /^var\((.+)\)$/.exec(color ?? "")?.[1];
}

describe("LayersPanel", () => {
  afterEach(cleanup);

  it("keys every duration class, longest first", () => {
    render(<LayersPanel />);
    const rows = durationGroup().getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      ...DURATION_ROWS.map(([label]) => label),
      "Totality limit",
    ]);
  });

  it.each(DURATION_ROWS)("paints %s in the map's colour for %i s", (label, durationSeconds) => {
    render(<LayersPanel />);
    const row = durationGroup().getByText(label).closest("li")!;
    expect(swatchToken(row)).toBe(fillToken(durationSeconds));
  });

  it("credits the NASA eclipse catalogue, with no date", () => {
    render(<LayersPanel />);
    const link = durationGroup().getByRole("link", { name: "NASA eclipse catalogue" });
    expect(link.getAttribute("href")).toBe("https://eclipse.gsfc.nasa.gov/SEpubs/5MCSE.html");
    expect(link.parentElement?.textContent).toBe("NASA eclipse catalogue");
  });
});

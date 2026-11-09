import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LayersPanel } from "../../../src/components/LayersPanel.js";
import { airports } from "../../helpers/airports.js";
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

function airportsGroup() {
  return within(screen.getByRole("region", { name: "Airports" }));
}

// The token a row's swatch is painted with
function swatchToken(row: HTMLElement): string | undefined {
  const color = row.querySelector<HTMLElement>(".swatch")?.style.getPropertyValue("--swatch");
  return /^var\((.+)\)$/.exec(color ?? "")?.[1];
}

describe("LayersPanel", () => {
  afterEach(cleanup);

  it("keys every duration class, longest first", () => {
    render(<LayersPanel airports={null} />);
    const rows = durationGroup().getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      ...DURATION_ROWS.map(([label]) => label),
      "Totality limit",
    ]);
  });

  it.each(DURATION_ROWS)("paints %s in the map's colour for %i s", (label, durationSeconds) => {
    render(<LayersPanel airports={null} />);
    const row = durationGroup().getByText(label).closest("li")!;
    expect(swatchToken(row)).toBe(fillToken(durationSeconds));
  });

  it("credits the NASA eclipse catalogue, with no date", () => {
    render(<LayersPanel airports={null} />);
    const link = durationGroup().getByRole("link", { name: "NASA eclipse catalogue" });
    expect(link.getAttribute("href")).toBe("https://eclipse.gsfc.nasa.gov/SEpubs/5MCSE.html");
    expect(link.parentElement?.textContent).toBe("NASA eclipse catalogue");
  });

  it("credits the airports' source and the day they were retrieved", () => {
    render(<LayersPanel airports={airports("AGP")} />);
    const link = airportsGroup().getByRole("link", { name: "OurAirports" });
    expect(link.getAttribute("href")).toBe("https://ourairports.com/data/");
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("OurAirports, 25 OCT 2026");
  });

  it("writes the retrieval day with two digits", () => {
    render(<LayersPanel airports={{ ...airports("AGP"), retrieved: "2026-11-06" }} />);
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("OurAirports, 06 NOV 2026");
  });

  it("shows — for the airports' source until they arrive, or when they can't be fetched", () => {
    render(<LayersPanel airports={null} />);
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("—");
    expect(airportsGroup().queryByRole("link")).toBeNull();
  });
});

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LayersPanel } from "../../../src/components/LayersPanel.js";
import { advisories } from "../../helpers/advisories.js";
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

function advisoriesGroup() {
  return within(screen.getByRole("region", { name: "Travel advisories" }));
}

// The token a row's swatch is painted with
function swatchToken(row: HTMLElement): string | undefined {
  const color = row.querySelector<HTMLElement>(".swatch")?.style.getPropertyValue("--swatch");
  return /^var\((.+)\)$/.exec(color ?? "")?.[1];
}

describe("LayersPanel", () => {
  afterEach(cleanup);

  it("keys every duration class, longest first", () => {
    render(<LayersPanel airports={null} advisories={null} />);
    const rows = durationGroup().getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      ...DURATION_ROWS.map(([label]) => label),
      "Totality limit",
    ]);
  });

  it.each(DURATION_ROWS)("paints %s in the map's colour for %i s", (label, durationSeconds) => {
    render(<LayersPanel airports={null} advisories={null} />);
    const row = durationGroup().getByText(label).closest("li")!;
    expect(swatchToken(row)).toBe(fillToken(durationSeconds));
  });

  it("credits the NASA eclipse catalogue, with no date", () => {
    render(<LayersPanel airports={null} advisories={null} />);
    const link = durationGroup().getByRole("link", { name: "NASA eclipse catalogue" });
    expect(link.getAttribute("href")).toBe("https://eclipse.gsfc.nasa.gov/SEpubs/5MCSE.html");
    expect(link.parentElement?.textContent).toBe("NASA eclipse catalogue");
  });

  it("credits the airports' source and the day they were retrieved", () => {
    render(<LayersPanel airports={airports("AGP")} advisories={null} />);
    const link = airportsGroup().getByRole("link", { name: "OurAirports" });
    expect(link.getAttribute("href")).toBe("https://github.com/davidmegginson/ourairports-data");
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("OurAirports, 25 OCT 2026");
  });

  it("writes the retrieval day with two digits", () => {
    render(
      <LayersPanel airports={{ ...airports("AGP"), retrieved: "2026-11-06" }} advisories={null} />,
    );
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("OurAirports, 06 NOV 2026");
  });

  it("shows — for the airports' source until they arrive, or when they can't be fetched", () => {
    render(<LayersPanel airports={null} advisories={null} />);
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("—");
    expect(airportsGroup().queryByRole("link")).toBeNull();
  });

  it("keys both hatched advisory states, the whole country first", () => {
    render(<LayersPanel airports={null} advisories={null} />);
    const rows = advisoriesGroup().getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["Whole country", "Some areas"]);
  });

  it("credits the advice and the day it was retrieved, not the public domain shapes", () => {
    render(<LayersPanel airports={null} advisories={advisories()} />);
    const link = advisoriesGroup().getByRole("link", { name: "UK FCDO travel advice" });
    expect(link.getAttribute("href")).toBe("https://www.gov.uk/foreign-travel-advice");
    expect(link.parentElement?.textContent).toBe("UK FCDO travel advice, 16 NOV 2026");
    expect(advisoriesGroup().queryByRole("link", { name: "Natural Earth" })).toBeNull();
  });

  it("credits the advice under the Open Government Licence, linked to it", () => {
    render(<LayersPanel airports={null} advisories={advisories()} />);
    const link = advisoriesGroup().getByRole("link", { name: "Open Government Licence v3.0" });
    expect(link.getAttribute("href")).toBe(
      "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    );
    expect(link.parentElement?.textContent).toBe(
      "Contains public sector information licensed under the Open Government Licence v3.0",
    );
  });

  it("shows — for the advisories' sources until they arrive, or when they can't be fetched", () => {
    render(<LayersPanel airports={null} advisories={null} />);
    expect(advisoriesGroup().getByRole("paragraph").textContent).toBe("—");
    expect(advisoriesGroup().queryByRole("link")).toBeNull();
  });
});

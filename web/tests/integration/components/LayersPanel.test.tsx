import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Advisories } from "../../../src/api/advisories.js";
import { LayersPanel } from "../../../src/components/LayersPanel.js";
import { advisories } from "../../helpers/advisories.js";
import { airports } from "../../helpers/airports.js";
import { fillToken } from "../../helpers/fillToken.js";

// What the panel says instead of the airports and advisories for a past eclipse
const PAST_NOTE = "Airports and travel advisories aren’t shown for past eclipses.";

// A path, since jsdom gives import.meta.url an http scheme
const ADVISORIES_FILE = join(import.meta.dirname, "../../../../data/advisories.geojson");

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
    render(<LayersPanel airports={null} advisories={null} showTravelLayers={true} />);
    const rows = durationGroup().getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      ...DURATION_ROWS.map(([label]) => label),
      "Totality limit",
    ]);
  });

  it.each(DURATION_ROWS)("paints %s in the map's colour for %i s", (label, durationSeconds) => {
    render(<LayersPanel airports={null} advisories={null} showTravelLayers={true} />);
    const row = durationGroup().getByText(label).closest("li")!;
    expect(swatchToken(row)).toBe(fillToken(durationSeconds));
  });

  it("credits Espenak & Meeus at NASA's GSFC, with no date", () => {
    render(<LayersPanel airports={null} advisories={null} showTravelLayers={true} />);
    const link = durationGroup().getByRole("link", { name: "Espenak & Meeus, NASA's GSFC" });
    expect(link.getAttribute("href")).toBe("https://eclipse.gsfc.nasa.gov/SEpubs/5MCSE.html");
    expect(link.parentElement?.textContent).toBe("Espenak & Meeus, NASA's GSFC");
  });

  it("replaces the airports and advisories with a note for a past eclipse", () => {
    render(<LayersPanel airports={null} advisories={advisories()} showTravelLayers={false} />);
    expect(screen.getByText(PAST_NOTE)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Airports" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Travel advisories" })).toBeNull();
  });

  it("shows no note for an upcoming eclipse", () => {
    render(
      <LayersPanel airports={airports("AGP")} advisories={advisories()} showTravelLayers={true} />,
    );
    expect(screen.queryByText(PAST_NOTE)).toBeNull();
  });

  it("credits the airports' source and the day they were retrieved", () => {
    render(<LayersPanel airports={airports("AGP")} advisories={null} showTravelLayers={true} />);
    const link = airportsGroup().getByRole("link", { name: "OurAirports" });
    expect(link.getAttribute("href")).toBe("https://github.com/davidmegginson/ourairports-data");
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("OurAirports, 25 OCT 2026");
  });

  it("writes the retrieval day with two digits", () => {
    render(
      <LayersPanel
        airports={{ ...airports("AGP"), retrieved: "2026-11-06" }}
        advisories={null}
        showTravelLayers={true}
      />,
    );
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("OurAirports, 06 NOV 2026");
  });

  it("shows — for the airports' source until they arrive, or when they can't be fetched", () => {
    render(<LayersPanel airports={null} advisories={null} showTravelLayers={true} />);
    expect(airportsGroup().getByRole("paragraph").textContent).toBe("—");
    expect(airportsGroup().queryByRole("link")).toBeNull();
  });

  it("credits the advice and the day it was retrieved, not the public domain shapes", () => {
    render(<LayersPanel airports={null} advisories={advisories()} showTravelLayers={true} />);
    const link = advisoriesGroup().getByRole("link", { name: "UK FCDO travel advice" });
    expect(link.getAttribute("href")).toBe("https://www.gov.uk/foreign-travel-advice");
    expect(link.parentElement?.textContent).toBe("UK FCDO travel advice, 16 NOV 2026");
    expect(advisoriesGroup().queryByRole("link", { name: "Natural Earth" })).toBeNull();
  });

  it("credits the advice under the Open Government Licence, linked to it", () => {
    render(<LayersPanel airports={null} advisories={advisories()} showTravelLayers={true} />);
    const link = advisoriesGroup().getByRole("link", { name: "Open Government Licence v3.0" });
    expect(link.getAttribute("href")).toBe(
      "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    );
    expect(link.parentElement?.textContent).toBe(
      "Contains public sector information licensed under the Open Government Licence v3.0",
    );
  });

  it("credits the committed snapshot's advice under the Open Government Licence", () => {
    const snapshot = JSON.parse(readFileSync(ADVISORIES_FILE, "utf8")) as Advisories;
    render(<LayersPanel airports={null} advisories={snapshot} showTravelLayers={true} />);
    const link = advisoriesGroup().getByRole("link", { name: "Open Government Licence v3.0" });
    expect(link.parentElement?.textContent).toBe(
      "Contains public sector information licensed under the Open Government Licence v3.0",
    );
  });

  it("shows — for the advisories' sources until they arrive, or when they can't be fetched", () => {
    render(<LayersPanel airports={null} advisories={null} showTravelLayers={true} />);
    expect(advisoriesGroup().getByRole("paragraph").textContent).toBe("—");
    expect(advisoriesGroup().queryByRole("link")).toBeNull();
  });

  it("credits only the advice by its fields, even when the shapes' source comes first, credited", () => {
    const [fcdo, naturalEarth] = advisories().sources;
    const naturalEarthCredited = {
      ...naturalEarth!,
      licence: "Some licence",
      licenceUrl: "https://example.com/licence",
      attribution: "Shapes under Some licence.",
    };
    render(
      <LayersPanel
        airports={null}
        advisories={{ ...advisories(), sources: [naturalEarthCredited, fcdo!] }}
        showTravelLayers={true}
      />,
    );
    const names = advisoriesGroup()
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names).toEqual(["UK FCDO travel advice", "Open Government Licence v3.0"]);
  });

  it("shows the advice's source without a credit line when it has no credit", () => {
    const fcdoUncredited = { ...advisories().sources[0]!, licenceUrl: undefined };
    render(
      <LayersPanel
        airports={null}
        advisories={{ ...advisories(), sources: [fcdoUncredited] }}
        showTravelLayers={true}
      />,
    );
    expect(advisoriesGroup().getByRole("paragraph").textContent).toBe(
      "UK FCDO travel advice, 16 NOV 2026",
    );
  });

  it("shows — for the advisories' sources when none supplies the advice", () => {
    const naturalEarth = advisories().sources[1]!;
    render(
      <LayersPanel
        airports={null}
        advisories={{ ...advisories(), sources: [naturalEarth] }}
        showTravelLayers={true}
      />,
    );
    expect(advisoriesGroup().getByRole("paragraph").textContent).toBe("—");
    expect(advisoriesGroup().queryByRole("link")).toBeNull();
  });

  it("keys both hatched advisory states, the whole country first", () => {
    render(<LayersPanel airports={null} advisories={null} showTravelLayers={true} />);
    const rows = advisoriesGroup().getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["Whole country", "Some areas"]);
  });
});

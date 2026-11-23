import type { CSSProperties } from "react";
import type { Advisories, AdvisorySource, AdvisoryState } from "../api/advisories.js";
import type { Airports } from "../api/airports.js";
import { CLASS_SECONDS, DURATION_CLASSES } from "../durationClasses.js";
import { formatDate } from "../utils.js";

type LayersPanelProps = {
  // The airports on the map, whose source and date the panel credits; null until they arrive or
  // when they can't be fetched
  airports: Airports | null;
  // The advisories on the map, whose sources and date the panel credits; null until they arrive or
  // when they can't be fetched
  advisories: Advisories | null;
  // Whether the airports and advisories show; false for a past eclipse, with a note in their place
  showTravelLayers: boolean;
};

type SourceLineProps = {
  // Where a layer's data comes from; null until it arrives or when it can't be fetched
  source: { name: string; url: string } | null;
  // The day the data was retrieved, as YYYY-MM-DD; none for data we generate
  retrieved?: string;
};

// Every eclipse's elements come from Espenak & Meeus's canon
const DURATION_SOURCE = {
  name: "Espenak & Meeus, NASA's GSFC",
  url: "https://eclipse.gsfc.nasa.gov/SEpubs/5MCSE.html",
};

// One row per duration class, longest first, labelled "≥ 7 min", "6 – 7 min" … "< 1 min"
const DURATION_ROWS = DURATION_CLASSES.map(({ startSeconds, colorToken }, index, classes) => {
  const start = startSeconds / CLASS_SECONDS;
  const next = classes[index + 1];
  if (next === undefined) return { label: `≥ ${start} min`, colorToken };
  const end = next.startSeconds / CLASS_SECONDS;
  return { label: start === 0 ? `< ${end} min` : `${start} – ${end} min`, colorToken };
}).reverse();

// Rows per column, for two columns; the left one takes the odd row out
const DURATION_COLUMN_ROWS = Math.ceil(DURATION_ROWS.length / 2);

// The group of place fields the travel advice supplies, whose source the panel credits
const ADVICE_FIELDS = "fcdo";

// One row per hatched advisory state, densest first, as the map draws them
const ADVISORY_ROWS: { state: Exclude<AdvisoryState, "none">; label: string }[] = [
  { state: "whole", label: "Whole country" },
  { state: "parts", label: "Some areas" },
];

// A layer's source, linked to its dataset, with the day it was retrieved; — until there's one
function SourceLine({ source, retrieved }: SourceLineProps) {
  return (
    <p className="layer-source">
      {source ? (
        <>
          <a href={source.url} target="_blank" rel="noreferrer">
            {source.name}
          </a>
          {retrieved && `, ${formatDate(retrieved)}`}
        </>
      ) : (
        "—"
      )}
    </p>
  );
}

// A source's credit split around its licence, to link it; null when its licence asks for none
function creditParts({ licence, licenceUrl, attribution }: AdvisorySource) {
  if (licenceUrl === undefined || attribution === undefined) return null;
  // Without its full stop, like the panel's other one-sentence lines
  const [before, after] = attribution.replace(/\.$/, "").split(licence);
  return { before, licence, licenceUrl, after };
}

// The key to the map's layers, over its bottom-left corner
export function LayersPanel({ airports, advisories, showTravelLayers }: LayersPanelProps) {
  const adviceSource = advisories?.sources.find(({ fields }) => fields === ADVICE_FIELDS) ?? null;
  const credit = adviceSource && creditParts(adviceSource);

  return (
    <aside className="layers-panel" aria-label="Layers">
      <p className="kicker">Layers</p>
      <section className="layer-group" aria-labelledby="layer-duration">
        <h2 id="layer-duration" className="layer-name">
          Totality duration
        </h2>
        <SourceLine source={DURATION_SOURCE} />
        {/* Two columns, filled top to bottom, so longest first still reads down the left */}
        <ul
          className="layer-key duration-key"
          style={{ "--rows": DURATION_COLUMN_ROWS } as CSSProperties}
        >
          {DURATION_ROWS.map(({ label, colorToken }) => (
            <li key={colorToken}>
              <span
                className="swatch"
                style={{ "--swatch": `var(${colorToken})` } as CSSProperties}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
        <ul className="layer-key">
          <li>
            <span className="limit-line" aria-hidden="true" />
            Totality limit
          </li>
        </ul>
      </section>
      {showTravelLayers ? (
        <>
          <section className="layer-group" aria-labelledby="layer-airports">
            {/* Name and source to the left, the map's symbol centred beside them */}
            <div className="layer-heading">
              <div>
                <h2 id="layer-airports" className="layer-name">
                  Airports
                </h2>
                <SourceLine source={airports?.source ?? null} retrieved={airports?.retrieved} />
              </div>
              <span className="airport-icon" aria-hidden="true" />
            </div>
          </section>
          <section className="layer-group" aria-labelledby="layer-advisories">
            <h2 id="layer-advisories" className="layer-name">
              Travel advisories
            </h2>
            <SourceLine source={adviceSource} retrieved={advisories?.retrieved} />
            {/* The licence's credit, when it asks for one, linked to the licence */}
            {credit && (
              <p className="layer-source layer-credit">
                {credit.before}
                <a href={credit.licenceUrl} target="_blank" rel="noreferrer">
                  {credit.licence}
                </a>
                {credit.after}
              </p>
            )}
            <ul className="layer-key">
              {ADVISORY_ROWS.map(({ state, label }) => (
                <li key={state}>
                  <span
                    className="hatch"
                    style={
                      {
                        "--hatch-width": `var(--advisory-hatch-${state}-width)`,
                        "--hatch-spacing": `var(--advisory-hatch-${state}-spacing)`,
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        // Where the airports and advisories would sit, after the same divider
        <section className="layer-group">
          <p className="layer-source">
            Airports and travel advisories aren’t shown for past eclipses.
          </p>
        </section>
      )}
    </aside>
  );
}

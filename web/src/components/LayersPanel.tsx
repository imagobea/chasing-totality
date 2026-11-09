import type { CSSProperties } from "react";
import type { Airports } from "../api/airports.js";
import { CLASS_SECONDS, DURATION_CLASSES } from "../durationClasses.js";
import { formatRetrievedDate } from "../utils.js";

type LayersPanelProps = {
  // The airports on the map, whose source and date the panel credits; null until they arrive or
  // when they can't be fetched
  airports: Airports | null;
};

// Every eclipse's elements come from Espenak & Meeus's canon
const DURATION_SOURCE = {
  name: "NASA eclipse catalogue",
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

// The key to the map's layers, over its bottom-left corner
export function LayersPanel({ airports }: LayersPanelProps) {
  return (
    <aside className="layers-panel" aria-label="Layers">
      <p className="kicker">Layers</p>
      <section className="layer-group" aria-labelledby="layer-duration">
        <h2 id="layer-duration" className="layer-name">
          Totality duration
        </h2>
        <p className="layer-source">
          <a href={DURATION_SOURCE.url} target="_blank" rel="noreferrer">
            {DURATION_SOURCE.name}
          </a>
        </p>
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
      <section className="layer-group" aria-labelledby="layer-airports">
        {/* Name and source to the left, the map's symbol centred beside them */}
        <div className="layer-heading">
          <div>
            <h2 id="layer-airports" className="layer-name">
              Airports
            </h2>
            <p className="layer-source">
              {airports ? (
                <>
                  <a href={airports.source.url} target="_blank" rel="noreferrer">
                    {airports.source.name}
                  </a>
                  , {formatRetrievedDate(airports.retrieved)}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <span className="airport-icon" aria-hidden="true" />
        </div>
      </section>
    </aside>
  );
}

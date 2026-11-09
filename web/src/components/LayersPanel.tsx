import type { CSSProperties } from "react";
import { CLASS_SECONDS, DURATION_CLASSES } from "../durationClasses.js";

// Every eclipse's elements come from Espenak & Meeus's canon
const DURATION_SOURCE = {
  name: "NASA eclipse catalogue",
  url: "https://eclipse.gsfc.nasa.gov/SEpubs/5MCSE.html",
};

// A class's whole minutes, as "< 1 min", "1 – 2 min" … "≥ 7 min"
function durationLabel(index: number): string {
  const start = DURATION_CLASSES[index]!.startSeconds / CLASS_SECONDS;
  const next = DURATION_CLASSES[index + 1];
  if (next === undefined) return `≥ ${start} min`;
  const end = next.startSeconds / CLASS_SECONDS;
  return start === 0 ? `< ${end} min` : `${start} – ${end} min`;
}

// The key to the map's layers, over its bottom-left corner
export function LayersPanel() {
  const durationRows = DURATION_CLASSES.map(({ colorToken }, index) => ({
    label: durationLabel(index),
    colorToken,
  })).reverse();

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
        <ul className="layer-key">
          {durationRows.map(({ label, colorToken }) => (
            <li key={colorToken}>
              <span
                className="swatch"
                style={{ "--swatch": `var(${colorToken})` } as CSSProperties}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
          <li>
            <span className="limit-line" aria-hidden="true" />
            Totality limit
          </li>
        </ul>
      </section>
    </aside>
  );
}

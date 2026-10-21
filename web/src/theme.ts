// Design tokens as JS, for MapLibre paint properties that can't read CSS variables

// Keys are the CSS variable names, values are written exactly as in tokens.css
export const theme = {
  "--color-bg": "#2a3245",
  "--color-surface": "rgba(36, 43, 60, 0.95)",
  "--color-surface-raised": "#2f3850",
  "--color-border": "#55617e",
  "--color-divider": "#3c4661",
  "--color-control-border": "#5e6a88",
  "--color-text": "#eef1f7",
  "--color-text-muted": "#b3bdd0",
  "--color-text-faint": "#aab4c8",
  "--color-accent": "#ffb547",
  "--color-on-accent": "#1e2433",
  "--color-path-fill-short": "#ffd9a0",
  "--color-path-fill-long": "#f2661f",
  "--color-path-edge": "#ffc46b",
  "--color-path-center": "#fff3dc",
  "--color-travel": "#8be4f2",
  "--color-advisory": "#ff8a8a",
  "--color-advisory-text": "#ffb3b3",
  "--color-status-ok": "#9be0ae",
  "--color-label-halo": "#2e3850",

  "--path-fill-opacity": "0.3",
  "--path-edge-width": "1px",
  "--advisory-fill-opacity": "0.55",
  "--label-halo-width": "1.5",

  "--font-display": '"Michroma", sans-serif',
  "--font-body": '"JetBrains Mono", monospace',
  "--text-xs": "10px",
  "--text-sm": "12px",
  "--text-md": "16px",
  "--text-lg": "24px",
  "--text-xl": "40px",
  "--tracking-kicker": "0.2em",

  "--space-1": "4px",
  "--space-2": "8px",
  "--space-3": "12px",
  "--space-4": "16px",
  "--space-5": "20px",
  "--radius": "0",
  "--panel-corner": "10px",
  "--target-min": "44px",
} as const;

// Map labels use a font the OpenFreeMap glyph server has, not the CSS fonts
export const MAP_FONT = "Noto Sans Regular";

// MapLibre wants numbers where the CSS tokens carry units
export function toNumber(token: `${number}${string}`): number {
  return Number.parseFloat(token);
}

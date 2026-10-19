# Chasing Totality — Design

> Lives at `docs/design/DESIGN.md`. Mockups live in `docs/design/mockups/`.
>
> This doc has two halves with different rules:
>
> | Section                   | Status         | How to treat it                                                                 |
> | ------------------------- | -------------- | ------------------------------------------------------------------------------- |
> | **Part A — Structure**    | ✅ Settled     | Follow it. Changes need a deliberate decision and an update here.               |
> | **Part B — Visual style** | 🧪 Provisional | Current best guess, expected to change. Always go through tokens. Don't polish. |
>
> Mockups show **structure**, not pixel-perfect specs.

---

## What the app is

A personal tool, for me, family and friends, for picking a spot to watch a total solar eclipse. You explore a map with the path of totality on it, click a location, and get what you need to decide: how long totality lasts there, whether the sky is usually clear, how to fly there and whether it's safe.

- **First eclipse:** 2 August 2027 (Spain → North Africa → Egypt → Arabia).
- **Platform:** desktop only. Planning happens ahead of time at a desk; no phone layout for now.
- **Stack:** Fastify + React + Vite + MapLibre + OpenFreeMap. Path data is pregenerated from NASA data and served by the API.

---

# Part A — Structure ✅ Settled

## A1. Screen layout

One screen. The map is the app; everything else floats over it or frames it.

```
┌──────────────────────────────────────────────────────────────────────┐
│ AppHeader: [Logo] [EclipsePicker ▾]          [Countdown] [ApiStatus] │
├──────────────────────────────────────────────────────────────────────┤
│                                                     ┌──────────────┐ │
│                                                     │              │ │
│                    MapStage (full width)            │  SpotPanel   │ │
│                                                     │  (right,     │ │
│                                                     │  scrolls)    │ │
│ ┌────────────┐                                      │              │ │
│ │LayersPanel │                                      │              │ │
│ │(bottom-left)                                      │              │ │
│ └────────────┘                                      └──────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ StatusBar: [selected coords]   [basemap · data source]  [attribution]│
└──────────────────────────────────────────────────────────────────────┘
```

- **Target viewport:** about 1280–1440 px wide. The map fills the space between header and status bar.
- **Panels:** LayersPanel and SpotPanel are overlays on the map, not columns. The map keeps its full width underneath them.
- **SpotPanel:** anchored top-right, at most the map height, and scrolls internally.

## A2. Components

Components are described by **role**, not by colour or font.

### AppHeader

- **Contains:** logo mark plus wordmark, `EclipsePicker`, `Countdown`, `ApiStatus`.
- **Order:** left to right as listed. A flexible spacer pushes Countdown and ApiStatus to the right.

### EclipsePicker

- **Trigger:** a button showing the selected eclipse as date · type, e.g. `2027 · AUG 02 · TOTAL`, plus a chevron.
- **Dropdown:** one row per eclipse, containing:
  - date
  - type
  - regions crossed
  - a short data-status tag (`DATA` / `NO DATA YET`)
- **Unavailable eclipses:** rows without data are shown but disabled. This tells people more are coming.
- **On select:** sets the app-wide `eclipseId`; every data request is scoped to it.
- **Current state:** only 2027-08-02 has data. 2028-07-22 and 2030-11-25 are listed as disabled.

### Countdown

- **Shows:** days until the selected eclipse's greatest eclipse, as `T−N D`, computed client-side.

### ApiStatus

- **Shows:** a small status indicator plus a text label (`API OK` / `API DOWN`).
- **Colour:** never the only signal; the text label always carries the status.

### MapStage

- MapLibre map with an OpenFreeMap basemap. The style is provisional; see B4.
- **Click anywhere:** selects that point (`lng/lat`) and opens SpotPanel with data for that point.
  - Clicks are map-level (`map.on('click')`), never per-layer, so labels and fills never block them.
  - Point data comes from the API: `GET /api/eclipses/:id/point?lat&lng`.
  - Never read point data from rendered features.
  - `inPath` may be derived from `queryRenderedFeatures` on our own layers, but only for cursor and UI hints.
- **Cursor:** crosshair over the path.
- **Markers:** saved spots show as markers with a name label. The selected spot is visually emphasised.
- **Greatest eclipse:** marked with a small cross and label.

#### Map layer stack (bottom → top). Settled.

1. Basemap fills (land, water, roads), from the style.
2. **Advisories:** hatched `fill-pattern` (image added via `map.addImage`) plus a dashed outline.
3. **Isoline fills:** translucent. Stacked bands get stronger toward the centre line.
4. **Isoline lines:** crisp edges, plus a dashed centre line.
5. Basemap labels, kept readable with halos.
6. **Our symbols:** duration labels, airport icons, greatest-eclipse marker.
7. Spot markers and the selection highlight.

Our fills and lines are inserted **before the first basemap symbol layer**. Our symbols go on top. Only one layer may ever be near-opaque; everything else stays translucent so labels stay readable.

### LayersPanel (bottom-left overlay)

- **Layer toggles**, in this order:
  1. Totality path
  2. Airports
  3. Travel advisories
- **Each toggle:** a real button with `aria-pressed`, a checkbox mark, a label and a small swatch matching the layer.
- **Legend: "Totality duration".** A 5-step ramp from edge to centre, with end labels `EDGE · 0s` and `CENTRE · <max>`. `<max>` comes from the eclipse data (6m 23s for 2027).
- **No flight-route layer.** It was considered and dropped.

### SpotPanel (right overlay)

Sections in this exact order: will I see it → will the sky be clear → can I get there → should I go.

1. **Header**
   - kicker: `Spot NN / NN · COUNTRY`
   - spot name (display style)
   - coordinates
   - close button (icon-only, with an `aria-label`)
2. **Totality**
   - duration as the panel's largest number
   - a bar showing the share of the eclipse's maximum
   - caption: `NN% OF MAX (6m 23s)`
3. **Timing.** Two columns:
   - mid-totality time (UTC)
   - sun altitude
4. **Sky · August history**
   - clear-sky percentage as a bar plus a number
   - average high temperature
   - caption naming the period (e.g. `2000–2025`)
5. **Getting there**
   - "Fly from" select: the user's origin airport.
   - Fixed date window caption: `OUT 31 JUL–1 AUG · BACK 3–4 AUG`, derived from the eclipse date.
   - Nearest airports list. Each row has:
     - IATA code plus name
     - distance from the spot
     - origin → airport distance
     - cached fare (`from €X`)
     - a "Search" link to Google Flights, prefilled with origin, airport and the date window
   - Freshness note: `Fares cached nightly · checked <date>`.
6. **Travel advisory**
   - level indicator plus text (e.g. "Exercise increased caution")
   - source, and a "checked on" date
7. **Saved spots:** chips (real buttons) to jump between saved spots.

**Empty state:** when nothing is selected, show a short prompt ("Pick a spot inside the band") plus one line on what clicking shows. The Saved spots chips stay visible.

**Loading state:** keep the section skeleton in place and fill values as they arrive. Don't collapse the panel.

### StatusBar (footer)

- **Left:** selected coordinates (`—` when nothing is selected).
- **Centre:** basemap name, then the path data source (`NASA GSFC`).
- **Right:** map attribution, `MapLibre | OpenFreeMap © OpenMapTiles · © OpenStreetMap`. Required; never remove it.

## A3. Flow

1. The app loads with the next eclipse that has data. The map is centred on the path.
2. The user explores the map, turns layers on and off, and clicks a point or a saved-spot marker.
3. SpotPanel opens with that point's data, loading section by section.
4. The user changes "Fly from" and the airport rows update: distances, fares and search links.
5. The user saves a spot. _(Save is planned; see Open questions.)_

## A4. Data each component expects

These shapes guide the API. They aren't final field names.

| Endpoint                               | Returns                                                                                                                                                                                      | Used by                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `GET /api/eclipses`                    | list of `{ id, date, type, regions, hasData, greatestEclipse: { lat, lng, durationS } }`                                                                                                     | EclipsePicker, Countdown, LayersPanel legend |
| `GET /api/eclipses/:id/isolines`       | GeoJSON bands and lines, each with a duration property                                                                                                                                       | MapStage                                     |
| `GET /api/eclipses/:id/point?lat&lng`  | `{ inPath, durationS, midTotalityUtc, sunAltitudeDeg, sky: { clearPct, avgHighC, period }, airports: [{ iata, name, lat, lng, kmFromSpot }], advisory: { level, text, source, checkedAt } }` | SpotPanel                                    |
| `GET /api/fares?origin&dest` _(later)_ | `{ fromPrice, currency, checkedAt }` from a nightly cache                                                                                                                                    | SpotPanel airport rows                       |

**Data sources (planned):**

- **Airports:** OurAirports, filtered to medium and large airports with scheduled service. Nearest-k lookup by great-circle distance.
- **Sky:** pregenerated August clear-sky stats on a coarse grid, e.g. ERA5 or NASA POWER.
- **Advisories:** a small hand-maintained GeoJSON, with source and date.

## A5. Content rules

- **Never invent data.** Unknown values render as `—` or a clearly marked placeholder.
- **Times:** always label the zone (UTC by default).
- **Distances:** km.
- **Durations:** `Xm YYs`.
- **Sources:** every external number (weather, fares, advisories) shows its source and how fresh it is.

## A6. Accessibility (non-negotiable)

- Real `<button>`, `<a>`, `<select>` and `<label>` elements. No click handlers on divs.
- Touch and click targets at least 44 px, including map markers.
- Text contrast at least 4.5:1, including small muted labels.
- **Never colour alone:**
  - Advisories use hatch, outline and text.
  - Layer toggles have a checkmark state.
  - Status has a text label.
- Icon-only buttons have an `aria-label`. The map container has a descriptive `aria-label`.

---

# Part B — Visual style 🧪 Provisional

> Everything below is **current best guess, expected to change.** Components must reference **tokens only**; never hardcode a colour, font, size or spacing value. Restyling should be an edit to one tokens file.

## B1. Direction (mood, not spec)

- **Feel:** minimal, retro sci-fi, "mission control".
- **Hierarchy:** the eclipse path is the loudest thing on screen. The basemap is quiet but readable. The UI chrome is quieter still.
- **Accents:** one warm accent (the eclipse) and one cool accent (travel/airports), plus a warning colour for advisories.
- **Flat UI:** no gradients-as-decoration and no drop shadows.

## B2. Tokens

**Naming:** tokens are named by role. Components use these names only; the values are provisional.

**Current values:** the "Retro (custom)" theme, i.e. the Current page of the mockup.

### Colour

| Token                    | Role                                                     | Current value       |
| ------------------------ | -------------------------------------------------------- | ------------------- |
| `--color-bg`             | app background                                           | `#07090D`           |
| `--color-surface`        | floating panel background                                | `rgba(9,12,17,.94)` |
| `--color-surface-raised` | inputs, selected rows                                    | `#0E1218`           |
| `--color-border`         | panel and header borders                                 | `#232C38`           |
| `--color-divider`        | section dividers inside panels                           | `#1A212B`           |
| `--color-control-border` | buttons, chips, selects                                  | `#2A3646`           |
| `--color-text`           | primary text                                             | `#E6E1D6`           |
| `--color-text-muted`     | labels, captions                                         | `#8C97A6`           |
| `--color-text-faint`     | disabled, fine print                                     | `#7E8A9A`           |
| `--color-accent`         | primary emphasis: selection, key numbers, focus brackets | `#FFB547`           |
| `--color-on-accent`      | text/icons on accent                                     | `#07090D`           |
| `--color-path-fill`      | isoline band fill (used translucent)                     | `#F08A24`           |
| `--color-path-edge`      | isoline band outlines                                    | `#FFB547`           |
| `--color-path-center`    | centre line                                              | `#FFF3DC`           |
| `--color-travel`         | airports, flight links, distance bars                    | `#63C7DB`           |
| `--color-advisory`       | advisory hatch and outline                               | `#FF6B6B`           |
| `--color-advisory-text`  | advisory text on dark                                    | `#FF9A9A`           |
| `--color-status-ok`      | API OK dot                                               | `#8FD4A0`           |
| `--color-label-halo`     | halo behind map labels                                   | `#0A0D12`           |

### Map-layer paint (provisional)

| Token                     | Current value                       |
| ------------------------- | ----------------------------------- |
| `--path-fill-opacity`     | `0.14` per band (centre band `0.2`) |
| `--path-edge-width`       | `1px`                               |
| `--advisory-fill-opacity` | `0.55` (hatch)                      |
| `--label-halo-width`      | `1.5` (MapLibre `text-halo-width`)  |

MapLibre paint properties can't read CSS variables. Mirror these tokens in a small JS theme object, e.g. `theme.ts`, that both CSS generation and map layers import. That keeps one source of truth.

### Typography

| Token               | Role                                         | Current value                   |
| ------------------- | -------------------------------------------- | ------------------------------- |
| `--font-display`    | wordmark, spot name, big numbers             | `Michroma` (wide, retro sci-fi) |
| `--font-body`       | everything else, data                        | `JetBrains Mono`                |
| `--text-xs`         | kickers, captions (uppercase, wide tracking) | `10px`                          |
| `--text-sm`         | body, rows                                   | `12px`                          |
| `--text-md`         | secondary values                             | `16px`                          |
| `--text-lg`         | spot name                                    | `24px`                          |
| `--text-xl`         | totality duration                            | `40px`                          |
| `--tracking-kicker` | uppercase labels                             | `0.2em`                         |

The fonts in particular are **not decided**. Swap freely via the two font tokens.

### Space, shape, motion

| Token                     | Current value            | Notes                                    |
| ------------------------- | ------------------------ | ---------------------------------------- |
| `--space-1` … `--space-5` | `4 / 8 / 12 / 16 / 20px` |                                          |
| `--radius`                | `0`                      | square, HUD-like                         |
| `--panel-corner`          | `10px`                   | accent L-brackets on panel corners       |
| `--target-min`            | `44px`                   | Settled (A6). Keep it as a token anyway. |
| Selected spot             | pulse ring, ~2.4 s       | Respect `prefers-reduced-motion`.        |

## B3. Theme candidates explored

The mockup has four pages: Current, Positron, Dark and Fiord. Each one overrides the same tokens. Key values for comparison:

| Token                | Retro     | Positron  | Dark      | Fiord     |
| -------------------- | --------- | --------- | --------- | --------- |
| `--color-bg`         | `#07090D` | `#F7F7F5` | `#0C0C0D` | `#2A3245` |
| `--color-text`       | `#E6E1D6` | `#1D232B` | `#ECECEE` | `#EEF1F7` |
| `--color-text-muted` | `#8C97A6` | `#59636F` | `#9C9CA4` | `#B3BDD0` |
| `--color-accent`     | `#FFB547` | `#B85400` | `#FFB547` | `#FFB547` |
| `--color-path-fill`  | `#F08A24` | `#F07A12` | `#F08A24` | `#FFA040` |
| `--color-travel`     | `#63C7DB` | `#0B6E86` | `#63C7DB` | `#8BE4F2` |
| `--color-advisory`   | `#FF6B6B` | `#C62828` | `#FF6B6B` | `#FF8A8A` |

On light themes the accent must darken to keep 4.5:1 contrast. That's why Positron uses `#B85400`.

## B4. Basemap (provisional)

- **Today:** OpenFreeMap `bright`.
- **Candidates:** `positron` (light), `dark`, `fiord`.
- **Decide by testing on the real isolines,** not the mockup. Swap `MAP_STYLE` and look.
- **Whichever wins:**
  - quiet the basemap (desaturate, drop POIs)
  - add label halos
  - keep labels readable; don't hide them
- **Customising:** tweak paint properties in code on `load`, or edit the style in Maputnik and self-host the JSON.

---

## Rules for implementation (for Claude and me)

1. **Part A is settled.** Build exactly these components, sections, order and interactions.
2. **Part B is provisional:**
   - all styling goes through tokens: a CSS variables file plus a mirrored `theme.ts` for MapLibre
   - no hardcoded colours, fonts or sizes in components
   - don't spend time polishing visuals
3. **First issue: "Set up design tokens / theme".** Components come after.
4. **Changes to structure:** update Part A here in the same PR.

## Open questions

- How saved spots persist: JSON file, SQLite, or localStorage per person.
- Which sources to use for advisories.
- Whether to build cached fares at all, or keep only Search links.
- The final basemap and fonts.

## References

- **Mockup canvas (Claude design):** pages Current, Positron, Dark, Fiord. Interactive, with a theme switch in Tweaks.
- **Exported screenshots:** `docs/design/mockups/`.

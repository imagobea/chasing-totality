# Chasing Totality — Design

Design for the app described in [README](../../README.md). Desktop only.

This doc has two halves with different rules:

| Section                   | Status            | How to treat it                                                                       |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| **Part A — Structure**    | ✅ Mostly settled | Follow it but keep an open mind. Items marked as 🧪 are tentative - see legend below. |
| **Part B — Visual style** | 🧪 Provisional    | Current best guess, expected to change. Always go through tokens. Don't polish.       |

🧪 = tentative: discuss ahead of building, expect changes
💡 = idea: feature is out of scope, might be implemented at a later stage
📦 = resources

Mockups in `docs/design/mockups/` show **structure**, not pixel-perfect specs.

---

## Part A — Structure ✅ Mostly settled

### A1. Screen layout

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
│ StatusBar: [cursor coords]     [basemap · data source]  [attribution]│
└──────────────────────────────────────────────────────────────────────┘
```

- **Target viewport:** about 1280–1440 px wide. The map fills the space between header and status bar.
- **Panels:** LayersPanel and SpotPanel are overlays on the map, not columns. The map keeps its full width underneath them.
- **SpotPanel:** anchored top-right, at most the map height, and scrolls internally.

### A2. Components

Components are described by **role**, not by colour or font.

#### AppHeader

- **Contains:** logo mark plus wordmark, `EclipsePicker`, `Countdown`, `ApiStatus`.
- **Order:** left to right as listed. A flexible spacer pushes Countdown and ApiStatus to the right.

📦 If no logo is provided, a placeholder is fine.

`EclipsePicker`

- **Trigger:** a button showing the selected eclipse as date, e.g. `2027 · AUG 02`, plus a chevron.
- **Dropdown:** one row per eclipse, containing:
  - date
- **On select:** if we handle eclipse dates as ids, we could set an app-wide `eclipseId`, then every data request would be scoped to it.
- **Current state:** only 2027-08-02 has data.

🧪 Eclipse ids are a suggestion, anything related to the API should be agreed ahead of coding and documented
📦 Eclipse dates source from API `/api/eclipses`

`Countdown`

- **Shows:** days until the selected eclipse, as `T−N D`, computed client-side.

📦 Compute remaining days based on the selected eclipse date

`ApiStatus`

- **Shows:** a small status indicator plus a text label (`API OK` / `API DOWN`).
- **Colour:** never the only signal; the text label always carries the status.

📦 API `/api/health`

#### MapStage

- MapLibre map with an OpenFreeMap basemap. The style is provisional; see B4.
- **Click anywhere:** selects that point (`lng/lat`) and opens SpotPanel with data for that point.
  - Clicks are map-level (`map.on('click')`), never per-layer, so labels and fills never block them.
  - Point data to come from the API.
  - Never read point data from rendered features.
  - `inPath` may be derived from `queryRenderedFeatures` on our own layers, but only for cursor and UI hints.
- **Cursor:** crosshair over the path.
- **Greatest eclipse:** highlighted, maybe with a small cross and label. 🧪 This is only a nice to have.

💡 Another idea would to allow saving spots, but it is not a priority.
📦 Location data - where it comes from and how it is handled - needs discussion.

Map layer stack (bottom → top):

1. Basemap fills (land, water, roads), from the style.
2. **Advisories:** hatched `fill-pattern` (image added via `map.addImage`) plus a dashed outline.
3. **Isoline fills:** one band per whole minute of totality, non-overlapping, each a flat colour from the duration ramp (longest = lightest).
4. **Isoline lines:** faint inner isolines every 30 s, and one strong line for the limit of totality.
5. Basemap labels, kept readable maybe with halos.
6. **Our symbols:** duration labels, airport icons, etc.
7. Spot markers and the selection highlight.

Our fills and lines are inserted **before the first basemap symbol layer**. Our symbols go on top. Only one layer may ever be near-opaque (the duration bands); everything else stays translucent, and basemap labels sit above the bands so they stay readable.

📦 Travel advisories and airport data need to be integrated.

`LayersPanel` (bottom-left overlay)

A legend that details map layers separated by dividers, in this order:

1. **Totality duration.** One row per duration class, longest first: `≥ 7 min`, `6 – 7 min`, … `< 1 min`, each a swatch plus its label. A last row keys the limit line: a short solid line labelled "Totality limit". Rows show every class, whether or not the selected eclipse reaches it.
2. **Airports**, with the airport icon on the right.
3. **Travel advisories**, with its hatch swatch on the right.

Each group has a layer name, then a source line under it in small muted text: `<source>, <date>`. Each source links to the dataset. Dates formatted as `06 Nov 2026`, only for data that was retrieved instead of generated.

📦 Travel advisories and airport data need to be integrated.

`SpotPanel` (right overlay)

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
   - when totality starts and ends
   - when eclipse starts and ends
   - sun altitude is a nice to have 🧪, should only be displayed if the data is already available
3. **Sky · August history**
   - clear-sky percentage as a bar plus a number
   - average high temperature
   - caption naming the period (e.g. `2000–2025`)
4. **Getting there** - 🧪 consider following requirements and UX provisional
   - "Fly from" select: the user's origin airport.
   - Fixed date window caption: `OUT 31 JUL–1 AUG · BACK 3–4 AUG`, derived from the eclipse date.
   - Nearest airports list. Each row has:
     - IATA code plus name
     - distance from the spot
     - origin → airport distance
     - cached fare (`from €X`)
     - a "Search" link to Google Flights, prefilled with origin, airport and the date window
   - Freshness note: `Fares cached nightly · checked <date>`.
5. **Travel advisory**
   - level indicator plus text (e.g. "Exercise increased caution")
   - source, and a "checked on" date

**Empty state:** when nothing is selected, show a short prompt ("Pick a spot inside the band") plus one line on what clicking shows.

**Loading state:** keep the section skeleton in place and fill values as they arrive. Don't collapse the panel.

📦 Weather data, airport data and travel advisories need to be integrated.

`StatusBar` (footer)

- **Left:** cursor coordinates, `CURSOR · 25.69° N · 32.64° E` (`—` when the cursor is off the map).
- **Right:** map attribution, `MapLibre | OpenFreeMap © OpenMapTiles · © OpenStreetMap`. Required; never remove it.

🧪 Keep the center blank, we might use it to reference other sources.

### A3. Flow

1. The app loads with the next eclipse that has data. The map is centred on the path.
2. The user explores the map, ~~toggles layers on and off~~, and clicks a point ~~or a saved-spot marker~~.
3. SpotPanel opens with that point's data, loading section by section.
4. 🧪 The user changes "Fly from" and the airport rows update: distances, fares and search links.
5. ~~The user saves a spot.~~

### A4. Content rules

- **Never invent data.** VERY IMPORTANT. Unknown values render as `—` or a clearly marked placeholder.
- **Times:** always label the zone (UTC by default).
- **Distances:** km.
- **Durations:** `Xm YYs`.
- **Sources:** VERY IMPORTANT. Every external number (weather, fares, advisories) shows its source and how fresh it is.

### A5. Accessibility (non-negotiable)

- Real `<button>`, `<a>`, `<select>` and `<label>` elements. No click handlers on divs.
- Touch and click targets at least 44 px, including map markers.
- Text contrast at least 4.5:1, including small muted labels.
- **Never colour alone:**
  - Advisories use hatch, outline and text.
  - Layer toggles have a checkmark state.
  - Status has a text label.
- Icon-only buttons have an `aria-label`. The map container has a descriptive `aria-label`.

---

## Part B — Visual style 🧪 Provisional

> Everything below is **current best guess, expected to change.** Components must reference **tokens only**; never hardcode a colour, font, size or spacing value. Restyling should be an edit to one tokens file.

### B1. Direction (mood, not spec)

- **Feel:** minimal, retro sci-fi, "mission control".
- **Hierarchy:** the eclipse path is the loudest thing on screen. The basemap is quiet but readable. The UI chrome is quieter still.
- **Accents:** one warm accent (the eclipse) and one cool accent (travel/airports), plus a warning colour for advisories.
- **Flat UI:** no gradients-as-decoration and no drop shadows.

### B2. Tokens

**Naming:** tokens are named by role. Components use these names only; the values are provisional.

**Themes:** each UI theme pairs with the OpenFreeMap style of the same name: Positron, Dark and Fiord. Each candidate is a set of values for the same tokens; components never change between themes.

#### Colour

| Token                    | Role                                                     | Positron                | Dark                 | Fiord                |
| ------------------------ | -------------------------------------------------------- | ----------------------- | -------------------- | -------------------- |
| `--color-bg`             | app background                                           | `#F7F7F5`               | `#0C0C0D`            | `#2A3245`            |
| `--color-surface`        | floating panel background                                | `rgba(255,255,255,.95)` | `rgba(18,18,20,.94)` | `rgba(36,43,60,.95)` |
| `--color-surface-raised` | inputs, selected rows                                    | `#FFFFFF`               | `#17171A`            | `#2F3850`            |
| `--color-border`         | panel and header borders                                 | `#D3D8DD`               | `#2C2C31`            | `#55617E`            |
| `--color-divider`        | section dividers inside panels                           | `#E6E9EC`               | `#202024`            | `#3C4661`            |
| `--color-control-border` | buttons, chips, selects                                  | `#BFC6CE`               | `#3A3A40`            | `#5E6A88`            |
| `--color-text`           | primary text                                             | `#1D232B`               | `#ECECEE`            | `#EEF1F7`            |
| `--color-text-muted`     | labels, captions                                         | `#59636F`               | `#9C9CA4`            | `#B3BDD0`            |
| `--color-text-faint`     | disabled, fine print                                     | `#5F6975`               | `#8E8E96`            | `#AAB4C8`            |
| `--color-accent`         | primary emphasis: selection, key numbers, focus brackets | `#B85400`               | `#FFB547`            | `#FFB547`            |
| `--color-on-accent`      | text/icons on accent                                     | `#FFFFFF`               | `#0C0C0D`            | `#1E2433`            |
| `--color-path-fill-0`    | duration band fill, < 1 min                              | —                       | —                    | `#4B245B`            |
| `--color-path-fill-1`    | duration band fill, 1–2 min                              | —                       | —                    | `#7E2260`            |
| `--color-path-fill-2`    | duration band fill, 2–3 min                              | —                       | —                    | `#AD244D`            |
| `--color-path-fill-3`    | duration band fill, 3–4 min                              | —                       | —                    | `#D13C29`            |
| `--color-path-fill-4`    | duration band fill, 4–5 min                              | —                       | —                    | `#E66310`            |
| `--color-path-fill-5`    | duration band fill, 5–6 min                              | —                       | —                    | `#F48D0A`            |
| `--color-path-fill-6`    | duration band fill, 6–7 min                              | —                       | —                    | `#F8BC4C`            |
| `--color-path-fill-7`    | duration band fill, ≥ 7 min                              | —                       | —                    | `#F9E99A`            |
| `--color-path-limit`     | outer limit of totality, the only strong line            | —                       | —                    | `#FFC46B`            |
| `--color-isoline`        | inner isolines, drawn faint                              | —                       | —                    | `#FFF3DC`            |
| `--color-travel`         | airports, flight links, distance bars                    | `#0B6E86`               | `#63C7DB`            | `#8BE4F2`            |
| `--color-advisory`       | advisory hatch and outline                               | `#C62828`               | `#FF6B6B`            | `#FF8A8A`            |
| `--color-advisory-text`  | advisory text                                            | `#A51D1D`               | `#FF9A9A`            | `#FFB3B3`            |
| `--color-status-ok`      | API OK dot                                               | `#2E8540`               | `#8FD4A0`            | `#9BE0AE`            |
| `--color-label-halo`     | halo behind map labels                                   | `#FFFFFF`               | `#0C0C0D`            | `#2E3850`            |

**Duration ramp:** colour by absolute minutes (not % of max); longest = lightest; only the outer limit line is strong. Colour shows where it's longer; exact durations come from the whole-minute isoline labels and the spot panel. The ramp is set for Fiord only so far (— = not yet chosen).

On the light theme (Positron) the accent is darker, to keep 4.5:1 text contrast on white; its path colours are not chosen yet.

#### Map-layer paint (provisional, same for all themes)

| Token                     | Current value                         |
| ------------------------- | ------------------------------------- |
| `--path-fill-opacity`     | `0.95` per band (bands don't overlap) |
| `--isoline-opacity`       | `0.35`                                |
| `--isoline-width`         | `0.75px`                              |
| `--path-limit-width`      | `1.25px`                              |
| `--advisory-fill-opacity` | `0.55` (hatch)                        |
| `--label-halo-width`      | `1.5` (MapLibre `text-halo-width`)    |

MapLibre paint properties can't read CSS variables. Mirror these tokens in a small JS theme object, e.g. `theme.ts`, that both CSS generation and map layers import. That keeps one source of truth.

#### Typography (same for all themes)

| Token               | Role                                         | Current value             |
| ------------------- | -------------------------------------------- | ------------------------- |
| `--font-display`    | wordmark, spot name, big numbers             | `Michroma` (wide, sci-fi) |
| `--font-body`       | everything else, data                        | `JetBrains Mono`          |
| `--text-xs`         | kickers, captions (uppercase, wide tracking) | `10px`                    |
| `--text-sm`         | body, rows                                   | `12px`                    |
| `--text-md`         | secondary values                             | `16px`                    |
| `--text-lg`         | spot name                                    | `24px`                    |
| `--text-xl`         | totality duration                            | `40px`                    |
| `--tracking-kicker` | uppercase labels                             | `0.2em`                   |

The fonts in particular are **not decided**. Swap freely via the two font tokens.

#### Space, shape, motion (same for all themes)

| Token                     | Current value            | Notes                                    |
| ------------------------- | ------------------------ | ---------------------------------------- |
| `--space-1` … `--space-5` | `4 / 8 / 12 / 16 / 20px` |                                          |
| `--radius`                | `0`                      | square, HUD-like                         |
| `--panel-corner`          | `10px`                   | accent L-brackets on panel corners       |
| `--target-min`            | `44px`                   | Settled (A5). Keep it as a token anyway. |
| Selected spot             | pulse ring, ~2.4 s       | Respect `prefers-reduced-motion`.        |

### B3. Themes and mockups

There are 3 mockups, one per theme: Positron, Dark and Fiord - screenshots in `docs/design/mockups/{positron,dark,fiord}.png`. These are candidates, not a feature: we'll pick one and ship only that theme. There is no theme switch in the app.

- **Dark:** neutral near-black; the eclipse path stands out most.
- **Fiord:** slate blue; the most atmospheric, but with the least contrast against the bands.
- **Positron:** light and calm; the most readable for long planning sessions.

The UI theme and the basemap are chosen **together**: picking a theme means loading its matching OpenFreeMap style. Mockup colours approximate each style; tune the tokens against the real basemap.

### B4. Basemap (provisional)

- **Today:** OpenFreeMap `bright` (to be replaced).
- **Candidates:** `positron` (light), `dark`, `fiord`, each paired with the UI theme of the same name.
- **Decide by testing on the real isolines,** not the mockup. The winning basemap’s palette becomes the only token set. Swap `MAP_STYLE` and look.
- **Whichever wins:**
  - quiet the basemap (desaturate, drop POIs)
  - add label halos
  - keep labels readable; don't hide them
- **Customising:** tweak paint properties in code on `load`, or edit the style in Maputnik and self-host the JSON.

---

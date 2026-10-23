# Main page design (#31)

## Context

The page is a bare heading, a status line and a 400 px map with an inline style. This brings it to the structure in DESIGN.md A1/A2 and the mockups: an AppHeader (logo, eclipse picker, countdown, API status), a map filling the screen between header and footer, and a StatusBar footer (cursor coordinates left, attribution right).

**Decisions:**

- **Layout:** a full-viewport grid (`auto 1fr auto`); the map fills the middle row. No inline styles; tokens only.
- **Styles:** one global `styles/app.css` with plain class names, after `tokens.css`.
- **Fonts:** Michroma and JetBrains Mono from a Google Fonts `<link>`; the tokens keep their fallbacks.
- **Logo:** one SVG file (ring plus dotted corona, as in the mockup), used in the header and as the favicon. It can't read CSS variables, so it holds the accent hex and a test keeps it in sync with the theme.
- **Responsive:** desktop first, phones acceptable. One breakpoint (~720 px): the header wraps and drops the wordmark, the footer drops the cursor coordinates, no horizontal scroll.
- **Selected eclipse:** App fetches `/api/eclipses` and selects the first date; picker, countdown and map read it.
- **Picker:** a native `<select>` (A5), options formatted `2027 · AUG 02`; disabled with `—` while loading or on error. No "TOTAL" suffix: the API has no eclipse type (A4).
- **Countdown:** `T−N D`, calendar days from the user's local today to the eclipse date, both as UTC midnights so time zones don't matter. Clamped at 0, `—` without a date, no midnight tick.
- **API status:** polls `/api/health` every 30 s; label `API OK` / `API DOWN` beside a dot, never colour alone.
- **Map and date:** the isolines source is built from the date. The map is created once; the source is added when the first date arrives and swapped with `setData` afterwards.
- **Cursor:** the map reports the mouse position (or none, off the map) to App; the footer shows `CURSOR · 25.69° N · 32.64° E` or `—`. DESIGN.md A2 changes from selected to cursor coordinates.
- **Attribution:** MapLibre's own `AttributionControl`, mounted in the footer through its public `onAdd`/`onRemove` instead of a map corner. It stays dynamic as styles and sources change, unlike a hardcoded string.
- **Out of scope:** LayersPanel, SpotPanel, the centre footer slot, picking the theme, visual polish.

## Commits

1. `docs:` this plan.
2. `feat:` full-screen layout: the map fills the screen between header and footer, fonts load, a header shell with logo and wordmark, the logo as favicon, the narrow-screen breakpoint.
3. `feat:` API status polls and shows `API OK` / `API DOWN` with a dot. Tests with fake timers: first check, recheck after 30 s, nothing after unmount.
4. `feat:` eclipse picker: dates fetched, first one selected, formatted options, loading and error states.
5. `feat:` countdown from the selected date. Tests pin the clock: day maths across time zones, clamping, no date.
6. `feat:` the map follows the selected date: no date, first date, date change.
7. `feat:` StatusBar: cursor coordinates (N/S, E/W formatting) and the attribution control in the footer, removed on unmount. DESIGN.md A2 updated.

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` and `pnpm --dir web test` pass.
- `pnpm dev` plus `pnpm --dir web dev`:
  - the header matches the mockup's structure; the picker shows `2027 · AUG 02`; the countdown reads `T−285 D` on 2026-10-21;
  - the status flips to `API DOWN` within 30 s of stopping the API, and back;
  - the map fills the screen with no page scroll; the footer coordinates follow the cursor, `—` off the map; attribution links work; the favicon shows the logo;
  - at ~390 px wide the header wraps, nothing scrolls sideways and the map is usable.

## Optional tooling

No MCP needed. `/run` for a screenshot against `docs/design/mockups/fiord.png`, `/simplify` and `/code-review` before the PR.

## Deviations and findings

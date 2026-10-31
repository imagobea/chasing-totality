# Isolines duration classes (#60)

## Context

Totality duration is drawn as a linear gradient over nested 30 s polygons, each translucent, so they stack towards the centre line. The colour seen at a point blends every band beneath it, so a colour doesn't stand for a duration. Goal: discrete per-minute classes, each with its own flat colour, so a colour always means the same duration.

## Decisions

- **Classes:** one per whole minute: < 1, 1–2, 2–3, 3–4, 4–5, 5–6, ≥ 6 min. Fixed in absolute minutes for every eclipse, so shorter eclipses just show fewer classes
- **Non-overlapping bands:** each band is the area between one isoline and the next, filled once at a single opacity, so its colour is exactly its class colour
- **Bands derived in the frontend** from the nested isolines it already fetches: data, API and engine unchanged. Uses an MIT polygon-clipping library. If deriving them is too slow for 2027, move it to the generator instead (larger files)
- **Lines and labels:** all 30 s isolines stay as thin lines with their duration labels (never colour alone)
- **Palette:** seven class tokens, cool slate → beige → sand → orange → red → deep red, approximated from the reference image; they replace the short/long fill tokens, with one fill-opacity token. Part B stays provisional, no polish

## Out of scope

- A totality duration legend
- The dashed centre line (needs NASA's central line served)
- Basemap tweaks, layer toggles

## Commits

1. `docs:` this plan
2. `feat:` isolines drawn as non-overlapping bands coloured by duration class
3. `docs:` DESIGN palette tokens updated

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` pass, web tests included
- In the browser, for 2027, 2028 and 2026: each band is one flat colour per minute class, classes don't blend, isoline labels stay readable, and 2027 loads without a noticeable delay

## Optional tooling

No MCP needed. `/run` for a screenshot, `/simplify` and `/code-review` before the PR.

## Deviations and findings

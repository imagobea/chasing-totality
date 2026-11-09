# Map legend (#34)

## Context

The map colours the totality path by whole-minute duration class, but nothing says which colour means what, or where the airports come from. Goal: a LayersPanel with a totality duration legend and the airports' source and date.

## Decisions

- **Eight classes:** < 1, 1–2, … 6–7, ≥ 7 min, enough for any eclipse in 1901–2100 (longest ~7m08s), with a new ramp
- **One definition of the classes** for the map and the legend, tested so a duration can't land a class off
- **Legend as LayersPanel in DESIGN.md:** totality duration and airports groups; no max, no centreline
- **Totality duration source:** the NASA eclipse catalogue, with no date, fixed in the frontend since every eclipse uses it; the isolines data stays unchanged
- **Airports source and date** come with the airports response, so our code fetches them, not MapLibre
- **Panel lives in App;** App fetches the isolines and airports, and the map only draws them

## Out of scope

- The travel advisories group, until that layer exists
- The centreline
- Moving the cursor state out of App (its TODO stays)

## Commits

1. `docs:` LayersPanel design
2. `docs:` this plan
3. `refactor(web):` one shared definition of the duration classes, with the duration → colour tests
4. `feat:` 8-class duration ramp (tokens and DESIGN.md)
5. `refactor(web):` App fetches the isolines; the map draws what it's given
6. `refactor(web):` App fetches the airports; the map draws what it's given
7. `feat(web):` LayersPanel with the totality duration group
8. `feat(web):` airports group with its source and date

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` pass, web tests included
- In the browser, for 2026, 2027 and 1919: the bands match their legend rows, the map looks the same after each refactor, and both groups show their source lines (— for the airports if they fail to load)

## Optional tooling

No MCP needed. `/run` for a screenshot, `/simplify` and `/code-review` before the PR.

## Deviations and findings

- One date format across the app, `02 AUG 2027`, for the picker and the source lines; the picker read `2027 · AUG 02` and the design gave sources `06 Nov 2026`

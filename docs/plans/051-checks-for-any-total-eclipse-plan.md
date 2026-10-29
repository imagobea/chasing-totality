# Checks for any total eclipse (#51)

## Context

Adding 2026-08-12 fails the NASA path-table checks on its two `Limits` rows, the sunrise and sunset ends where NASA puts the Sun at 0°. We measure the Sun's altitude from the geocentric horizon; NASA uses the geodetic one (square to the local vertical), so our ends land up to 0.1° either side of the horizon and flip between total and none. A dry run over every central total eclipse of 2001–2100 found two more test assumptions that only held for 2027 and 2028.

## Decisions

**Engine**

- The Sun's altitude is measured from the geodetic horizon, as an observer sees it; no refraction
- Totality still counts as visible if the Sun is up at mid, C2 or C3, so our path runs a little past NASA's ends

**Testing**

- `Limits` rows sit on the horizon, so they are checked by the Sun's altitude at mid-eclipse: within ±0.018° of 0° (2 km of ground, like the limits)
- Central-line duration, limit position and halfway checks run on timed rows only
- Tolerances stay fixed for every eclipse (2 km, 0.5 s, 5 s), never derived from or widened for one eclipse; comments quote the worst measured across all eclipses
- Mid-eclipse times compare across midnight UT
- Halfway to a limit only needs some totality: at a very low Sun it can last longer than on the central line
- No new handling for rare cases (paths over a pole, NASA typos): the checks fail, so the skill stops and reports

## Out of scope

- Adding 2026-08-12: next, via the add-eclipse skill
- The skill's path-page download (#49): it takes the link from NASA's catalogue row, as 2051–2100 pages live in another folder
- Paths crossing a pole, non-central or hybrid eclipses (the skill already refuses the last two)

## Commits

1. `docs:` this plan
2. Geodetic horizon
   - 2a. `fix:` Sun altitude from the geodetic horizon; NASA's six path ends (2026, 2027, 2028) sit within 0.003° of 0°
   - 2b. `feat:` 2027 and 2028 isolines regenerated; only the path ends move
3. NASA path-table checks hold for any total eclipse
   - 3a. `test:` path ends checked by the Sun's altitude; the other checks skip them
   - 3b. `test:` mid-eclipse times compare across midnight UT
   - 3c. `test:` halfway to a limit only needs some totality
   - 3d. `test:` tolerance comments quote the worst measured across all eclipses
4. `docs:` engine README and DECISIONS: geodetic horizon, our path running past NASA's ends

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` pass
- With the 2026 files applied locally (not committed), `pnpm test` passes
- 2027 isolines in geojson.io: Spain and N Africa unchanged, ends within a few km of NASA's

## Optional tooling

No MCP needed. `/simplify` and `/code-review` before the PR.

## Deviations and findings

- Our largest gaps from NASA's path tables for 2026–2028, on the timed rows: a limit 0.80 km from NASA's (2028), a central-line duration 0.19 s off, a mid-eclipse time 1.17 s off. The old "1.7 km" and "0.25 s" came from 2027's sunrise `Limits` row, a horizon artefact
- Our largest gaps from NASA's path tables over the 61 eclipses of 2001–2100 that pass: a limit 1.61 km from NASA's (2044-08-23, Sun 2° up), a central-line duration 0.21 s off, a mid-eclipse time 1.35 s off, and a path end 0.015° off the horizon (2071-09-23). That last one comes closest to its tolerance, 0.018°
- The path-end altitude check came with the engine fix (2a), as its failing test; 3a only made the other checks skip the ends
- All 67 central total eclipses of 2001–2100 run through the checks: 61 pass. The 6 that stop are paths over a pole (2072, 2094), Antarctic paths with one limit 2.0–2.5 km off (2003, 2021), and NASA typos (2009, 2034)
- Our path sits 0.2–0.8 km south of NASA's and mid-eclipse ~1 s later in all three eclipses: the elements' source, systematic, not something a tolerance can be derived from

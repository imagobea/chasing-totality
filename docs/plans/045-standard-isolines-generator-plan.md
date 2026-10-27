# Standard isolines generator (#45)

## Context

The engine and the isolines script come from spike #4 and are tied to 2027-08-02. The script hardcodes the eclipse, a Spain–Red Sea rectangle (which cuts the path with straight edges) and 0–6m00s thresholds. It also writes to a scratch folder, and the result is copied into the served data by hand. Goal: adding a total eclipse means sourcing its Besselian elements and NASA's path table, then running one command. The app stays focused on total eclipses, prioritising 2027-08-02.

## Decisions

**Adding an eclipse**

- Source its Besselian elements and NASA's path table, keyed by date; record the elements' ΔT and source
- One list of known eclipses, keyed by date, is the single place to add one
- One command, with the date as its argument; a missing or unknown date lists the known ones

**Generating isolines**

- Area: NASA's limits plus a margin, so the whole path is covered (no straight cuts); ~5 km step
- Thresholds: every 30 s up to the longest duration
- Output goes straight to served data; NASA's limits go to scratch, for eye comparison
- The command reports grid size, run time and file size; the step is revisited only if too slow

**Testing**

- The maths is proven once, on 2027, against JSEX across the path width
- NASA's path-table check runs for every eclipse, catching pasted-in mistakes
- JSEX stays a GitHub copy pinned at a commit: its 2027 elements match NASA's Canon page, and its results agree with our maths and NASA's path table, so no further check
- Test files reviewed: keep, merge or drop

## Out of scope

- Frontend 2027 hardcodes (map centre, airports box, TODOs): next issue, so that adding an eclipse needs no frontend change
- Updating 2027's ΔT to an IERS prediction: optional follow-up
- An "add eclipse" Claude skill: the issue after that, built from the second eclipse's steps and proven by adding a third (2030-11-25) end to end

## Commits

1. `docs:` this plan
2. `refactor:` elements and path tables found by date; NASA's path-table check runs for every eclipse
3. `refactor:` generic isolines command (area from NASA's limits, automatic thresholds, output to served data), mirroring the airports script; spike commands renamed (`data:isolines`, `fixtures:jsex`)
4. `feat:` 2027 isolines regenerated over the whole path
5. `test:` test review outcome
6. `docs:` engine and main README: the generation pipeline, adding an eclipse, ΔT per source, JSEX provenance
7. `feat:` second eclipse (2028-07-22), generated and checked by eye; whether to serve it is decided then. Its steps and pitfalls go in "Deviations and findings", for the skill

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` pass
- `pnpm data:isolines 2027-08-02`, then the output and NASA's limits in geojson.io: isolines follow NASA's limits along the whole path, no straight cuts, Spain and N Africa unchanged
- `pnpm dev`: the 2027 isolines endpoint returns 200 and the frontend still renders

## Optional tooling

No MCP needed. `/simplify` and `/code-review` before the PR.

## Deviations and findings

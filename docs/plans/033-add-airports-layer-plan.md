# Airports layer (#33)

## Context

First external integration, picked ahead of travel advisories: airport data is open, static and point-shaped, so it's the cheapest way to set up the pattern (source → storage → endpoint → map layer → source and freshness note) that advisories will reuse. DESIGN.md puts airport icons in the "our symbols" layer (on top) and gives them the travel accent colour. Plan lands at `docs/plans/033-add-airports-layer-plan.md` as the first commit. Fares, "Fly from" and SpotPanel's nearest-airports list are out of scope.

A possible later step is an airport picker: choose a home airport, then see on the map the airports you can fly to from there. Nothing here builds that, but the data is shaped so it won't need redoing (worldwide coverage, airports keyed by IATA code, an endpoint that can filter).

## Candidate sources

| Source                             | Licence           | Freshness                   | Notes                                                                    |
| ---------------------------------- | ----------------- | --------------------------- | ------------------------------------------------------------------------ |
| **OurAirports** CSV                | Public domain     | Updated daily               | type (large/medium/small), scheduled-service flag, IATA, country; no key |
| OpenFlights                        | ODbL              | Airports ~2017, routes 2014 | Has routes too, but stale                                                |
| OSM `aeroway=aerodrome` (Overpass) | ODbL              | Live                        | Tags vary; needs share-alike attribution; rate limited                   |
| Wikidata SPARQL                    | CC0               | Live                        | Messy coverage of commercial service                                     |
| AeroDataBox / aviationstack        | Commercial, keyed | Live                        | Ruled out: no paid API keys                                              |

**Pick:** OurAirports.

## Decisions

- **No paid sources:** only free, keyless data, here and for any follow-up.
- **Selection:** airports worldwide with an IATA code, scheduled service and type large or medium (a few thousand rows). Worldwide rather than near the path, so a later picker can offer any home airport.
- **Storage:** this feature doesn't need a database: the data is small, read-only and rarely changes. A fixture-style script downloads the CSV, filters it and writes a committed GeoJSON snapshot with its retrieval date. Airports change too rarely to fetch on the fly; refreshing means rerunning the script by hand before the eclipse (monthly at most).
- **API:** one endpoint serves the snapshot as GeoJSON, with the source name and retrieval date in the response, and an optional bounding-box filter. Airports are identified by IATA code.
- **Map:** shows only airports inside a bounding box around the 2027 path plus a buffer (S Spain, Balearics, N Africa, Egypt, Saudi/Yemen). One GeoJSON source and a symbol layer (icon plus IATA label) above the basemap labels, coloured from theme tokens. Toggling the layer is out of scope.
- **Sources rule:** the source and "checked" date show up in the UI (status bar centre or layer legend).

## Out of scope: picker and routes

Undecided. "Where can I fly from X" needs route data, and the free options are weak: OpenFlights routes are frozen around 2014, and Wikipedia's "Airlines and destinations" tables are current but need scraping. If it goes ahead, it starts as its own spike comparing free route sources. That spike is where the fetch-on-the-fly vs stored-data and refresh-rate questions really matter, because routes change every season.

## Commits

1. `docs:` this plan.
2. `feat:` the airports snapshot: the generator script and the committed GeoJSON, with tests on the filter (type, service, IATA).
3. `feat:` the airports endpoint, with route tests (shape, source metadata, bbox filter).
4. `feat:` the airports layer on the map for the path's bounding box, with tests on the layer specs (source URL, ids, label field, token colours).
5. `docs:` README: data source, licence and how to refresh.

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` pass (web tests after `nvm use`).
- The endpoint with no filter returns worldwide airports (e.g. LHR, JFK present). With the path's bbox it returns only nearby ones.
- `pnpm dev` and `pnpm --dir web dev`: airport icons and IATA labels show over S Spain / N Africa (e.g. AGP, SVQ, TNG, LXR) above the isolines, and none far from the path. Source and date are visible. No console errors.

## Optional tooling

No MCP needed. `/run` for a screenshot, `/simplify` and `/code-review` before the PR.

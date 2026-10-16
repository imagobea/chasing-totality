# Map with isolines (#20)

## Context
The frontend shows only the API status. This adds a map: an OpenFreeMap base map, drawn by MapLibre GL JS, with the 2027-08-02 isolines from `/api/eclipses/2027-08-02/isolines` on top (ADR 001). Plan lands at `docs/plans/020-map-with-isolines-plan.md` as the first commit.

**Decisions:**
- **Integration:** plain `maplibre-gl` in a `useEffect` (create on mount, `map.remove()` on unmount); no React wrapper.
- **Base map:** OpenFreeMap ~~`positron`~~ `bright` style URL; no key, no proxy, attribution control left on.
- **View:** fixed centre and zoom over S Spain / N Africa; the eclipse date is a constant.
- **Isolines:** one `geojson` source; a fill layer whose colour comes from `durationSeconds` (`interpolate`), an outline layer, and `name` labels along the lines (`symbol-placement: line`).
- **Layer specs as data:** the source and layer definitions live in their own module, separate from the component, so they can be tested without WebGL.
- **Tests:** unit tests on the layer specs ~~only~~ and on the map's lifecycle, with MapLibre mocked; the map itself is checked by eye in the browser.
- **Out of scope:** legend, eclipse picker, click-for-duration, fit-to-data, gzip for the 1.2 MB GeoJSON.

## Commits
1. `docs:` this plan.
2. `feat:` the base map.
   - Add `maplibre-gl` to the web package, and its stylesheet.
   - A map component: created on mount, removed on unmount, OpenFreeMap style, fixed centre and zoom over the target area.
   - The app renders the map ~~filling the viewport~~; the API status stays visible on top.
3. `feat:` the isolines on top.
   - Layer specs as data: the GeoJSON source pointing at the 2027-08-02 endpoint; fill, outline and label layers.
   - The map adds the source and layers once its style has loaded.
   - Tests on the specs: the source URL, unique layer ids all on that source, labels reading `name`.
4. `docs:` README: what the frontend shows and where the tiles come from.

## Verification
- `pnpm test`, `pnpm typecheck`, `pnpm lint` pass.
- `pnpm dev` (API + web): the base map loads; the isolines are nested, coloured more strongly towards the central line, and labelled; attribution is visible; no console errors.
- Geometry matches geojson.io / `docs/images/` for the same file.
- `docker compose up --build`: the same through nginx.

## Optional tooling
No MCP needed. `/run` for a screenshot of the map, `/simplify` and `/code-review` before the PR. No `/security-review`: no new input, routes or secrets; `pnpm audit` covers the new dependency.

## Deviations and findings
- **Worker.** MapLibre's worker is set with `setWorkerUrl` and Vite's `?worker&url` import, as the MapLibre docs recommend for bundlers.
- **Fonts.** Labels need a font OpenFreeMap serves (Noto Sans); others, e.g. Open Sans, 404.
- **Labels.** `symbol-spacing` is raised so labels repeat only a few times along each isoline.

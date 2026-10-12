# Add isolines endpoint (#18)

## Context
The frontend needs our isolines from the API. An eclipse's isolines never change, so they're generated once by hand and committed as static GeoJSON (ADR 003). Plan lands at `docs/plans/018-add-isolines-endpoint-plan.md` as the first commit.

**Decisions:**
- **`GET /eclipses`:** dates that have data, sorted (e.g. `["2027-08-02"]`). Always 200.
- **`GET /eclipses/:date/isolines`:** 200 with the file as `application/geo+json`, path of totality included (the 0 s isoline). 404 for a valid date with no data: an empty 200 would claim the eclipse has no totality. 422 for a malformed or impossible date, via a route schema (`format: "date"`) and an error handler, since Fastify defaults to 400.
- **Data:** `data/isolines/<date>.geojson`, copied by hand from `pnpm spike:grid`'s output; the spike stays unchanged.
- **Logger:** level from `LOG_LEVEL` (default `info`), off unless passed, so tests are silent. No pino-pretty.
- **Tests:** through Fastify's `inject`, like `health.test.ts`; no separate unit tests.
- **Out of scope:** NASA's path, a `?data=` selector, caching.

## Commits
1. `docs:` this plan.
2. `chore:` configure the API logger.
   - `src/server/app.ts`: `buildApp` takes an options object; its `logger` goes to `Fastify()` and is off when not given, which keeps tests silent.
   - `src/server/main.ts`: passes a logger whose level comes from `LOG_LEVEL` (default `info`).
   - README: `LOG_LEVEL` next to `PORT`/`HOST`.
3. `feat:` add the 2027-08-02 isolines data.
   - `pnpm spike:grid` with the current engine, then copy `out/2027-durations.geojson` to `data/isolines/2027-08-02.geojson`.
   - Only the data file is committed; no code changes.
4. `feat:` eclipses endpoints.
   - `src/server/app.ts`: a `dataDir` option (default `data/isolines/`), and the two routes:
     - `GET /eclipses`: the `.geojson` file names in the data dir, without the extension, sorted.
     - `GET /eclipses/:date/isolines`: params schema, 422 error handler, the file as geo+json, 404 when there's no file.
   - `test/server/eclipses.test.ts`:
     - `/eclipses`: 200 with `["2027-08-02"]`; 200 with `[]` for an empty data dir (a temp dir passed as `dataDir`).
     - `/eclipses/:date/isolines`, 200: geo+json content type, a FeatureCollection, the path of totality and the 6m00s isoline present.
     - 404: a well-formed date with no data (e.g. `2030-01-01`).
     - 422: `2027-8-2`, `not-a-date`, `2027-02-30`.
5. `chore:` ship the data in the runtime image (`COPY data ./data` in the `runtime` stage).
6. `docs:` README: both endpoints, their responses, and how to regenerate the data (run the spike, copy the file under the eclipse's date).

## Verification
- `pnpm test`, `pnpm typecheck`, `pnpm lint` pass.
- `pnpm dev`, then:
  - `curl -i localhost:3000/eclipses` → 200, `["2027-08-02"]`.
  - `curl -i localhost:3000/eclipses/2027-08-02/isolines` → 200, `application/geo+json`.
  - `/eclipses/2030-01-01/isolines` → 404; `/eclipses/2027-02-30/isolines` → 422.
  - Request lines show up in the log; `LOG_LEVEL=warn pnpm dev` hides them.
- Drop the served file into geojson.io: same picture as the spike's output.
- `docker compose up --build api`: the same curls work against the container.

## Optional tooling
No MCP needed. `/run` to hit the endpoints on the real server, `/security-review` since a URL param picks a file to read, `/simplify` and `/code-review` before the PR.

## Deviations and findings
- **Env config.** Extra commit: `.env.example` documents the API settings; `LOG_LEVEL` defaults to `warn` in production, `debug` otherwise.

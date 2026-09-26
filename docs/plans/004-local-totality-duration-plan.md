# Spike #4: can we calculate local totality duration?

## Context
The tool needs totality-duration isolines, but NASA's path tables only give the duration on the central line. This spike checks two things for the 2 Aug 2027 eclipse:
- Can we compute the duration for any lat/lon from Besselian elements? That's the method behind NASA's JSEX.
- Does a grid of those values produce sensible contours?

The repo is empty apart from package.json (pnpm).

**Decisions:**
- **Licensing: clean-room + oracle.** JSEX `program.js` is GPL-2.0-or-later, so we don't port it. We write our own TypeScript from the published maths (Meeus, *Elements of Solar Eclipses*; Explanatory Supplement ch. 11). The original JSEX code only runs inside a fixture script that downloads it at run time, and we commit only the JSON it outputs.
  - Caveat: this isn't a strict clean room, because I've already read program.js. The module follows the textbook formulation and its own structure (typed objects, not index arrays).
- **Delivery:** one branch, small reviewable commits, one PR that closes #4.
- **Test-first:** each feature's tests land in a commit before the code that passes them. Those intermediate commits are deliberately red, and each one's message says so.

## Principles
- Keep the code clean and minimal, with no abstractions the spike doesn't need.
- Comment for a reader with little astronomy background:
  - Each module opens with a short plain-English explanation, e.g. what the fundamental plane is, why ρsinφ′/ρcosφ′, what L2′ < 0 means.
  - Each non-obvious formula gets a one-line *why* and a textbook reference.
- Keep docs to the point. Don't repeat what the code or other docs already say.
- The `src/eclipse/` layout is provisional and may move later.

## Research facts
- **2027-08-02 elements** (from JSEX `SE2001.js`, originally Espenak & Meeus, *Five Millennium Canon*, NASA public-domain data):
  - T0 = 2461619.922108 JD, t0 = 10h TDT, ΔT = 76.0 s
  - polynomials x[0..3], y[0..3], d[0..2], μ[0..2], l1[0..2], l2[0..2]
  - tan f1 = 0.0046064, tan f2 = 0.0045834
- **Method:**
  1. Compute the observer's geocentric ρsinφ′ and ρcosφ′.
  2. Project the observer into the fundamental plane (ξ, η, ζ, plus their rates).
  3. Newton-iterate to mid-eclipse (u·a + v·b = 0).
  4. The observer sees totality if m < |L2′| and L2′ < 0.
  5. Newton-iterate to C2 and C3.
  6. Duration = C3 − C2.
- **NASA oracle** (SE2027Aug02Tpath.html): north limit, south limit and central line every 120 s, with the central-line duration (e.g. 06m23.2s at 10:00 UT).

## Commits

**Setup**
1. `docs: add spike #4 plan`: this file as `docs/spikes/004-local-totality-duration-plan.md`. This commit contains that one file and nothing else.
2. `chore: pin Node 24 LTS`: `.nvmrc`, plus `engines` and `"type": "module"` in package.json.
3. `chore: add TypeScript`:
   - `typescript` and `@types/node`
   - `tsconfig.json` (strict, NodeNext)
   - `typecheck` script
   - `.gitignore` (`node_modules`, `out/`)
4. `chore: add Vitest`: `vitest`, the `test` script and `vitest.config.ts` if needed.
5. `chore: add Dockerfile`:
   - `Dockerfile`: `node:24-slim`, corepack/pnpm, `pnpm install --frozen-lockfile`, `CMD pnpm test`
   - `.dockerignore`
6. `chore: add compose service`:
   - `compose.yaml`: an `app` service that bind-mounts the repo, with an anonymous `node_modules` volume.
   - Then `docker compose run --rm app pnpm <script>` works and `out/` shows up on the host.

**Core calculation (test-first)**
7. `test: add NASA 2027 path fixture`: `test/fixtures/SE2027Aug02Tpath.txt`, the table rows only.
8. `test: add NASA path table parser`: `test/nasaPath.ts` plus its test.
9. `test: Besselian element evaluation` (red): polynomials at t = 0 and t = 1 match hand-computed values.
10. `feat: Besselian elements + 2027 data`:
   - `src/eclipse/besselian.ts`: named-field type, plus `evaluate(el, t)` returning values and hourly rates.
   - `src/eclipse/elements/2027-08-02.ts`
11. `test: observer geocentric coordinates` (red):
   - equator: ρcosφ′ = 1, ρsinφ′ = 0
   - pole: ρsinφ′ ≈ 0.99665
   - altitude increases ρ
12. `feat: observer coordinates`: `src/eclipse/observer.ts`. Input is lat and east-positive lon in degrees, plus altitude in m.
13. `test: totality duration vs NASA path` (red):
    - Every central-line row matches NASA within ±1.0 s. The tolerance covers NASA's rounding and lunar-radius conventions.
    - Every limit point gives ≤ ~5 s.
    - A point 5 km outside a limit gives 0.
    - Halfway between the central line and a limit, the duration is strictly between 0 and the central value.
14. `feat: local circumstances + totalityDuration`:
    - `src/eclipse/localCircumstances.ts` returns `{type, mid, c2?, c3?, durationSeconds, sunAltitude}`.
    - Newton iterations have a tolerance and an iteration cap.
    - If a contact happens with the Sun below the horizon, the result flags it rather than silently giving a wrong answer.
15. `chore: add JSEX fixture generator`:
    - `scripts/generate-jsex-fixtures.ts` and the `spike:fixtures` script.
    - It fetches `program.js` and `SE2001.js` at a pinned commit SHA.
    - It runs them in `node:vm` with `obsvconst` stubbed (`getall`/`getduration` don't touch the DOM).
16. `test: add JSEX 2027 fixtures`: the generated `test/fixtures/jsex-2027.json`, about 20 points:
      - central line
      - inside the path: Luxor, Tarifa, Jeddah, Benghazi
      - ±5 km from the limits
      - outside the path: Madrid, Cairo, Sanaa
17. `test: agreement with JSEX`: same type everywhere, durations within ±0.1 s. It should pass straight away; if it doesn't, the fix goes in this commit.

**Grid + isolines**
18. `feat: duration grid`: `src/isolines/grid.ts`. `durationGrid(el, bbox, stepDeg)` returns a `Float64Array` plus its dimensions, with a small test.
19. `feat: contours to GeoJSON`:
    - `src/isolines/contours.ts` wraps `d3-contour` (thresholds every 30 s) and converts grid indices to lon/lat.
    - Test: the 0 s contour lies within ~2 km of NASA's limits, and contours are nested.
20. `chore: spike-grid script`:
    - `scripts/spike-grid.ts` writes `out/2027-durations.geojson` and `out/2027-nasa-path.geojson` (the overlay).
    - Grid: 0.1° over lon −45…75, lat −10…40 (~600k points). The script logs its timing.

**Findings**
21. `docs: spike findings`: `docs/spikes/004-local-totality-duration.md` links to the plan instead of restating it. Each point appears once, briefly:
    - accuracy vs NASA and JSEX
    - a contour screenshot next to NASA's map
    - limitations: no lunar limb profile (about 1–2 km and 1–2 s), fixed ΔT, sunrise/sunset ends
    - performance
    - go/no-go on both success criteria
    - follow-ups
22. `docs: update README`: a brief description plus how to run things (local and Docker).

## Commit conventions
- Conventional prefixes: `chore:`, `feat:`, `fix:`, `test:`, `docs:`, `refactor:`.
- Each commit has one scope and a few files, so it's realistic to review.
- A commit whose `test:` is deliberately red says so in its body.
- After plan approval, I'll save these preferences (small commits, prefixes, TDD) to memory for future sessions.

## Optional tooling that would help
- **`gh` CLI or the GitHub MCP server**: `gh` isn't installed here. With either one I could read and update issue #4, tick its success criteria and open the PR. Otherwise you'd do that part by hand.
- **Playwright MCP**: lets me take the contour screenshot for the findings doc myself instead of you doing it in geojson.io.
- **Context7 MCP**: up-to-date docs for d3-contour, Vitest and TS config. Nice to have, not essential.
- **Built-in skills:** I'd use these at the end.
  - `/simplify` on the finished branch keeps the code minimal.
  - `/code-review` runs before the PR.
  - `dataviz` + an Artifact could give an interactive contour-vs-NASA map page as an alternative to the static screenshot. It's optional and only worth it if you want to share the result.

## Verification
- `docker compose build`, then `docker compose run --rm app pnpm test` and `pnpm typecheck` are green. They're also green locally on Node 24.
- `pnpm spike:fixtures` regenerates identical JSON.
- `pnpm spike:grid` writes the GeoJSON. Load both files in geojson.io and compare them with NASA's path map.
- Spot-check 2–3 arbitrary points by hand in NASA's live JSEX and note the results in the findings doc.

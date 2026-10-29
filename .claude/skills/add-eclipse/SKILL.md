---
name: add-eclipse
description: Add a total solar eclipse end to end (Besselian elements, NASA path table, isolines) so the API and map serve it with no code changes. Use when asked to add, host or serve an eclipse for a date.
argument-hint: <date, e.g. 2026-08-12 or "12 August 2026">
disable-model-invocation: true
---

# Add eclipse

Adds the total solar eclipse on the date given (`$ARGUMENTS`); below, `<date>` is that date as `YYYY-MM-DD`. Why and how this works: `docs/plans/049-add-eclipse-skill-plan.md`, `src/engine/README.md`, and the existing eclipses (2027-08-02, 2028-07-22) as worked examples.

Run the gates in order. **Any failure stops the run**: report which gate, what you saw and what you think caused it, and leave the files as they are for the user to inspect. Never commit.

## Guardrail

The limit check (each limit within 2 km of NASA's, measured square to the path's edge) **never widens**, not for one eclipse, not for one row. If it fails, find which rows fail and why: the path's ends, a low Sun, a sharply curving edge, a path near a pole, or a mistyped element or row. Report it; don't touch the tolerance or skip rows.

## Gate 1: date

- Any wording works ("12 August 2026", "Aug 12 2026", "2026-08-12"): turn it into a real calendar date as `YYYY-MM-DD` and say which date you read before going on
- Ask instead of guessing when it's missing, has no year, or could be two dates (`08/12/2026`: 12 August or 8 December?)
- Not already added: it isn't a key in `src/engine/eclipse/elements/index.ts`
- Within 2001–2100: the range of JSEX's `SE2001.js` and NASA's `SEpath2001` pages. Outside it, stop: the sources differ and the skill hasn't been tried there

## Gate 2: NASA's catalogue

Download https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html into a new, empty folder in the scratchpad and find the row for the date (`2026 Aug 12` style). Its Type column must be exactly `T`, a central total eclipse.

Anything else stops the run, saying what it is: `A` annular, `H` hybrid, `P` partial, no row (no eclipse that day), or `T+`/`T-` (total but non-central: there is no central line, which the path table and its checks need).

## Gate 3: Besselian elements

Take them from JSEX, not NASA's elements page (which rounds them). Download `SE2001.js` from the commit pinned in `scripts/generate-jsex-fixtures.ts` (`JSEX_URL`) into the same kind of scratch folder. JSEX is GPL: copy only the numbers (NASA's, public domain), never its code.

Each eclipse is a `// YYYY M D` comment (month and day space-padded, e.g. `// 2026  8 12`) followed by 28 numbers:

| Line | Numbers               | Our field                           |
| ---- | --------------------- | ----------------------------------- |
| 1    | JD, t0, −4, 4, ΔT, ΔT | `t0`, `deltaT` (the Canon's ΔT)     |
| 2    | 4 coefficients        | `x`                                 |
| 3    | 4 coefficients        | `y`                                 |
| 4    | 3 coefficients        | `d`                                 |
| 5    | 3 coefficients        | `mu` (write its `0.000e-00` as `0`) |
| 6    | 3 coefficients        | `l1`                                |
| 7    | 3 coefficients        | `l2` (negative for a total eclipse) |
| 8    | 2 numbers             | `tanF1`, `tanF2`                    |

Check the mapping on 2028-07-22 against `src/engine/eclipse/elements/2028-07-22.ts` before writing the new file.

- New file `src/engine/eclipse/elements/<date>.ts`, shaped like 2028's: the header comment names the eclipse, the source (Canon via JSEX's `SE2001.js`), the Canon's ΔT and NASA's path-page ΔT (from gate 4). Export `eclipse<YYYY><Mon><DD>`, e.g. `eclipse2026Aug12`
- Add it to the list in `src/engine/eclipse/elements/index.ts`, in date order

## Gate 4: NASA's path table

Download `https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE<YYYY><Mon><DD>Tpath.html` (e.g. `SE2026Aug12Tpath.html`) into a scratch folder.

- Write `data/nasa-paths/<date>.txt` shaped like `data/nasa-paths/2028-07-22.txt`: three `#` lines (title, source URL with today's retrieval date, "Table rows copied verbatim; ΔT = <NASA's ΔT> s. '-' means the limit is off the Earth at that time."), a `#` line, then the table's five header lines and every row, from the first `Limits` row to the last
- Rows verbatim: the parser reads fixed-width columns. Turn HTML entities in the header into characters (`&#176;` → `°`, `&#180;` → `'`); never touch the rows
- NASA's ΔT is on the page ("a value of ΔT = 71.4 seconds"); it usually differs from the Canon's

## Gate 5: generate

```bash
pnpm data:isolines <date>
```

Writes the served isolines to `data/isolines/<date>.geojson` and NASA's limits to `out/<date>-nasa-path.geojson`. Keep its output line (grid size, run time, isolines, file size) for the summary. Compare with 2027 (2756 × 1044 points, ~20 s, 3.1 MB) and 2028 (2150 × 869, ~15 s, 2.0 MB); flag anything far larger.

## Gate 6: checks

Node 24 first (the shell defaults to 20):

```bash
source ~/.nvm/nvm.sh && nvm use
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
pnpm --dir web test
```

`pnpm test` checks the new elements against the new path table (central-line durations, mid-eclipse times, limits within 2 km). A failure here is usually a mistyped element, a row copied wrong, or the wrong ΔT; for the limit check, see the guardrail. If only formatting fails, `pnpm exec prettier --write` the new files and rerun.

## Gate 7: smoke

The API lists the date and its isolines carry a bbox:

```bash
pnpm exec tsx --input-type=module -e '
import { buildApp } from "./src/server/app.js";
const app = buildApp();
const dates = (await app.inject("/eclipses")).json();
const res = await app.inject("/eclipses/<date>/isolines");
console.log(dates, res.statusCode, res.json().bbox);
await app.close();'
```

Expect the date in the list, 200 and four numbers. The frontend needs nothing else: its picker lists what the API lists and the map fits that bbox.

## Handover

Nothing is committed. Report:

1. **Summary**: the date and where it's visible, sources (catalogue row, JSEX commit, NASA path page) with both ΔTs, the generator line, each gate passed, and the files added or changed
2. **Run it**: the production stack (non-root images, no live mounts, the data baked in):

   ```bash
   docker compose up --build
   ```

   Then open http://localhost:8080, pick the new date and check the map fits its path. `docker compose down` when done

3. **Optional check**: drop `data/isolines/<date>.geojson` and `out/<date>-nasa-path.geojson` into https://geojson.io; the isolines should follow NASA's limits along the whole path
4. **Commit message** to suggest: `feat: add the <date> eclipse`

Then wait for the user.

# Chasing totality

Isolines tool for the 2027-08-02 total solar eclipse: Besselian elements → totality duration at a
lat/lon → grid isolines → GeoJSON, served by a Fastify API and drawn on a MapLibre map.
See README.md for the overview and docs/DECISIONS.md for past decisions.

## Commands

Node 24 (`.nvmrc`), pnpm via corepack. Run from the repo root.

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`: the same checks CI runs
- `pnpm dev`: API with watch. `pnpm build` / `pnpm start`: compiled API
- Frontend lives in `web/` (pnpm workspace) with its own package.json: `pnpm --dir web dev`

## Layout

- `src/engine/`: pure eclipse maths, no I/O (see its README)
- `src/server/`: Fastify app (`app.ts` builds it, `routes/` holds endpoints)
- `web/`: React + Vite + MapLibre
- `docs/plans/`: plans for features with real decisions only. `scripts/`: spikes and fixture generators

## Gotchas

- Root `typescript` is aliased to TS 6 because typescript-eslint doesn't support TS 7 yet. `tsc` comes
  from `@typescript/native` (TS 7). `web/` uses plain TS 7. Remove the alias once
  typescript-eslint#10940 lands
- JSEX is GPL: use it only as a test oracle (fixtures), never copy its code
- Accuracy for 2027-08-02 over S Spain / N Africa matters more than generality

## Conventions

- PR titles are conventional (`feat|fix|chore|docs|test|refactor`) because squash-merge uses
  them as the commit message; CI enforces it
- Small, scoped commits, test-first where it makes sense
- Prettier (printWidth 100) owns formatting, so don't hand-format
- One-line comments have no trailing full stop
- File order: imports, types, consts, helpers, main function last

## Working with Claude

- Don't commit, push or open PRs: leave changes uncommitted, one commit's worth at a time
- Fix mistakes forward in the next commit, never rewrite history: PRs are squash-merged. Plans are
  intent, not contract; record changes of mind in the plan's "Deviations and findings"
- For review findings, describe the fix (file, line, exact change); the user applies it
- No plan docs for scaffold/tooling work

## UI

- Part A in `docs/design/DESIGN.md` (structure, components) is mostly settled: follow it
- Part B (colors, fonts, sizes) is provisional: use design tokens (CSS variables plus `web/src/theme.ts` for MapLibre), never hardcode values, and skip visual polish
- Mockups in `docs/design/mockups/` show structure, not pixel-perfect specs

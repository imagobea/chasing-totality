# Chasing totality

Isolines tool for the 2027-08-02 total solar eclipse: Besselian elements → totality duration at a
lat/lon → grid isolines → GeoJSON, served by a Fastify API and drawn on a MapLibre map.
See README.md for the overview and docs/DECISIONS.md for past decisions.

## Commands

Node 24 (`.nvmrc`), pnpm via corepack. Run from the repo root.

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`: the same checks CI runs (CI runs
  `pnpm test:coverage` instead, which adds coverage)
- `pnpm dev`: API with watch. `pnpm build` / `pnpm start`: compiled API.
- Frontend lives in `web/` (pnpm workspace) with its own package.json: `pnpm --dir web dev`

## Layout

- `src/engine/`: pure eclipse maths, no I/O (see its README)
- `src/server/`: Fastify app (`app.ts` builds it, `routes/` holds endpoints)
- `web/`: React + Vite + MapLibre
- `docs/plans/`: plans for features with real decisions only. `scripts/`: spikes and fixture generators.

## Gotchas

- Root `typescript` is aliased to TS 6 because typescript-eslint doesn't support TS 7 yet. `tsc` comes
  from `@typescript/native` (TS 7). `web/` uses plain TS 7. Remove the alias once
  typescript-eslint#10940 lands.
- JSEX is GPL: use it only as a test oracle (fixtures), never copy its code
- Accuracy for 2027-08-02 over S Spain / N Africa matters more than generality

## Conventions

- PR titles are conventional (`feat|fix|chore|docs|test|refactor`) because squash-merge uses
  them as the commit message; CI enforces it
- Small, scoped commits, test-first where it makes sense
- Prettier (printWidth 100) owns formatting, so don't hand-format
- Comments: a single sentence has no trailing full stop; with more than one, every sentence ends with one
- File order: imports, types, consts, helpers, main function last
- Component order: state, refs, effect events, effects

## Testing

- Root `tests/` and `web/tests/` each have `unit/` and `integration/` Vitest projects and
  `helpers/`; the root also has `fixtures/`. `e2e/` has no project yet.
- Root: unit is pure maths, integration does I/O (fs, Fastify). Web: unit runs in node,
  integration in jsdom (components, and user flows through `App`).
- Test files mirror `src/`, one `describe` per file: `module.function.test.ts` when a module needs
  several
- Test behaviour, not implementation or styling. Never assert CSS values or colours; the theme ↔
  tokens sync suite is the one exception.
- Every feature needs negative and edge-case tests, not just the happy path. The goal is safe
  delivery, not coverage.
- One smoke test on real committed data per feature; behaviour tests on fixtures or temp data
- Mock only at boundaries (fetch, fs, MapLibre/WebGL), never pure helpers
- In each file: validation tests first, then tests in the order of the code; consistent test names
- Clean up in hooks (`afterEach`, `afterAll`, `onTestFinished`), so a failing assertion can't skip it
- A new test must be shown to fail: mutate the code it covers. Drop tests that don't earn their place.

## Working with Claude

- Plan first: agree what and how before writing code
- Spikes, features and complex tasks get a committed plan in `docs/plans/`; scaffold/tooling work doesn't
- Plans state intent and decisions, not implementation: no variable, function or file names. Log only real changes of mind in the plan's "Deviations and findings", not trivial additions.
- Don't commit unless asked; never push or open PRs. Leave one commit's worth of changes uncommitted, suggest a commit message, and wait for the user to commit before starting the next.
- Fix mistakes forward in a new commit; never amend, rebase or force-push (PRs are squash-merged)
- Review findings, including `/code-review` and `/simplify` output: a numbered table, most severe first (# | issue in one line | file:line | address? yes/no + why | suggested fix), then a recommendation and details or snippets below. Describe fixes; apply only the ones asked for, even when the skill would apply them itself.
- Verify claims from subagents or reviews (read the code, reason it through) before passing them on
- Before running web tests, run `source ~/.nvm/nvm.sh && nvm use` (the shell defaults to Node 20)

## UI

- Part A in `docs/design/DESIGN.md` (structure, components) is mostly settled: follow it
- Part B (colors, fonts, sizes) is provisional: use design tokens (CSS variables plus `web/src/theme.ts` for MapLibre), never hardcode values, and skip visual polish
- Mockups in `docs/design/mockups/` show structure, not pixel-perfect specs

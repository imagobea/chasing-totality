# Add a frontend (#9)

## Context
The repo has an engine and a Fastify API but nothing a person can open in a browser. ADR 001 picks React + Vite for the frontend and says pnpm workspaces arrive with it. This issue only sets up the frontend skeleton:

- Create a React + Vite + TypeScript app
- Wire it to the API with a health check
- Dockerise it

Plan lands at `docs/plans/009-add-a-frontend-plan.md` as the first commit.

**Decisions:**
- **Layout:** pnpm workspace. The root package (engine + server) stays where it is; the frontend is a new `web/` package. No files move. `pnpm-workspace.yaml` lists `web`. The frontend doesn't import the engine, it will consume GeoJSON from the API.
- **Stack:** Vite + React 19 + TypeScript (strict, same flags as root where they apply, plus DOM libs and `jsx`), `@vitejs/plugin-react`. Versions: latest at install time.
- **Tests:** Vitest (already used) with jsdom and Testing Library. Each package owns its tests: the root keeps `test/` (engine + server, already split in `test/engine`, `test/server`), and `web/` gets its own `web/test/` mirroring `web/src/`, same convention as the root (separate folder, not colocated). Not `test/web/` at the root: the web tests need jsdom, other deps and a DOM tsconfig, and would break the "one package, one set of deps" rule that workspaces give us. Root `pnpm test` keeps running only the root tests; `web` has its own `test` script; `pnpm -r test` runs both. If the layout feels wrong once there's real code, moving a test folder is a cheap change.
- **API access:** the browser calls `/api/*` on its own origin. Vite's dev server proxies `/api` to the API (target from an env var, default `http://localhost:3000`) and strips the prefix. No CORS code on the server.
- **Page:** one minimal page: title, and an API status line fed by `GET /api/health` (loading, ok, unreachable). Enough to prove the whole path works.
- **Docker:** `web` gets its own stages in a Dockerfile under `web/`. `dev` runs the Vite dev server (host `0.0.0.0`, port 5173) in compose; `runtime` serves the built `dist/` with nginx and proxies `/api` to the `api` service.
- **Root Dockerfile and workspace:** it must copy `pnpm-workspace.yaml` and `web/package.json` before `pnpm install --frozen-lockfile`, and the `runtime` stage must install only the root package's prod deps (filtered), so the API image doesn't pull React.

## Commits
1. This plan.
2. `chore:` workspace.
   - `pnpm-workspace.yaml` with `web`.
   - Root vitest config limited to `test/`, so it never picks up `web/` tests.
   - Root tests and typecheck still pass.
3. `chore:` Vite + React + TS scaffold in `web/`.
   - `web/package.json` (private, `dev`/`build`/`preview`/`typecheck`/`test` scripts), `index.html`, `vite.config.ts`, `tsconfig.json`, entry file and an empty `App`.
   - `.gitignore`/`.dockerignore` already cover `node_modules` and `dist` at any depth; check, don't assume.
   - Lockfile updated.
4. `feat:` API status component, test-first (test and feature in one commit).
   - Testing Library + jsdom setup in `web/`, tests under `web/test/`.
   - Test: renders loading, then "ok" when `/api/health` answers `{status:"ok"}`, and an error state when the fetch fails (fetch mocked).
   - Component, wired into `App`.
5. `feat:` dev proxy.
   - `vite.config.ts` proxies `/api` to the API, prefix stripped, target configurable by env var.
6. `chore:` Docker.
   - Root `Dockerfile`: copy workspace files, filter prod install (see decisions).
   - `web/Dockerfile`: `dev` and `build` and `runtime` (nginx) stages; `web/nginx.conf` serving the SPA and proxying `/api`.
   - `compose.yaml`: `web` service (dev target, port 5173, live-mounted source with its own `node_modules` volume, proxy target `http://api:3000`) depends on `api`.
7. `docs:` README (Stack line, run instructions for web, Docker, project structure), ADR note only if a decision changed (none expected).

## Verification
- `pnpm test` and `pnpm typecheck` at the root still pass; `pnpm --filter web test`, `typecheck` and `build` pass.
- Local: `pnpm dev` (API) and `pnpm --filter web dev`; open `http://localhost:5173`, status line shows ok; stop the API, reload, it shows unreachable.
- `docker compose -f compose.yaml -f compose.dev.yaml up --build`: page loads on `localhost:5173` and shows ok.
- API image still lean: `docker compose run --rm api ls node_modules` shows no react/vite.
- `docker compose -f compose.yaml -f compose.dev.yaml run --rm api pnpm test` still works.
- Production stack: `docker compose up --build`; `curl localhost:8080/api/health` returns `{"status":"ok"}` through nginx, and `http://localhost:8080` shows the status line ok.


## Open points to confirm while working
- ✅ Whether Vite 8 / plugin-react 6 install cleanly under pnpm 10's build-script approval: confirmed. Only the harmless "Ignored build scripts: esbuild" warning appears.
- ✅ Whether the root `Dockerfile` `dev` stage is better off installing the whole workspace (current plan) or staying root-only: root-only (`--filter .`), so the API's dev and build images don't pull the web toolchain.

## Optional tooling
No MCP needed. `/run` to see the page working, `/simplify` and `/code-review` before the PR.

## Deviations and findings
- **Compose layout.** The plan added a dev-only `web` service next to `app` and `api`, which left the API with no dev mode and the web with no prod mode. Instead, `compose.yaml` is the prod stack (`api`, plus `web` on nginx at 8080) and `compose.dev.yaml` overrides the same two services for development (`pnpm dev`, Vite on 5173, source mounted). The `app` service is gone: tests run with `docker compose -f compose.yaml -f compose.dev.yaml run --rm api pnpm test`.

- **Dev ports.** The dev override uses `ports: !override` so `web` doesn't also publish nginx's port.

- **Small additions.** An extra `ApiStatus` test for an error status from the API, and `"node"` in the web tsconfig `types` so the Vite config can read `process.env`.

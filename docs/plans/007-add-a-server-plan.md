# Add a server (#7)

## Context
The app so far is an engine (Besselian elements to isolines) with no way to serve it. ADR 001 picks Fastify + TypeScript for the API, run in Docker. This issue only sets up the server skeleton:
- Create a Fastify API
- Dockerise the service
- Add a `/health` endpoint

No isolines endpoint yet; that comes in a later issue. Plan lands at `docs/plans/007-add-a-server-plan.md` as the first commit.

**Decisions:**
- **Layout:** `src/server/` in the existing single package, importing from `src/engine` directly. pnpm workspaces (ADR 001) wait until the frontend arrives.
- **Build:** `tsc` compiles to `dist/`, the container runs plain `node`. No runtime TypeScript loader.
- **Docker:** one multi-stage Dockerfile. A `dev` target keeps today's behaviour (all deps, `CMD pnpm test`); a `runtime` target is prod deps + `dist/` and starts the server.
- **`/health`:** `GET /health` returns 200 `{ "status": "ok" }`. Liveness only; there's no database to check (ADR 003).
- **Config:** `PORT` (default 3000) and `HOST` (default `0.0.0.0`, needed inside a container) from the environment.

## Commits
1. This plan.
2. `feat:` Fastify app with `/health`.
   - Add `fastify`.
   - `src/server/app.ts`: builds the app and registers the route, without listening.
   - `test/server/health.test.ts`: uses Fastify's `inject`, no real port; checks status 200 and body.
3. `feat:` server entry point.
   - `src/server/main.ts`: reads `PORT`/`HOST`, listens, closes on SIGTERM/SIGINT so `docker stop` is clean.
   - `dev` script (`tsx watch`) for local work.
4. `chore:` production build.
   - `tsconfig.build.json`: extends `tsconfig.json`, emits, `rootDir: src`, `outDir: dist`, includes `src` only.
   - `build` and `start` scripts; `dist/` in `.gitignore` and `.dockerignore`.
5. `chore:` Dockerfile stages.
   - `dev`: the current image.
   - `build`: `pnpm build`.
   - `runtime`: `node:24-slim`, prod deps only, `dist/` copied from `build`, non-root, `HEALTHCHECK` calling `/health` with Node's `fetch` (no curl in slim), `CMD node dist/server/main.js`.
6. `chore:` compose.
   - Existing `app` service gets `target: dev`.
   - New `api` service builds `runtime`, maps `3000:3000`, and reuses the image healthcheck.
7. `docs:` README (Docker, API run instructions, project structure) and a Stack line update.

## Verification
- `pnpm test` and `pnpm typecheck` pass.
- `pnpm build && pnpm start`, then `curl -i localhost:3000/health` returns 200 `{"status":"ok"}`.
- `docker compose up --build api`: container reports `healthy` in `docker compose ps`, `curl localhost:3000/health` works from the host, `docker compose stop api` exits promptly (graceful shutdown).
- `docker compose run --rm app pnpm test` still works.
- Runtime image has no devDependencies (`docker compose run --rm api ls node_modules/.bin` shows no vitest/tsc).

## Optional tooling
No MCP needed: Docker, pnpm and curl through the shell cover everything here. Skills that fit:
- `/run`: start the server and confirm `/health` in the real app, for the verification steps.
- `/simplify` and `/code-review` on the branch before opening the PR.

## Deviations and findings

# Architecture Decision Records

## 001 — Application architecture

Date: 2026-09-23

Stack:

- Node.js LTS, services run in Docker
- pnpm workspaces
- React + Vite (frontend)
- Fastify + TypeScript (API)
- MapLibre GL JS (map rendering)
- OpenFreeMap (base map tiles)
- PostgreSQL + PostGIS (spatial data) — superseded by 003

### Why

Simple architecture, with good control over the map and our own
geospatial data. No Next.js: we don't need SSR or server components.
Not tied to a hosting provider.

---

## 002 — Compute eclipse geometry from Besselian elements

Date: 2026-10-02

We generate eclipse geometry and totality duration from Besselian
elements, as validated in [spike #4](plans/004-local-totality-duration-plan.md).

### Why

The spike showed we can compute totality duration for any coordinate
and draw sensible duration isolines for the 2 Aug 2027 eclipse. Results
match NASA's central-line durations within 0.3 s and JSEX within 0.001 s.

---

## 003 — Drop PostgreSQL/PostGIS for now

Date: 2026-10-02

Supersedes the database part of 001.

We serve the computed isolines as static GeoJSON and have no database.

### Why

Nothing in the app needs persistence or spatial queries yet, so a
database would only add infrastructure. We can add PostGIS later if
that changes.

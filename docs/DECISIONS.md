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

---

## 004 — Longitudes carry on past 180°

Date: 2026-10-28

Across the 180° meridian, longitudes carry on past it instead of wrapping
(179°W becomes 181°E), so a box's west edge is always west of its east
edge. This holds for the isolines, their bounding box and the airports
endpoint's bbox, which no longer takes a west edge east of its east edge.

### Why

MapLibre draws a path across 180° in one piece only if its longitudes
carry on, so the isolines need it. One convention everywhere means a
path's box can go straight to the map and the API, with no conversion.

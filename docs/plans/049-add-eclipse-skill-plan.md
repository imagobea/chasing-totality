# Add eclipse skill (#49)

## Context

Since #45, #47 and #50, adding a total eclipse needs only its data: Besselian elements, NASA's path table and one generator run, checked against NASA's limits within 2 km. Adding 2028-07-22 was still a manual sequence with pitfalls (rounded NASA elements, ΔT per source, the 180° meridian). Goal: a project Claude skill that takes a date to served data, with checks, and stops for review before anything is committed.

## Decisions

**Skill**

- A committed project skill, given a date; it runs existing commands, no new engine, server or frontend code
- A sequence of gates; any failure stops it with a report

**Gates, in order**

1. Date: a real date, not already added, within 2001–2100 (the range of JSEX's elements and NASA's path pages)
2. NASA's eclipse catalogue: the eclipse must be total; hybrid, annular, partial or none stops it
3. Elements: read by hand from JSEX at the commit already pinned for fixtures (NASA's page rounds them), with the Canon's ΔT and source, then added to the known eclipses. No helper script: the path-table check catches typos
4. Path table: copied verbatim from NASA's path page, with source, retrieval date and NASA's ΔT
5. Isolines and NASA's limits generated; grid size, run time and file size reported
6. Checks: lint, format, typecheck, tests, web tests included
7. Smoke: the API lists the date and its isolines carry a bbox

**Guardrail**

- The 2 km limit check never widens; if it fails, stop, find which rows fail and why, and report

**Handover, nothing committed**

- Summary of the run: sources, ΔTs, generator output, gates passed
- Docker command for the production stack (non-root images, no live mounts), to pick the new date in the browser
- NASA's limits and the isolines, for an optional check in geojson.io
- A suggested commit message

## Out of scope

- The frontend opens on the earliest eclipse, so a past one (2026-08-12) becomes the default with a T−0 D countdown; defaulting to the first future eclipse is a separate issue
- How the API serves isolines (size, compression)

## Commits

1. `docs:` this plan
2. `feat:` add eclipse skill; README points to it
3. `feat:` 2026-08-12, added with the skill

## Verification

- The skill adds 2026-08-12 end to end, all gates pass at 2 km
- A non-total date (2026-02-17, annular) stops at the catalogue gate
- Docker stack: 2026-08-12 in the picker, the map fits its path; its isolines follow NASA's limits in geojson.io

## Optional tooling

No MCP needed. `/simplify` and `/code-review` before the PR.

## Deviations and findings

- Non-central total eclipses (one limit, no central line) stop at the catalogue gate too: the path table and its checks need a central line. None is due before 2043

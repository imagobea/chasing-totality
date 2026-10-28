# Frontend renders any eclipse (#47)

## Context

The API serves any generated eclipse, but the frontend's map view and airports box suit 2027 only, and the isolines and the airports endpoint cross the 180° meridian differently. Goal: adding an eclipse needs only its data files. 2027 still comes first.

## Decisions

- 180° meridian: longitudes carry on past 180° everywhere, so west is always less than east; the airports endpoint follows and drops its wrap-around form
- Each isolines file carries the generator's area as its bbox; the frontend reads it from the isolines it downloads, so the API is unchanged
- Picking an eclipse fits the map to its whole path - panning and zooming stay free for now
- Airports: the eclipse's bbox plus ~3°, reloaded when date changes
- Duration colours keep their fixed scale for now

## Out of scope

- How the API serves isolines (size, compression)
- The "add eclipse" skill
- Validating a user's lat/lon

## Commits

1. `docs:` this plan
2. `feat:` 180° convention in the airports endpoint and the decisions log
3. `feat:` isolines files carry their bbox; 2027 and 2028 regenerated
4. `feat:` the frontend works for any eclipse

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` pass, web tests included
- In the browser: 2027 opens on its whole path with its airports (Bosaso included); 2028 shows its path across 180° with airports on both sides

## Optional tooling

No MCP needed. `/simplify` and `/code-review` before the PR.

## Deviations and findings

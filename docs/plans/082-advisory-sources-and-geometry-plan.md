# Advisory sources and geometry spike (#82)

## Context

Part of #32, builds on #33 (airports). Travel advisories need an official, regularly updated source whose licence allows a committed snapshot, and shapes to draw it on the map. This spike picks both and settles how they're matched. The script, endpoint and map layer follow as separate issues.

## Candidate sources

| Source           | Licence       | Level                                           | Verdict                                        |
| ---------------- | ------------- | ----------------------------------------------- | ---------------------------------------------- |
| **UK FCDO**      | OGL v3        | Structured field, whole or parts                | Picked                                         |
| Netherlands BuZa | CC0           | Dutch text only (old field no longer supported) | Fallback                                       |
| Canada           | OGL Canada    | Structured, no "parts" detail                   | No                                             |
| US State Dept    | Public domain | Regions only in HTML                            | No                                             |
| Germany          | Own terms     | —                                               | Ruled out: live data and registration required |
| France           | —             | —                                               | No API                                         |

**Pick:** UK FCDO via the GOV.UK Content API: structured level, any reason (conflict, health, disasters), updated regularly, no sign-up. Its index of 226 countries and territories is the master list.

**Shapes:** Natural Earth admin-0 map units 1:50m. It matches 219 of 226 UK entries directly and splits out overseas territories. 1:110m drops 57 small places, and 1:10m is about 13 MB.

## Decisions

- **Master list:** the UK index decides which places have a status. Natural Earth only supplies shapes.
- **States:** whole, parts or none. "Avoid all" and "all but essential" count as one level. If a place has both, whole wins.
- **Snapshot:** every matched shape, "none" included, so SpotPanel can name any place and link to its UK page. Each place has its status, last major update and page link, and the file records the source, licence and retrieval date.
- **Matching:** by UK name and synonyms, with the exceptions in the table below. Fixed in the script; any mismatch stops the run.
- **All or none:** any failure means no snapshot. The script stop on:
  - a response other than 200
  - a withdrawn page
  - an unknown status
  - an unmatched UK entry
  - a stale alias
  - a shape claimed twice
  - fetched pages not equal to the index count
    Review this if it becomes a problem.
- **Run summary:** pages scanned and matched (direct, alias, not drawn), counts per state, and unclaimed shapes listed for review.
- **Polite fetching:** one request at a time, under the API's 10 per second limit, with a few retries and a generic client name.
- **Attribution:** OGL v3 credit text, a licence link, and nothing that implies endorsement.

### Matching exceptions

| UK entry                                  | Natural Earth                     | Why                          | Handling        |
| ----------------------------------------- | --------------------------------- | ---------------------------- | --------------- |
| Myanmar (Burma)                           | Myanmar                           | Name differs                 | Alias           |
| Pitcairn Island                           | Pitcairn Islands                  | Name differs                 | Alias           |
| St Helena, Ascension and Tristan da Cunha | Saint Helena                      | Name differs                 | Alias           |
| Antarctica/British Antarctic Territory    | Antarctica                        | Name differs                 | Alias           |
| Bonaire/St Eustatius/Saba                 | Caribbean Netherlands             | Name differs                 | Alias           |
| Cook Islands, Tokelau and Niue            | Cook Islands, Niue                | One page, several shapes     | Alias           |
| St Martin and St Barthélemy               | Saint Martin, Saint Barthelemy    | One page, several shapes     | Alias           |
| Somalia                                   | Somalia, Somaliland               | Page covers a separate shape | Coverage alias  |
| Cyprus                                    | Cyprus, Northern Cyprus           | Page covers a separate shape | Coverage alias  |
| Denmark                                   | Denmark, Greenland, Faroe Islands | Page covers separate shapes  | Coverage alias  |
| USA                                       | USA, Puerto Rico, Guam            | Page covers separate shapes  | Coverage alias  |
| Gibraltar                                 | —                                 | Too small for 1:50m          | Known not drawn |

A coverage alias gives the extra shape its page's status. Each one is read by hand before it's added, and the run stops if the page no longer mentions the place.

## Out of scope

- Advisory details in SpotPanel (separate issue)
- Hiding travel data for past eclipses (separate issue)

## Commits

1. `docs:` this plan.

## Verification

- Places on the 2027 path (Spain, Morocco, Western Sahara, Algeria, Tunisia, Libya, Egypt, Saudi Arabia, Yemen, Somalia incl. Somaliland) get the expected states.

## Optional tooling

No MCP needed.

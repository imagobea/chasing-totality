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

**Shapes:** Natural Earth admin-0 map units 1:50m. It matches 219 of 226 UK entries directly and splits out overseas territories. 1:110m drops 57 small places, and 1:10m is about 13 MB. The script downloads a pinned release on each run.

## Decisions

- **Master list:** the UK index decides which places have a status. Natural Earth only supplies shapes.
- **States:** whole, parts or none. "Avoid all" and "all but essential" count as one level. If a place has both, whole wins.
- **Snapshot:** every matched shape, "none" included, so SpotPanel can name any place and link to its UK page. Shapes with no UK page are left out. Each place has its state, how it was matched, the UK page's own fields (status, last major update, last review, latest change note) with a link to the page, and the shape's Natural Earth name and code. The file records both sources, their licences and the retrieval date. See the format below.
- **Matching:** UK name and synonyms against Natural Earth names, with the exceptions in the table below. Fixed in the script; any mismatch stops the run.
- **All or none:** any failure means no snapshot. The script stops on:
  - a response other than 200
  - a withdrawn page
  - an unknown status
  - an unmatched UK entry
  - a stale alias
  - a shape claimed twice
  - fetched pages not equal to the index count
  - a shape that collapses when rounded
    Review this if it becomes a problem.
- **Run summary:** pages scanned and matched (direct, synonym, alias, coverage alias, not drawn), counts per state, and shapes with no UK page listed for review.
- **Polite fetching:** one request at a time, under the API's 10 per second limit, with a few retries and a generic client name.
- **Attribution:** OGL v3 credit text, a licence link, and nothing that implies endorsement.

### Matching exceptions

| UK entry                                  | Natural Earth                                               | Why                              | Handling        |
| ----------------------------------------- | ----------------------------------------------------------- | -------------------------------- | --------------- |
| Myanmar (Burma)                           | Myanmar                                                     | Name differs                     | Alias           |
| Pitcairn Island                           | Pitcairn Islands                                            | Name differs                     | Alias           |
| St Helena, Ascension and Tristan da Cunha | Saint Helena                                                | Name differs                     | Alias           |
| Antarctica/British Antarctic Territory    | Antarctica                                                  | Name differs                     | Alias           |
| Bonaire/St Eustatius/Saba                 | Caribbean Netherlands                                       | Name differs                     | Alias           |
| St Pierre & Miquelon                      | Saint Pierre and Miquelon                                   | Name differs                     | Alias           |
| Cook Islands, Tokelau and Niue            | Cook Islands, Tokelau, Niue                                 | One page, several shapes         | Alias           |
| St Martin and St Barthélemy               | Saint Martin, Saint Barthelemy                              | One page, several shapes         | Alias           |
| Somalia                                   | Somalia, Somaliland                                         | Page covers a separate shape     | Coverage alias  |
| Cyprus                                    | Cyprus, Northern Cyprus                                     | Page covers a separate shape     | Coverage alias  |
| Denmark                                   | Denmark, Faeroe Islands                                     | Page covers a separate shape     | Coverage alias  |
| USA                                       | USA, United States Virgin Islands, Northern Mariana Islands | Page covers separate shapes      | Coverage alias  |
| Tanzania                                  | Tanzania, Zanzibar                                          | Page covers a separate shape     | Coverage alias  |
| Italy                                     | Italy, Vatican                                              | Page covers a separate shape     | Coverage alias  |
| Kiribati                                  | Not Christmas Island                                        | Synonym names Australia's island | Blocked         |
| Gibraltar                                 | —                                                           | Too small for 1:50m              | Known not drawn |

A coverage alias gives the extra shape its page's status. Each one is read by hand before it's added, and the run stops if the page no longer mentions the place.

Some UK synonyms name a separate shape, so the page claims it without an exception: Puerto Rico, Guam and American Samoa (USA), Greenland (Denmark), Madeira and Azores (Portugal). Synonyms that are just another name for the page's own shape (United States, Czech Republic, Sint Maarten) count as direct matches.

### Snapshot format

Our own fields sit next to two groups that keep the source's field names. `match` is empty for a direct match and otherwise reads `<how>__<UK page>__<shape>`, where how is `synonym`, `alias` or `coverage_alias`. Coordinates are rounded to 3 decimals (about 110 m).

```json
{
  "type": "FeatureCollection",
  "sources": [
    {
      "name": "UK FCDO travel advice",
      "url": "https://www.gov.uk/foreign-travel-advice",
      "licence": "Open Government Licence v3.0",
      "licenceUrl": "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
      "attribution": "Contains public sector information licensed under the Open Government Licence v3.0."
    },
    {
      "name": "Natural Earth",
      "url": "https://www.naturalearthdata.com",
      "version": "5.1.2",
      "licence": "Public domain"
    }
  ],
  "retrieved": "2026-11-16",
  "features": [
    {
      "type": "Feature",
      "id": 1159321261,
      "properties": {
        "state": "parts",
        "match": null,
        "naturalEarth": {
          "NE_ID": 1159321261,
          "NAME": "Somalia",
          "ADM0_A3": "SOM",
          "NOTE_BRK": null
        },
        "fcdo": {
          "country": { "name": "Somalia", "slug": "somalia" },
          "alert_status": ["avoid_all_travel_to_parts"],
          "public_updated_at": "2026-06-04T15:57:41+01:00",
          "reviewed_at": "2026-06-04T14:57:41Z",
          "change_description": "Updated information about the political situation ('Safety and security' page).",
          "url": "https://www.gov.uk/foreign-travel-advice/somalia"
        }
      },
      "geometry": { "type": "MultiPolygon", "coordinates": ["…"] }
    },
    {
      "type": "Feature",
      "id": 1159321259,
      "properties": {
        "state": "parts",
        "match": "coverage_alias__somalia__somaliland",
        "naturalEarth": {
          "NE_ID": 1159321259,
          "NAME": "Somaliland",
          "ADM0_A3": "SOL",
          "NOTE_BRK": "Self admin.; Claimed by Somalia"
        },
        "fcdo": { "…": "same as Somalia" }
      },
      "geometry": { "type": "MultiPolygon", "coordinates": ["…"] }
    }
  ]
}
```

## Out of scope

- Advisory details in SpotPanel (separate issue)
- Hiding travel data for past eclipses (separate issue)

## Commits

1. `docs:` this plan.

## Verification

- Places on the 2027 path (Spain, Morocco, Western Sahara, Algeria, Tunisia, Libya, Egypt, Saudi Arabia, Yemen, Somalia incl. Somaliland) get the expected states.

## Optional tooling

No MCP needed.

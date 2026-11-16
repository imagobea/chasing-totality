import { describe, it } from "vitest";

describe("generate-advisories", () => {
  // Validation: every stop condition fails the run and writes nothing
  it.todo("fails when the index answers other than 200");
  it.todo("fails when a page still answers other than 200 after the retries");
  it.todo("fails when a page is withdrawn");
  it.todo("fails when fewer pages are fetched than the index lists");
  it.todo("fails on an unknown alert status");
  it.todo("fails when the Natural Earth download fails");
  it.todo("fails when a page matches no shape");
  it.todo("fails when an alias names a page or shape that no longer exists");
  it.todo("fails when a page no longer mentions a place it covers");
  it.todo("fails when a page known not to be drawn now matches a shape");
  it.todo("fails when a shape is claimed by two pages");
  it.todo("fails when a ring collapses once rounded");

  // Fetching
  it.todo("retries a failed request, then carries on");
  it.todo("requests one page at a time, about 5 a second");
  it.todo("identifies itself with a generic client name");

  // State
  it.todo("reads no alert status as none");
  it.todo("reads each whole-country status as whole");
  it.todo("reads each parts status as parts");
  it.todo("reads whole when a page has both whole and parts");

  // Matching
  it.todo("matches a page to the shape with its name or long name");
  it.todo("matches a synonym that renames the page's own shape as a direct match");
  it.todo("claims a separate shape a synonym names");
  it.todo("claims the shapes an alias names");
  it.todo("claims the shapes a coverage alias names");
  it.todo("ignores a blocked synonym match");
  it.todo("skips pages known not to be drawn");
  it.todo("leaves out shapes with no page");

  // Snapshot
  it.todo("labels a match by how, page slug and shape name, in snake_case");
  it.todo("rounds coordinates to 3 decimals and drops repeated points");
  it.todo("writes a feature per matched shape, keyed by NE_ID");
  it.todo("links each place to its gov.uk page, not the API");
  it.todo("sorts features by NE_ID");

  // Run summary
  it.todo("reports matches by how, counts per state and shapes with no page");
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatEclipseDate } from "../src/eclipses.js";

describe("formatEclipseDate", () => {
  it("writes year, short month and two-digit day", () => {
    expect(formatEclipseDate("2027-08-02")).toBe("2027 · AUG 02");
  });

  it("keeps the calendar day at the ends of the year", () => {
    expect(formatEclipseDate("2026-01-01")).toBe("2026 · JAN 01");
    expect(formatEclipseDate("2028-12-31")).toBe("2028 · DEC 31");
  });
});

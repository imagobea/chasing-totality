// @vitest-environment node
import { describe, expect, it } from "vitest";
import { daysUntil, formatEclipseDate } from "../src/utils.js";

describe("formatEclipseDate", () => {
  it("writes year, short month and two-digit day", () => {
    expect(formatEclipseDate("2027-08-02")).toBe("2027 · AUG 02");
  });

  it("keeps the calendar day at the ends of the year", () => {
    expect(formatEclipseDate("2026-01-01")).toBe("2026 · JAN 01");
    expect(formatEclipseDate("2028-12-31")).toBe("2028 · DEC 31");
  });
});

describe("daysUntil", () => {
  // Local-time constructors, so these hold in whatever time zone the tests run
  it("counts calendar days from the local day", () => {
    expect(daysUntil("2027-08-02", new Date(2026, 9, 21, 0, 1))).toBe(285);
    expect(daysUntil("2027-08-02", new Date(2026, 9, 21, 23, 59))).toBe(285);
    expect(daysUntil("2027-08-02", new Date(2027, 7, 1, 12))).toBe(1);
  });

  it("is 0 on the day and after it", () => {
    expect(daysUntil("2027-08-02", new Date(2027, 7, 2, 23, 59))).toBe(0);
    expect(daysUntil("2027-08-02", new Date(2027, 7, 3))).toBe(0);
  });
});

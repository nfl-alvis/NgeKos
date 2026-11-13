import { describe, expect, it } from "vitest";
import { ageInDays, formatReviewDate } from "@/lib/adminReviewStore";

describe("adminReviewStore date utilities", () => {
  it("ageInDays parses date-only YYYY-MM-DD cleanly", () => {
    const fixedNow = new Date("2026-11-11T12:00:00Z");
    expect(ageInDays("2026-11-11", fixedNow)).toBe(0);
    expect(ageInDays("2026-11-09", fixedNow)).toBe(2);
    expect(ageInDays("2026-11-01", fixedNow)).toBe(10);
  });

  it("ageInDays parses full ISO timestamps with time and offset without producing NaN", () => {
    const fixedNow = new Date("2026-11-11T12:00:00Z");
    expect(ageInDays("2026-11-11T08:00:00.000Z", fixedNow)).toBe(0);
    expect(ageInDays("2026-11-08T15:30:00.000Z", fixedNow)).toBe(2);
    expect(ageInDays("2026-11-01T00:00:00+07:00", fixedNow)).toBe(10);
  });

  it("ageInDays safely handles invalid or missing dates by returning 0 instead of NaN", () => {
    const fixedNow = new Date("2026-11-11T12:00:00Z");
    expect(ageInDays(undefined, fixedNow)).toBe(0);
    expect(ageInDays(null, fixedNow)).toBe(0);
    expect(ageInDays("", fixedNow)).toBe(0);
    expect(ageInDays("not-a-date", fixedNow)).toBe(0);
  });

  it("formatReviewDate formats valid dates and handles fallback cleanly", () => {
    expect(formatReviewDate("2026-11-11", "en")).toContain("2026");
    expect(formatReviewDate("2026-11-11T14:30:00.000Z", "id")).toContain("2026");
    expect(formatReviewDate(undefined, "id")).toBe("-");
    expect(formatReviewDate("invalid", "id")).toBe("-");
  });
});

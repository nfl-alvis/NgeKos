import { describe, it, expect } from "vitest";
import {
  calculateLeaseEndDate,
  getLeaseExpirationInfo,
  canExtendLease,
  calculateExtensionInvoice,
} from "./lease-extension-policy";

describe("lease-extension-policy", () => {
  describe("calculateLeaseEndDate", () => {
    it("adds duration months properly to start date", () => {
      const start = new Date("2026-01-01T00:00:00.000Z");
      const end = calculateLeaseEndDate(start, 3);
      expect(end.toISOString().slice(0, 10)).toBe("2026-04-01");
    });

    it("handles year transition across December", () => {
      const start = new Date("2026-11-15T00:00:00.000Z");
      const end = calculateLeaseEndDate(start, 3);
      expect(end.toISOString().slice(0, 10)).toBe("2027-02-15");
    });
  });

  describe("getLeaseExpirationInfo", () => {
    const startDate = new Date("2026-01-01T00:00:00.000Z");
    const durationMonths = 6; // End date is 2026-07-01

    it("returns ACTIVE_NORMAL when reference date is more than 30 days before end date", () => {
      const ref = new Date("2026-05-01T00:00:00.000Z"); // 61 days remaining
      const info = getLeaseExpirationInfo({
        startDate,
        durationMonths,
        referenceDate: ref,
        status: "ACTIVE",
      });

      expect(info.expiringStatus).toBe("ACTIVE_NORMAL");
      expect(info.isExpiringNotice).toBe(false);
      expect(info.isEligibleForExtension).toBe(true);
      expect(info.daysRemaining).toBeGreaterThan(30);
    });

    it("returns EXPIRING_H30 when reference date is within 30 days of end date", () => {
      const ref = new Date("2026-06-15T00:00:00.000Z"); // 16 days remaining
      const info = getLeaseExpirationInfo({
        startDate,
        durationMonths,
        referenceDate: ref,
        status: "ACTIVE",
      });

      expect(info.expiringStatus).toBe("EXPIRING_H30");
      expect(info.isExpiringNotice).toBe(true);
      expect(info.isEligibleForExtension).toBe(true);
      expect(info.daysRemaining).toBe(16);
    });

    it("returns EXPIRING_H7 when reference date is within 7 days of end date", () => {
      const ref = new Date("2026-06-26T00:00:00.000Z"); // 5 days remaining
      const info = getLeaseExpirationInfo({
        startDate,
        durationMonths,
        referenceDate: ref,
        status: "ACTIVE",
      });

      expect(info.expiringStatus).toBe("EXPIRING_H7");
      expect(info.isExpiringNotice).toBe(true);
      expect(info.isEligibleForExtension).toBe(true);
      expect(info.daysRemaining).toBe(5);
    });

    it("returns EXPIRED when reference date is past end date", () => {
      const ref = new Date("2026-07-05T00:00:00.000Z"); // -4 days remaining
      const info = getLeaseExpirationInfo({
        startDate,
        durationMonths,
        referenceDate: ref,
        status: "ACTIVE",
      });

      expect(info.expiringStatus).toBe("EXPIRED");
      expect(info.isExpiringNotice).toBe(true);
      expect(info.daysRemaining).toBeLessThanOrEqual(0);
    });

    it("returns NOT_ACTIVE when booking status is not ACTIVE", () => {
      const info = getLeaseExpirationInfo({
        startDate,
        durationMonths,
        status: "COMPLETED",
      });

      expect(info.expiringStatus).toBe("NOT_ACTIVE");
      expect(info.isEligibleForExtension).toBe(false);
      expect(info.isExpiringNotice).toBe(false);
    });

    it("returns NOT_ACTIVE when booking has already checked out", () => {
      const info = getLeaseExpirationInfo({
        startDate,
        durationMonths,
        status: "ACTIVE",
        checkedOutAt: new Date("2026-06-01T00:00:00.000Z"),
      });

      expect(info.expiringStatus).toBe("NOT_ACTIVE");
      expect(info.isEligibleForExtension).toBe(false);
    });
  });

  describe("canExtendLease", () => {
    it("allows extension for ACTIVE booking with no termination pending", () => {
      const res = canExtendLease({ status: "ACTIVE", checkedOutAt: null, terminationStatus: "NONE" });
      expect(res.allowed).toBe(true);
    });

    it("disallows extension for non-ACTIVE status", () => {
      const res = canExtendLease({ status: "PENDING" });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("NOT_ACTIVE");
    });

    it("disallows extension if already checked out", () => {
      const res = canExtendLease({ status: "ACTIVE", checkedOutAt: new Date() });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("ALREADY_CHECKED_OUT");
    });

    it("disallows extension if mutual termination is currently requested", () => {
      const res = canExtendLease({ status: "ACTIVE", terminationStatus: "REQUESTED" });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("TERMINATION_PENDING");
    });
  });

  describe("calculateExtensionInvoice", () => {
    it("charges zero deposit and retains rollover deposit from previous lease", () => {
      const calc = calculateExtensionInvoice({
        monthlyPrice: 2000000,
        additionalMonths: 6,
        billingCycle: "MONTHLY",
        existingDeposit: 1000000,
      });

      expect(calc.newDepositCharged).toBe(0);
      expect(calc.rolloverDepositAmount).toBe(1000000);
      expect(calc.termRentAmount).toBe(2000000);
      expect(calc.totalFirstPaymentDue).toBe(2000000); // Only rent, NO deposit added!
      expect(calc.totalExtensionRent).toBe(12000000);
      expect(calc.rolloverNotice).toContain("1.000.000");
    });

    it("handles quarterly billing cycle for extension", () => {
      const calc = calculateExtensionInvoice({
        monthlyPrice: 1500000,
        additionalMonths: 6,
        billingCycle: "QUARTERLY",
        existingDeposit: 500000,
      });

      expect(calc.newDepositCharged).toBe(0);
      expect(calc.termRentAmount).toBe(4500000); // 3 * 1.5M
      expect(calc.totalFirstPaymentDue).toBe(4500000);
      expect(calc.rolloverDepositAmount).toBe(500000);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateDailyProrataRefund,
  canRequestTermination,
  canConfirmTermination,
} from "./mutual-termination-policy";

describe("mutual-termination-policy", () => {
  describe("calculateDailyProrataRefund", () => {
    it("calculates exact daily prorata refund for unspent days", () => {
      // 30 days period: 1 Nov to 1 Dec
      const periodStart = new Date("2026-11-01T00:00:00.000Z");
      const periodEnd = new Date("2026-12-01T00:00:00.000Z");
      // Terminate on 11 Nov (10 days used, 20 days unused)
      const terminationDate = new Date("2026-11-11T00:00:00.000Z");

      const res = calculateDailyProrataRefund({
        periodStart,
        periodEnd,
        terminationDate,
        periodRentAmount: 1500000,
        futurePaidTermsAmount: 0,
        depositAmount: 500000,
        damageDeductionAmount: 0,
      });

      expect(res.totalDaysInPeriod).toBe(30);
      expect(res.daysUsed).toBe(10);
      expect(res.daysUnused).toBe(20);
      // 20/30 * 1,500,000 = 1,000,000 rent refund
      expect(res.rentRefundAmount).toBe(1000000);
      expect(res.depositRefundAmount).toBe(500000);
      expect(res.totalRefundToTenant).toBe(1500000);
      expect(res.damageCompensationToOwner).toBe(0);
    });

    it("includes 100% of future prepaid cycles and applies agreed damage deduction", () => {
      const periodStart = new Date("2026-11-01T00:00:00.000Z");
      const periodEnd = new Date("2026-12-01T00:00:00.000Z");
      const terminationDate = new Date("2026-11-16T00:00:00.000Z"); // 15 days used, 15 days unused

      const res = calculateDailyProrataRefund({
        periodStart,
        periodEnd,
        terminationDate,
        periodRentAmount: 1500000,
        futurePaidTermsAmount: 3000000, // tenant already paid for month 2 & 3 in advance
        depositAmount: 500000,
        damageDeductionAmount: 150000, // agreed damage deduction for wall repaint
      });

      expect(res.daysUsed).toBe(15);
      expect(res.daysUnused).toBe(15);
      // 15/30 * 1.5jt = 750k + 3jt future terms = 3.75jt rent refund
      expect(res.rentRefundAmount).toBe(3750000);
      // Deposit 500k - 150k damage = 350k deposit refund
      expect(res.depositRefundAmount).toBe(350000);
      expect(res.totalRefundToTenant).toBe(4100000); // 3.75jt + 350k
      expect(res.damageCompensationToOwner).toBe(150000);
    });
  });

  describe("canRequestTermination", () => {
    it("allows request when booking is ACTIVE and no pending request exists", () => {
      const res = canRequestTermination({
        status: "ACTIVE",
        terminationStatus: "NONE",
      });
      expect(res.allowed).toBe(true);
    });

    it("rejects request if termination is already requested", () => {
      const res = canRequestTermination({
        status: "ACTIVE",
        terminationStatus: "REQUESTED",
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("ALREADY_REQUESTED");
    });

    it("rejects request if booking is not ACTIVE", () => {
      const res = canRequestTermination({
        status: "COMPLETED",
        terminationStatus: "NONE",
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("INVALID_STATUS");
    });
  });

  describe("canConfirmTermination", () => {
    it("allows opposing party to approve/reject termination request", () => {
      const res = canConfirmTermination({
        status: "ACTIVE",
        terminationStatus: "REQUESTED",
        requestedBy: "TENANT",
        currentActorRole: "OWNER",
      });
      expect(res.allowed).toBe(true);
    });

    it("rejects confirmation if the actor is the same party who requested it", () => {
      const res = canConfirmTermination({
        status: "ACTIVE",
        terminationStatus: "REQUESTED",
        requestedBy: "TENANT",
        currentActorRole: "TENANT",
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("CANNOT_CONFIRM_OWN_REQUEST");
    });
  });
});

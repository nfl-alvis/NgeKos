import { describe, it, expect } from "vitest";
import {
  calculateFirstInvoice,
  calculatePaymentDeadline,
  isPaymentDeadlinePassed,
  calculateNextAnchorDueDate,
  type BillingCycle,
} from "./billing-cycle-service";

describe("billing-cycle-service", () => {
  describe("calculateFirstInvoice", () => {
    const monthlyPrice = 1500000;
    const deposit = 500000;

    it("calculates for MONTHLY billing cycle correctly", () => {
      const result = calculateFirstInvoice({
        monthlyPrice,
        deposit,
        billingCycle: "MONTHLY",
        durationMonths: 6,
      });

      expect(result.termRentAmount).toBe(1500000);
      expect(result.depositAmount).toBe(500000);
      expect(result.totalFirstPayment).toBe(2000000); // Deposit + 1st month rent
      expect(result.totalInstallments).toBe(6);
    });

    it("calculates for QUARTERLY (3 bulanan) billing cycle correctly", () => {
      const result = calculateFirstInvoice({
        monthlyPrice,
        deposit,
        billingCycle: "QUARTERLY",
        durationMonths: 12,
      });

      expect(result.termRentAmount).toBe(4500000); // 3 * 1.5jt
      expect(result.depositAmount).toBe(500000);
      expect(result.totalFirstPayment).toBe(5000000); // Deposit + 3 months rent
      expect(result.totalInstallments).toBe(4);
    });

    it("calculates for WEEKLY billing cycle correctly", () => {
      const result = calculateFirstInvoice({
        monthlyPrice,
        deposit,
        billingCycle: "WEEKLY",
        durationMonths: 1,
      });

      expect(result.termRentAmount).toBe(375000); // 1.5jt / 4
      expect(result.totalFirstPayment).toBe(875000);
      expect(result.totalInstallments).toBe(4);
    });

    it("calculates for ANNUALLY (tahunan) billing cycle correctly", () => {
      const result = calculateFirstInvoice({
        monthlyPrice,
        deposit,
        billingCycle: "ANNUALLY",
        durationMonths: 12,
      });

      expect(result.termRentAmount).toBe(18000000); // 12 * 1.5jt
      expect(result.totalFirstPayment).toBe(18500000);
      expect(result.totalInstallments).toBe(1);
    });
  });

  describe("calculatePaymentDeadline & validation", () => {
    it("sets deadline to exactly 24 hours after approval", () => {
      const approvedAt = new Date("2026-11-20T10:00:00.000Z");
      const deadline = calculatePaymentDeadline(approvedAt);

      expect(deadline.toISOString()).toBe("2026-11-21T10:00:00.000Z");
    });

    it("detects when 1x24h payment deadline has passed", () => {
      const deadline = new Date("2026-11-21T10:00:00.000Z");

      const before = new Date("2026-11-21T09:59:00.000Z");
      expect(isPaymentDeadlinePassed(deadline, before)).toBe(false);

      const after = new Date("2026-11-21T10:01:00.000Z");
      expect(isPaymentDeadlinePassed(deadline, after)).toBe(true);
    });
  });

  describe("calculateNextAnchorDueDate", () => {
    it("anchors next monthly due date to the exact check-in day of month", () => {
      const checkInDate = new Date("2026-01-15T08:00:00.000Z"); // 15 Jan
      const nextDue = calculateNextAnchorDueDate({
        checkInDate,
        billingCycle: "MONTHLY",
        installmentIndex: 1, // 2nd installment
      });

      expect(nextDue.getDate()).toBe(15);
      expect(nextDue.getMonth()).toBe(1); // February (0-indexed: 1)
      expect(nextDue.getFullYear()).toBe(2026);
    });

    it("anchors next quarterly due date 3 months after check-in date", () => {
      const checkInDate = new Date("2026-01-15T08:00:00.000Z"); // 15 Jan
      const nextDue = calculateNextAnchorDueDate({
        checkInDate,
        billingCycle: "QUARTERLY",
        installmentIndex: 1,
      });

      expect(nextDue.getDate()).toBe(15);
      expect(nextDue.getMonth()).toBe(3); // April (0-indexed: 3)
      expect(nextDue.getFullYear()).toBe(2026);
    });

    it("anchors next weekly due date 7 days after check-in date", () => {
      const checkInDate = new Date("2026-01-15T08:00:00.000Z");
      const nextDue = calculateNextAnchorDueDate({
        checkInDate,
        billingCycle: "WEEKLY",
        installmentIndex: 1,
      });

      expect(nextDue.getDate()).toBe(22);
      expect(nextDue.getMonth()).toBe(0); // January
    });
  });
});

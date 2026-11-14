import { describe, expect, it } from "vitest";
import {
  canTenantCheckIn,
  canOwnerCheckIn,
  canTenantRequestCheckOut,
  canOwnerConfirmCheckOut,
} from "./checkin-checkout-policy";

describe("Check-in & Check-out Policy Rules", () => {
  const baseActiveBooking = {
    id: "b-1",
    status: "ACTIVE" as const,
    checkedInAt: null,
    checkedOutAt: null,
    checkOutRequestedAt: null,
  };

  describe("canTenantCheckIn", () => {
    it("allows tenant to check in when booking is ACTIVE and not yet checked in", () => {
      const res = canTenantCheckIn(baseActiveBooking);
      expect(res.allowed).toBe(true);
    });

    it("rejects check-in if booking is PENDING or other non-ACTIVE status", () => {
      const res = canTenantCheckIn({ ...baseActiveBooking, status: "PENDING" as any });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("INVALID_STATUS");
    });

    it("rejects check-in if already checked in", () => {
      const res = canTenantCheckIn({
        ...baseActiveBooking,
        checkedInAt: new Date("2026-11-01"),
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("ALREADY_CHECKED_IN");
    });
  });

  describe("canOwnerCheckIn", () => {
    it("allows owner to confirm check in when booking is ACTIVE and not yet checked in", () => {
      const res = canOwnerCheckIn(baseActiveBooking);
      expect(res.allowed).toBe(true);
    });

    it("rejects owner check-in if already checked in", () => {
      const res = canOwnerCheckIn({
        ...baseActiveBooking,
        checkedInAt: new Date("2026-11-01"),
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("ALREADY_CHECKED_IN");
    });
  });

  describe("canTenantRequestCheckOut", () => {
    it("allows checked-in tenant to request checkout", () => {
      const checkedInBooking = {
        ...baseActiveBooking,
        checkedInAt: new Date("2026-11-01"),
      };
      const res = canTenantRequestCheckOut(checkedInBooking);
      expect(res.allowed).toBe(true);
    });

    it("rejects checkout request if tenant has not checked in yet", () => {
      const res = canTenantRequestCheckOut(baseActiveBooking);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("NOT_CHECKED_IN");
    });

    it("rejects checkout request if checkout was already requested", () => {
      const res = canTenantRequestCheckOut({
        ...baseActiveBooking,
        checkedInAt: new Date("2026-11-01"),
        checkOutRequestedAt: new Date("2026-11-20"),
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("CHECKOUT_ALREADY_REQUESTED");
    });

    it("rejects checkout request if already checked out", () => {
      const res = canTenantRequestCheckOut({
        ...baseActiveBooking,
        checkedInAt: new Date("2026-11-01"),
        checkedOutAt: new Date("2026-11-25"),
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("ALREADY_CHECKED_OUT");
    });
  });

  describe("canOwnerConfirmCheckOut", () => {
    it("allows owner to confirm checkout for checked-in booking", () => {
      const checkedInBooking = {
        ...baseActiveBooking,
        checkedInAt: new Date("2026-11-01"),
        checkOutRequestedAt: new Date("2026-11-20"),
      };
      const res = canOwnerConfirmCheckOut(checkedInBooking);
      expect(res.allowed).toBe(true);
    });

    it("rejects owner checkout confirmation if booking not checked in", () => {
      const res = canOwnerConfirmCheckOut(baseActiveBooking);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("NOT_CHECKED_IN");
    });

    it("rejects owner checkout confirmation if already checked out", () => {
      const res = canOwnerConfirmCheckOut({
        ...baseActiveBooking,
        checkedInAt: new Date("2026-11-01"),
        checkedOutAt: new Date("2026-11-25"),
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe("ALREADY_CHECKED_OUT");
    });
  });
});

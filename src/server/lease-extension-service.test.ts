import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    rentalAgreement: {
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
    },
    roomUnit: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    roomType: {
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/audit-service", () => ({ recordAuditLog: vi.fn() }));

import { extendLease, getExpiringLeases } from "./lease-extension-service";

describe("lease-extension-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantProfile = {
    id: "p-tenant",
    fullName: "Budi Tenant",
    role: "SEEKER" as const,
  };

  const otherProfile = {
    id: "p-stranger",
    fullName: "Stranger",
    role: "SEEKER" as const,
  };

  const sampleBooking = {
    id: "b-101",
    code: "BK-101",
    status: "ACTIVE" as const,
    applicantId: "p-tenant",
    propertyId: "prop-1",
    roomUnitId: "unit-1",
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    durationMonths: 6,
    monthlyPriceSnapshot: 2000000,
    depositSnapshot: 1000000,
    billingCycle: "MONTHLY",
    terminationStatus: "NONE",
    property: { id: "prop-1", ownerId: "p-owner", name: "Kost Sakura" },
    roomType: { id: "rt-1", name: "Deluxe Room" },
    roomUnit: { id: "unit-1", number: "101" },
    agreement: { id: "ag-1", endDate: new Date("2026-07-01T00:00:00.000Z") },
  };

  describe("extendLease", () => {
    it("successfully extends lease, updates duration, preserves deposit, and creates invoice", async () => {
      mockPrisma.booking.findFirst.mockResolvedValueOnce(sampleBooking);
      mockPrisma.rentalAgreement.update.mockResolvedValueOnce({
        id: "ag-1",
        endDate: new Date("2026-10-01T00:00:00.000Z"),
      });
      mockPrisma.invoice.create.mockResolvedValueOnce({
        id: "inv-ext-1",
        code: "INV-EXT-2601-ABC",
        amount: 2000000,
        status: "ISSUED",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-10-01T00:00:00.000Z"),
      });
      mockPrisma.booking.update.mockResolvedValueOnce({
        ...sampleBooking,
        durationMonths: 9,
      });

      const res = await extendLease({
        bookingId: "b-101",
        profile: tenantProfile as any,
        additionalMonths: 3,
        billingCycle: "MONTHLY",
      });

      expect(res.booking.durationMonths).toBe(9);
      expect(res.calculation.newDepositCharged).toBe(0);
      expect(res.calculation.rolloverDepositAmount).toBe(1000000);
      expect(res.calculation.termRentAmount).toBe(2000000);
      expect(res.invoice.amount).toBe(2000000);
      expect(mockPrisma.rentalAgreement.update).toHaveBeenCalled();
      expect(mockPrisma.invoice.create).toHaveBeenCalled();
      expect(mockPrisma.booking.update).toHaveBeenCalled();
    });

    it("throws 404 when booking not found", async () => {
      mockPrisma.booking.findFirst.mockResolvedValueOnce(null);

      await expect(
        extendLease({
          bookingId: "nonexistent",
          profile: tenantProfile as any,
          additionalMonths: 3,
        })
      ).rejects.toMatchObject({
        status: 404,
        code: "BOOKING_NOT_FOUND",
      });
    });

    it("throws 403 when user is not tenant or admin", async () => {
      mockPrisma.booking.findFirst.mockResolvedValueOnce(sampleBooking);

      await expect(
        extendLease({
          bookingId: "b-101",
          profile: otherProfile as any,
          additionalMonths: 3,
        })
      ).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });
    });

    it("throws 400 when booking is not ACTIVE", async () => {
      mockPrisma.booking.findFirst.mockResolvedValueOnce({
        ...sampleBooking,
        status: "COMPLETED",
      });

      await expect(
        extendLease({
          bookingId: "b-101",
          profile: tenantProfile as any,
          additionalMonths: 3,
        })
      ).rejects.toMatchObject({
        status: 400,
        code: "NOT_ACTIVE",
      });
    });

    it("throws 400 when booking already checked out", async () => {
      mockPrisma.booking.findFirst.mockResolvedValueOnce({
        ...sampleBooking,
        checkedOutAt: new Date(),
      });

      await expect(
        extendLease({
          bookingId: "b-101",
          profile: tenantProfile as any,
          additionalMonths: 3,
        })
      ).rejects.toMatchObject({
        status: 400,
        code: "ALREADY_CHECKED_OUT",
      });
    });

    it("throws 400 when mutual termination is pending", async () => {
      mockPrisma.booking.findFirst.mockResolvedValueOnce({
        ...sampleBooking,
        terminationStatus: "REQUESTED",
      });

      await expect(
        extendLease({
          bookingId: "b-101",
          profile: tenantProfile as any,
          additionalMonths: 3,
        })
      ).rejects.toMatchObject({
        status: 400,
        code: "TERMINATION_PENDING",
      });
    });
  });

  describe("getExpiringLeases", () => {
    it("returns only leases that fall within the notice window", async () => {
      // Lease 1: starts 2026-01-01, 6 months -> ends 2026-07-01. Ref date 2026-06-15 -> 16 days left (EXPIRING_H30)
      const expiringBooking = {
        ...sampleBooking,
        id: "b-expiring",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        durationMonths: 6,
      };

      // Lease 2: starts 2026-01-01, 12 months -> ends 2027-01-01. Ref date 2026-06-15 -> 200 days left (NORMAL, not notice)
      const healthyBooking = {
        ...sampleBooking,
        id: "b-healthy",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        durationMonths: 12,
      };

      mockPrisma.booking.findMany.mockResolvedValueOnce([expiringBooking, healthyBooking]);

      const results = await getExpiringLeases({
        ownerId: "p-owner",
        referenceDate: new Date("2026-06-15T00:00:00.000Z"),
      });

      expect(results.length).toBe(1);
      expect(results[0].booking.id).toBe("b-expiring");
      expect(results[0].expiration.expiringStatus).toBe("EXPIRING_H30");
      expect(results[0].expiration.daysRemaining).toBe(16);
    });
  });
});

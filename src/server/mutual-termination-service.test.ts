import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockCreditWallet } = vi.hoisted(() => ({
  mockPrisma: {
    booking: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    roomUnit: {
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  },
  mockCreditWallet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/server/wallet-service", () => ({ creditWallet: mockCreditWallet }));
vi.mock("@/server/audit-service", () => ({ recordAuditLog: vi.fn() }));

import {
  requestTermination,
  confirmTermination,
} from "./mutual-termination-service";

describe("mutual-termination-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantProfile = {
    id: "p-tenant",
    fullName: "Penyewa Budi",
    role: "SEEKER" as const,
  };

  const ownerProfile = {
    id: "p-owner",
    fullName: "Pemilik Kos",
    role: "OWNER" as const,
  };

  const sampleBooking = {
    id: "b-1",
    code: "BK-123",
    status: "ACTIVE" as const,
    applicantId: "p-tenant",
    propertyId: "prop-1",
    roomUnitId: "unit-1",
    startDate: new Date("2026-11-01T00:00:00.000Z"),
    durationMonths: 1,
    monthlyPriceSnapshot: 1500000,
    depositSnapshot: 500000,
    terminationStatus: "NONE",
    property: { ownerId: "p-owner", name: "Kos Mawar" },
  };

  describe("requestTermination", () => {
    it("submits termination request by tenant with reason and calculated refund", async () => {
      mockPrisma.booking.findFirst.mockResolvedValueOnce(sampleBooking);
      mockPrisma.booking.update.mockResolvedValueOnce({
        ...sampleBooking,
        terminationStatus: "REQUESTED",
        terminationRequestedBy: "TENANT",
        terminationReason: "Pindah kerja ke kota lain",
      });

      const res = await requestTermination({
        bookingId: "b-1",
        profile: tenantProfile as any,
        reason: "Pindah kerja ke kota lain",
      });

      expect(res.terminationStatus).toBe("REQUESTED");
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "b-1" },
          data: expect.objectContaining({
            terminationStatus: "REQUESTED",
            terminationRequestedBy: "TENANT",
            terminationReason: "Pindah kerja ke kota lain",
          }),
        })
      );
    });
  });

  describe("confirmTermination", () => {
    it("approves termination request and credits refund to tenant wallet", async () => {
      const requestedBooking = {
        ...sampleBooking,
        terminationStatus: "REQUESTED",
        terminationRequestedBy: "TENANT",
        terminationReason: "Pindah kerja",
        terminationRefundAmount: 1200000,
      };

      mockPrisma.booking.findFirst.mockResolvedValueOnce(requestedBooking);
      mockPrisma.booking.update.mockResolvedValueOnce({
        ...requestedBooking,
        status: "COMPLETED",
        terminationStatus: "APPROVED",
      });

      const res = await confirmTermination({
        bookingId: "b-1",
        profile: ownerProfile as any, // owner confirms tenant's request
        action: "APPROVE",
      });

      expect(res.status).toBe("COMPLETED");
      expect(mockCreditWallet).toHaveBeenCalled();
      expect(mockPrisma.roomUnit.update).toHaveBeenCalledWith({
        where: { id: "unit-1" },
        data: { status: "AVAILABLE" },
      });
    });

    it("rejects confirmation if the same requester attempts to approve", async () => {
      const requestedBooking = {
        ...sampleBooking,
        terminationStatus: "REQUESTED",
        terminationRequestedBy: "TENANT",
      };

      mockPrisma.booking.findFirst.mockResolvedValueOnce(requestedBooking);

      await expect(
        confirmTermination({
          bookingId: "b-1",
          profile: tenantProfile as any, // same requester!
          action: "APPROVE",
        })
      ).rejects.toThrow();
    });
  });
});

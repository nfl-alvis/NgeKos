import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    wallet: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    walletTransaction: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    payoutRequest: {
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  evaluateLazyEscrowRelease,
  calculatePayoutValidation,
  formatCurrencyIdr,
  getOrCreateWallet,
  requestPayout,
  processPayout,
  creditWallet,
  MIN_PAYOUT_AMOUNT,
} from "./wallet-service";

describe("wallet-service: pure domain policies and helpers", () => {
  it("formats currency to IDR cleanly", () => {
    expect(formatCurrencyIdr(1500000)).toBe("Rp 1.500.000");
    expect(formatCurrencyIdr(0)).toBe("Rp 0");
  });

  describe("calculatePayoutValidation", () => {
    it("rejects payout if requested amount exceeds available balance", () => {
      const result = calculatePayoutValidation({
        currentBalance: 500000,
        requestedAmount: 600000,
        minPayoutAmount: 50000,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INSUFFICIENT_BALANCE");
    });

    it("rejects payout if requested amount is below minimum threshold", () => {
      const result = calculatePayoutValidation({
        currentBalance: 500000,
        requestedAmount: 20000,
        minPayoutAmount: 50000,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("BELOW_MINIMUM");
    });

    it("rejects payout with empty bank account details", () => {
      const result = calculatePayoutValidation({
        currentBalance: 500000,
        requestedAmount: 100000,
        bankName: "",
        accountNumber: "123",
        accountHolder: "Budi",
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("INVALID_BANK_DETAILS");
    });

    it("approves valid payout request within balance and threshold", () => {
      const result = calculatePayoutValidation({
        currentBalance: 500000,
        requestedAmount: 300000,
        bankName: "BCA",
        accountNumber: "1234567890",
        accountHolder: "Budi Santoso",
        minPayoutAmount: 50000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remainingBalance).toBe(200000);
    });
  });

  describe("evaluateLazyEscrowRelease", () => {
    const now = new Date("2026-11-20T12:00:00Z");

    it("identifies transactions that have reached or passed payoutEligibleAt", () => {
      const transactions = [
        {
          id: "tx-1",
          amount: 1500000,
          type: "EARNING_HOLD",
          status: "PENDING",
          payoutEligibleAt: new Date("2026-11-20T10:00:00Z"), // passed 2 hours ago
        },
        {
          id: "tx-2",
          amount: 1200000,
          type: "EARNING_HOLD",
          status: "PENDING",
          payoutEligibleAt: new Date("2026-11-20T15:00:00Z"), // 3 hours in future
        },
      ];

      const result = evaluateLazyEscrowRelease(transactions as any, now);

      expect(result.eligibleToRelease.length).toBe(1);
      expect(result.eligibleToRelease[0].id).toBe("tx-1");
      expect(result.totalReleaseAmount).toBe(1500000);
      expect(result.stillHeld.length).toBe(1);
      expect(result.stillHeld[0].id).toBe("tx-2");
    });

    it("does not release transactions that are already COMPLETED", () => {
      const transactions = [
        {
          id: "tx-1",
          amount: 1500000,
          type: "EARNING_HOLD",
          status: "COMPLETED",
          payoutEligibleAt: new Date("2026-11-19T10:00:00Z"),
        },
      ];

      const result = evaluateLazyEscrowRelease(transactions as any, now);
      expect(result.eligibleToRelease.length).toBe(0);
      expect(result.totalReleaseAmount).toBe(0);
    });
  });

  describe("getOrCreateWallet and lazy escrow sync", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("creates wallet if one does not exist for profile", async () => {
      mockPrisma.wallet.findUnique.mockResolvedValueOnce(null);
      mockPrisma.wallet.create.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 0,
        heldBalance: 0,
      });
      mockPrisma.walletTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 0,
        heldBalance: 0,
        transactions: [],
        payouts: [],
      });

      const wallet = await getOrCreateWallet("p-1");
      expect(wallet.id).toBe("w-1");
      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: { profileId: "p-1", balance: 0, heldBalance: 0 },
      });
    });

    it("releases matured escrow holds on access", async () => {
      mockPrisma.wallet.findUnique.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 100000,
        heldBalance: 1500000,
      });
      mockPrisma.walletTransaction.findMany.mockResolvedValueOnce([
        {
          id: "tx-hold",
          amount: 1500000,
          walletId: "w-1",
          referenceId: "b-1",
        },
      ]);
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 1600000,
        heldBalance: 0,
        transactions: [],
        payouts: [],
      });

      const wallet = await getOrCreateWallet("p-1");

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { id: "w-1" },
        data: {
          balance: { increment: 1500000 },
          heldBalance: { decrement: 1500000 },
        },
      });
      expect(mockPrisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["tx-hold"] } },
        data: expect.objectContaining({ status: "COMPLETED" }),
      });
    });
  });

  describe("requestPayout", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("creates PayoutRequest and deducts balance on valid request", async () => {
      mockPrisma.wallet.findUnique.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 500000,
        heldBalance: 0,
      });
      mockPrisma.walletTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 500000,
        heldBalance: 0,
        transactions: [],
        payouts: [],
      });
      mockPrisma.payoutRequest.create.mockResolvedValueOnce({
        id: "pay-1",
        walletId: "w-1",
        amount: 200000,
        status: "PENDING",
      });

      const result = await requestPayout({
        profileId: "p-1",
        amount: 200000,
        bankName: "BCA",
        accountNumber: "12345678",
        accountHolder: "Budi",
      });

      expect(result.id).toBe("pay-1");
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { id: "w-1" },
        data: { balance: { decrement: 200000 } },
      });
      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "WITHDRAWAL",
          status: "PENDING",
          amount: 200000,
        }),
      });
    });

    it("throws ApiError if balance is insufficient", async () => {
      mockPrisma.wallet.findUnique.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 100000,
        heldBalance: 0,
      });
      mockPrisma.walletTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-1",
        balance: 100000,
        heldBalance: 0,
        transactions: [],
        payouts: [],
      });

      await expect(
        requestPayout({
          profileId: "p-1",
          amount: 300000,
          bankName: "BCA",
          accountNumber: "12345678",
          accountHolder: "Budi",
        })
      ).rejects.toThrow(/Saldo tidak mencukupi/);
    });
  });

  describe("processPayout", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("marks payout COMPLETED when approved by admin", async () => {
      mockPrisma.payoutRequest.findUniqueOrThrow.mockResolvedValueOnce({
        id: "pay-1",
        walletId: "w-1",
        amount: 200000,
        status: "PENDING",
        wallet: { id: "w-1" },
      });
      mockPrisma.payoutRequest.update.mockResolvedValueOnce({
        id: "pay-1",
        status: "COMPLETED",
      });

      const res = await processPayout({
        payoutId: "pay-1",
        adminProfileId: "admin-1",
        action: "APPROVE",
        referenceNumber: "BCA-123456",
      });

      expect(res.status).toBe("COMPLETED");
      expect(mockPrisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          walletId: "w-1",
          referenceId: "pay-1",
          type: "WITHDRAWAL",
        },
        data: expect.objectContaining({ status: "COMPLETED" }),
      });
    });

    it("refunds balance when payout is rejected by admin", async () => {
      mockPrisma.payoutRequest.findUniqueOrThrow.mockResolvedValueOnce({
        id: "pay-1",
        walletId: "w-1",
        amount: 200000,
        status: "PENDING",
        wallet: { id: "w-1" },
      });
      mockPrisma.payoutRequest.update.mockResolvedValueOnce({
        id: "pay-1",
        status: "REJECTED",
      });

      const res = await processPayout({
        payoutId: "pay-1",
        adminProfileId: "admin-1",
        action: "REJECT",
        adminNote: "Rekening tidak valid",
      });

      expect(res.status).toBe("REJECTED");
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { id: "w-1" },
        data: { balance: { increment: 200000 } },
      });
      expect(mockPrisma.walletTransaction.updateMany).toHaveBeenCalledWith({
        where: {
          walletId: "w-1",
          referenceId: "pay-1",
          type: "WITHDRAWAL",
        },
        data: { status: "CANCELLED" },
      });
    });
  });

  describe("creditWallet", () => {
    it("increments balance and records credit transaction", async () => {
      mockPrisma.wallet.findUnique.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-tenant",
        balance: 50000,
        heldBalance: 0,
      });
      mockPrisma.walletTransaction.findMany.mockResolvedValueOnce([]);
      mockPrisma.wallet.findUniqueOrThrow.mockResolvedValueOnce({
        id: "w-1",
        profileId: "p-tenant",
        balance: 50000,
        heldBalance: 0,
        transactions: [],
        payouts: [],
      });
      mockPrisma.walletTransaction.create.mockResolvedValueOnce({
        id: "tx-ref",
        amount: 300000,
        type: "RENT_REFUND",
      });

      await creditWallet({
        profileId: "p-tenant",
        amount: 300000,
        type: "RENT_REFUND",
        description: "Pengembalian sisa sewa",
      });

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { id: "w-1" },
        data: { balance: { increment: 300000 } },
      });
    });
  });
});

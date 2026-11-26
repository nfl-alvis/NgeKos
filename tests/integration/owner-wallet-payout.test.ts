import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import {
  holdEscrow,
  creditWallet,
  requestPayout,
} from "@/server/wallet-service";
import { GET as getWalletApi } from "@/app/api/wallet/route";
import { POST as requestPayoutApi } from "@/app/api/wallet/payout/route";
import { GET as adminGetPayoutsApi } from "@/app/api/admin/payouts/route";
import { POST as adminProcessPayoutApi } from "@/app/api/admin/payouts/[id]/route";

// Hoisted auth state
const { authState } = vi.hoisted(() => ({
  authState: {
    currentProfile: null as Profile | null,
  },
}));

vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    requireUser: vi.fn().mockImplementation(async (allowedRoles?: readonly string[]) => {
      if (!authState.currentProfile) {
        throw new ApiError(401, "UNAUTHENTICATED", "Please sign in first");
      }
      if (allowedRoles && !allowedRoles.includes(authState.currentProfile.role)) {
        throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
      }
      return {
        authUser: { id: authState.currentProfile.id, email: authState.currentProfile.email },
        profile: authState.currentProfile,
      };
    }),
  };
});

describe("Owner Wallet Payout & Escrow Flow Integration", () => {
  const ownerProfileId = "58983471-0904-40df-beb8-3a51888b176b";
  const adminProfileId = "a1111111-1111-1111-1111-111111111111";

  const ownerProfile: Profile = {
    id: ownerProfileId,
    email: "owner@ngekost.id",
    fullName: "Ratri Wulandari (Owner Demo)",
    phone: "081234567890",
    avatarUrl: null,
    birthPlace: null,
    occupation: null,
    role: "OWNER",
    adminRole: null,
    status: "ACTIVE",
    locale: "id",
    emailNotifications: true,
    pushNotifications: true,
    marketingNotifications: false,
    telegramChatId: null,
    telegramUsername: null,
    telegramConnectedAt: null,
    telegramConnectToken: null,
    telegramConnectTokenExpiresAt: null,
    bankName: "BCA",
    accountNumber: "1234567890",
    accountHolder: "Ratri Wulandari",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminProfile: Profile = {
    id: adminProfileId,
    email: "admin@ngekost.id",
    fullName: "Bayu Pratama (Admin Demo)",
    phone: "081234567891",
    avatarUrl: null,
    birthPlace: null,
    occupation: null,
    role: "ADMIN",
    adminRole: "SUPER",
    status: "ACTIVE",
    locale: "id",
    emailNotifications: true,
    pushNotifications: true,
    marketingNotifications: false,
    telegramChatId: null,
    telegramUsername: null,
    telegramConnectedAt: null,
    telegramConnectToken: null,
    telegramConnectTokenExpiresAt: null,
    bankName: null,
    accountNumber: null,
    accountHolder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const cleanWallet = async () => {
    const wallet = await prisma.wallet.findUnique({
      where: { profileId: ownerProfileId },
    });
    if (wallet) {
      await prisma.payoutRequest.deleteMany({ where: { walletId: wallet.id } });
      await prisma.walletTransaction.deleteMany({ where: { walletId: wallet.id } });
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: 0, heldBalance: 0 },
      });
    }
  };

  beforeAll(async () => {
    await cleanWallet();
  });

  afterAll(async () => {
    await cleanWallet();
  });

  describe("1. GET /api/wallet", () => {
    it("returns 401 when unauthenticated", async () => {
      authState.currentProfile = null;
      const req = new Request("http://localhost:3000/api/wallet");
      const res = await getWalletApi(req);
      expect(res.status).toBe(401);
    });

    it("returns owner wallet with zero balance initially", async () => {
      authState.currentProfile = ownerProfile;
      const req = new Request("http://localhost:3000/api/wallet");
      const res = await getWalletApi(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.balance).toBe(0);
      expect(json.data.heldBalance).toBe(0);
      expect(json.data.transactions).toEqual([]);
      expect(json.data.payouts).toEqual([]);
    }, 60_000);
  });

  describe("2. Escrow Lifecycle: Hold on Booking & Release on Matured Check-in H+1", () => {
    it("holds rental payment in escrow and releases to active balance when eligible", async () => {
      authState.currentProfile = ownerProfile;
      await cleanWallet();

      // Seeker pays rent: Rp 2.500.000 held in escrow with payout eligible in the past (already matured)
      const maturedTime = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      await holdEscrow({
        ownerProfileId,
        amount: 2_500_000,
        referenceId: "BOOKING-E2E-TEST-01",
        description: "Dana sewa kos tertahan di Escrow NgeKos (check-in H+1)",
        payoutEligibleAt: maturedTime,
      });

      // Initially held
      const walletBefore = await prisma.wallet.findUniqueOrThrow({
        where: { profileId: ownerProfileId },
      });
      expect(Number(walletBefore.heldBalance)).toBe(2_500_000);

      // Accessing wallet triggers lazy escrow release
      const req = new Request("http://localhost:3000/api/wallet");
      const res = await getWalletApi(req);
      const json = await res.json();
      expect(json.data.balance).toBe(2_500_000);
      expect(json.data.heldBalance).toBe(0);

      // Transactions include EARNING_HOLD (COMPLETED) and ESCROW_RELEASE (COMPLETED)
      expect(json.data.transactions).toHaveLength(2);
      const types = json.data.transactions.map((t: any) => t.type);
      expect(types).toContain("EARNING_HOLD");
      expect(types).toContain("ESCROW_RELEASE");
    }, 60_000);
  });

  describe("3. POST /api/wallet/payout (Owner requests withdrawal)", () => {
    it("rejects payout below minimum threshold (Rp 50.000)", async () => {
      authState.currentProfile = ownerProfile;
      const req = new Request("http://localhost:3000/api/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          amount: 25_000,
          bankName: "BCA",
          accountNumber: "1234567890",
          accountHolder: "Ratri Wulandari",
        }),
      });

      const res = await requestPayoutApi(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("BELOW_MINIMUM");
    }, 60_000);

    it("rejects payout exceeding available active balance", async () => {
      authState.currentProfile = ownerProfile;
      const req = new Request("http://localhost:3000/api/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          amount: 50_000_000, // Balance is ~2.500.000
          bankName: "BCA",
          accountNumber: "1234567890",
          accountHolder: "Ratri Wulandari",
        }),
      });

      const res = await requestPayoutApi(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("INSUFFICIENT_BALANCE");
    }, 60_000);

    it("rejects payout with missing bank details", async () => {
      authState.currentProfile = ownerProfile;
      const req = new Request("http://localhost:3000/api/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          amount: 100_000,
          bankName: "",
          accountNumber: "1234567890",
          accountHolder: "Ratri Wulandari",
        }),
      });

      const res = await requestPayoutApi(req);
      expect(res.status).toBe(422);
    }, 60_000);

    it("successfully creates payout request and deducts wallet balance", async () => {
      authState.currentProfile = ownerProfile;
      await cleanWallet();
      await creditWallet({
        profileId: ownerProfileId,
        amount: 1_000_000,
        type: "ESCROW_RELEASE",
        referenceId: "SEED-RELEASE",
        description: "Saldo sewa tersedia",
      });

      const req = new Request("http://localhost:3000/api/wallet/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          amount: 400_000,
          bankName: "BCA",
          accountNumber: "1234567890",
          accountHolder: "Ratri Wulandari",
        }),
      });

      const res = await requestPayoutApi(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("PENDING");
      expect(Number(json.data.amount)).toBe(400_000);
      expect(json.data.bankName).toBe("BCA");
      expect(json.data.accountNumber).toBe("1234567890");

      // Verify wallet balance is deducted: 1.000.000 - 400.000 = 600.000
      const wallet = await prisma.wallet.findUniqueOrThrow({
        where: { profileId: ownerProfileId },
      });
      expect(Number(wallet.balance)).toBe(600_000);

      // Verify WITHDRAWAL transaction is logged with status PENDING
      const tx = await prisma.walletTransaction.findFirstOrThrow({
        where: { walletId: wallet.id, type: "WITHDRAWAL" },
      });
      expect(tx.status).toBe("PENDING");
      expect(Number(tx.amount)).toBe(400_000);
    }, 60_000);
  });

  describe("4. Admin Approval & Rejection Flow", () => {
    it("forbids non-admin from accessing admin payouts API", async () => {
      authState.currentProfile = ownerProfile;
      const getReq = new Request("http://localhost:3000/api/admin/payouts");
      const res = await adminGetPayoutsApi(getReq);
      expect(res.status).toBe(403);
    });

    it("allows admin to view pending payout in list", async () => {
      await cleanWallet();
      await creditWallet({
        profileId: ownerProfileId,
        amount: 500_000,
        type: "ESCROW_RELEASE",
        referenceId: "INIT",
        description: "Saldo",
      });
      const payout = await requestPayout({
        profileId: ownerProfileId,
        amount: 300_000,
        bankName: "BCA",
        accountNumber: "9876543210",
        accountHolder: "Ratri Wulandari",
      });

      authState.currentProfile = adminProfile;
      const getReq = new Request("http://localhost:3000/api/admin/payouts?status=PENDING");
      const res = await adminGetPayoutsApi(getReq);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const found = json.data.find((p: any) => p.id === payout.id);
      expect(found).toBeDefined();
      expect(found.amount).toBe(300_000);
      expect(found.status).toBe("PENDING");
    }, 60_000);

    it("Admin APPROVE: marks payout COMPLETED and settles withdrawal transaction", async () => {
      await cleanWallet();
      await creditWallet({
        profileId: ownerProfileId,
        amount: 500_000,
        type: "ESCROW_RELEASE",
        referenceId: "INIT",
        description: "Saldo",
      });
      const payout = await requestPayout({
        profileId: ownerProfileId,
        amount: 300_000,
        bankName: "BCA",
        accountNumber: "9876543210",
        accountHolder: "Ratri Wulandari",
      });

      authState.currentProfile = adminProfile;
      const postReq = new Request(`http://localhost:3000/api/admin/payouts/${payout.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          action: "APPROVE",
          referenceNumber: "TRX-BCA-88991122",
          adminNote: "Transfer berhasil via Flip/BCA Corporate",
        }),
      });

      const res = await adminProcessPayoutApi(postReq, { params: Promise.resolve({ id: payout.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("COMPLETED");
      expect(json.data.referenceNumber).toBe("TRX-BCA-88991122");

      // Verify withdrawal transaction is COMPLETED
      const tx = await prisma.walletTransaction.findFirstOrThrow({
        where: { referenceId: payout.id, type: "WITHDRAWAL" },
      });
      expect(tx.status).toBe("COMPLETED");

      // Wallet balance remains 200.000 (already deducted during request)
      const wallet = await prisma.wallet.findUniqueOrThrow({
        where: { profileId: ownerProfileId },
      });
      expect(Number(wallet.balance)).toBe(200_000);
    }, 60_000);

    it("Admin REJECT: refunds the requested amount back to owner active balance", async () => {
      await cleanWallet();
      await creditWallet({
        profileId: ownerProfileId,
        amount: 500_000,
        type: "ESCROW_RELEASE",
        referenceId: "INIT",
        description: "Saldo",
      });
      const payout = await requestPayout({
        profileId: ownerProfileId,
        amount: 300_000,
        bankName: "BCA",
        accountNumber: "9876543210",
        accountHolder: "Ratri Wulandari",
      });

      authState.currentProfile = adminProfile;

      // Balance before reject: 200.000
      const walletBefore = await prisma.wallet.findUniqueOrThrow({
        where: { profileId: ownerProfileId },
      });
      expect(Number(walletBefore.balance)).toBe(200_000);

      const postReq = new Request(`http://localhost:3000/api/admin/payouts/${payout.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          action: "REJECT",
          adminNote: "Nama di rekening bank tidak cocok dengan KTP pemilik",
        }),
      });

      const res = await adminProcessPayoutApi(postReq, { params: Promise.resolve({ id: payout.id }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("REJECTED");
      expect(json.data.adminNote).toContain("tidak cocok");

      // Wallet balance is REFUNDED: 200.000 + 300.000 = 500.000
      const walletAfter = await prisma.wallet.findUniqueOrThrow({
        where: { profileId: ownerProfileId },
      });
      expect(Number(walletAfter.balance)).toBe(500_000);

      // Withdrawal transaction status is CANCELLED
      const tx = await prisma.walletTransaction.findFirstOrThrow({
        where: { referenceId: payout.id, type: "WITHDRAWAL" },
      });
      expect(tx.status).toBe("CANCELLED");
    }, 60_000);
  });
});

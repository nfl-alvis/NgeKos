/**
 * Midtrans Sandbox Staging Integration & Secure Demo Mode Test Suite.
 *
 * Menguji seluruh aspek integrasi pembayaran Midtrans Sandbox:
 * 1. Environment & Configuration Architecture (Isolasi sandbox vs prod, fail-closed, key formatting)
 * 2. Snap Transaction Creation (Server-side validation, Basic Auth, endpoint routing)
 * 3. Midtrans Core Status API (v2 status check, authorization, safe error handling)
 * 4. Webhook Notification & Signature Verification (SHA512, timingSafeEqual, tampering defense)
 * 5. Webhook Idempotency & DB Updates (Atomic settlement, double-spend prevention, audit logs)
 * 6. Owner Subscription Snap Flow (Pencegahan bypass langganan gratis, pending payment, Snap token)
 * 7. Lockdown Simulasi Pembayaran (Penonaktifan /api/payments/simulate di staging dan production)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

// Hoisted mocks for database, headers, and services
const h = vi.hoisted(() => {
  const store = new Map<string, { name: string; value: string }>();

  const mockBooking = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  const mockPayment = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };

  const mockRoomUnit = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockSubscription = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockSubscriptionPlan = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  };

  const mockProfile = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  const mockAuditLog = {
    create: vi.fn(),
  };

  const prismaModels = {
    booking: mockBooking,
    payment: mockPayment,
    roomUnit: mockRoomUnit,
    subscription: mockSubscription,
    subscriptionPlan: mockSubscriptionPlan,
    profile: mockProfile,
    auditLog: mockAuditLog,
  };

  return {
    store,
    prismaModels,
    mockBooking,
    mockPayment,
    mockRoomUnit,
    mockSubscription,
    mockSubscriptionPlan,
    mockProfile,
    mockAuditLog,
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [...h.store.values()],
    get: (name: string) => h.store.get(name),
    set: (name: string, value: string) => {
      h.store.set(name, { name, value });
    },
    delete: (name: string) => {
      h.store.delete(name);
    },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...h.prismaModels,
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: unknown) => unknown)(h.prismaModels);
      }
      return arg;
    }),
  },
}));

import {
  getAppEnv,
  getMidtransConfig,
  isMidtransMockMode,
  createSnapTransaction,
  getMidtransTransactionStatus,
  verifyMidtransNotification,
  type MidtransNotificationPayload,
} from "@/server/midtrans";
import { POST as webhookPOST } from "@/app/api/payments/midtrans/webhook/route";
import { POST as statusPOST } from "@/app/api/payments/midtrans/status/route";
import { POST as simulatePOST } from "@/app/api/payments/simulate/route";
import { POST as subscriptionPOST } from "@/app/api/owner/subscription/route";
import { registerLocalUser, setSessionCookie } from "@/server/user-store";

describe("Midtrans Sandbox Staging Integration & Secure Demo Mode", () => {
  const originalEnv = { ...process.env };
  const SANDBOX_SERVER_KEY = "SB-Mid-server-DemoSandboxSecretKey123456";
  const SANDBOX_CLIENT_KEY = "SB-Mid-client-DemoSandboxClientKey123456";
  const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
  const TEST_OWNER_ID = "22222222-2222-4222-8222-222222222222";
  const TEST_BOOKING_ID = "44444444-4444-4444-8444-444444444444";

  beforeEach(() => {
    vi.clearAllMocks();
    h.store.clear();
    process.env = { ...originalEnv };
    process.env.APP_ENV = "test";
    process.env.MIDTRANS_SERVER_KEY = SANDBOX_SERVER_KEY;
    process.env.MIDTRANS_CLIENT_KEY = SANDBOX_CLIENT_KEY;
    process.env.MIDTRANS_IS_PRODUCTION = "false";
    process.env.SESSION_SECRET = "test-session-secret-must-be-at-least-32-chars-long";
    process.env.APP_ORIGIN = "http://localhost:3000";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loginAs(actor: { id: string; email: string; role: "owner" | "seeker" | "admin"; fullName: string }) {
    h.store.clear();
    if (actor.role !== "admin") {
      registerLocalUser({
        id: actor.id,
        email: actor.email,
        password: "irrelevant-in-test",
        fullName: actor.fullName,
        role: actor.role,
      });
    }
    await setSessionCookie({ userId: actor.id, email: actor.email });
  }

  function calculateSignature(orderId: string, statusCode: string, grossAmount: string, key = SANDBOX_SERVER_KEY) {
    const raw = `${orderId}${statusCode}${grossAmount}${key}`;
    return crypto.createHash("sha512").update(raw).digest("hex");
  }

  // =========================================================================
  // 1. ENVIRONMENT & CONFIGURATION VALIDATION
  // =========================================================================
  describe("1. Environment & Configuration Architecture", () => {
    it("detects APP_ENV correctly and separates from NODE_ENV", () => {
      process.env.APP_ENV = "staging";
      (process.env as Record<string, string | undefined>).NODE_ENV = "production"; // Typical Next.js build
      expect(getAppEnv()).toBe("staging");

      process.env.APP_ENV = "production";
      expect(getAppEnv()).toBe("production");

      process.env.APP_ENV = "development";
      expect(getAppEnv()).toBe("development");

      delete process.env.APP_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      expect(getAppEnv()).toBe("test");
    });

    it("staging fail-closed: throws if MIDTRANS_IS_PRODUCTION=true in staging", () => {
      process.env.APP_ENV = "staging";
      process.env.MIDTRANS_IS_PRODUCTION = "true";
      expect(() => getMidtransConfig()).toThrowError(/Staging wajib menggunakan Midtrans Sandbox/);
    });

    it("development fail-closed: throws if MIDTRANS_IS_PRODUCTION=true in development", () => {
      process.env.APP_ENV = "development";
      process.env.MIDTRANS_IS_PRODUCTION = "true";
      expect(() => getMidtransConfig()).toThrowError(/dilarang mengaktifkan MIDTRANS_IS_PRODUCTION=true/);
    });

    it("production fail-closed: throws if MIDTRANS_IS_PRODUCTION=false in production", () => {
      process.env.APP_ENV = "production";
      process.env.MIDTRANS_IS_PRODUCTION = "false";
      expect(() => getMidtransConfig()).toThrowError(/mewajibkan MIDTRANS_IS_PRODUCTION=true/);
    });

    it("key isolation: rejects sandbox key in production environment", () => {
      process.env.APP_ENV = "production";
      process.env.MIDTRANS_IS_PRODUCTION = "true";
      process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-shouldnotbeinprod";
      expect(() => getMidtransConfig()).toThrowError(/tidak boleh menggunakan Server Key Sandbox/);
    });

    it("key validation: rejects malformed server key format", () => {
      process.env.APP_ENV = "staging";
      process.env.MIDTRANS_IS_PRODUCTION = "false";
      process.env.MIDTRANS_SERVER_KEY = "RandomUnknownSecretKeyWithoutMidtransPrefix";
      expect(() => getMidtransConfig()).toThrowError(/Format MIDTRANS_SERVER_KEY tidak valid/);
    });

    it("mock mode forbidden: rejects MIDTRANS_SANDBOX_MOCK=true in staging", () => {
      process.env.APP_ENV = "staging";
      process.env.MIDTRANS_IS_PRODUCTION = "false";
      process.env.MIDTRANS_SANDBOX_MOCK = "true";
      expect(() => getMidtransConfig()).toThrowError(/dilarang di lingkungan staging/);
      expect(isMidtransMockMode()).toBe(false);
    });

    it("correctly routes to Sandbox Snap & Core API URLs in staging", () => {
      process.env.APP_ENV = "staging";
      process.env.MIDTRANS_IS_PRODUCTION = "false";
      const config = getMidtransConfig();
      expect(config.isProduction).toBe(false);
      expect(config.snapUrl).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
      expect(config.coreApiUrl).toBe("https://api.sandbox.midtrans.com");
      expect(config.mockMode).toBe(false);
    });
  });

  // =========================================================================
  // 2. SIGNATURE VERIFICATION & INTEGRITY
  // =========================================================================
  describe("2. Midtrans Notification Signature Verification", () => {
    it("verifies authentic SHA-512 notification signature using timingSafeEqual", () => {
      const orderId = `BOOK-${TEST_BOOKING_ID}-1730000000`;
      const statusCode = "200";
      const grossAmount = "2500000.00";
      const signatureKey = calculateSignature(orderId, statusCode, grossAmount);

      const payload: MidtransNotificationPayload = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
        transaction_status: "settlement",
      };

      expect(verifyMidtransNotification(payload)).toBe(true);
    });

    it("rejects tampered gross_amount (signature mismatch)", () => {
      const orderId = `BOOK-${TEST_BOOKING_ID}-1730000000`;
      const signatureKey = calculateSignature(orderId, "200", "2500000.00");

      const payload: MidtransNotificationPayload = {
        order_id: orderId,
        status_code: "200",
        gross_amount: "50000.00", // Attacker manipulated amount
        signature_key: signatureKey,
        transaction_status: "settlement",
      };

      expect(verifyMidtransNotification(payload)).toBe(false);
    });

    it("rejects tampered order_id (spoofed transaction)", () => {
      const signatureKey = calculateSignature("BOOK-original-123", "200", "2500000.00");

      const payload: MidtransNotificationPayload = {
        order_id: "BOOK-tampered-123",
        status_code: "200",
        gross_amount: "2500000.00",
        signature_key: signatureKey,
        transaction_status: "settlement",
      };

      expect(verifyMidtransNotification(payload)).toBe(false);
    });

    it("rejects invalid signature string safely without throwing unhandled exceptions", () => {
      const payload: MidtransNotificationPayload = {
        order_id: "BOOK-1",
        status_code: "200",
        gross_amount: "1000",
        signature_key: "not-a-valid-hex-and-wrong-length",
        transaction_status: "settlement",
      };

      expect(verifyMidtransNotification(payload)).toBe(false);
    });
  });

  // =========================================================================
  // 3. SNAP TRANSACTION CREATION & API CALLS
  // =========================================================================
  describe("3. Snap Transaction Creation & Status API Client", () => {
    it("creates Snap transaction with server-validated amount and Basic Auth", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "snap-token-abc123xyz",
          redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc123xyz",
        }),
      });
      global.fetch = mockFetch;

      const result = await createSnapTransaction({
        orderId: "BOOK-101-1730000000",
        grossAmount: 1500000,
        customerDetails: {
          first_name: "Budi",
          email: "budi@example.com",
        },
        itemDetails: [
          {
            id: "room-type-1",
            name: "Kost Melati Kamar 1",
            price: 1500000,
            quantity: 1,
          },
        ],
      });

      expect(result.token).toBe("snap-token-abc123xyz");
      expect(result.redirect_url).toContain("app.sandbox.midtrans.com");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://app.sandbox.midtrans.com/snap/v1/transactions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from(`${SANDBOX_SERVER_KEY}:`).toString("base64")}`,
          }),
        })
      );
    });

    it("fetches transaction status from Core API endpoint securely", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: "200",
          status_message: "Success, transaction is found",
          transaction_id: "midtrans-tx-999",
          order_id: "BOOK-101-1730000000",
          gross_amount: "1500000.00",
          payment_type: "bank_transfer",
          transaction_time: "2026-11-04 12:00:00",
          transaction_status: "settlement",
        }),
      });
      global.fetch = mockFetch;

      const status = await getMidtransTransactionStatus("BOOK-101-1730000000");
      expect(status.transaction_status).toBe("settlement");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.sandbox.midtrans.com/v2/BOOK-101-1730000000/status",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from(`${SANDBOX_SERVER_KEY}:`).toString("base64")}`,
          }),
        })
      );
    });
  });

  // =========================================================================
  // 4. WEBHOOK PROCESSING, IDEMPOTENCY & DB SETTLEMENT
  // =========================================================================
  describe("4. Webhook Notification Handler & Idempotent Settlement", () => {
    it("rejects webhook notification with invalid signature (401)", async () => {
      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: `BOOK-${TEST_BOOKING_ID}-1730000000`,
          status_code: "200",
          gross_amount: "1500000.00",
          signature_key: "0000000000000000000000000000000000000000000000000000000000000000",
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.error).toBe("Invalid Midtrans signature");
    });

    it("rejects webhook when gross_amount does not match internal booking amount (400)", async () => {
      const orderId = `BOOK-${TEST_BOOKING_ID}-1730000000`;
      const statusCode = "200";
      const tamperedAmount = "10000.00"; // Fake underpayment
      const signatureKey = calculateSignature(orderId, statusCode, tamperedAmount);

      h.mockBooking.findFirst.mockResolvedValue({
        id: TEST_BOOKING_ID,
        depositSnapshot: null,
        monthlyPriceSnapshot: new Prisma.Decimal(2500000), // Real expected amount is 2.5jt
      });

      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: tamperedAmount,
          signature_key: signatureKey,
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toBe("Gross amount mismatch");
      expect(h.mockPayment.create).not.toHaveBeenCalled();
    });

    it("settles booking atomically and writes audit log upon settlement", async () => {
      const orderId = `BOOK-${TEST_BOOKING_ID}-1730000000`;
      const statusCode = "200";
      const amount = "2500000.00";
      const signatureKey = calculateSignature(orderId, statusCode, amount);

      h.mockBooking.findFirst.mockResolvedValue({
        id: TEST_BOOKING_ID,
        depositSnapshot: null,
        monthlyPriceSnapshot: new Prisma.Decimal(2500000),
      });

      h.mockBooking.findUnique.mockResolvedValue({
        id: TEST_BOOKING_ID,
        status: "APPROVED_AWAITING_PAYMENT",
        roomUnitId: "unit-101",
        propertyId: "prop-1",
        roomTypeId: "rt-1",
        applicantId: TEST_USER_ID,
      });

      h.mockRoomUnit.update.mockResolvedValue({});
      h.mockPayment.findUnique.mockResolvedValue(null);
      h.mockPayment.create.mockResolvedValue({ id: "pay-new-uuid" });
      h.mockProfile.findUnique.mockResolvedValue(null);
      h.mockAuditLog.create.mockResolvedValue({ id: "audit-1" });

      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: amount,
          signature_key: signatureKey,
          transaction_status: "settlement",
          payment_type: "bca_va",
        }),
      });

      const res = await webhookPOST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      expect(h.mockBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_BOOKING_ID },
          data: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
      expect(h.mockRoomUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "unit-101" },
          data: { status: "OCCUPIED" },
        })
      );
      expect(h.mockPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: TEST_BOOKING_ID,
            status: "VERIFIED",
            midtransOrderId: orderId,
          }),
        })
      );
      expect(h.mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "payment.settle",
            entityType: "payment",
          }),
        })
      );
    });

    it("settles subscription payment (SUB-*) atomically and activates owner plan", async () => {
      const orderId = `SUB-${TEST_OWNER_ID.slice(0, 8)}-professional-1730000000`;
      const statusCode = "200";
      const amount = "249000.00";
      const signatureKey = calculateSignature(orderId, statusCode, amount);

      h.mockPayment.findUnique.mockResolvedValue({
        id: "pay-sub-1",
        amount: new Prisma.Decimal(249000),
        status: "PENDING",
        recordedById: TEST_OWNER_ID,
      });

      h.mockSubscriptionPlan.findUnique.mockResolvedValue({
        id: "plan-pro-id",
        code: "professional",
        name: "Professional",
        priceMonthly: new Prisma.Decimal(249000),
      });

      h.mockSubscription.findFirst.mockResolvedValue({
        id: "sub-1",
        ownerId: TEST_OWNER_ID,
        status: "TRIAL",
      });
      h.mockSubscription.update.mockResolvedValue({ id: "sub-1", status: "ACTIVE" });
      h.mockPayment.update.mockResolvedValue({ id: "pay-sub-1", status: "VERIFIED" });
      h.mockAuditLog.create.mockResolvedValue({ id: "audit-sub-1" });

      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: amount,
          signature_key: signatureKey,
          transaction_status: "settlement",
          payment_type: "gopay",
        }),
      });

      const res = await webhookPOST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      expect(h.mockSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub-1" },
          data: expect.objectContaining({
            planId: "plan-pro-id",
            status: "ACTIVE",
          }),
        })
      );
      expect(h.mockPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-sub-1" },
          data: expect.objectContaining({ status: "VERIFIED" }),
        })
      );
      expect(h.mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "subscription.paid",
            entityType: "subscription",
          }),
        })
      );
    });

    it("idempotency: replaying settlement webhook returns 200 without duplicate creation", async () => {
      const orderId = `BOOK-${TEST_BOOKING_ID}-1730000000`;
      const statusCode = "200";
      const amount = "2500000.00";
      const signatureKey = calculateSignature(orderId, statusCode, amount);

      h.mockBooking.findFirst.mockResolvedValue({
        id: TEST_BOOKING_ID,
        depositSnapshot: null,
        monthlyPriceSnapshot: new Prisma.Decimal(2500000),
      });

      // Booking is already ACTIVE
      h.mockBooking.findUnique.mockResolvedValue({
        id: TEST_BOOKING_ID,
        status: "ACTIVE",
        roomUnitId: "unit-101",
        applicantId: TEST_USER_ID,
      });

      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: amount,
          signature_key: signatureKey,
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(h.mockPayment.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. OWNER SUBSCRIPTION MIDTRANS SNAP INTEGRATION
  // =========================================================================
  describe("5. Owner Subscription Midtrans Snap Flow & Anti-Bypass", () => {
    it("paid plan requires Midtrans Snap checkout and does NOT activate for free", async () => {
      await loginAs({
        id: TEST_OWNER_ID,
        email: "juragan@ngekost.id",
        role: "owner",
        fullName: "Juragan Kos",
      });

      h.mockSubscriptionPlan.findMany.mockResolvedValue([
        {
          id: "plan-pro-id",
          code: "professional",
          name: "Professional",
          priceMonthly: new Prisma.Decimal(249000),
          maxProperties: 10,
          maxRooms: 60,
          advancedAnalytics: true,
          active: true,
        },
      ]);

      h.mockSubscription.findFirst.mockResolvedValue({
        id: "sub-1",
        ownerId: TEST_OWNER_ID,
        status: "TRIAL",
        plan: { code: "starter", name: "Starter", priceMonthly: 99000 },
      });

      // Mock snap transaction API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token: "snap-sub-token-123",
          redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-sub-token-123",
        }),
      });

      h.mockPayment.create.mockResolvedValue({ id: "pay-sub-pending" });
      h.mockPayment.update.mockResolvedValue({ id: "pay-sub-pending" });

      const req = new Request("http://localhost:3000/api/owner/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          action: "change_plan",
          planId: "plan-pro-id",
        }),
      });

      const res = await subscriptionPOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.requiresPayment).toBe(true);
      expect(json.data.token).toBe("snap-sub-token-123");
      expect(json.data.redirectUrl).toContain("app.sandbox.midtrans.com");
      expect(json.data.orderId).toContain("SUB-");

      // Verifikasi payment tercatat PENDING dan subscription TIDAK langsung ACTIVE
      expect(h.mockPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PENDING",
            method: "MIDTRANS",
            amount: expect.anything(),
          }),
        })
      );
      expect(h.mockSubscription.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. PAYMENT SIMULATION LOCKOUT ENFORCEMENT
  // =========================================================================
  describe("6. Payment Simulation Lockout (/api/payments/simulate)", () => {
    it("returns 403 Forbidden in staging environment", async () => {
      await loginAs({
        id: TEST_USER_ID,
        email: "seeker@ngekost.id",
        role: "seeker",
        fullName: "Seeker",
      });
      process.env.APP_ENV = "staging";

      const req = new Request("http://localhost:3000/api/payments/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ bookingId: TEST_BOOKING_ID }),
      });

      const res = await simulatePOST(req);
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.error.code).toBe("SIMULATION_DISABLED");
    });

    it("returns 403 Forbidden in production environment", async () => {
      await loginAs({
        id: TEST_USER_ID,
        email: "seeker@ngekost.id",
        role: "seeker",
        fullName: "Seeker",
      });
      process.env.APP_ENV = "production";

      const req = new Request("http://localhost:3000/api/payments/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ bookingId: TEST_BOOKING_ID }),
      });

      const res = await simulatePOST(req);
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.error.code).toBe("SIMULATION_DISABLED");
    });

    it("returns 403 Forbidden if NODE_ENV is production", async () => {
      await loginAs({
        id: TEST_USER_ID,
        email: "seeker@ngekost.id",
        role: "seeker",
        fullName: "Seeker",
      });
      process.env.APP_ENV = "development";
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";

      const req = new Request("http://localhost:3000/api/payments/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ bookingId: TEST_BOOKING_ID }),
      });

      const res = await simulatePOST(req);
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.error.code).toBe("SIMULATION_DISABLED");
    });
  });

  // =========================================================================
  // 7. MIDTRANS STATUS CHECK API
  // =========================================================================
  describe("7. Status Verification Endpoint (/api/payments/midtrans/status)", () => {
    it("returns 401 for unauthenticated requests", async () => {
      const req = new Request("http://localhost:3000/api/payments/midtrans/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ orderId: `BOOK-${TEST_BOOKING_ID}-1730000000` }),
      });

      const res = await statusPOST(req);
      expect(res.status).toBe(401);
    });

    it("synchronizes transaction status and settles booking when verified", async () => {
      await loginAs({
        id: TEST_USER_ID,
        email: "seeker@ngekost.id",
        role: "seeker",
        fullName: "Penyewa Asli",
      });
      const orderId = `BOOK-${TEST_BOOKING_ID}-1730000000`;

      // Mock Midtrans Core API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status_code: "200",
          status_message: "Success",
          transaction_id: "tx-status-123",
          order_id: orderId,
          gross_amount: "2500000.00",
          payment_type: "bca_va",
          transaction_status: "settlement",
        }),
      });

      h.mockBooking.findFirst.mockResolvedValue({
        id: TEST_BOOKING_ID,
        applicantId: TEST_USER_ID,
        property: { ownerId: TEST_OWNER_ID },
      });

      h.mockBooking.findUnique.mockResolvedValue({
        id: TEST_BOOKING_ID,
        status: "APPROVED_AWAITING_PAYMENT",
        roomUnitId: "unit-101",
        propertyId: "prop-1",
        applicantId: TEST_USER_ID,
      });

      h.mockRoomUnit.update.mockResolvedValue({});
      h.mockPayment.findUnique.mockResolvedValue(null);
      h.mockPayment.create.mockResolvedValue({ id: "pay-settled" });
      h.mockAuditLog.create.mockResolvedValue({ id: "audit-settled" });

      const req = new Request("http://localhost:3000/api/payments/midtrans/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ orderId }),
      });

      const res = await statusPOST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.settled).toBe(true);
      expect(json.data.transactionStatus).toBe("settlement");
    });
  });
});

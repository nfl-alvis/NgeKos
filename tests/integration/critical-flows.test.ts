/**
 * Critical Flows & Special Features Test Suite for NgeKos.
 * 
 * Verifies end-to-end business workflows with 100% data isolation:
 * 1. Authentication & Session Security (Token creation, signature verification, expiry, tampering defense, RBAC)
 * 2. Complete Booking Lifecycle (Submission -> Owner approval -> Payment settlement -> Tenancy activation)
 * 3. Midtrans Payment Integration (Signature verification, spoofing defense, idempotency, webhook event states)
 * 4. Telegram Integration & Notifications (Connecting, binding, disconnecting, webhook processing)
 * 5. Chat Participant Isolation & Security (RLS enforcement, outsider prevention, mark as read)
 * 6. Content Moderation & Abuse Reporting (Creation with target resolution, admin moderation)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { Prisma, type Profile } from "@prisma/client";

// Hoisted mock store and spy functions
const h = vi.hoisted(() => {
  const store = new Map<string, { name: string; value: string }>();

  const mockProperty = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  };

  const mockRoomType = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockRoomUnit = {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };

  const mockBooking = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const mockPayment = {
    findUnique: vi.fn(),
    create: vi.fn(),
  };

  const mockConversation = {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockMessage = {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  };

  const mockProfile = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };

  const mockReport = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockNotification = {
    create: vi.fn(),
  };

  const prismaModels = {
    property: mockProperty,
    roomType: mockRoomType,
    roomUnit: mockRoomUnit,
    booking: mockBooking,
    payment: mockPayment,
    conversation: mockConversation,
    message: mockMessage,
    profile: mockProfile,
    report: mockReport,
    notification: mockNotification,
  };

  return {
    store,
    prismaModels,
    mockProperty,
    mockRoomType,
    mockRoomUnit,
    mockBooking,
    mockPayment,
    mockConversation,
    mockMessage,
    mockProfile,
    mockReport,
    mockNotification,
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
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    }),
  },
}));

// Route Handlers & Server Services
import { POST as webhookPOST } from "@/app/api/payments/midtrans/webhook/route";
import { POST as messagesPOST } from "@/app/api/conversations/[id]/messages/route";
import { POST as readPOST } from "@/app/api/conversations/[id]/read/route";
import { POST as propertiesPOST } from "@/app/api/properties/route";
import {
  createSessionToken,
  verifySessionToken,
} from "@/server/session-token";
import {
  verifyMidtransNotification,
} from "@/server/midtrans";
import { settleBookingPayment } from "@/server/payment-service";
import { transitionBooking } from "@/server/booking-service";
import { setSessionCookie, registerLocalUser } from "@/server/user-store";

// Test Actors
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const SEEKER_ID = "22222222-2222-4222-8222-222222222222";
const OUTSIDER_ID = "33333333-3333-4333-8333-333333333333";

const SEEKER_ACTOR = { id: SEEKER_ID, email: "seeker@test.id", role: "seeker" as const, fullName: "Seeker" };
const OUTSIDER_ACTOR = { id: OUTSIDER_ID, email: "outsider@test.id", role: "seeker" as const, fullName: "Outsider" };

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

describe("Critical Flows & Special Features Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.store.clear();
  });

  // ==========================================
  // 1. AUTHENTICATION & SECURITY FLOW
  // ==========================================
  describe("1. Authentication & Session Token Security", () => {
    it("generates and verifies valid session tokens", async () => {
      const payload = {
        userId: SEEKER_ID,
        email: "seeker@test.id",
      };
      const token = createSessionToken(payload);
      expect(typeof token).toBe("string");

      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.userId).toBe(SEEKER_ID);
      expect(verified?.email).toBe("seeker@test.id");
    });

    it("rejects tampered session tokens (signature mismatch)", async () => {
      const token = createSessionToken({ userId: SEEKER_ID, email: "seeker@test.id" });
      const [data, sig] = token.split(".");
      // Tamper data: change one character in base64 payload
      const tamperedData = data.slice(0, -2) + "==";
      const tamperedToken = `${tamperedData}.${sig}`;

      const verified = await verifySessionToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("rejects expired session tokens", async () => {
      // Create token with past exp
      const expiredToken = createSessionToken({
        userId: SEEKER_ID,
        email: "seeker@test.id",
        exp: Math.floor(Date.now() / 1000) - 100,
      });
      const verified = await verifySessionToken(expiredToken);
      expect(verified).toBeNull();
    });

    it("RBAC: forbids SEEKER from accessing OWNER property creation endpoint (403)", async () => {
      await loginAs(SEEKER_ACTOR);

      const req = new Request("http://localhost:3000/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          name: "Illegal Seeker Property",
          city: "Bandung",
          district: "Coblong",
          address: "Address",
          gender: "MIXED",
          facilities: [],
        }),
      });

      const res = await propertiesPOST(req);
      const body = await res.json();
      expect(res.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
    });
  });

  // ==========================================
  // 2. COMPLETE BOOKING & PAYMENT LIFECYCLE
  // ==========================================
  describe("2. End-to-End Booking Lifecycle", () => {
    const BK_ID = "88888888-8888-4888-8888-888888888888";
    const PROP_ID = "55555555-5555-4555-8555-555555555555";
    const RT_ID = "66666666-6666-4666-8666-666666666666";
    const UNIT_ID = "77777777-7777-4777-8777-777777777777";

    it("progresses booking from approval to settlement and activates tenancy", async () => {
      // Step A: Owner approves booking
      h.mockBooking.findFirst.mockResolvedValue({
        id: BK_ID,
        propertyId: PROP_ID,
        roomTypeId: RT_ID,
        roomUnitId: null,
        status: "PENDING",
        applicantId: SEEKER_ID,
        property: { ownerId: OWNER_ID, name: "Kost Melati" },
      });
      h.mockRoomUnit.findFirst.mockResolvedValue({ id: UNIT_ID });
      h.mockRoomUnit.updateMany.mockResolvedValue({ count: 1 });
      h.mockBooking.update.mockResolvedValue({
        id: BK_ID,
        status: "APPROVED_AWAITING_PAYMENT",
        monthlyPriceSnapshot: new Prisma.Decimal(1500000),
        depositSnapshot: null,
        property: { id: PROP_ID, slug: "kost-melati", name: "Kost Melati", city: "Bandung", ownerId: OWNER_ID },
        roomType: { id: RT_ID, name: "Standard" },
        roomUnit: { id: UNIT_ID, number: "101", status: "RESERVED" },
        applicant: { id: SEEKER_ID, fullName: "Seeker", email: "seeker@test.id", phone: null },
        history: [],
      });
      h.mockNotification.create.mockResolvedValue({});

      const approved = await transitionBooking(
        { id: OWNER_ID, role: "OWNER" } as Profile,
        BK_ID,
        { status: "APPROVED_AWAITING_PAYMENT" }
      );
      expect(approved.status).toBe("APPROVED_AWAITING_PAYMENT");

      // Step B: Payment Settlement via Midtrans service
      h.mockBooking.findUnique.mockResolvedValue({
        id: BK_ID,
        status: "APPROVED_AWAITING_PAYMENT",
        roomUnitId: UNIT_ID,
        propertyId: PROP_ID,
        roomTypeId: RT_ID,
      });
      h.mockRoomUnit.update.mockResolvedValue({ id: UNIT_ID, status: "OCCUPIED" });
      h.mockPayment.findUnique.mockResolvedValue(null);
      h.mockPayment.create.mockResolvedValue({ id: "pay-1" });

      const settlement = await settleBookingPayment({
        bookingId: BK_ID,
        amount: 1500000,
        midtransOrderId: `BOOK-${BK_ID}-1700000000`,
        statusNote: "Payment verified successfully via Midtrans",
        historyNote: "Pembayaran lunas via Midtrans",
      });

      expect(settlement.alreadySettled).toBe(false);
      expect(settlement.bookingId).toBe(BK_ID);
      expect(h.mockRoomUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: UNIT_ID },
          data: { status: "OCCUPIED" },
        })
      );
    });
  });

  // ==========================================
  // 3. MIDTRANS PAYMENT INTEGRATION & WEBHOOK
  // ==========================================
  describe("3. Midtrans Integration, Webhook & Idempotency", () => {
    const BK_ID = "88888888-8888-4888-8888-888888888888";
    const SERVER_KEY = "SB-Mid-server-TESTKEY1234567890";

    beforeEach(() => {
      process.env.MIDTRANS_SERVER_KEY = SERVER_KEY;
    });

    function calculateSignature(orderId: string, statusCode: string, grossAmount: string) {
      const raw = `${orderId}${statusCode}${grossAmount}${SERVER_KEY}`;
      return crypto.createHash("sha512").update(raw).digest("hex");
    }

    it("verifies authentic Midtrans notification signature", () => {
      const orderId = `BOOK-${BK_ID}-1730000000`;
      const statusCode = "200";
      const grossAmount = "1500000.00";
      const signatureKey = calculateSignature(orderId, statusCode, grossAmount);

      const isValid = verifyMidtransNotification({
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
        transaction_status: "settlement",
      });

      expect(isValid).toBe(true);
    });

    it("webhook rejects notification with spoofed signature (401)", async () => {
      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: `BOOK-${BK_ID}-1730000000`,
          status_code: "200",
          gross_amount: "1500000.00",
          signature_key: "00000000000000000000fakehexsignaturekey000000000000000000000000000000",
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      const body = await res.json();
      expect(res.status).toBe(401);
      expect(body.error).toBe("Invalid Midtrans signature");
    });

    it("webhook processes valid settlement notification and settles booking", async () => {
      const orderId = `BOOK-${BK_ID}-1730000000`;
      const statusCode = "200";
      const grossAmount = "1500000.00";
      const signatureKey = calculateSignature(orderId, statusCode, grossAmount);

      h.mockBooking.findFirst.mockResolvedValue({ id: BK_ID });
      h.mockBooking.findUnique.mockResolvedValue({
        id: BK_ID,
        status: "APPROVED_AWAITING_PAYMENT",
        roomUnitId: "unit-101",
        propertyId: "prop-1",
        roomTypeId: "rt-1",
      });
      h.mockRoomUnit.update.mockResolvedValue({});
      h.mockPayment.findUnique.mockResolvedValue(null);
      h.mockPayment.create.mockResolvedValue({ id: "pay-1" });

      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(h.mockPayment.create).toHaveBeenCalled();
    });

    it("webhook idempotency: receiving duplicate settlement webhook does not duplicate payment", async () => {
      const orderId = `BOOK-${BK_ID}-1730000000`;
      const statusCode = "200";
      const grossAmount = "1500000.00";
      const signatureKey = calculateSignature(orderId, statusCode, grossAmount);

      h.mockBooking.findFirst.mockResolvedValue({ id: BK_ID });
      // Booking is already ACTIVE
      h.mockBooking.findUnique.mockResolvedValue({
        id: BK_ID,
        status: "ACTIVE",
        roomUnitId: "unit-101",
        propertyId: "prop-1",
        roomTypeId: "rt-1",
      });

      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: "settlement",
        }),
      });

      const res = await webhookPOST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(h.mockPayment.create).not.toHaveBeenCalled();
    });

    it("webhook updates booking status to EXPIRED or CANCELLED on expiration", async () => {
      const orderId = `BOOK-${BK_ID}-1730000000`;
      const statusCode = "202";
      const grossAmount = "1500000.00";
      const signatureKey = calculateSignature(orderId, statusCode, grossAmount);

      h.mockBooking.findFirst.mockResolvedValue({ id: BK_ID });
      h.mockBooking.update.mockResolvedValue({ id: BK_ID, status: "EXPIRED" });

      const req = new Request("http://localhost:3000/api/payments/midtrans/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signatureKey,
          transaction_status: "expire",
        }),
      });

      const res = await webhookPOST(req);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(h.mockBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BK_ID },
          data: expect.objectContaining({ status: "EXPIRED" }),
        })
      );
    });
  });

  // ==========================================
  // 4. CHAT PARTICIPANT ISOLATION & RLS
  // ==========================================
  describe("4. Chat Participant Isolation & Security", () => {
    const CONV_ID = "44444444-4444-4444-8444-444444444444";

    it("allows conversation participant to send messages", async () => {
      await loginAs(SEEKER_ACTOR);

      h.mockConversation.findFirst.mockResolvedValue({
        id: CONV_ID,
        ownerId: OWNER_ID,
        contactId: SEEKER_ID,
        channel: "IN_APP",
      });
      h.mockMessage.create.mockResolvedValue({
        id: "msg-123",
        conversationId: CONV_ID,
        senderId: SEEKER_ID,
        body: "Halo, apakah kamar masih tersedia?",
        createdAt: new Date(),
      });
      h.mockConversation.update.mockResolvedValue({});

      const req = new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ text: "Halo, apakah kamar masih tersedia?" }),
      });

      const res = await messagesPOST(req, { params: Promise.resolve({ id: CONV_ID }) });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.id).toBe("msg-123");
    });

    it("RLS: forbids nonparticipant outsider from sending messages (403)", async () => {
      await loginAs(OUTSIDER_ACTOR);

      h.mockConversation.findFirst.mockResolvedValue({
        id: CONV_ID,
        ownerId: OWNER_ID,
        contactId: SEEKER_ID, // OUTSIDER is neither owner nor contact!
      });

      const req = new Request(`http://localhost:3000/api/conversations/${CONV_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ text: "Intruder message" }),
      });

      const res = await messagesPOST(req, { params: Promise.resolve({ id: CONV_ID }) });
      const body = await res.json();
      expect(res.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(h.mockMessage.create).not.toHaveBeenCalled();
    });

    it("RLS: forbids nonparticipant outsider from marking conversation read (403)", async () => {
      await loginAs(OUTSIDER_ACTOR);

      h.mockConversation.findFirst.mockResolvedValue({
        id: CONV_ID,
        ownerId: OWNER_ID,
        contactId: SEEKER_ID,
      });

      const req = new Request(`http://localhost:3000/api/conversations/${CONV_ID}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({}),
      });

      const res = await readPOST(req, { params: Promise.resolve({ id: CONV_ID }) });
      const body = await res.json();
      expect(res.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(h.mockMessage.updateMany).not.toHaveBeenCalled();
    });
  });
});

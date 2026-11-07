import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Profile } from "@prisma/client";
import { ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";

// Hoisted mock store and spy functions
const h = vi.hoisted(() => {
  const authState = {
    currentProfile: null as Profile | null,
  };

  const mockRefundRequest = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockBooking = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockPayment = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  };

  const mockRoomUnit = {
    update: vi.fn(),
  };

  const mockProfile = {
    findUnique: vi.fn(),
  };

  const mockAuditLog = {
    create: vi.fn(),
  };

  const mockNotification = {
    create: vi.fn(),
  };

  const prismaModels = {
    refundRequest: mockRefundRequest,
    booking: mockBooking,
    payment: mockPayment,
    roomUnit: mockRoomUnit,
    profile: mockProfile,
    auditLog: mockAuditLog,
    notification: mockNotification,
  };

  return {
    authState,
    prismaModels,
    mockRefundRequest,
    mockBooking,
    mockPayment,
    mockRoomUnit,
    mockProfile,
    mockAuditLog,
    mockNotification,
  };
});

// Mock @/server/auth
vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/auth")>();
  return {
    ...actual,
    requireUser: vi.fn().mockImplementation(async (allowedRoles?: readonly string[]) => {
      if (!h.authState.currentProfile) {
        throw new ApiError(401, "UNAUTHENTICATED", "Please sign in first");
      }
      if (allowedRoles && !allowedRoles.includes(h.authState.currentProfile.role)) {
        throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
      }
      return {
        authUser: { id: h.authState.currentProfile.id, email: h.authState.currentProfile.email },
        profile: h.authState.currentProfile,
      };
    }),
    getAuthContext: vi.fn().mockImplementation(async () => {
      if (!h.authState.currentProfile) return null;
      return {
        authUser: { id: h.authState.currentProfile.id, email: h.authState.currentProfile.email },
        profile: h.authState.currentProfile,
      };
    }),
  };
});

// Mock prisma
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

describe("Backend Refund Management Test Suite", () => {
  const adminProfile: Profile = {
    id: "a1111111-1111-1111-1111-111111111111",
    email: "admin@ngekost.id",
    fullName: "Bayu Pratama (Admin Demo)",
    phone: "08123456789",
    avatarUrl: null,
    birthPlace: null,
    occupation: null,
    role: "ADMIN",
    adminRole: "FINANCE",
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
    lastSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const seekerProfile1: Profile = {
    ...adminProfile,
    id: "e2e00000-0000-4000-8000-000000000001",
    email: "seeker1@ngekost.id",
    fullName: "Budi Seeker",
    role: "SEEKER",
    adminRole: null,
  };

  const seekerProfile2: Profile = {
    ...adminProfile,
    id: "e2e00000-0000-4000-8000-000000000002",
    email: "seeker2@ngekost.id",
    fullName: "Siti Seeker",
    role: "SEEKER",
    adminRole: null,
  };

  const sampleBookingId = "b1111111-1111-4111-8111-111111111111";
  const samplePaymentId = "c1111111-1111-4111-8111-111111111111";
  const sampleRefundId = "d1111111-1111-4111-8111-111111111111";

  const sampleBooking = {
    id: sampleBookingId,
    code: "BK-261103-ABCD",
    applicantId: seekerProfile1.id,
    status: "ACTIVE",
    roomUnitId: "u1111111-1111-1111-1111-111111111111",
    property: {
      id: "prop-1",
      name: "Kost Pangeran Diponegoro",
      slug: "kost-pangeran-diponegoro",
    },
    applicant: {
      id: seekerProfile1.id,
      fullName: seekerProfile1.fullName,
      email: seekerProfile1.email,
      phone: seekerProfile1.phone,
    },
    payments: [
      {
        id: samplePaymentId,
        amount: new Prisma.Decimal(2500000),
        status: "VERIFIED",
        method: "MIDTRANS",
        reference: "BOOK-ABCD-123456",
        midtransOrderId: "BOOK-ABCD-123456",
        createdAt: new Date(),
      },
    ],
    refundRequests: [],
  };

  const sampleRefundRecord = {
    id: sampleRefundId,
    bookingId: sampleBookingId,
    paymentId: samplePaymentId,
    applicantId: seekerProfile1.id,
    amount: new Prisma.Decimal(2500000),
    reason: "Pindah dinas kerja mendadak ke luar kota",
    status: "PENDING",
    rejectionReason: null,
    adminNote: null,
    decidedById: null,
    decidedAt: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    booking: {
      id: sampleBookingId,
      code: "BK-261103-ABCD",
      status: "ACTIVE",
      roomUnitId: "u1111111-1111-1111-1111-111111111111",
      property: {
        id: "prop-1",
        name: "Kost Pangeran Diponegoro",
        slug: "kost-pangeran-diponegoro",
      },
      payments: [
        {
          id: samplePaymentId,
          amount: new Prisma.Decimal(2500000),
          status: "VERIFIED",
          method: "MIDTRANS",
          reference: "BOOK-ABCD-123456",
          midtransOrderId: "BOOK-ABCD-123456",
        },
      ],
    },
    applicant: {
      id: seekerProfile1.id,
      fullName: seekerProfile1.fullName,
      email: seekerProfile1.email,
      phone: seekerProfile1.phone,
    },
    decidedBy: null,
    payment: {
      id: samplePaymentId,
      amount: new Prisma.Decimal(2500000),
      method: "MIDTRANS",
      reference: "BOOK-ABCD-123456",
      midtransOrderId: "BOOK-ABCD-123456",
      status: "VERIFIED",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    h.authState.currentProfile = null;
    h.mockProfile.findUnique.mockResolvedValue({ id: adminProfile.id });
    h.mockAuditLog.create.mockResolvedValue({ id: "audit-1" });
    h.mockNotification.create.mockResolvedValue({ id: "notif-1" });
  });

  /* -------------------------------------------------------------
   * 1. Authorization & Role-Based Access Control Guards
   * ------------------------------------------------------------- */
  describe("1. Authorization & Role-Based Access Control", () => {
    it("1.1. Unauthenticated request to GET /api/admin/refunds is rejected with 401 UNAUTHENTICATED", async () => {
      h.authState.currentProfile = null;
      const { GET } = await import("@/app/api/admin/refunds/route");
      const req = new Request("http://localhost:3000/api/admin/refunds");

      const res = await GET(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHENTICATED");
    });

    it("1.2. Seeker user requesting GET /api/admin/refunds is rejected with 403 FORBIDDEN", async () => {
      h.authState.currentProfile = seekerProfile1;
      const { GET } = await import("@/app/api/admin/refunds/route");
      const req = new Request("http://localhost:3000/api/admin/refunds");

      const res = await GET(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("1.3. Seeker user attempting to patch admin decision is rejected with 403 FORBIDDEN", async () => {
      h.authState.currentProfile = seekerProfile1;
      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "APPROVED" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("1.4. Unauthenticated request to POST /api/refunds is rejected with 401 UNAUTHENTICATED", async () => {
      h.authState.currentProfile = null;
      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ bookingId: sampleBookingId, reason: "Batal karena alasan pribadi" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  /* -------------------------------------------------------------
   * 2. Seeker Refund Request Creation & Boundary Validations
   * ------------------------------------------------------------- */
  describe("2. Seeker Refund Request Creation & Validations", () => {
    it("2.1. Rejects refund request for non-existent booking with 404 BOOKING_NOT_FOUND", async () => {
      h.authState.currentProfile = seekerProfile1;
      h.mockBooking.findFirst.mockResolvedValue(null);
      h.mockBooking.findUnique.mockResolvedValue(null);

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ bookingId: sampleBookingId, reason: "Alasan pindah tempat kerja" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe("BOOKING_NOT_FOUND");
    });

    it("2.2. Seeker cannot request refund for another user's booking (403 FORBIDDEN)", async () => {
      h.authState.currentProfile = seekerProfile2; // Logged in as Siti
      h.mockBooking.findFirst.mockResolvedValue(sampleBooking); // Booking belongs to Budi (seeker1)
      h.mockBooking.findUnique.mockResolvedValue(sampleBooking);

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ bookingId: sampleBookingId, reason: "Mencoba refund booking orang lain" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("2.3. Rejects refund request when booking has no verified payment (400 NO_VERIFIED_PAYMENT)", async () => {
      h.authState.currentProfile = seekerProfile1;
      const noPaymentBooking = {
        ...sampleBooking,
        payments: [], // No verified payments
      };
      h.mockBooking.findFirst.mockResolvedValue(noPaymentBooking);
      h.mockBooking.findUnique.mockResolvedValue(noPaymentBooking);

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ bookingId: sampleBookingId, reason: "Belum bayar tapi minta refund" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("NO_VERIFIED_PAYMENT");
    });

    it("2.4. Rejects refund request when requested amount exceeds verified payment (422 AMOUNT_EXCEEDS_REMAINING)", async () => {
      h.authState.currentProfile = seekerProfile1;
      h.mockBooking.findFirst.mockResolvedValue(sampleBooking); // Verified payment: 2,500,000
      h.mockBooking.findUnique.mockResolvedValue(sampleBooking);

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          bookingId: sampleBookingId,
          amount: 5000000, // Exceeds verified 2,500,000!
          reason: "Meminta pengembalian lebih dari yang dibayar",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("AMOUNT_EXCEEDS_REMAINING");
    });

    it("2.5. Rejects duplicate refund request when a PENDING request already exists (409 PENDING_REFUND_EXISTS)", async () => {
      h.authState.currentProfile = seekerProfile1;
      const pendingRefundBooking = {
        ...sampleBooking,
        refundRequests: [{ id: "existing-pending", status: "PENDING", amount: new Prisma.Decimal(2500000) }],
      };
      h.mockBooking.findFirst.mockResolvedValue(pendingRefundBooking);
      h.mockBooking.findUnique.mockResolvedValue(pendingRefundBooking);

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ bookingId: sampleBookingId, reason: "Pengajuan kedua berturut-turut" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("PENDING_REFUND_EXISTS");
    });

    it("2.6. Successfully creates a valid refund request and records atomic audit log", async () => {
      h.authState.currentProfile = seekerProfile1;
      h.mockBooking.findFirst.mockResolvedValue(sampleBooking);
      h.mockBooking.findUnique.mockResolvedValue(sampleBooking);
      h.mockRefundRequest.create.mockResolvedValue(sampleRefundRecord);

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          bookingId: sampleBookingId,
          amount: 2500000,
          reason: "Pindah dinas kerja mendadak ke luar kota",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(sampleRefundId);
      expect(body.data.status).toBe("PENDING");
      expect(body.data.uiStatus).toBe("diajukan");

      // Verify audit log call
      expect(h.mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "refund.request",
            entityType: "REFUND_REQUEST",
            entityId: sampleRefundId,
          }),
        }),
      );

      // Verify notification call
      expect(h.mockNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            profileId: seekerProfile1.id,
            type: "PAYMENT",
          }),
        }),
      );
    });
  });

  /* -------------------------------------------------------------
   * 3. Admin Decision State Machine (Approve, Reject, Process)
   * ------------------------------------------------------------- */
  describe("3. Admin Decision State Machine & Concurrency Control", () => {
    it("3.1. Admin can approve a PENDING refund request", async () => {
      h.authState.currentProfile = adminProfile;
      h.mockRefundRequest.findUnique.mockResolvedValue(sampleRefundRecord);
      h.mockRefundRequest.update.mockResolvedValue({
        ...sampleRefundRecord,
        status: "APPROVED",
        decidedById: adminProfile.id,
        decidedAt: new Date(),
        decidedBy: { id: adminProfile.id, fullName: adminProfile.fullName, email: adminProfile.email },
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "APPROVED", adminNote: "Dokumen bukti pemindahan kerja valid" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("APPROVED");
      expect(body.data.uiStatus).toBe("disetujui");

      // Verify audit log for refund.approve
      expect(h.mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "refund.approve",
            entityType: "REFUND_REQUEST",
            entityId: sampleRefundId,
          }),
        }),
      );
    });

    it("3.2. Admin rejecting a refund requires non-empty reason (422)", async () => {
      h.authState.currentProfile = adminProfile;

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "REJECTED", reason: "" }), // Empty reason!
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("3.3. Admin can reject a PENDING refund request with reason", async () => {
      h.authState.currentProfile = adminProfile;
      h.mockRefundRequest.findUnique.mockResolvedValue(sampleRefundRecord);
      h.mockRefundRequest.update.mockResolvedValue({
        ...sampleRefundRecord,
        status: "REJECTED",
        rejectionReason: "Bukti klaim tidak sesuai ketentuan pembatalan",
        decidedById: adminProfile.id,
        decidedAt: new Date(),
        decidedBy: { id: adminProfile.id, fullName: adminProfile.fullName, email: adminProfile.email },
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          decision: "REJECTED",
          reason: "Bukti klaim tidak sesuai ketentuan pembatalan",
        }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("REJECTED");
      expect(body.data.uiStatus).toBe("ditolak");
      expect(body.data.rejectionReason).toBe("Bukti klaim tidak sesuai ketentuan pembatalan");

      // Verify audit log for refund.reject
      expect(h.mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "refund.reject",
            entityType: "REFUND_REQUEST",
            entityId: sampleRefundId,
          }),
        }),
      );
    });

    it("3.4. Illegal status transition is rejected: cannot approve already REJECTED refund (409)", async () => {
      h.authState.currentProfile = adminProfile;
      h.mockRefundRequest.findUnique.mockResolvedValue({
        ...sampleRefundRecord,
        status: "REJECTED",
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "APPROVED" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("3.5. Cannot mark PROCESSED on a refund that is still PENDING (409)", async () => {
      h.authState.currentProfile = adminProfile;
      h.mockRefundRequest.findUnique.mockResolvedValue({
        ...sampleRefundRecord,
        status: "PENDING", // Not APPROVED yet!
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "PROCESSED" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("3.6. Admin can mark an APPROVED refund as PROCESSED, updating Payment to REFUNDED", async () => {
      h.authState.currentProfile = adminProfile;
      h.mockRefundRequest.findUnique.mockResolvedValue({
        ...sampleRefundRecord,
        status: "APPROVED",
      });
      h.mockRefundRequest.update.mockResolvedValue({
        ...sampleRefundRecord,
        status: "PROCESSED",
        processedAt: new Date(),
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "PROCESSED", adminNote: "Transfer BCA manual berhasil" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("PROCESSED");

      // Verify payment was updated to REFUNDED
      expect(h.mockPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: samplePaymentId },
          data: expect.objectContaining({ status: "REFUNDED" }),
        }),
      );

      // Verify audit log for refund.process
      expect(h.mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "refund.process",
            entityType: "REFUND_REQUEST",
            entityId: sampleRefundId,
          }),
        }),
      );
    });
  });

  /* -------------------------------------------------------------
   * 4. Seeker Retrieval & Cancellation
   * ------------------------------------------------------------- */
  describe("4. Seeker Retrieval & Cancellation", () => {
    it("4.1. Seeker can view their own refund requests", async () => {
      h.authState.currentProfile = seekerProfile1;
      h.mockRefundRequest.findMany.mockResolvedValue([sampleRefundRecord]);
      h.mockRefundRequest.count.mockResolvedValue(1);
      h.mockRefundRequest.aggregate.mockResolvedValue({ _count: 1, _sum: { amount: new Prisma.Decimal(2500000) } });

      const { GET } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds");

      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(sampleRefundId);
      expect(body.data[0].userId).toBe(seekerProfile1.id);
    });

    it("4.2. Seeker cannot view details of another user's refund (403 FORBIDDEN)", async () => {
      h.authState.currentProfile = seekerProfile2; // Siti
      h.mockRefundRequest.findUnique.mockResolvedValue(sampleRefundRecord); // Belongs to Budi

      const { GET } = await import("@/app/api/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/refunds/${sampleRefundId}`);

      const res = await GET(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("4.3. Seeker can cancel their own PENDING refund request", async () => {
      h.authState.currentProfile = seekerProfile1;
      h.mockRefundRequest.findUnique.mockResolvedValue(sampleRefundRecord);
      h.mockRefundRequest.update.mockResolvedValue({
        ...sampleRefundRecord,
        status: "CANCELLED",
      });

      const { PATCH } = await import("@/app/api/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ action: "CANCEL" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.status).toBe("CANCELLED");
      expect(body.data.uiStatus).toBe("dibatalkan");

      // Verify audit log for refund.cancel
      expect(h.mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "refund.cancel",
            entityType: "REFUND_REQUEST",
            entityId: sampleRefundId,
          }),
        }),
      );
    });

    it("4.4. Seeker cannot cancel another user's refund (403 FORBIDDEN)", async () => {
      h.authState.currentProfile = seekerProfile2; // Siti
      h.mockRefundRequest.findUnique.mockResolvedValue(sampleRefundRecord); // Belongs to Budi

      const { PATCH } = await import("@/app/api/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ action: "CANCEL" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(403);
    });
  });

  /* -------------------------------------------------------------
   * 5. Financial Integrity, Partial vs Full Processing & Concurrency
   * ------------------------------------------------------------- */
  describe("5. Financial Integrity, Partial vs Full Processing & Concurrency", () => {
    it("5.1. Partial refund processed does NOT mark payment as REFUNDED, does not cancel booking, and does not evict room", async () => {
      h.authState.currentProfile = adminProfile;

      const partialRefundRecord = {
        ...sampleRefundRecord,
        amount: new Prisma.Decimal(500000), // Only 500k out of 2.5m
        status: "APPROVED",
      };

      h.mockRefundRequest.findUnique.mockResolvedValue(partialRefundRecord);
      h.mockRefundRequest.update.mockResolvedValue({
        ...partialRefundRecord,
        status: "PROCESSED",
        processedAt: new Date(),
      });

      // Mock booking finding to simulate total payments 2.5m and only 500k processed
      h.mockBooking.findUnique.mockResolvedValue({
        id: sampleBookingId,
        status: "ACTIVE",
        roomUnitId: "u1111111-1111-1111-1111-111111111111",
        payments: [
          {
            id: samplePaymentId,
            amount: new Prisma.Decimal(2500000),
            status: "VERIFIED",
          },
        ],
        refundRequests: [
          {
            id: sampleRefundId,
            amount: new Prisma.Decimal(500000),
            paymentId: samplePaymentId,
            status: "PROCESSED",
          },
        ],
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "PROCESSED", adminNote: "Kompensasi perbaikan AC" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(200);

      // Verify payment update did NOT change status to REFUNDED (remains partial note)
      expect(h.mockPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: samplePaymentId },
          data: expect.not.objectContaining({ status: "REFUNDED" }),
        }),
      );

      // Verify booking was NOT cancelled
      expect(h.mockBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleBookingId },
          data: expect.not.objectContaining({ status: "CANCELLED" }),
        }),
      );

      // Verify room was NOT set to AVAILABLE
      expect(h.mockRoomUnit.update).not.toHaveBeenCalled();
    });

    it("5.2. Full refund processed DOES mark payment as REFUNDED, cancels booking, and sets room to AVAILABLE", async () => {
      h.authState.currentProfile = adminProfile;

      const fullRefundRecord = {
        ...sampleRefundRecord,
        amount: new Prisma.Decimal(2500000),
        status: "APPROVED",
      };

      h.mockRefundRequest.findUnique.mockResolvedValue(fullRefundRecord);
      h.mockRefundRequest.update.mockResolvedValue({
        ...fullRefundRecord,
        status: "PROCESSED",
        processedAt: new Date(),
      });

      h.mockBooking.findUnique.mockResolvedValue({
        id: sampleBookingId,
        status: "ACTIVE",
        roomUnitId: "u1111111-1111-1111-1111-111111111111",
        payments: [
          {
            id: samplePaymentId,
            amount: new Prisma.Decimal(2500000),
            status: "VERIFIED",
          },
        ],
        refundRequests: [
          {
            id: sampleRefundId,
            amount: new Prisma.Decimal(2500000),
            paymentId: samplePaymentId,
            status: "PROCESSED",
          },
        ],
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "PROCESSED", adminNote: "Pengembalian sewa penuh" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(200);

      // Verify payment was marked REFUNDED
      expect(h.mockPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: samplePaymentId },
          data: expect.objectContaining({ status: "REFUNDED" }),
        }),
      );

      // Verify booking was CANCELLED with cancelledAt timestamp
      expect(h.mockBooking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleBookingId },
          data: expect.objectContaining({
            status: "CANCELLED",
            cancelledAt: expect.any(Date),
          }),
        }),
      );

      // Verify roomUnit was set to AVAILABLE
      expect(h.mockRoomUnit.update).toHaveBeenCalledWith({
        where: { id: "u1111111-1111-1111-1111-111111111111" },
        data: { status: "AVAILABLE" },
      });
    });

    it("5.3. Rejects refund request when requested amount exceeds specific payment remaining balance (422 PAYMENT_AMOUNT_EXCEEDED)", async () => {
      h.authState.currentProfile = seekerProfile1;

      const paymentBId = "c2222222-2222-4222-8222-222222222222";

      // Booking has Payment A (1.000.000) with 600.000 already approved refund,
      // and Payment B (2.000.000). Total booking remaining is 2.400.000.
      h.mockBooking.findFirst.mockResolvedValue({
        ...sampleBooking,
        payments: [
          {
            id: samplePaymentId,
            amount: new Prisma.Decimal(1000000),
            status: "VERIFIED",
          },
          {
            id: paymentBId,
            amount: new Prisma.Decimal(2000000),
            status: "VERIFIED",
          },
        ],
        refundRequests: [
          {
            id: "refund-prev",
            amount: new Prisma.Decimal(600000),
            paymentId: samplePaymentId,
            status: "APPROVED",
          },
        ],
      });

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          bookingId: sampleBookingId,
          paymentId: samplePaymentId,
          amount: 500000, // Remaining on Payment A is 400.000, even though booking has 2.400.000
          reason: "Kelebihan bayar sewa bulan pertama",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("PAYMENT_AMOUNT_EXCEEDED");
    });

    it("5.4. Rejects refund request when specific payment is already fully allocated (422 PAYMENT_FULLY_REFUNDED)", async () => {
      h.authState.currentProfile = seekerProfile1;

      const paymentBId = "c2222222-2222-4222-8222-222222222222";

      // Booking has Payment A (1.000.000) with all 1.000.000 already approved,
      // and Payment B (2.000.000). Total booking has 2.000.000 remaining.
      h.mockBooking.findFirst.mockResolvedValue({
        ...sampleBooking,
        payments: [
          {
            id: samplePaymentId,
            amount: new Prisma.Decimal(1000000),
            status: "VERIFIED",
          },
          {
            id: paymentBId,
            amount: new Prisma.Decimal(2000000),
            status: "VERIFIED",
          },
        ],
        refundRequests: [
          {
            id: "refund-prev",
            amount: new Prisma.Decimal(1000000),
            paymentId: samplePaymentId,
            status: "APPROVED",
          },
        ],
      });

      const { POST } = await import("@/app/api/refunds/route");
      const req = new Request("http://localhost:3000/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          bookingId: sampleBookingId,
          paymentId: samplePaymentId,
          amount: 100000,
          reason: "Permintaan tambahan refund",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("PAYMENT_FULLY_REFUNDED");
    });

    it("5.5. Concurrency retry: automatically retries and succeeds when Prisma throws P2034 conflict", async () => {
      h.authState.currentProfile = adminProfile;
      h.mockRefundRequest.findUnique.mockResolvedValue(sampleRefundRecord);
      h.mockRefundRequest.update.mockResolvedValue({
        ...sampleRefundRecord,
        status: "APPROVED",
      });

      // Simulate first attempt throwing P2034, second succeeding
      const p2034Error = new Prisma.PrismaClientKnownRequestError(
        "Transaction failed due to a write conflict or a deadlock. Please retry your transaction.",
        { code: "P2034", clientVersion: "6.12.0" },
      );

      let attempts = 0;
      vi.mocked(prisma.$transaction).mockImplementation(async (arg: unknown) => {
        if (typeof arg === "function") {
          attempts++;
          if (attempts === 1) {
            throw p2034Error;
          }
          return (arg as (tx: unknown) => unknown)(h.prismaModels);
        }
        return arg;
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "APPROVED", adminNote: "Disetujui setelah retry" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(200);
      expect(attempts).toBe(2); // Successfully retried!
    });

    it("5.6. Concurrency conflict exhaustion: returns 409 CONCURRENCY_CONFLICT on persistent P2034 serialization failure", async () => {
      h.authState.currentProfile = adminProfile;

      const p2034Error = new Prisma.PrismaClientKnownRequestError(
        "Transaction failed due to persistent write conflict.",
        { code: "P2034", clientVersion: "6.12.0" },
      );

      vi.mocked(prisma.$transaction).mockImplementation(async (arg: unknown) => {
        if (typeof arg === "function") {
          throw p2034Error;
        }
        return arg;
      });

      const { PATCH } = await import("@/app/api/admin/refunds/[id]/route");
      const req = new Request(`http://localhost:3000/api/admin/refunds/${sampleRefundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ decision: "APPROVED" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: sampleRefundId }) });
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error.code).toBe("CONCURRENCY_CONFLICT");
    });
  });
});

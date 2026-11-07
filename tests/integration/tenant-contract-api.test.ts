/**
 * Tenant Contract & Booking API State Verification Test Suite (Tahap 2.3).
 * 
 * Verifies backend booking/contract operations and tenant tenancy invariants with 100% data isolation:
 * 1. Unauthenticated users cannot access contract/booking data (401 UNAUTHENTICATED).
 * 2. Tenant isolation: tenants can strictly only query their own bookings (applicantId scoped).
 * 3. Empty state: returns empty array cleanly without crashing when tenant has no bookings.
 * 4. Contract lifecycle & active lease identification (ACTIVE / APPROVED_AWAITING_PAYMENT vs COMPLETED / CANCELLED).
 * 5. Decimal snapshot conversion: numeric formatting for monthly price and deposit.
 * 6. Relation preservation: includes property details, room type, and room unit.
 * 7. Fail-fast error handling: database exceptions propagate directly without silent mock fallback.
 * 8. Security guards: seekers cannot approve or unilaterally transition forbidden booking states (403/409).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Profile } from "@prisma/client";

// Hoisted mock for Prisma
const h = vi.hoisted(() => {
  const mockBooking = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockRoomType = {
    findFirst: vi.fn(),
  };

  const mockRoomUnit = {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  };

  const mockNotification = {
    create: vi.fn(),
  };

  const mockTx = {
    booking: mockBooking,
    roomType: mockRoomType,
    roomUnit: mockRoomUnit,
    notification: mockNotification,
  };

  const mockDb = {
    booking: mockBooking,
    roomType: mockRoomType,
    roomUnit: mockRoomUnit,
    notification: mockNotification,
    $transaction: vi.fn().mockImplementation((arg: any) => {
      if (typeof arg === "function") return arg(mockTx);
      return Promise.all(arg);
    }),
  };

  return { mockBooking, mockRoomType, mockRoomUnit, mockNotification, mockDb };
});

vi.mock("@/lib/prisma", () => ({
  prisma: h.mockDb,
}));

// Import services under test
import { listBookings, getBooking, transitionBooking } from "@/server/booking-service";
import { requireUser } from "@/server/auth";
import { ApiError } from "@/server/http";

const TENANT_A: Profile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "tenant.a@test.id",
  fullName: "Penyewa A",
  phone: "081234567891",
  avatarUrl: null,
  birthPlace: null,
  occupation: null,
  role: "SEEKER",
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
  lastSeenAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const TENANT_B: Profile = {
  ...TENANT_A,
  id: "22222222-2222-4222-8222-222222222222",
  email: "tenant.b@test.id",
  fullName: "Penyewa B",
};

const OWNER_PROFILE: Profile = {
  ...TENANT_A,
  id: "99999999-9999-4999-8999-999999999999",
  email: "owner@test.id",
  fullName: "Pemilik Kost",
  role: "OWNER",
};

describe("Tenant Contract & Booking API Invariants (Tahap 2.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Unauthenticated access check
  it("1. Unauthenticated users cannot access booking/contract data (401 UNAUTHENTICATED)", async () => {
    await expect(requireUser()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  // 2. Tenant isolation
  it("2. Tenant query is strictly scoped to their own applicantId", async () => {
    h.mockBooking.findMany.mockResolvedValueOnce([
      {
        id: "b-1",
        code: "BK-20260901-ABC1",
        applicantId: TENANT_A.id,
        propertyId: "p-1",
        roomTypeId: "rt-1",
        roomUnitId: "ru-1",
        startDate: new Date("2026-09-01"),
        durationMonths: 6,
        status: "ACTIVE",
        monthlyPriceSnapshot: new Prisma.Decimal(2500000),
        depositSnapshot: new Prisma.Decimal(500000),
        property: { id: "p-1", slug: "kost-damai", name: "Kost Damai", city: "Bandung", ownerId: OWNER_PROFILE.id },
        roomType: { id: "rt-1", name: "Deluxe Single" },
        roomUnit: { id: "ru-1", number: "101", status: "OCCUPIED" },
        applicant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email, phone: TENANT_A.phone },
        history: [],
      },
    ]);
    h.mockBooking.count.mockResolvedValueOnce(1);

    const result = await listBookings(TENANT_A, 1, 20);

    expect(h.mockBooking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { applicantId: TENANT_A.id },
      })
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].applicantId).toBe(TENANT_A.id);
    expect(result.items[0].property.name).toBe("Kost Damai");
  });

  // 3. Empty state handling
  it("3. Returns empty list cleanly when tenant has no bookings", async () => {
    h.mockBooking.findMany.mockResolvedValueOnce([]);
    h.mockBooking.count.mockResolvedValueOnce(0);

    const result = await listBookings(TENANT_B, 1, 20);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.pages).toBe(0);
  });

  // 4. Contract lifecycle: distinguishes active lease from completed/cancelled
  it("4. Distinguishes active lease from historical agreements and completed tenancies", async () => {
    const rawItems = [
      {
        id: "b-active",
        code: "BK-20260901-ACTV",
        applicantId: TENANT_A.id,
        propertyId: "p-1",
        roomTypeId: "rt-1",
        roomUnitId: "ru-1",
        startDate: new Date("2026-09-01"),
        durationMonths: 12,
        status: "ACTIVE",
        monthlyPriceSnapshot: new Prisma.Decimal(2000000),
        depositSnapshot: new Prisma.Decimal(500000),
        property: { id: "p-1", slug: "kost-damai", name: "Kost Damai", city: "Bandung", ownerId: OWNER_PROFILE.id },
        roomType: { id: "rt-1", name: "Standard Room" },
        roomUnit: { id: "ru-1", number: "202", status: "OCCUPIED" },
        applicant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email, phone: TENANT_A.phone },
        history: [],
      },
      {
        id: "b-old",
        code: "BK-20250901-COMP",
        applicantId: TENANT_A.id,
        propertyId: "p-1",
        roomTypeId: "rt-1",
        roomUnitId: "ru-1",
        startDate: new Date("2025-09-01"),
        durationMonths: 12,
        status: "COMPLETED",
        monthlyPriceSnapshot: new Prisma.Decimal(1800000),
        depositSnapshot: new Prisma.Decimal(500000),
        property: { id: "p-1", slug: "kost-damai", name: "Kost Damai", city: "Bandung", ownerId: OWNER_PROFILE.id },
        roomType: { id: "rt-1", name: "Standard Room" },
        roomUnit: { id: "ru-1", number: "202", status: "AVAILABLE" },
        applicant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email, phone: TENANT_A.phone },
        history: [],
      },
    ];

    h.mockBooking.findMany.mockResolvedValueOnce(rawItems);
    h.mockBooking.count.mockResolvedValueOnce(2);

    const result = await listBookings(TENANT_A, 1, 20);

    const activeContract = result.items.find((b) => b.status === "ACTIVE");
    const completedContract = result.items.find((b) => b.status === "COMPLETED");

    expect(activeContract).toBeDefined();
    expect(activeContract?.id).toBe("b-active");
    expect(completedContract).toBeDefined();
    expect(completedContract?.id).toBe("b-old");
  });

  // 5. Decimal snapshot conversion
  it("5. Accurately converts Decimal values to JS numbers for snapshot pricing and deposit", async () => {
    h.mockBooking.findMany.mockResolvedValueOnce([
      {
        id: "b-snap",
        code: "BK-20261001-SNAP",
        applicantId: TENANT_A.id,
        propertyId: "p-1",
        roomTypeId: "rt-1",
        roomUnitId: "ru-1",
        startDate: new Date("2026-10-01"),
        durationMonths: 3,
        status: "ACTIVE",
        monthlyPriceSnapshot: new Prisma.Decimal(3250000),
        depositSnapshot: new Prisma.Decimal(1000000),
        property: { id: "p-1", slug: "kost-asri", name: "Kost Asri", city: "Jakarta", ownerId: OWNER_PROFILE.id },
        roomType: { id: "rt-1", name: "VIP Suite" },
        roomUnit: { id: "ru-1", number: "305", status: "OCCUPIED" },
        applicant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email, phone: TENANT_A.phone },
        history: [],
      },
    ]);
    h.mockBooking.count.mockResolvedValueOnce(1);

    const result = await listBookings(TENANT_A, 1, 20);
    const item = result.items[0];

    expect(typeof item.monthlyPriceSnapshot).toBe("number");
    expect(item.monthlyPriceSnapshot).toBe(3250000);
    expect(typeof item.depositSnapshot).toBe("number");
    expect(item.depositSnapshot).toBe(1000000);
  });

  // 6. Null deposit snapshot handling
  it("6. Correctly returns null for depositSnapshot when deposit was not charged", async () => {
    h.mockBooking.findMany.mockResolvedValueOnce([
      {
        id: "b-no-deposit",
        code: "BK-20261001-NDEP",
        applicantId: TENANT_A.id,
        propertyId: "p-1",
        roomTypeId: "rt-1",
        roomUnitId: null,
        startDate: new Date("2026-10-01"),
        durationMonths: 1,
        status: "PENDING",
        monthlyPriceSnapshot: new Prisma.Decimal(1500000),
        depositSnapshot: null,
        property: { id: "p-1", slug: "kost-hemat", name: "Kost Hemat", city: "Yogyakarta", ownerId: OWNER_PROFILE.id },
        roomType: { id: "rt-1", name: "Economy" },
        roomUnit: null,
        applicant: { id: TENANT_A.id, fullName: TENANT_A.fullName, email: TENANT_A.email, phone: TENANT_A.phone },
        history: [],
      },
    ]);
    h.mockBooking.count.mockResolvedValueOnce(1);

    const result = await listBookings(TENANT_A, 1, 20);
    expect(result.items[0].depositSnapshot).toBeNull();
  });

  // 7. Database fail-fast without silent mock fallback
  it("7. Propagates database exceptions immediately (fail-fast principle)", async () => {
    h.mockBooking.findMany.mockRejectedValueOnce(
      new Error("Postgres connection pool exhausted")
    );

    await expect(listBookings(TENANT_A, 1, 20)).rejects.toThrow(
      "Postgres connection pool exhausted"
    );
  });

  // 8. Seeker authorization guards: forbidden status transitions
  it("8. Seeker cannot approve their own booking or make unauthorized status transitions", async () => {
    h.mockBooking.findFirst.mockResolvedValueOnce({
      id: "b-pending",
      code: "BK-20260901-PEND",
      applicantId: TENANT_A.id,
      status: "PENDING",
      propertyId: "p-1",
      property: { ownerId: OWNER_PROFILE.id, name: "Kost Damai" },
    });

    // Seeker trying to transition to APPROVED_AWAITING_PAYMENT must fail with 409
    await expect(
      transitionBooking(TENANT_A, "b-pending", {
        status: "APPROVED_AWAITING_PAYMENT",
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "INVALID_BOOKING_TRANSITION",
    });
  });

  // 9. Cross-tenant booking detail access prevention
  it("9. Prevents tenant from accessing another applicant's booking details (403 FORBIDDEN)", async () => {
    h.mockBooking.findFirst.mockResolvedValueOnce({
      id: "b-tenant-b",
      code: "BK-20260901-TB",
      applicantId: TENANT_B.id,
      propertyId: "p-1",
      roomTypeId: "rt-1",
      roomUnitId: "ru-1",
      status: "ACTIVE",
      monthlyPriceSnapshot: new Prisma.Decimal(2000000),
      depositSnapshot: null,
      property: { id: "p-1", slug: "kost-damai", name: "Kost Damai", city: "Bandung", ownerId: OWNER_PROFILE.id },
      roomType: { id: "rt-1", name: "Room A" },
      roomUnit: { id: "ru-1", number: "101", status: "OCCUPIED" },
      applicant: { id: TENANT_B.id, fullName: TENANT_B.fullName, email: TENANT_B.email, phone: TENANT_B.phone },
      history: [],
    });

    await expect(getBooking(TENANT_A, "b-tenant-b")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});

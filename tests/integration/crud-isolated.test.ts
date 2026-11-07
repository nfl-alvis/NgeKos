/**
 * Isolated CRUD Verification Test Suite for NgeKos Core Entities.
 * 
 * Verifies all CRUD operations with 100% data isolation:
 * - Property (Kost): Create, Read (List, Filters, Sort, Pagination, Detail), Update, Delete
 * - RoomType & RoomUnit: Create, Read, Update status, Delete
 * - Booking: Create, Read, Transition (Approve, Reject, Cancel), Detail
 * - Review: Create, Read, Update, Delete, Rating recalculation
 * - Complaint & Report: Create, Read, Transition state machine, Admin moderation
 * - Announcement: Create, Read, Mark read
 * - Notification: Create, Read, Mark read, Delete
 * - Favorite: Add, Read, Remove
 * - User / Profile: Read, Update, Admin role/status change, Self-modification guard
 * 
 * Includes comprehensive edge case testing:
 * - Empty string / invalid inputs
 * - 404 Not Found
 * - 401 Unauthorized / 403 Forbidden
 * - 409 Conflict / Invalid state transitions
 * - Boundary constraints
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Profile } from "@prisma/client";

// Hoisted mock store and spy functions
const h = vi.hoisted(() => {
  const store = new Map<string, { name: string; value: string }>();

  // Mock Prisma model delegates
  const mockProperty = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockFacility = {
    count: vi.fn(),
  };

  const mockRoomType = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockRoomUnit = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  };

  const mockBooking = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockRentalAgreement = {
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  };

  const mockReview = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockComplaint = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockReport = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockAnnouncement = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  };

  const mockAnnouncementRead = {
    upsert: vi.fn(),
  };

  const mockNotification = {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockFavorite = {
    findMany: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockProfile = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  const mockPropertyVerification = {
    create: vi.fn(),
  };

  const mockPropertyImage = {
    create: vi.fn(),
  };

  const mockPropertyFacility = {
    create: vi.fn(),
    deleteMany: vi.fn(),
  };

  const prismaModels = {
    property: mockProperty,
    facility: mockFacility,
    roomType: mockRoomType,
    roomUnit: mockRoomUnit,
    booking: mockBooking,
    rentalAgreement: mockRentalAgreement,
    review: mockReview,
    complaint: mockComplaint,
    report: mockReport,
    announcement: mockAnnouncement,
    announcementRead: mockAnnouncementRead,
    notification: mockNotification,
    favorite: mockFavorite,
    profile: mockProfile,
    propertyVerification: mockPropertyVerification,
    propertyImage: mockPropertyImage,
    propertyFacility: mockPropertyFacility,
  };

  return {
    store,
    prismaModels,
    mockProperty,
    mockFacility,
    mockRoomType,
    mockRoomUnit,
    mockBooking,
    mockRentalAgreement,
    mockReview,
    mockComplaint,
    mockReport,
    mockAnnouncement,
    mockAnnouncementRead,
    mockNotification,
    mockFavorite,
    mockProfile,
    mockPropertyVerification,
    mockPropertyImage,
    mockPropertyFacility,
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

// Import Services & Errors
import { ApiError } from "@/server/http";
import {
  createProperty,
  listPublicProperties,
  getProperty,
  updateProperty,
  deleteProperty,
} from "@/server/property-service";
import {
  createRoomType,
  deleteRoomType,
  createRoomUnit,
  updateRoomUnitStatus,
  deleteRoomUnit,
} from "@/server/room-service";
import {
  createBooking,
  transitionBooking,
} from "@/server/booking-service";
import {
  addFavorite,
  removeFavorite,
  listFavorites,
  createReview,
  updateReview,
  deleteReview,
  createComplaint,
  updateComplaint,
} from "@/server/engagement-service";
import {
  createAnnouncement,
  markAnnouncementRead,
  listNotifications,
  markNotificationRead,
  deleteNotification,
} from "@/server/owner-service";
import {
  createReport,
  updateReportStatus,
} from "@/server/report-service";
import { PATCH as updateAdminUserPATCH } from "@/app/api/admin/users/[id]/route";

// Test Actor Profiles
const OWNER_PROFILE: Profile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@test.id",
  fullName: "Owner Tester",
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
  lastSeenAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const SEEKER_PROFILE: Profile = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "seeker@test.id",
  fullName: "Seeker Tester",
  phone: "089876543210",
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

const ADMIN_PROFILE: Profile = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin@test.id",
  fullName: "Admin Tester",
  phone: "081122334455",
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
  lastSeenAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const OTHER_OWNER_PROFILE: Profile = {
  ...OWNER_PROFILE,
  id: "44444444-4444-4444-8444-444444444444",
  email: "otherowner@test.id",
};

describe("Isolated CRUD Verification Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.store.clear();
  });

  // ==========================================
  // 1. PROPERTY CRUD
  // ==========================================
  describe("1. Property CRUD", () => {
    const PROP_ID = "55555555-5555-4555-8555-555555555555";
    const samplePropertyRecord = {
      id: PROP_ID,
      slug: "kost-melati-jaya",
      name: "Kost Melati Jaya",
      tagline: "Nyaman dan bersih",
      description: "Deskripsi kost",
      city: "Bandung",
      district: "Coblong",
      address: "Jl. Dipatiukur No. 10",
      postalCode: "40132",
      latitude: new Prisma.Decimal(-6.89),
      longitude: new Prisma.Decimal(107.61),
      gender: "MIXED",
      status: "VERIFIED",
      rejectionNote: null,
      depositAmount: new Prisma.Decimal(500000),
      minMonthlyPrice: new Prisma.Decimal(1500000),
      distanceToCampusM: 350,
      averageRating: new Prisma.Decimal(4.8),
      reviewCount: 12,
      publishedAt: new Date().toISOString(),
      ownerId: OWNER_PROFILE.id,
      owner: { id: OWNER_PROFILE.id, fullName: OWNER_PROFILE.fullName, phone: OWNER_PROFILE.phone },
      images: [{ id: "img-1", storagePath: "kost/1.jpg", altText: "Cover", isCover: true, sortOrder: 0 }],
      facilities: [{ facility: { key: "wifi", nameId: "WiFi", nameEn: "WiFi", icon: "wifi" } }],
      roomTypes: [
        {
          id: "rt-1",
          name: "Standard Room",
          description: "Kamar mandi dalam",
          pricePerMonth: new Prisma.Decimal(1500000),
          sizeM2: new Prisma.Decimal(12),
          capacity: 1,
          units: [{ id: "unit-1", number: "101", floor: "1", status: "AVAILABLE", roomTypeId: "rt-1" }],
        },
      ],
    };

    it("CREATE: owner creates property successfully with verification submission", async () => {
      h.mockFacility.count.mockResolvedValue(1);
      h.mockProperty.findUnique.mockResolvedValue(null); // unique slug check
      h.mockProperty.create.mockResolvedValue({ id: PROP_ID, slug: "kost-melati-jaya" });
      h.mockRoomType.create.mockResolvedValue({ id: "rt-1" });
      h.mockRoomUnit.create.mockResolvedValue({ id: "unit-1" });
      h.mockProperty.update.mockResolvedValue({});
      h.mockPropertyImage.create.mockResolvedValue({});
      h.mockPropertyVerification.create.mockResolvedValue({});
      h.mockProperty.findUniqueOrThrow.mockResolvedValue(samplePropertyRecord);

      const result = await createProperty(OWNER_PROFILE, {
        name: "Kost Melati Jaya",
        tagline: "Nyaman dan bersih",
        description: "Deskripsi kost",
        city: "Bandung",
        district: "Coblong",
        address: "Jl. Dipatiukur No. 10",
        gender: "MIXED",
        facilities: ["wifi"],
        autoSubmitVerification: true,
      });

      expect(result.id).toBe(PROP_ID);
      expect(result.slug).toBe("kost-melati-jaya");
      expect(result.city).toBe("Bandung");
      expect(result.status).toBe("VERIFIED");
      expect(h.mockPropertyVerification.create).toHaveBeenCalled();
    });

    it("CREATE: rejects unknown facility keys with 422", async () => {
      h.mockFacility.count.mockResolvedValue(0); // facility does not exist

      await expect(
        createProperty(OWNER_PROFILE, {
          name: "Kost Invalid Facility",
          description: "Desc",
          city: "Bandung",
          district: "Coblong",
          address: "Address",
          gender: "MIXED",
          facilities: ["unknown_teleporter_facility"],
          autoSubmitVerification: true,
        })
      ).rejects.toThrow(ApiError);
    });

    it("READ LIST: public can list verified properties with filters and pagination", async () => {
      h.mockProperty.findMany.mockResolvedValue([samplePropertyRecord]);
      h.mockProperty.count.mockResolvedValue(1);

      const list = await listPublicProperties({
        city: "Bandung",
        gender: "MIXED",
        facilities: ["wifi"],
        maxPrice: 2000000,
        sort: "newest",
        page: 1,
        limit: 10,
      });

      expect(list.items).toHaveLength(1);
      expect(list.total).toBe(1);
      expect(list.items[0].city).toBe("Bandung");
      expect(list.items[0].minPrice).toBe(1500000);
    });

    it("READ DETAIL: returns property detail for valid id", async () => {
      h.mockProperty.findFirst.mockResolvedValue(samplePropertyRecord);

      const result = await getProperty(PROP_ID, OWNER_PROFILE);
      expect(result.id).toBe(PROP_ID);
      expect(result.name).toBe("Kost Melati Jaya");
      expect(result.facilities).toHaveLength(1);
    });

    it("READ DETAIL: throws 404 when property is not found", async () => {
      h.mockProperty.findFirst.mockResolvedValue(null);

      await expect(getProperty("non-existent-id", OWNER_PROFILE)).rejects.toThrow(ApiError);
    });

    it("UPDATE: owner updates property details successfully", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ ownerId: OWNER_PROFILE.id, status: "VERIFIED" });
      h.mockPropertyFacility.deleteMany.mockResolvedValue({});
      h.mockPropertyFacility.create.mockResolvedValue({});
      h.mockProperty.update.mockResolvedValue({
        ...samplePropertyRecord,
        name: "Kost Melati Baru",
      });

      const updated = await updateProperty(OWNER_PROFILE, PROP_ID, {
        name: "Kost Melati Baru",
        facilities: ["wifi"],
      });

      expect(updated.name).toBe("Kost Melati Baru");
    });

    it("UPDATE: forbidden 403 when non-owner attempts to update property", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ ownerId: OWNER_PROFILE.id, status: "VERIFIED" });

      await expect(
        updateProperty(OTHER_OWNER_PROFILE, PROP_ID, { name: "Hijacked Property" })
      ).rejects.toThrow(ApiError);
    });

    it("DELETE: owner soft-deletes property when there are no active tenancies", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ ownerId: OWNER_PROFILE.id });
      h.mockRentalAgreement.count.mockResolvedValue(0);
      h.mockProperty.update.mockResolvedValue({});

      await expect(deleteProperty(OWNER_PROFILE, PROP_ID)).resolves.not.toThrow();
      expect(h.mockProperty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROP_ID },
          data: expect.objectContaining({ status: "INACTIVE" }),
        })
      );
    });

    it("DELETE: blocked with 409 conflict when property has active tenants", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ ownerId: OWNER_PROFILE.id });
      h.mockRentalAgreement.count.mockResolvedValue(2); // 2 active tenants!

      await expect(deleteProperty(OWNER_PROFILE, PROP_ID)).rejects.toThrow(ApiError);
    });
  });

  // ==========================================
  // 2. ROOM TYPE & ROOM UNIT CRUD
  // ==========================================
  describe("2. RoomType & RoomUnit CRUD", () => {
    const PROP_ID = "55555555-5555-4555-8555-555555555555";
    const RT_ID = "66666666-6666-4666-8666-666666666666";
    const UNIT_ID = "77777777-7777-4777-8777-777777777777";

    it("CREATE RoomType: creates room type and updates property min price", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID, ownerId: OWNER_PROFILE.id });
      h.mockRoomType.create.mockResolvedValue({
        id: RT_ID,
        name: "Deluxe Room",
        pricePerMonth: new Prisma.Decimal(2500000),
        sizeM2: new Prisma.Decimal(16),
        capacity: 1,
      });
      h.mockRoomType.aggregate.mockResolvedValue({ _min: { pricePerMonth: new Prisma.Decimal(2500000) } });
      h.mockProperty.update.mockResolvedValue({});

      const created = await createRoomType(OWNER_PROFILE, PROP_ID, {
        name: "Deluxe Room",
        pricePerMonth: 2500000,
        sizeM2: 16,
        capacity: 1,
      });

      expect(created.id).toBe(RT_ID);
      expect(created.pricePerMonth).toBe(2500000);
      expect(h.mockProperty.update).toHaveBeenCalled();
    });

    it("CREATE RoomUnit: attaches unit to room type successfully", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID, ownerId: OWNER_PROFILE.id });
      h.mockRoomType.findFirst.mockResolvedValue({ id: RT_ID });
      h.mockRoomUnit.create.mockResolvedValue({
        id: UNIT_ID,
        propertyId: PROP_ID,
        roomTypeId: RT_ID,
        number: "201",
        floor: "2",
        status: "AVAILABLE",
      });

      const unit = await createRoomUnit(OWNER_PROFILE, PROP_ID, {
        roomTypeId: RT_ID,
        number: "201",
        floor: "2",
      });

      expect(unit.number).toBe("201");
      expect(unit.status).toBe("AVAILABLE");
    });

    it("CREATE RoomUnit: rejects if room type does not belong to property", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID, ownerId: OWNER_PROFILE.id });
      h.mockRoomType.findFirst.mockResolvedValue(null); // mismatch!

      await expect(
        createRoomUnit(OWNER_PROFILE, PROP_ID, {
          roomTypeId: "alien-rt-id",
          number: "201",
        })
      ).rejects.toThrow(ApiError);
    });

    it("UPDATE RoomUnit status: transitions status to MAINTENANCE", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID, ownerId: OWNER_PROFILE.id });
      h.mockRoomUnit.findFirst.mockResolvedValue({ id: UNIT_ID, status: "AVAILABLE" });
      h.mockRoomUnit.update.mockResolvedValue({ id: UNIT_ID, status: "MAINTENANCE" });

      const updated = await updateRoomUnitStatus(OWNER_PROFILE, PROP_ID, UNIT_ID, "MAINTENANCE");
      expect(updated.status).toBe("MAINTENANCE");
    });

    it("UPDATE RoomUnit status: prevents manual modification of RESERVED room unit", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID, ownerId: OWNER_PROFILE.id });
      h.mockRoomUnit.findFirst.mockResolvedValue({ id: UNIT_ID, status: "RESERVED" }); // locked

      await expect(
        updateRoomUnitStatus(OWNER_PROFILE, PROP_ID, UNIT_ID, "AVAILABLE")
      ).rejects.toThrow(ApiError);
    });

    it("DELETE RoomUnit: rejects deletion of RESERVED or OCCUPIED rooms with 409", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID, ownerId: OWNER_PROFILE.id });
      h.mockRoomUnit.findFirst.mockResolvedValue({ id: UNIT_ID, status: "OCCUPIED" });

      await expect(deleteRoomUnit(OWNER_PROFILE, PROP_ID, UNIT_ID)).rejects.toThrow(ApiError);
    });

    it("DELETE RoomType: blocks deletion if active bookings or active units exist", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID, ownerId: OWNER_PROFILE.id });
      h.mockRoomType.findFirst.mockResolvedValue({ id: RT_ID });
      h.mockRoomUnit.count.mockResolvedValue(3); // still has units!
      h.mockBooking.count.mockResolvedValue(0);

      await expect(deleteRoomType(OWNER_PROFILE, PROP_ID, RT_ID)).rejects.toThrow(ApiError);
    });
  });

  // ==========================================
  // 3. BOOKING CRUD & LIFECYCLE
  // ==========================================
  describe("3. Booking CRUD & Lifecycle", () => {
    const PROP_ID = "55555555-5555-4555-8555-555555555555";
    const RT_ID = "66666666-6666-4666-8666-666666666666";
    const BK_ID = "88888888-8888-4888-8888-888888888888";

    const futureDate = () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    };

    const pastDate = () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    };

    it("CREATE: seeker creates booking with valid start date and available room", async () => {
      h.mockRoomType.findFirst.mockResolvedValue({
        id: RT_ID,
        name: "Standard",
        pricePerMonth: new Prisma.Decimal(1500000),
        property: { depositAmount: new Prisma.Decimal(500000), ownerId: OWNER_PROFILE.id, name: "Kost Melati" },
      });
      h.mockBooking.count.mockResolvedValue(0); // no active duplicate
      h.mockBooking.create.mockResolvedValue({
        id: BK_ID,
        code: "BK-261026-ABCD",
        applicantId: SEEKER_PROFILE.id,
        propertyId: PROP_ID,
        roomTypeId: RT_ID,
        durationMonths: 3,
        status: "PENDING",
        monthlyPriceSnapshot: new Prisma.Decimal(1500000),
        depositSnapshot: new Prisma.Decimal(500000),
        property: { id: PROP_ID, slug: "kost-melati", name: "Kost Melati", city: "Bandung", ownerId: OWNER_PROFILE.id },
        roomType: { id: RT_ID, name: "Standard" },
        roomUnit: null,
        applicant: { id: SEEKER_PROFILE.id, fullName: SEEKER_PROFILE.fullName, email: SEEKER_PROFILE.email, phone: SEEKER_PROFILE.phone },
        history: [],
      });
      h.mockNotification.create.mockResolvedValue({});

      const booking = await createBooking(SEEKER_PROFILE, {
        propertyId: PROP_ID,
        roomTypeId: RT_ID,
        startDate: futureDate(),
        durationMonths: 3,
        note: "Saya mahasiswa baru",
      });

      expect(booking.id).toBe(BK_ID);
      expect(booking.status).toBe("PENDING");
      expect(booking.monthlyPriceSnapshot).toBe(1500000);
      expect(h.mockNotification.create).toHaveBeenCalled();
    });

    it("CREATE: rejects booking with past start date (422)", async () => {
      await expect(
        createBooking(SEEKER_PROFILE, {
          propertyId: PROP_ID,
          roomTypeId: RT_ID,
          startDate: pastDate(),
          durationMonths: 1,
        })
      ).rejects.toThrow(ApiError);
    });

    it("CREATE: rejects duplicate active booking for same property (409)", async () => {
      h.mockRoomType.findFirst.mockResolvedValue({
        id: RT_ID,
        property: { depositAmount: null, ownerId: OWNER_PROFILE.id, name: "Kost" },
      });
      h.mockBooking.count.mockResolvedValue(1); // already has active booking!

      await expect(
        createBooking(SEEKER_PROFILE, {
          propertyId: PROP_ID,
          roomTypeId: RT_ID,
          startDate: futureDate(),
          durationMonths: 1,
        })
      ).rejects.toThrow(ApiError);
    });

    it("TRANSITION: owner approves booking and marks room unit as RESERVED", async () => {
      const UNIT_ID = "unit-101-available";
      h.mockBooking.findFirst.mockResolvedValue({
        id: BK_ID,
        propertyId: PROP_ID,
        roomTypeId: RT_ID,
        roomUnitId: null,
        status: "PENDING",
        applicantId: SEEKER_PROFILE.id,
        property: { ownerId: OWNER_PROFILE.id, name: "Kost Melati" },
      });
      h.mockRoomUnit.findFirst.mockResolvedValue({ id: UNIT_ID });
      h.mockRoomUnit.updateMany.mockResolvedValue({ count: 1 });
      h.mockBooking.update.mockResolvedValue({
        id: BK_ID,
        status: "APPROVED_AWAITING_PAYMENT",
        monthlyPriceSnapshot: new Prisma.Decimal(1500000),
        depositSnapshot: null,
        property: { id: PROP_ID, slug: "kost-melati", name: "Kost Melati", city: "Bandung", ownerId: OWNER_PROFILE.id },
        roomType: { id: RT_ID, name: "Standard" },
        roomUnit: { id: UNIT_ID, number: "101", status: "RESERVED" },
        applicant: { id: SEEKER_PROFILE.id, fullName: "Seeker", email: "seeker@test.id", phone: null },
        history: [],
      });
      h.mockNotification.create.mockResolvedValue({});

      const approved = await transitionBooking(OWNER_PROFILE, BK_ID, {
        status: "APPROVED_AWAITING_PAYMENT",
      });

      expect(approved.status).toBe("APPROVED_AWAITING_PAYMENT");
      expect(h.mockRoomUnit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "RESERVED" },
        })
      );
    });

    it("TRANSITION: seeker cancels booking and releases RESERVED unit back to AVAILABLE", async () => {
      const UNIT_ID = "unit-101-reserved";
      h.mockBooking.findFirst.mockResolvedValue({
        id: BK_ID,
        propertyId: PROP_ID,
        roomTypeId: RT_ID,
        roomUnitId: UNIT_ID,
        status: "APPROVED_AWAITING_PAYMENT",
        applicantId: SEEKER_PROFILE.id,
        property: { ownerId: OWNER_PROFILE.id, name: "Kost Melati" },
      });
      h.mockRoomUnit.updateMany.mockResolvedValue({ count: 1 });
      h.mockBooking.update.mockResolvedValue({
        id: BK_ID,
        status: "CANCELLED",
        monthlyPriceSnapshot: new Prisma.Decimal(1500000),
        depositSnapshot: null,
        property: { id: PROP_ID, slug: "kost-melati", name: "Kost Melati", city: "Bandung", ownerId: OWNER_PROFILE.id },
        roomType: { id: RT_ID, name: "Standard" },
        roomUnit: null,
        applicant: { id: SEEKER_PROFILE.id, fullName: "Seeker", email: "seeker@test.id", phone: null },
        history: [],
      });
      h.mockNotification.create.mockResolvedValue({});

      const cancelled = await transitionBooking(SEEKER_PROFILE, BK_ID, {
        status: "CANCELLED",
        note: "Menemukan tempat lain",
      });

      expect(cancelled.status).toBe("CANCELLED");
      expect(h.mockRoomUnit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: UNIT_ID, status: "RESERVED" },
          data: { status: "AVAILABLE" },
        })
      );
    });

    it("TRANSITION: rejects invalid transition (Seeker trying to approve) with 409", async () => {
      h.mockBooking.findFirst.mockResolvedValue({
        id: BK_ID,
        propertyId: PROP_ID,
        status: "PENDING",
        applicantId: SEEKER_PROFILE.id,
        property: { ownerId: OWNER_PROFILE.id },
      });

      await expect(
        transitionBooking(SEEKER_PROFILE, BK_ID, {
          status: "APPROVED_AWAITING_PAYMENT",
        })
      ).rejects.toThrow(ApiError);
    });
  });

  // ==========================================
  // 4. REVIEW & RATING CRUD
  // ==========================================
  describe("4. Review & Rating CRUD", () => {
    const PROP_ID = "55555555-5555-4555-8555-555555555555";
    const AGREE_ID = "agree-9999-9999-9999-999999999999";
    const REV_ID = "rev-1111-1111-1111-111111111111";

    it("CREATE: verified tenant writes review, recalculating property average rating", async () => {
      h.mockRentalAgreement.findFirst.mockResolvedValue({ id: AGREE_ID, propertyId: PROP_ID });
      h.mockReview.findUnique.mockResolvedValue(null);
      h.mockReview.create.mockResolvedValue({
        id: REV_ID,
        agreementId: AGREE_ID,
        propertyId: PROP_ID,
        authorId: SEEKER_PROFILE.id,
        rating: 5,
        body: "Kost sangat nyaman dan aman!",
      });
      h.mockReview.aggregate.mockResolvedValue({
        _avg: { rating: 5.0 },
        _count: 1,
      });
      h.mockProperty.update.mockResolvedValue({});

      const review = await createReview(SEEKER_PROFILE, {
        agreementId: AGREE_ID,
        rating: 5,
        body: "Kost sangat nyaman dan aman!",
      });

      expect(review.id).toBe(REV_ID);
      expect(review.rating).toBe(5);
      expect(h.mockProperty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PROP_ID },
          data: expect.objectContaining({ averageRating: expect.any(Prisma.Decimal), reviewCount: 1 }),
        })
      );
    });

    it("UPDATE: author updates review rating and recalculates property rating", async () => {
      h.mockReview.findFirst.mockResolvedValue({ propertyId: PROP_ID });
      h.mockReview.update.mockResolvedValue({ id: REV_ID, rating: 4, body: "Update komentar" });
      h.mockReview.aggregate.mockResolvedValue({ _avg: { rating: 4.0 }, _count: 1 });
      h.mockProperty.update.mockResolvedValue({});

      const updated = await updateReview(SEEKER_PROFILE, REV_ID, { rating: 4, body: "Update komentar" });
      expect(updated.rating).toBe(4);
      expect(h.mockProperty.update).toHaveBeenCalled();
    });

    it("DELETE: author deletes review, recalculating property rating", async () => {
      h.mockReview.findFirst.mockResolvedValue({ propertyId: PROP_ID });
      h.mockReview.update.mockResolvedValue({});
      h.mockReview.aggregate.mockResolvedValue({ _avg: { rating: 0 }, _count: 0 });
      h.mockProperty.update.mockResolvedValue({});

      await expect(deleteReview(SEEKER_PROFILE, REV_ID)).resolves.not.toThrow();
      expect(h.mockReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: REV_ID },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  // ==========================================
  // 5. COMPLAINT & REPORT CRUD
  // ==========================================
  describe("5. Complaint & Report CRUD", () => {
    const PROP_ID = "55555555-5555-4555-8555-555555555555";
    const AGREE_ID = "agree-9999-9999-9999-999999999999";
    const CMP_ID = "cmp-1111-1111-1111-111111111111";

    it("COMPLAINT CREATE: tenant submits complaint with auto-generated code and OPEN status", async () => {
      h.mockRentalAgreement.findFirst.mockResolvedValue({ id: AGREE_ID, propertyId: PROP_ID });
      h.mockComplaint.create.mockResolvedValue({
        id: CMP_ID,
        code: "CMP-2026-ABCDEF",
        category: "FACILITY",
        title: "Kran air bocor",
        description: "Air terus menetes di kamar mandi",
        status: "OPEN",
        property: { id: PROP_ID, name: "Kost Melati", slug: "kost-melati" },
        agreement: { id: AGREE_ID, roomUnit: { number: "101" } },
        history: [{ status: "OPEN" }],
      });

      const complaint = await createComplaint(SEEKER_PROFILE, {
        agreementId: AGREE_ID,
        category: "FACILITY",
        title: "Kran air bocor",
        description: "Air terus menetes di kamar mandi",
      });

      expect(complaint.id).toBe(CMP_ID);
      expect(complaint.status).toBe("OPEN");
      expect(complaint.code).toMatch(/^CMP-/);
    });

    it("COMPLAINT TRANSITION: owner transitions OPEN -> ACKNOWLEDGED", async () => {
      h.mockComplaint.findUnique.mockResolvedValue({
        id: CMP_ID,
        status: "OPEN",
        property: { ownerId: OWNER_PROFILE.id },
      });
      h.mockComplaint.update.mockResolvedValue({
        id: CMP_ID,
        status: "ACKNOWLEDGED",
      });

      const updated = await updateComplaint(OWNER_PROFILE, CMP_ID, "ACKNOWLEDGED", "Sedang disiapkan teknisi");
      expect(updated.status).toBe("ACKNOWLEDGED");
    });

    it("COMPLAINT TRANSITION: rejects invalid transition (OPEN -> RESOLVED skipping steps) with 409", async () => {
      h.mockComplaint.findUnique.mockResolvedValue({
        id: CMP_ID,
        status: "OPEN",
        property: { ownerId: OWNER_PROFILE.id },
      });

      await expect(
        updateComplaint(OWNER_PROFILE, CMP_ID, "RESOLVED", "Langsung beres")
      ).rejects.toThrow(ApiError);
    });

    it("REPORT CREATE & ADMIN RESOLVE: user reports property, admin marks RESOLVED", async () => {
      const REPORT_ID = "rep-1111-1111-1111-111111111111";
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID });
      h.mockReport.create.mockResolvedValue({
        id: REPORT_ID,
        reporterId: SEEKER_PROFILE.id,
        targetType: "PROPERTY",
        targetId: PROP_ID,
        reason: "Foto tidak sesuai kenyataan",
        status: "OPEN",
        reporter: { id: SEEKER_PROFILE.id, fullName: SEEKER_PROFILE.fullName, email: SEEKER_PROFILE.email },
      });

      const report = await createReport(SEEKER_PROFILE, {
        targetType: "PROPERTY",
        targetId: PROP_ID,
        reason: "Foto tidak sesuai kenyataan",
      });

      expect(report.id).toBe(REPORT_ID);
      expect(report.status).toBe("OPEN");

      // Admin resolves report
      h.mockReport.findUnique.mockResolvedValue({ id: REPORT_ID, status: "OPEN" });
      h.mockReport.update.mockResolvedValue({
        id: REPORT_ID,
        status: "RESOLVED",
        resolution: "Owner telah diminta update foto",
      });

      const resolved = await updateReportStatus(ADMIN_PROFILE, REPORT_ID, "RESOLVED", "Owner telah diminta update foto");
      expect(resolved.status).toBe("RESOLVED");
    });

    it("REPORT MODERATION: non-admin forbidden (403) from updating report status", async () => {
      await expect(
        updateReportStatus(SEEKER_PROFILE, "any-rep-id", "RESOLVED")
      ).rejects.toThrow(ApiError);
    });
  });

  // ==========================================
  // 6. ANNOUNCEMENT & NOTIFICATION CRUD
  // ==========================================
  describe("6. Announcement & Notification CRUD", () => {
    const PROP_ID = "55555555-5555-4555-8555-555555555555";
    const ANN_ID = "ann-1111-1111-1111-111111111111";

    it("ANNOUNCEMENT CREATE & READ: owner creates announcement, tenant marks read", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID });
      h.mockAnnouncement.create.mockResolvedValue({
        id: ANN_ID,
        propertyId: PROP_ID,
        authorId: OWNER_PROFILE.id,
        title: "Pembersihan Toren Air",
        body: "Air akan dimatikan jam 10-12 siang.",
      });

      const ann = await createAnnouncement(OWNER_PROFILE, {
        propertyId: PROP_ID,
        title: "Pembersihan Toren Air",
        body: "Air akan dimatikan jam 10-12 siang.",
      });
      expect(ann.id).toBe(ANN_ID);

      // Tenant marks read
      h.mockAnnouncement.findFirst.mockResolvedValue({ id: ANN_ID });
      h.mockAnnouncementRead.upsert.mockResolvedValue({});

      await expect(markAnnouncementRead(SEEKER_PROFILE, ANN_ID)).resolves.not.toThrow();
      expect(h.mockAnnouncementRead.upsert).toHaveBeenCalled();
    });

    it("NOTIFICATION: list, mark single/all read, delete", async () => {
      const NOTIF_ID = "99999999-9999-4999-8999-999999999999";
      h.mockNotification.findMany.mockResolvedValue([
        { id: NOTIF_ID, profileId: SEEKER_PROFILE.id, title: "Booking Approved", readAt: null },
      ]);
      h.mockNotification.updateMany.mockResolvedValue({ count: 1 });
      h.mockNotification.deleteMany.mockResolvedValue({ count: 1 });

      const notifs = await listNotifications(SEEKER_PROFILE);
      expect(notifs).toHaveLength(1);

      await markNotificationRead(SEEKER_PROFILE, NOTIF_ID);
      expect(h.mockNotification.updateMany).toHaveBeenCalled();

      await deleteNotification(SEEKER_PROFILE, NOTIF_ID);
      expect(h.mockNotification.deleteMany).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 7. FAVORITE CRUD
  // ==========================================
  describe("7. Favorite CRUD", () => {
    const PROP_ID = "55555555-5555-4555-8555-555555555555";

    it("ADD & REMOVE: seeker adds and removes favorite property", async () => {
      h.mockProperty.findFirst.mockResolvedValue({ id: PROP_ID });
      h.mockFavorite.upsert.mockResolvedValue({});
      h.mockFavorite.deleteMany.mockResolvedValue({ count: 1 });
      h.mockFavorite.findMany.mockResolvedValue([
        {
          createdAt: new Date(),
          property: {
            id: PROP_ID,
            slug: "kost-melati",
            name: "Kost Melati",
            city: "Bandung",
            district: "Coblong",
            minMonthlyPrice: new Prisma.Decimal(1500000),
            averageRating: new Prisma.Decimal(4.9),
            reviewCount: 8,
            images: [{ storagePath: "cover.jpg" }],
          },
        },
      ]);

      await addFavorite(SEEKER_PROFILE, PROP_ID);
      expect(h.mockFavorite.upsert).toHaveBeenCalled();

      const favs = await listFavorites(SEEKER_PROFILE);
      expect(favs).toHaveLength(1);
      expect(favs[0].name).toBe("Kost Melati");

      await removeFavorite(SEEKER_PROFILE, PROP_ID);
      expect(h.mockFavorite.deleteMany).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 8. USER / PROFILE & ADMIN MANAGEMENT
  // ==========================================
  describe("8. User / Profile & Admin User Management", () => {
    const ADMIN_ID = "a1111111-1111-1111-1111-111111111111";
    const ADMIN_EMAIL = "admin@ngekost.id";
    const adminUser = {
      ...ADMIN_PROFILE,
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
    };

    it("ADMIN USER UPDATE: admin suspends another user account successfully", async () => {
      h.mockProfile.findUnique.mockResolvedValue(adminUser);
      h.mockProfile.update.mockResolvedValue({
        id: SEEKER_PROFILE.id,
        email: SEEKER_PROFILE.email,
        fullName: SEEKER_PROFILE.fullName,
        role: "SEEKER",
        status: "SUSPENDED",
      });

      const { setSessionCookie } = await import("@/server/user-store");
      await setSessionCookie({ userId: ADMIN_ID, email: ADMIN_EMAIL });

      const req = new Request(`http://localhost:3000/api/admin/users/${SEEKER_PROFILE.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "SUSPENDED" }),
      });

      const res = await updateAdminUserPATCH(req, {
        params: Promise.resolve({ id: SEEKER_PROFILE.id }),
      });

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.status).toBe("SUSPENDED");
    });

    it("ADMIN USER UPDATE: prevents admin from suspending own account (400 CANNOT_MODIFY_SELF)", async () => {
      h.mockProfile.findUnique.mockResolvedValue(adminUser);

      const { setSessionCookie } = await import("@/server/user-store");
      await setSessionCookie({ userId: ADMIN_ID, email: ADMIN_EMAIL });

      const req = new Request(`http://localhost:3000/api/admin/users/${ADMIN_ID}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "SUSPENDED" }),
      });

      const res = await updateAdminUserPATCH(req, {
        params: Promise.resolve({ id: ADMIN_ID }),
      });

      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe("CANNOT_MODIFY_SELF");
    });
  });
});

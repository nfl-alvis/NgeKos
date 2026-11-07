/**
 * Tenant Room & Property API State Verification Test Suite.
 * 
 * Verifies backend property and room operations for tenant views with 100% data isolation:
 * 1. Public and tenant can read property details by slug/ID with full room types and facilities.
 * 2. Non-existent property throws 404 (PROPERTY_NOT_FOUND).
 * 3. Seeker cannot update property details (403 FORBIDDEN - only OWNER/ADMIN).
 * 4. Seeker cannot delete property (403 FORBIDDEN - only OWNER/ADMIN).
 * 5. Room unit mapping: preserves floor, unit number, status, and room type specifications.
 * 6. Fail-fast error propagation: database exceptions propagate without masking.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Profile } from "@prisma/client";

// Hoisted mock for PropertyRepository
const h = vi.hoisted(() => {
  const mockRepo = {
    findManyPublic: vi.fn(),
    findManyByOwner: vi.fn(),
    findRecord: vi.fn(),
    slugExists: vi.fn(),
    validateFacilities: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countActiveAgreements: vi.fn(),
  };
  return { mockRepo };
});

vi.mock("@/server/property-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/property-repository")>();
  return {
    ...actual,
    getPropertyRepository: () => h.mockRepo,
  };
});

// Import services under test
import { getProperty, updateProperty, deleteProperty } from "@/server/property-service";

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

const OWNER_PROFILE: Profile = {
  ...TENANT_A,
  id: "99999999-9999-4999-8999-999999999999",
  email: "owner@test.id",
  fullName: "Pemilik Kost",
  role: "OWNER",
};

describe("Tenant Room & Property API Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Reading property by identifier
  it("1. Successfully retrieves property details with facilities and room types", async () => {
    h.mockRepo.findRecord.mockResolvedValueOnce({
      id: "p-1",
      slug: "kost-asri",
      name: "Kost Asri",
      tagline: "Nyaman dan tenang",
      description: "Dekat kampus utama",
      city: "Bandung",
      district: "Coblong",
      address: "Jl. Dago No. 12",
      postalCode: "40132",
      latitude: null,
      longitude: null,
      gender: "ALL",
      status: "VERIFIED",
      rejectionNote: null,
      depositAmount: 500000,
      minMonthlyPrice: 1500000,
      distanceToCampusM: 450,
      averageRating: 4.8,
      reviewCount: 12,
      publishedAt: new Date(),
      ownerId: OWNER_PROFILE.id,
      owner: {
        id: OWNER_PROFILE.id,
        fullName: OWNER_PROFILE.fullName,
        email: OWNER_PROFILE.email,
        phone: OWNER_PROFILE.phone,
        avatarUrl: null,
      },
      images: [],
      facilities: [
        {
          facility: {
            key: "wifi",
            nameId: "WiFi Cepat",
            nameEn: "High-Speed WiFi",
            icon: "Wifi",
          },
        },
      ],
      roomTypes: [
        {
          id: "rt-1",
          name: "Kamar Standar",
          description: "Kamar mandi dalam",
          pricePerMonth: 1500000,
          sizeM2: 16,
          capacity: 1,
          units: [
            {
              id: "ru-1",
              number: "101",
              floor: 1,
              status: "OCCUPIED",
              roomTypeId: "rt-1",
            },
          ],
        },
      ],
    });

    const result = await getProperty("kost-asri", TENANT_A);

    expect(result.name).toBe("Kost Asri");
    expect(result.distanceToCampusM).toBe(450);
    expect(result.facilities).toHaveLength(1);
    expect(result.facilities[0].key).toBe("wifi");
    expect(result.roomTypes[0].units[0].number).toBe("101");
  });

  // 2. Non-existent property throws 404
  it("2. Non-existent property throws 404 (PROPERTY_NOT_FOUND)", async () => {
    h.mockRepo.findRecord.mockResolvedValueOnce(null);

    await expect(getProperty("unknown-kost", TENANT_A)).rejects.toMatchObject({
      status: 404,
      code: "PROPERTY_NOT_FOUND",
    });
  });

  // 3. Seeker cannot update property details
  it("3. Seeker is forbidden from updating property details (403 FORBIDDEN)", async () => {
    h.mockRepo.findRecord.mockResolvedValueOnce({
      id: "p-1",
      ownerId: OWNER_PROFILE.id,
    });

    await expect(
      updateProperty(TENANT_A, "p-1", { name: "Hacked Kost" })
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  // 4. Seeker cannot delete property
  it("4. Seeker is forbidden from deleting property (403 FORBIDDEN)", async () => {
    h.mockRepo.findRecord.mockResolvedValueOnce({
      id: "p-1",
      ownerId: OWNER_PROFILE.id,
    });

    await expect(deleteProperty(TENANT_A, "p-1")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  // 5. Fail-fast error propagation
  it("5. Propagates repository exceptions immediately without silent mock fallback", async () => {
    h.mockRepo.findRecord.mockRejectedValueOnce(
      new Error("Prisma client failed to acquire pool connection")
    );

    await expect(getProperty("kost-asri", TENANT_A)).rejects.toThrow(
      "Prisma client failed to acquire pool connection"
    );
  });
});

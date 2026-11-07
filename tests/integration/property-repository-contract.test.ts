/**
 * Property Repository Contract & Seam Verification Test Suite.
 * 
 * Verifies the Property Repository Seam according to Matt Pocock's design principles:
 * - "One adapter means a hypothetical seam. Two adapters means a real one."
 * - "The interface is the test surface."
 * 
 * Tests both concrete adapters:
 * 1. InMemoryPropertyRepository (Deterministic, 100% data isolated, no network/DB)
 * 2. PrismaPropertyRepository (Fail-fast production adapter, no silent fallback)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type Profile } from "@prisma/client";
import {
  InMemoryPropertyRepository,
  PrismaPropertyRepository,
  getPropertyRepository,
  setPropertyRepository,
} from "@/server/property-repository";
import {
  createProperty,
  listPublicProperties,
  getProperty,
  updateProperty,
  deleteProperty,
} from "@/server/property-service";
import { ApiError } from "@/server/http";

const OWNER: Profile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@test.id",
  fullName: "Owner Contract Tester",
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

const SEEKER: Profile = {
  ...OWNER,
  id: "22222222-2222-4222-8222-222222222222",
  email: "seeker@test.id",
  role: "SEEKER",
};

describe("Property Repository Seam & Adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default repository
    setPropertyRepository(new PrismaPropertyRepository());
  });

  // ==========================================
  // 1. IN-MEMORY ADAPTER (Offline & Test Seam)
  // ==========================================
  describe("1. InMemoryPropertyRepository", () => {
    it("creates, retrieves, filters, updates, and deletes properties in memory without DB", async () => {
      const memoryRepo = new InMemoryPropertyRepository();
      setPropertyRepository(memoryRepo);

      // A. Create Property
      const created = await createProperty(OWNER, {
        name: "Kost Mawar Asri",
        description: "Kost nyaman strategis",
        city: "Malang",
        district: "Lowokwaru",
        address: "Jl. Soekarno Hatta No. 12",
        gender: "FEMALE",
        facilities: ["wifi", "ac"],
        autoSubmitVerification: true,
      });

      expect(created.id).toBeDefined();
      expect(created.slug).toBe("kost-mawar-asri");
      expect(created.city).toBe("Malang");
      expect(created.status).toBe("PENDING");

      // B. Detail lookup by slug
      const found = await getProperty("kost-mawar-asri", OWNER);
      expect(found.id).toBe(created.id);
      expect(found.name).toBe("Kost Mawar Asri");

      // C. Public Listing (only shows VERIFIED properties)
      const emptyPublic = await listPublicProperties({
        city: "Malang",
        page: 1,
        limit: 10,
        sort: "rating",
        facilities: [],
      });
      expect(emptyPublic.items).toHaveLength(0); // Still PENDING!

      // D. Update Property (Owner can update)
      const updated = await updateProperty(OWNER, created.id, {
        name: "Kost Mawar Asri Premium",
        facilities: ["wifi", "ac"],
      });
      expect(updated.name).toBe("Kost Mawar Asri Premium");

      // E. Delete Property
      await deleteProperty(OWNER, created.id);
      await expect(getProperty(created.id, OWNER)).rejects.toThrow(ApiError);
    });

    it("enforces facility validation against known facilities in memory", async () => {
      const memoryRepo = new InMemoryPropertyRepository();
      setPropertyRepository(memoryRepo);

      await expect(
        createProperty(OWNER, {
          name: "Kost Alien",
          description: "Desc",
          city: "Malang",
          district: "Lowokwaru",
          address: "Address",
          gender: "MIXED",
          facilities: ["unknown_teleportation_pod"],
          autoSubmitVerification: true,
        })
      ).rejects.toThrow(ApiError);
    });

    it("forbids non-owner from updating or deleting property (403)", async () => {
      const memoryRepo = new InMemoryPropertyRepository();
      setPropertyRepository(memoryRepo);

      const created = await createProperty(OWNER, {
        name: "Kost Owner Pribadi",
        description: "Desc",
        city: "Malang",
        district: "Lowokwaru",
        address: "Address",
        gender: "MIXED",
        facilities: ["wifi"],
        autoSubmitVerification: true,
      });

      // Seeker attempts update
      await expect(
        updateProperty(SEEKER, created.id, { name: "Hijacked" })
      ).rejects.toThrow(ApiError);

      // Seeker attempts delete
      await expect(deleteProperty(SEEKER, created.id)).rejects.toThrow(ApiError);
    });

    it("prevents deletion if property has active rental agreements (409 ACTIVE_TENANCY)", async () => {
      const memoryRepo = new InMemoryPropertyRepository();
      setPropertyRepository(memoryRepo);

      const created = await createProperty(OWNER, {
        name: "Kost Tersewa",
        description: "Desc",
        city: "Malang",
        district: "Lowokwaru",
        address: "Address",
        gender: "MIXED",
        facilities: ["wifi"],
        autoSubmitVerification: true,
      });

      // Simulate active tenancy
      memoryRepo.setActiveAgreements(created.id, 2);

      await expect(deleteProperty(OWNER, created.id)).rejects.toThrow(
        "A property with active tenants cannot be deleted"
      );
    });
  });

  // ==========================================
  // 2. PRISMA ADAPTER (Production Fail-Fast & Seam Invariant)
  // ==========================================
  describe("2. PrismaPropertyRepository Fail-Fast & Seam Invariant", () => {
    it("fails fast when database errors occur instead of silently falling back to mock fixtures", async () => {
      const mockDb = {
        property: {
          findFirst: vi.fn().mockRejectedValue(new Error("Database connection pool timeout")),
        },
      } as unknown as typeof import("@/lib/prisma").prisma;

      const prismaRepo = new PrismaPropertyRepository(mockDb);
      setPropertyRepository(prismaRepo);

      // Calling getProperty should throw the database error, NOT return static mock data
      await expect(getProperty("some-kost-id", OWNER)).rejects.toThrow("Database connection pool timeout");
    });

    it("enforces atomic active tenancy validation during delete transaction", async () => {
      const mockDb = {
        $transaction: vi.fn().mockImplementation(async (callback) => {
          const tx = {
            rentalAgreement: {
              count: vi.fn().mockResolvedValue(1), // 1 active tenant!
            },
            property: {
              update: vi.fn(),
            },
          };
          return callback(tx);
        }),
      } as unknown as typeof import("@/lib/prisma").prisma;

      const prismaRepo = new PrismaPropertyRepository(mockDb);
      await expect(prismaRepo.delete("prop-active-123")).rejects.toThrow(
        "A property with active tenants cannot be deleted"
      );
    });

    it("production guard prevents overriding repository in production environment", () => {
      try {
        vi.stubEnv("NODE_ENV", "production");
        const dummyRepo = new InMemoryPropertyRepository();
        setPropertyRepository(dummyRepo);

        // In production, setPropertyRepository was ignored
        expect(getPropertyRepository()).toBeInstanceOf(PrismaPropertyRepository);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
});

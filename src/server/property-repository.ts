import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type Profile, type RoomStatus } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { propertyIdentifierWhere, type propertyListQuerySchema } from "@/server/properties";
import type { PropertyCreateInput } from "@/server/validation";
import type { z } from "zod";

export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;

export const propertyInclude = {
  owner: { select: { id: true, fullName: true, phone: true } },
  images: { orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }] },
  facilities: { include: { facility: true } },
  roomTypes: {
    where: { deletedAt: null },
    orderBy: { pricePerMonth: "asc" as const },
    include: {
      units: {
        where: { deletedAt: null },
        select: { id: true, number: true, floor: true, status: true, roomTypeId: true },
      },
    },
  },
} satisfies Prisma.PropertyInclude;

export type PropertyRecord = Prisma.PropertyGetPayload<{ include: typeof propertyInclude }>;

/**
 * Seam Repository Properti (Prinsip Matt Pocock - Deep Module & Seams).
 * 
 * Satu interface seragam yang dipenuhi oleh dua adapter:
 * 1. PrismaPropertyRepository (Produksi - PostgreSQL / Supabase, fail-fast, tanpa fallback tersembunyi)
 * 2. InMemoryPropertyRepository (Test / Demo Terisolasi - deterministik, tanpa I/O database)
 */
export interface PropertyRepository {
  findManyPublic(query: PropertyListQuery): Promise<{ items: PropertyRecord[]; total: number }>;
  findManyByOwner(owner: Profile, query: Pick<PropertyListQuery, "page" | "limit">): Promise<{ items: PropertyRecord[]; total: number }>;
  findRecord(identifier: string, viewer?: Profile | null): Promise<PropertyRecord | null>;
  slugExists(slug: string): Promise<boolean>;
  validateFacilities(facilityKeys: string[]): Promise<boolean>;
  create(owner: Profile, input: PropertyCreateInput, slug: string): Promise<PropertyRecord>;
  update(owner: Profile, id: string, input: Partial<PropertyCreateInput>): Promise<PropertyRecord>;
  delete(id: string): Promise<void>;
  countActiveAgreements(propertyId: string): Promise<number>;
}

// ==========================================
// 1. ADAPTER PRODUKSI (Prisma PostgreSQL)
// ==========================================
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly db = defaultPrisma) {}

  async findManyPublic(query: PropertyListQuery): Promise<{ items: PropertyRecord[]; total: number }> {
    const where: Prisma.PropertyWhereInput = {
      status: "VERIFIED",
      deletedAt: null,
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.maxPrice !== undefined ? { minMonthlyPrice: { lte: query.maxPrice } } : {}),
      ...(query.q
        ? {
            OR: ["name", "city", "district", "address"].map((field) => ({
              [field]: { contains: query.q, mode: "insensitive" },
            })) as Prisma.PropertyWhereInput[],
          }
        : {}),
      ...(query.facilities.length
        ? {
            AND: query.facilities.map((key) => ({
              facilities: { some: { facility: { key } } },
            })),
          }
        : {}),
    };

    const orderBy: Prisma.PropertyOrderByWithRelationInput[] =
      query.sort === "price-asc"
        ? [{ minMonthlyPrice: "asc" }, { averageRating: "desc" }]
        : query.sort === "price-desc"
          ? [{ minMonthlyPrice: "desc" }, { averageRating: "desc" }]
          : query.sort === "newest"
            ? [{ publishedAt: "desc" }]
            : [{ averageRating: "desc" }, { reviewCount: "desc" }];

    const [items, total] = await this.db.$transaction([
      this.db.property.findMany({
        where,
        include: propertyInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.property.count({ where }),
    ]);

    return { items, total };
  }

  async findManyByOwner(owner: Profile, query: Pick<PropertyListQuery, "page" | "limit">): Promise<{ items: PropertyRecord[]; total: number }> {
    const where: Prisma.PropertyWhereInput =
      owner.role === "ADMIN" ? { deletedAt: null } : { ownerId: owner.id, deletedAt: null };

    const [items, total] = await this.db.$transaction([
      this.db.property.findMany({
        where,
        include: propertyInclude,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.property.count({ where }),
    ]);

    return { items, total };
  }

  async findRecord(identifier: string, viewer?: Profile | null): Promise<PropertyRecord | null> {
    const whereAnd: Prisma.PropertyWhereInput[] = [propertyIdentifierWhere(identifier)];

    if (viewer?.role === "ADMIN") {
      // Admin dapat melihat seluruh status
    } else if (viewer?.role === "OWNER") {
      whereAnd.push({ OR: [{ ownerId: viewer.id }, { status: "VERIFIED" }] });
    } else {
      whereAnd.push({ status: "VERIFIED" });
    }

    return this.db.property.findFirst({
      where: {
        deletedAt: null,
        AND: whereAnd,
      },
      include: propertyInclude,
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    const existing = await this.db.property.findUnique({
      where: { slug },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async validateFacilities(facilityKeys: string[]): Promise<boolean> {
    if (!facilityKeys.length) return true;
    const uniqueKeys = [...new Set(facilityKeys)];
    const count = await this.db.facility.count({
      where: { key: { in: uniqueKeys } },
    });
    return count === uniqueKeys.length;
  }

  async create(owner: Profile, input: PropertyCreateInput, slug: string): Promise<PropertyRecord> {
    const {
      facilities,
      latitude,
      longitude,
      depositAmount,
      roomTypes,
      images,
      autoSubmitVerification = true,
      ...data
    } = input;

    return this.db.$transaction(
      async (tx) => {
        let minPrice = new Prisma.Decimal(1500000);
        if (roomTypes && roomTypes.length > 0) {
          const prices = roomTypes.map((rt) => new Prisma.Decimal(rt.pricePerMonth));
          minPrice = prices.reduce((min, p) => (p.lessThan(min) ? p : min), prices[0]);
        }

        const prop = await tx.property.create({
          data: {
            ...data,
            ownerId: owner.id,
            slug,
            status: autoSubmitVerification ? "PENDING" : "DRAFT",
            minMonthlyPrice: minPrice,
            latitude: latitude === undefined ? undefined : new Prisma.Decimal(latitude),
            longitude: longitude === undefined ? undefined : new Prisma.Decimal(longitude),
            depositAmount: depositAmount === undefined ? undefined : new Prisma.Decimal(depositAmount),
            facilities: { create: facilities.map((key) => ({ facility: { connect: { key } } })) },
          },
        });

        if (roomTypes && roomTypes.length > 0) {
          for (const rt of roomTypes) {
            const desc =
              rt.description ??
              (rt.facilities && rt.facilities.length > 0
                ? JSON.stringify({ facilities: rt.facilities })
                : null);
            const createdRt = await tx.roomType.create({
              data: {
                propertyId: prop.id,
                name: rt.name,
                description: desc,
                pricePerMonth: new Prisma.Decimal(rt.pricePerMonth),
                sizeM2: rt.sizeM2 ? new Prisma.Decimal(rt.sizeM2) : new Prisma.Decimal(12),
                capacity: 1,
              },
            });
            const totalUnits = rt.total ?? 1;
            const availUnits = rt.available !== undefined ? rt.available : totalUnits;
            const units = Array.from({ length: totalUnits }, (_, idx) => ({
              propertyId: prop.id,
              roomTypeId: createdRt.id,
              number: `${idx + 1}`,
              floor: "1",
              status: (idx + 1 <= availUnits ? "AVAILABLE" : "OCCUPIED") as RoomStatus,
            }));
            if (units.length > 0) {
              await tx.roomUnit.createMany({ data: units });
            }
          }
        } else {
          const defaultPrice = new Prisma.Decimal(1500000);
          const createdRt = await tx.roomType.create({
            data: {
              propertyId: prop.id,
              name: "Kamar Standar",
              pricePerMonth: defaultPrice,
              sizeM2: new Prisma.Decimal(12),
              capacity: 1,
            },
          });
          await tx.roomUnit.create({
            data: {
              propertyId: prop.id,
              roomTypeId: createdRt.id,
              number: "1",
              floor: "1",
              status: "AVAILABLE",
            },
          });
        }

        if (images && images.length > 0) {
          const imgs = images.map((img, i) => ({
            propertyId: prop.id,
            storagePath: img.storagePath || `defaults/${prop.slug}-${i}.jpg`,
            altText: img.altText ?? prop.name,
            isCover: img.isCover ?? (i === 0),
            sortOrder: i,
          }));
          await tx.propertyImage.createMany({ data: imgs });
        } else {
          await tx.propertyImage.create({
            data: {
              propertyId: prop.id,
              storagePath: `defaults/${prop.slug}.jpg`,
              altText: prop.name,
              isCover: true,
              sortOrder: 0,
            },
          });
        }

        if (autoSubmitVerification) {
          await tx.propertyVerification.create({
            data: {
              propertyId: prop.id,
              submittedAt: new Date(),
            },
          });
        }

        return tx.property.findUniqueOrThrow({
          where: { id: prop.id },
          include: propertyInclude,
        });
      },
      { timeout: 25000, maxWait: 10000 }
    );
  }

  async update(owner: Profile, id: string, input: Partial<PropertyCreateInput>): Promise<PropertyRecord> {
    const {
      facilities,
      latitude,
      longitude,
      depositAmount,
      roomTypes: _rt,
      images: _img,
      autoSubmitVerification: _asv,
      ...data
    } = input;

    return this.db.$transaction(
      async (tx) => {
        const existing = await tx.property.findUnique({ where: { id }, select: { status: true } });
        if (facilities) {
          await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
          for (const key of facilities) {
            await tx.propertyFacility.create({
              data: { property: { connect: { id } }, facility: { connect: { key } } },
            });
          }
        }
        return tx.property.update({
          where: { id },
          data: {
            ...data,
            ...(latitude === undefined ? {} : { latitude: new Prisma.Decimal(latitude) }),
            ...(longitude === undefined ? {} : { longitude: new Prisma.Decimal(longitude) }),
            ...(depositAmount === undefined ? {} : { depositAmount: new Prisma.Decimal(depositAmount) }),
            ...(existing?.status === "REJECTED" ? { status: "DRAFT", rejectionNote: null } : {}),
          },
          include: propertyInclude,
        });
      },
      { timeout: 25000, maxWait: 10000 }
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.$transaction(
      async (tx) => {
        const active = await tx.rentalAgreement.count({
          where: { propertyId: id, status: "ACTIVE" },
        });
        if (active > 0) {
          throw new ApiError(409, "ACTIVE_TENANCY", "A property with active tenants cannot be deleted");
        }
        await tx.property.update({
          where: { id },
          data: { deletedAt: new Date(), status: "INACTIVE" },
        });
      },
      { timeout: 25000, maxWait: 10000 }
    );
  }

  async countActiveAgreements(propertyId: string): Promise<number> {
    return this.db.rentalAgreement.count({
      where: { propertyId, status: "ACTIVE" },
    });
  }
}

// ==========================================
// 2. ADAPTER TEST / DETERMINISTIK (In-Memory)
// ==========================================
export class InMemoryPropertyRepository implements PropertyRepository {
  private records = new Map<string, PropertyRecord>();
  private facilities = new Set<string>(["wifi", "ac", "parking", "bathroom_inside", "furnished"]);
  private activeAgreements = new Map<string, number>();

  constructor(initialData: PropertyRecord[] = []) {
    for (const item of initialData) {
      this.records.set(item.id, item);
      if (item.slug) this.records.set(item.slug, item);
    }
  }

  setActiveAgreements(propertyId: string, count: number): void {
    this.activeAgreements.set(propertyId, count);
  }

  async findManyPublic(query: PropertyListQuery): Promise<{ items: PropertyRecord[]; total: number }> {
    const all = Array.from(new Set(this.records.values())).filter(
      (p) => p.status === "VERIFIED" && p.deletedAt === null
    );

    let filtered = all;
    if (query.city) {
      filtered = filtered.filter((p) => p.city.toLowerCase() === query.city!.toLowerCase());
    }
    if (query.gender) {
      filtered = filtered.filter((p) => p.gender === query.gender);
    }
    if (query.maxPrice !== undefined) {
      filtered = filtered.filter((p) => Number(p.minMonthlyPrice) <= query.maxPrice!);
    }
    if (query.q) {
      const qLower = query.q.toLowerCase();
      filtered = filtered.filter((p) =>
        (p.name + p.city + p.district + p.address).toLowerCase().includes(qLower)
      );
    }

    const total = filtered.length;
    const skip = (query.page - 1) * query.limit;
    const items = filtered.slice(skip, skip + query.limit);
    return { items, total };
  }

  async findManyByOwner(owner: Profile, query: Pick<PropertyListQuery, "page" | "limit">): Promise<{ items: PropertyRecord[]; total: number }> {
    const all = Array.from(new Set(this.records.values())).filter(
      (p) => p.deletedAt === null && (owner.role === "ADMIN" || p.ownerId === owner.id)
    );
    const total = all.length;
    const skip = (query.page - 1) * query.limit;
    const items = all.slice(skip, skip + query.limit);
    return { items, total };
  }

  async findRecord(identifier: string, viewer?: Profile | null): Promise<PropertyRecord | null> {
    const item = this.records.get(identifier);
    if (!item || item.deletedAt !== null) return null;

    if (viewer?.role === "ADMIN") return item;
    if (viewer?.role === "OWNER" && item.ownerId === viewer.id) return item;
    if (item.status === "VERIFIED") return item;

    return null;
  }

  async slugExists(slug: string): Promise<boolean> {
    return this.records.has(slug);
  }

  async validateFacilities(facilityKeys: string[]): Promise<boolean> {
    return facilityKeys.every((key) => this.facilities.has(key));
  }

  async create(owner: Profile, input: PropertyCreateInput, slug: string): Promise<PropertyRecord> {
    const id = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const record: PropertyRecord = {
      id,
      slug,
      name: input.name,
      tagline: input.tagline ?? null,
      description: input.description,
      city: input.city,
      district: input.district,
      address: input.address,
      postalCode: input.postalCode ?? null,
      latitude: input.latitude ? new Prisma.Decimal(input.latitude) : null,
      longitude: input.longitude ? new Prisma.Decimal(input.longitude) : null,
      gender: input.gender,
      status: input.autoSubmitVerification !== false ? "PENDING" : "DRAFT",
      rejectionNote: null,
      maxRooms: null,
      depositAmount: input.depositAmount ? new Prisma.Decimal(input.depositAmount) : null,
      minMonthlyPrice: new Prisma.Decimal(input.roomTypes?.[0]?.pricePerMonth ?? 1500000),
      distanceToCampusM: null,
      averageRating: new Prisma.Decimal(0),
      reviewCount: 0,
      publishedAt: null,
      ownerId: owner.id,
      owner: { id: owner.id, fullName: owner.fullName, phone: owner.phone },
      images: [],
      facilities: input.facilities.map((k) => ({
        propertyId: id,
        facilityId: `fac-${k}`,
        facility: {
          id: `fac-${k}`,
          key: k,
          nameId: k,
          nameEn: k,
          icon: null,
          category: "GENERAL" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })),
      roomTypes: (input.roomTypes || []).map((rt, idx) => ({
        id: `rt-${idx}`,
        propertyId: id,
        name: rt.name,
        description:
          rt.description ??
          (rt.facilities && rt.facilities.length > 0
            ? JSON.stringify({ facilities: rt.facilities })
            : null),
        pricePerMonth: new Prisma.Decimal(rt.pricePerMonth),
        sizeM2: rt.sizeM2 ? new Prisma.Decimal(rt.sizeM2) : new Prisma.Decimal(12),
        capacity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        units: [],
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    this.records.set(id, record);
    this.records.set(slug, record);
    return record;
  }

  async update(owner: Profile, id: string, input: Partial<PropertyCreateInput>): Promise<PropertyRecord> {
    const existing = this.records.get(id);
    if (!existing) throw new Error("Property not found");

    const updated: PropertyRecord = {
      ...existing,
      name: input.name ?? existing.name,
      tagline: input.tagline !== undefined ? input.tagline : existing.tagline,
      description: input.description ?? existing.description,
      city: input.city ?? existing.city,
      district: input.district ?? existing.district,
      address: input.address ?? existing.address,
      updatedAt: new Date(),
    };

    this.records.set(id, updated);
    if (updated.slug) this.records.set(updated.slug, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const active = await this.countActiveAgreements(id);
    if (active > 0) {
      throw new ApiError(409, "ACTIVE_TENANCY", "A property with active tenants cannot be deleted");
    }
    const existing = this.records.get(id);
    if (existing) {
      existing.deletedAt = new Date();
      existing.status = "INACTIVE";
    }
  }

  async countActiveAgreements(propertyId: string): Promise<number> {
    return this.activeAgreements.get(propertyId) ?? 0;
  }
}

// ==========================================
// 3. SEAM PROVIDER & DEPENDENCY INJECTION
// ==========================================
let currentRepository: PropertyRepository = new PrismaPropertyRepository();

export function getPropertyRepository(): PropertyRepository {
  return currentRepository;
}

export function setPropertyRepository(repo: PropertyRepository): void {
  if (process.env.NODE_ENV === "production") {
    console.warn("[PropertyRepository] setPropertyRepository ignored in production environment");
    return;
  }
  currentRepository = repo;
}

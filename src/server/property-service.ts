import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type Profile } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { propertyIdentifierWhere, slugifyPropertyName, type propertyListQuerySchema } from "@/server/properties";
import type { PropertyCreateInput } from "@/server/validation";
import type { z } from "zod";

type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;

const propertyInclude = {
  owner: { select: { id: true, fullName: true, phone: true } },
  images: { orderBy: [{ isCover: "desc" as const }, { sortOrder: "asc" as const }] },
  facilities: { include: { facility: true } },
  roomTypes: {
    where: { deletedAt: null },
    orderBy: { pricePerMonth: "asc" as const },
    include: { units: { where: { deletedAt: null }, select: { id: true, number: true, floor: true, status: true, roomTypeId: true } } },
  },
} satisfies Prisma.PropertyInclude;

type PropertyRecord = Prisma.PropertyGetPayload<{ include: typeof propertyInclude }>;

function storageUrl(path: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET}/${encoded}`;
}

export function propertyDto(property: PropertyRecord) {
  return {
    id: property.id,
    slug: property.slug,
    name: property.name,
    tagline: property.tagline,
    description: property.description,
    city: property.city,
    district: property.district,
    address: property.address,
    postalCode: property.postalCode,
    latitude: property.latitude === null ? null : Number(property.latitude),
    longitude: property.longitude === null ? null : Number(property.longitude),
    gender: property.gender,
    status: property.status,
    rejectionNote: property.rejectionNote,
    depositAmount: property.depositAmount === null ? null : Number(property.depositAmount),
    minPrice: Number(property.minMonthlyPrice),
    distanceToCampusM: property.distanceToCampusM,
    rating: Number(property.averageRating),
    reviewCount: property.reviewCount,
    publishedAt: property.publishedAt,
    owner: property.owner,
    images: property.images.map((image) => ({ ...image, url: storageUrl(image.storagePath) })),
    facilities: property.facilities.map(({ facility }) => ({ key: facility.key, nameId: facility.nameId, nameEn: facility.nameEn, icon: facility.icon })),
    roomTypes: property.roomTypes.map((roomType) => ({
      id: roomType.id,
      name: roomType.name,
      description: roomType.description,
      pricePerMonth: Number(roomType.pricePerMonth),
      sizeM2: roomType.sizeM2 === null ? null : Number(roomType.sizeM2),
      capacity: roomType.capacity,
      total: roomType.units.length,
      available: roomType.units.filter((unit) => unit.status === "AVAILABLE").length,
      units: roomType.units.map((unit) => ({
        id: unit.id,
        number: unit.number,
        floor: unit.floor,
        status: unit.status,
        roomTypeId: unit.roomTypeId,
      })),
    })),
  };
}

import { properties as staticProperties } from "@/lib/data/properties";
import { OWNER_PROPERTY_SLUGS } from "@/lib/data/entities";

const localStore = new Map<string, any>();

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 2000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Database timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

function mapStaticToDto(p: any, ownerId = "58983471-0904-40df-beb8-3a51888b176b") {
  return {
    id: p.id || `prop-${p.slug}`,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline ?? "",
    description: p.description,
    city: p.city,
    district: p.district,
    address: p.address,
    postalCode: p.postalCode ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    gender: p.gender === "male" ? "MALE" : p.gender === "female" ? "FEMALE" : "MIXED",
    status: p.verificationStatus === "verified" ? "VERIFIED" : p.verificationStatus === "rejected" ? "REJECTED" : "PENDING",
    rejectionNote: p.verificationNote ?? null,
    depositAmount: p.dpAmount ?? (p.depositInfo?.includes("500") ? 500000 : null),
    minPrice: p.minPrice ?? 0,
    distanceToCampusM: p.distanceToCampusM ?? 0,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    publishedAt: p.verificationStatus === "verified" ? new Date().toISOString() : null,
    owner: { id: ownerId, fullName: "Ratri Wulandari (Owner Demo)", phone: null },
    images: [],
    facilities: (p.facilities || []).map((key: string) => ({ key, nameId: key, nameEn: key, icon: null })),
    roomTypes: (p.roomTypes || []).map((rt: any) => ({
      id: rt.id || `rt-${rt.name}`,
      name: rt.name,
      description: null,
      pricePerMonth: rt.pricePerMonth,
      sizeM2: rt.sizeM2 ?? 12,
      capacity: 1,
      total: rt.total ?? 1,
      available: rt.available ?? 1,
      units: [],
    })),
    ownerId,
  };
}

export async function listPublicProperties(query: PropertyListQuery) {
  try {
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

    const [items, total] = await withTimeout(
      prisma.$transaction([
        prisma.property.findMany({ where, include: propertyInclude, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
        prisma.property.count({ where }),
      ]),
      2000
    );

    return { items: items.map(propertyDto), total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
  } catch {
    // Fallback using local store + static properties
    const localVerified = Array.from(new Set(localStore.values())).filter((p: any) => p.status === "VERIFIED");
    const staticMapped = staticProperties.map((p) => mapStaticToDto(p));
    const existingSlugs = new Set(localVerified.map((p: any) => p.slug));
    let combined = [...localVerified, ...staticMapped.filter((p) => !existingSlugs.has(p.slug))];

    if (query.city) combined = combined.filter((p) => p.city.toLowerCase().includes(query.city!.toLowerCase()));
    if (query.q) {
      const qLower = query.q.toLowerCase();
      combined = combined.filter((p) => (p.name + p.city + p.district + p.address).toLowerCase().includes(qLower));
    }
    const total = combined.length;
    const skip = (query.page - 1) * query.limit;
    const items = combined.slice(skip, skip + query.limit);
    return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) || 1 };
  }
}

export async function listOwnerProperties(owner: Profile, query: Pick<PropertyListQuery, "page" | "limit">) {
  try {
    const where: Prisma.PropertyWhereInput =
      owner.role === "ADMIN" ? { deletedAt: null } : { ownerId: owner.id, deletedAt: null };
    const [items, total] = await withTimeout(
      prisma.$transaction([
        prisma.property.findMany({
          where,
          include: propertyInclude,
          orderBy: { updatedAt: "desc" },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.property.count({ where }),
      ]),
      2000
    );
    return { items: items.map(propertyDto), total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
  } catch {
    // Fallback: Return properties created in localStore + exactly 1 demo property if owner
    const localList = Array.from(new Set(localStore.values())).filter(
      (p: any) => owner.role === "ADMIN" || p.ownerId === owner.id
    );
    const staticOwnerProps = staticProperties
      .filter((p) => OWNER_PROPERTY_SLUGS.includes(p.slug))
      .map((p) => mapStaticToDto(p, owner.id));
    const existingSlugs = new Set(localList.map((p: any) => p.slug));
    const combined = [...localList, ...staticOwnerProps.filter((p) => !existingSlugs.has(p.slug))];
    const total = combined.length;
    const skip = (query.page - 1) * query.limit;
    const items = combined.slice(skip, skip + query.limit);
    return { items, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) || 1 };
  }
}

export async function getProperty(identifier: string, viewer?: Profile | null) {
  try {
    const property = await withTimeout(
      prisma.property.findFirst({
        where: {
          deletedAt: null,
          AND: [
            propertyIdentifierWhere(identifier),
            viewer?.role === "ADMIN"
              ? {}
              : viewer?.role === "OWNER"
                ? { OR: [{ ownerId: viewer.id }, { status: "VERIFIED" }] }
                : { status: "VERIFIED" },
          ],
        },
        include: propertyInclude,
      }),
      2000
    );
    if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
    return propertyDto(property);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const prop = localStore.get(identifier) || staticProperties.find((p) => p.slug === identifier || p.id === identifier);
    if (!prop) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
    return prop.ownerId ? prop : mapStaticToDto(prop);
  }
}

async function uniqueSlug(name: string) {
  const base = slugifyPropertyName(name) || "kost";
  try {
    const existing = await withTimeout(prisma.property.findUnique({ where: { slug: base }, select: { id: true } }), 1000);
    return existing ? `${base}-${randomBytes(3).toString("hex")}` : base;
  } catch {
    return localStore.has(base) ? `${base}-${randomBytes(3).toString("hex")}` : base;
  }
}

async function assertFacilitiesExist(keys: string[]) {
  if (!keys.length) return;
  try {
    const count = await withTimeout(prisma.facility.count({ where: { key: { in: [...new Set(keys)] } } }), 1000);
    if (count !== new Set(keys).size) throw new ApiError(422, "UNKNOWN_FACILITY", "Terdapat fasilitas yang tidak dikenal");
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }
}

export async function getLocalPendingProperties() {
  return Array.from(new Set(localStore.values())).filter(
    (p: any) => p.status === "PENDING"
  );
}

export async function createProperty(owner: Profile, input: PropertyCreateInput) {
  await assertFacilitiesExist(input.facilities);
  const slug = await uniqueSlug(input.name);

  try {
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

    const property = await withTimeout(
      prisma.$transaction(async (tx) => {
        const prop = await tx.property.create({
          data: {
            ...data,
            ownerId: owner.id,
            slug,
            status: autoSubmitVerification ? "PENDING" : "DRAFT",
            latitude: latitude === undefined ? undefined : new Prisma.Decimal(latitude),
            longitude: longitude === undefined ? undefined : new Prisma.Decimal(longitude),
            depositAmount: depositAmount === undefined ? undefined : new Prisma.Decimal(depositAmount),
            facilities: { create: facilities.map((key) => ({ facility: { connect: { key } } })) },
          },
        });

        // Create room types & units if provided
        if (roomTypes && roomTypes.length > 0) {
          for (const rt of roomTypes) {
            const createdRt = await tx.roomType.create({
              data: {
                propertyId: prop.id,
                name: rt.name,
                description: rt.description ?? null,
                pricePerMonth: new Prisma.Decimal(rt.pricePerMonth),
                sizeM2: rt.sizeM2 ? new Prisma.Decimal(rt.sizeM2) : new Prisma.Decimal(12),
                capacity: 1,
              },
            });
            const totalUnits = rt.total ?? 1;
            const availUnits = rt.available !== undefined ? rt.available : totalUnits;
            for (let i = 1; i <= totalUnits; i++) {
              await tx.roomUnit.create({
                data: {
                  propertyId: prop.id,
                  roomTypeId: createdRt.id,
                  number: `${i}`,
                  floor: "1",
                  status: i <= availUnits ? "AVAILABLE" : "OCCUPIED",
                },
              });
            }
          }
          const aggregate = await tx.roomType.aggregate({
            where: { propertyId: prop.id, deletedAt: null },
            _min: { pricePerMonth: true },
          });
          if (aggregate._min.pricePerMonth) {
            await tx.property.update({
              where: { id: prop.id },
              data: { minMonthlyPrice: aggregate._min.pricePerMonth },
            });
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
          await tx.property.update({
            where: { id: prop.id },
            data: { minMonthlyPrice: defaultPrice },
          });
        }

        // Create images if provided
        if (images && images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            await tx.propertyImage.create({
              data: {
                propertyId: prop.id,
                storagePath: img.storagePath || `defaults/${prop.slug}-${i}.jpg`,
                altText: img.altText ?? prop.name,
                isCover: img.isCover ?? (i === 0),
                sortOrder: i,
              },
            });
          }
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

        // Auto submit verification
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
      }),
      5000
    );
    return propertyDto(property);
  } catch (dbErr) {
    if (dbErr instanceof ApiError) throw dbErr;
    // Fallback store
    const id = `prop-${Date.now()}-${randomBytes(3).toString("hex")}`;
    const autoVerif = input.autoSubmitVerification !== false;
    const newProp = {
      id,
      slug,
      name: input.name,
      tagline: input.tagline ?? "",
      description: input.description,
      city: input.city,
      district: input.district,
      address: input.address,
      postalCode: input.postalCode ?? null,
      latitude: input.latitude ? Number(input.latitude) : null,
      longitude: input.longitude ? Number(input.longitude) : null,
      gender: input.gender,
      status: autoVerif ? "PENDING" : "DRAFT",
      rejectionNote: null,
      depositAmount: input.depositAmount ? Number(input.depositAmount) : null,
      minPrice: input.roomTypes?.[0]?.pricePerMonth ?? 0,
      distanceToCampusM: null,
      rating: 0,
      reviewCount: 0,
      publishedAt: null,
      owner: { id: owner.id, fullName: owner.fullName, phone: owner.phone },
      images: input.images?.map((img, idx) => ({
        id: `img-${idx}`,
        storagePath: img.storagePath || "",
        url: img.url || "",
        isCover: img.isCover ?? (idx === 0),
      })) || [],
      facilities: input.facilities.map((k) => ({ key: k, nameId: k, nameEn: k, icon: null })),
      roomTypes: input.roomTypes?.map((rt, idx) => ({
        id: `rt-${idx}`,
        name: rt.name,
        description: rt.description ?? null,
        pricePerMonth: rt.pricePerMonth,
        sizeM2: rt.sizeM2 ?? 12,
        capacity: 1,
        total: rt.total ?? 1,
        available: rt.available ?? rt.total ?? 1,
        units: [],
      })) || [],
      ownerId: owner.id,
    };
    localStore.set(id, newProp);
    localStore.set(slug, newProp);
    return newProp;
  }
}

export async function updateProperty(owner: Profile, id: string, input: Partial<PropertyCreateInput>) {
  try {
    const existing = await withTimeout(prisma.property.findFirst({ where: { id, deletedAt: null }, select: { ownerId: true, status: true } }), 1000);
    if (!existing) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
    if (owner.role !== "ADMIN" && existing.ownerId !== owner.id) throw new ApiError(403, "FORBIDDEN", "Properti ini bukan milik Anda");
    const { facilities, latitude, longitude, depositAmount, roomTypes, images, autoSubmitVerification, ...data } = input;
    const property = await withTimeout(
      prisma.$transaction(async (tx) => {
        if (facilities) {
          await tx.propertyFacility.deleteMany({ where: { propertyId: id } });
          for (const key of facilities) {
            await tx.propertyFacility.create({ data: { property: { connect: { id } }, facility: { connect: { key } } } });
          }
        }
        return tx.property.update({
          where: { id },
          data: {
            ...data,
            ...(latitude === undefined ? {} : { latitude: new Prisma.Decimal(latitude) }),
            ...(longitude === undefined ? {} : { longitude: new Prisma.Decimal(longitude) }),
            ...(depositAmount === undefined ? {} : { depositAmount: new Prisma.Decimal(depositAmount) }),
            ...(existing.status === "REJECTED" ? { status: "DRAFT", rejectionNote: null } : {}),
          },
          include: propertyInclude,
        });
      }),
      2500
    );
    return propertyDto(property);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    let existing = localStore.get(id);
    if (!existing) {
      const staticP = staticProperties.find((p) => p.slug === id || p.id === id);
      if (staticP) {
        existing = mapStaticToDto(staticP, owner.id);
        localStore.set(id, existing);
      }
    }
    if (!existing) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
    const updated = { ...existing, ...input };
    localStore.set(id, updated);
    if (updated.slug) localStore.set(updated.slug, updated);
    return updated;
  }
}

export async function deleteProperty(owner: Profile, id: string) {
  try {
    const property = await withTimeout(prisma.property.findFirst({ where: { id, deletedAt: null }, select: { ownerId: true } }), 1000);
    if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
    if (owner.role !== "ADMIN" && property.ownerId !== owner.id) throw new ApiError(403, "FORBIDDEN", "Properti ini bukan milik Anda");
    const active = await withTimeout(prisma.rentalAgreement.count({ where: { propertyId: id, status: "ACTIVE" } }), 1000);
    if (active) throw new ApiError(409, "ACTIVE_TENANCY", "Properti dengan penyewa aktif tidak dapat dihapus");
    await withTimeout(prisma.property.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } }), 1500);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    localStore.delete(id);
  }
}

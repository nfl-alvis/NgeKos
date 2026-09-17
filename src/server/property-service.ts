import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type Profile } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { slugifyPropertyName, type propertyListQuerySchema } from "@/server/properties";
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
    include: { units: { where: { deletedAt: null }, select: { status: true } } },
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
    })),
  };
}

export async function listPublicProperties(query: PropertyListQuery) {
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

  const [items, total] = await prisma.$transaction([
    prisma.property.findMany({ where, include: propertyInclude, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.property.count({ where }),
  ]);

  return { items: items.map(propertyDto), total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

export async function listOwnerProperties(owner: Profile, query: Pick<PropertyListQuery, "page" | "limit">) {
  const where: Prisma.PropertyWhereInput =
    owner.role === "ADMIN" ? { deletedAt: null } : { ownerId: owner.id, deletedAt: null };
  const [items, total] = await prisma.$transaction([
    prisma.property.findMany({
      where,
      include: propertyInclude,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.property.count({ where }),
  ]);
  return { items: items.map(propertyDto), total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) };
}

export async function getProperty(identifier: string, viewer?: Profile | null) {
  const property = await prisma.property.findFirst({
    where: {
      deletedAt: null,
      AND: [
        { OR: [{ id: identifier }, { slug: identifier }] },
        viewer?.role === "ADMIN"
          ? {}
          : viewer?.role === "OWNER"
            ? { OR: [{ ownerId: viewer.id }, { status: "VERIFIED" }] }
            : { status: "VERIFIED" },
      ],
    },
    include: propertyInclude,
  });
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
  return propertyDto(property);
}

async function uniqueSlug(name: string) {
  const base = slugifyPropertyName(name) || "kost";
  const existing = await prisma.property.findUnique({ where: { slug: base }, select: { id: true } });
  return existing ? `${base}-${randomBytes(3).toString("hex")}` : base;
}

async function assertFacilitiesExist(keys: string[]) {
  if (!keys.length) return;
  const count = await prisma.facility.count({ where: { key: { in: [...new Set(keys)] } } });
  if (count !== new Set(keys).size) throw new ApiError(422, "UNKNOWN_FACILITY", "Terdapat fasilitas yang tidak dikenal");
}

export async function createProperty(owner: Profile, input: PropertyCreateInput) {
  await assertFacilitiesExist(input.facilities);
  const { facilities, latitude, longitude, depositAmount, ...data } = input;
  const property = await prisma.property.create({
    data: {
      ...data,
      ownerId: owner.id,
      slug: await uniqueSlug(input.name),
      latitude: latitude === undefined ? undefined : new Prisma.Decimal(latitude),
      longitude: longitude === undefined ? undefined : new Prisma.Decimal(longitude),
      depositAmount: depositAmount === undefined ? undefined : new Prisma.Decimal(depositAmount),
      facilities: { create: facilities.map((key) => ({ facility: { connect: { key } } })) },
    },
    include: propertyInclude,
  });
  return propertyDto(property);
}

export async function updateProperty(owner: Profile, id: string, input: Partial<PropertyCreateInput>) {
  const existing = await prisma.property.findFirst({ where: { id, deletedAt: null }, select: { ownerId: true, status: true } });
  if (!existing) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
  if (owner.role !== "ADMIN" && existing.ownerId !== owner.id) throw new ApiError(403, "FORBIDDEN", "Properti ini bukan milik Anda");
  if (input.facilities) await assertFacilitiesExist(input.facilities);

  const { facilities, latitude, longitude, depositAmount, ...data } = input;
  const property = await prisma.$transaction(async (tx) => {
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
  });
  return propertyDto(property);
}

export async function deleteProperty(owner: Profile, id: string) {
  const property = await prisma.property.findFirst({ where: { id, deletedAt: null }, select: { ownerId: true } });
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
  if (owner.role !== "ADMIN" && property.ownerId !== owner.id) throw new ApiError(403, "FORBIDDEN", "Properti ini bukan milik Anda");
  const active = await prisma.rentalAgreement.count({ where: { propertyId: id, status: "ACTIVE" } });
  if (active) throw new ApiError(409, "ACTIVE_TENANCY", "Properti dengan penyewa aktif tidak dapat dihapus");
  await prisma.property.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
}

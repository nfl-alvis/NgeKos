import "server-only";
import { randomBytes } from "node:crypto";
import type { Profile } from "@prisma/client";
import { env } from "@/lib/env";
import { ApiError } from "@/server/http";
import { slugifyPropertyName, type propertyListQuerySchema } from "@/server/properties";
import type { PropertyCreateInput } from "@/server/validation";
import type { z } from "zod";
import {
  getPropertyRepository,
  type PropertyRecord,
  type PropertyRepository,
} from "@/server/property-repository";

export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;

function storageUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
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
    facilities: property.facilities.map(({ facility }) => ({
      key: facility.key,
      nameId: facility.nameId,
      nameEn: facility.nameEn,
      icon: facility.icon,
    })),
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

async function uniqueSlug(repo: PropertyRepository, name: string): Promise<string> {
  const base = slugifyPropertyName(name) || "kost";
  const exists = await repo.slugExists(base);
  return exists ? `${base}-${randomBytes(3).toString("hex")}` : base;
}

export async function listPublicProperties(query: PropertyListQuery) {
  const repo = getPropertyRepository();
  const { items, total } = await repo.findManyPublic(query);
  return {
    items: items.map(propertyDto),
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.ceil(total / query.limit) || 1,
  };
}

export async function listOwnerProperties(owner: Profile, query: Pick<PropertyListQuery, "page" | "limit">) {
  const repo = getPropertyRepository();
  const { items, total } = await repo.findManyByOwner(owner, query);
  return {
    items: items.map(propertyDto),
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.ceil(total / query.limit) || 1,
  };
}

export async function getProperty(identifier: string, viewer?: Profile | null) {
  const repo = getPropertyRepository();
  const property = await repo.findRecord(identifier, viewer);
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Property not found");
  return propertyDto(property);
}

export async function getLocalPendingProperties(): Promise<any[]> {
  return [];
}

export async function createProperty(owner: Profile, input: PropertyCreateInput) {
  const repo = getPropertyRepository();
  const validFacilities = await repo.validateFacilities(input.facilities);
  if (!validFacilities) {
    throw new ApiError(422, "UNKNOWN_FACILITY", "Unknown facility value found");
  }

  const slug = await uniqueSlug(repo, input.name);
  const created = await repo.create(owner, input, slug);
  return propertyDto(created);
}

export async function updateProperty(owner: Profile, id: string, input: Partial<PropertyCreateInput>) {
  const repo = getPropertyRepository();
  const existing = await repo.findRecord(id, owner);
  if (!existing) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Property not found");

  if (owner.role !== "ADMIN" && existing.ownerId !== owner.id) {
    throw new ApiError(403, "FORBIDDEN", "You do not own this property");
  }

  const updated = await repo.update(owner, id, input);
  return propertyDto(updated);
}

export async function deleteProperty(owner: Profile, id: string) {
  const repo = getPropertyRepository();
  const existing = await repo.findRecord(id, owner);
  if (!existing) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Property not found");

  if (owner.role !== "ADMIN" && existing.ownerId !== owner.id) {
    throw new ApiError(403, "FORBIDDEN", "You do not own this property");
  }

  const active = await repo.countActiveAgreements(id);
  if (active > 0) {
    throw new ApiError(409, "ACTIVE_TENANCY", "A property with active tenants cannot be deleted");
  }

  await repo.delete(id);
}

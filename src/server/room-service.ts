import "server-only";
import { Prisma, type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import type { z } from "zod";
import type { roomTypeCreateSchema, roomUnitCreateSchema } from "@/server/validation";

type RoomTypeInput = z.infer<typeof roomTypeCreateSchema>;
type RoomUnitInput = z.infer<typeof roomUnitCreateSchema>;

async function ownedProperty(profile: Profile, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: {
      OR: [{ id: propertyId }, { slug: propertyId }],
      deletedAt: null,
    },
    select: { id: true, ownerId: true },
  });
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Property not found");
  if (profile.role !== "ADMIN" && property.ownerId !== profile.id) throw new ApiError(403, "FORBIDDEN", "You do not own this property");
  return property;
}

export async function listRoomUnits(profile: Profile, propertyId: string) {
  const prop = await ownedProperty(profile, propertyId);
  return prisma.roomUnit.findMany({
    where: { propertyId: prop.id, deletedAt: null },
    include: {
      roomType: {
        select: { id: true, name: true, pricePerMonth: true, sizeM2: true },
      },
    },
    orderBy: { number: "asc" },
  });
}

async function refreshMinPrice(tx: Prisma.TransactionClient, propertyId: string) {
  const aggregate = await tx.roomType.aggregate({ where: { propertyId, deletedAt: null }, _min: { pricePerMonth: true } });
  await tx.property.update({ where: { id: propertyId }, data: { minMonthlyPrice: aggregate._min.pricePerMonth ?? new Prisma.Decimal(0) } });
}

export async function createRoomType(profile: Profile, propertyId: string, input: RoomTypeInput) {
  await ownedProperty(profile, propertyId);
  return prisma.$transaction(async (tx) => {
    const roomType = await tx.roomType.create({
      data: { ...input, propertyId, pricePerMonth: new Prisma.Decimal(input.pricePerMonth), sizeM2: input.sizeM2 ? new Prisma.Decimal(input.sizeM2) : undefined },
    });
    await refreshMinPrice(tx, propertyId);
    return { ...roomType, pricePerMonth: Number(roomType.pricePerMonth), sizeM2: roomType.sizeM2 ? Number(roomType.sizeM2) : null };
  });
}

export async function createRoomUnit(profile: Profile, propertyId: string, input: RoomUnitInput) {
  await ownedProperty(profile, propertyId);
  const roomType = await prisma.roomType.findFirst({ where: { id: input.roomTypeId, propertyId, deletedAt: null }, select: { id: true } });
  if (!roomType) throw new ApiError(422, "ROOM_TYPE_MISMATCH", "This room type is not available on this property");
  return prisma.roomUnit.create({ data: { ...input, propertyId } });
}

export async function updateRoomUnitStatus(profile: Profile, propertyId: string, roomId: string, status: "AVAILABLE" | "MAINTENANCE" | "OCCUPIED") {
  await ownedProperty(profile, propertyId);
  const unit = await prisma.roomUnit.findFirst({ where: { id: roomId, propertyId, deletedAt: null } });
  if (!unit) throw new ApiError(404, "ROOM_NOT_FOUND", "Room not found");
  if (unit.status === "RESERVED") throw new ApiError(409, "ROOM_IN_USE", "A reserved room's status cannot be changed manually");
  return prisma.roomUnit.update({ where: { id: roomId }, data: { status } });
}

export async function deleteRoomUnit(profile: Profile, propertyId: string, roomId: string) {
  await ownedProperty(profile, propertyId);
  const unit = await prisma.roomUnit.findFirst({ where: { id: roomId, propertyId, deletedAt: null } });
  if (!unit) throw new ApiError(404, "ROOM_NOT_FOUND", "Room not found");
  if (unit.status === "RESERVED" || unit.status === "OCCUPIED") {
    throw new ApiError(409, "ROOM_IN_USE", "The room is reserved or occupied and cannot be deleted");
  }
  await prisma.roomUnit.update({ where: { id: roomId }, data: { deletedAt: new Date() } });
  return { success: true, id: roomId };
}

export async function deleteRoomType(profile: Profile, propertyId: string, roomTypeId: string) {
  await ownedProperty(profile, propertyId);
  const existing = await prisma.roomType.findFirst({
    where: { id: roomTypeId, propertyId, deletedAt: null },
  });
  if (!existing) throw new ApiError(404, "ROOM_TYPE_NOT_FOUND", "Room type not found");

  const [activeUnits, activeBookings] = await Promise.all([
    prisma.roomUnit.count({ where: { roomTypeId, deletedAt: null } }),
    prisma.booking.count({ where: { roomTypeId, status: { in: ["PENDING", "APPROVED_AWAITING_PAYMENT", "ACTIVE"] } } }),
  ]);
  if (activeBookings > 0) {
    throw new ApiError(409, "ROOM_TYPE_IN_USE", "This room type still has active bookings and cannot be deleted");
  }
  if (activeUnits > 0) {
    throw new ApiError(409, "ROOM_TYPE_IN_USE", `Tipe kamar masih memiliki ${activeUnits} unit kamar. Hapus unit kamarnya terlebih dahulu.`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.roomType.update({ where: { id: roomTypeId }, data: { deletedAt: new Date() } });
    await refreshMinPrice(tx, propertyId);
    return { success: true, id: roomTypeId };
  });
}

export async function updateRoomType(
  profile: Profile,
  propertyId: string,
  roomTypeId: string,
  input: Partial<RoomTypeInput>
) {
  await ownedProperty(profile, propertyId);
  const existing = await prisma.roomType.findFirst({
    where: { id: roomTypeId, propertyId, deletedAt: null },
  });
  if (!existing) throw new ApiError(404, "ROOM_TYPE_NOT_FOUND", "Room type not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.roomType.update({
      where: { id: roomTypeId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.pricePerMonth !== undefined ? { pricePerMonth: new Prisma.Decimal(input.pricePerMonth) } : {}),
        ...(input.sizeM2 !== undefined ? { sizeM2: input.sizeM2 ? new Prisma.Decimal(input.sizeM2) : null } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      },
    });
    await refreshMinPrice(tx, propertyId);
    return {
      ...updated,
      pricePerMonth: Number(updated.pricePerMonth),
      sizeM2: updated.sizeM2 ? Number(updated.sizeM2) : null,
    };
  });
}


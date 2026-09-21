import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type BookingStatus, type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTransitionBooking } from "@/server/booking-policy";
import { ApiError } from "@/server/http";
import type { BookingCreateInput } from "@/server/validation";

const bookingInclude = {
  property: { select: { id: true, slug: true, name: true, city: true, ownerId: true } },
  roomType: { select: { id: true, name: true } },
  roomUnit: { select: { id: true, number: true, status: true } },
  applicant: { select: { id: true, fullName: true, email: true, phone: true } },
  history: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.BookingInclude;

type BookingRecord = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

function bookingDto(booking: BookingRecord) {
  return {
    ...booking,
    monthlyPriceSnapshot: Number(booking.monthlyPriceSnapshot),
    depositSnapshot: booking.depositSnapshot === null ? null : Number(booking.depositSnapshot),
  };
}

function bookingCode() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `BK-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createBooking(profile: Profile, input: BookingCreateInput) {
  const startDate = new Date(`${input.startDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (startDate < today) throw new ApiError(422, "INVALID_START_DATE", "Tanggal mulai tidak boleh di masa lalu");

  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId, propertyId: input.propertyId, deletedAt: null, property: { status: "VERIFIED", deletedAt: null } },
    include: { property: { select: { depositAmount: true } } },
  });
  if (!roomType) throw new ApiError(404, "ROOM_TYPE_NOT_FOUND", "Tipe kamar tidak tersedia");

  if (input.roomUnitId) {
    const unit = await prisma.roomUnit.findFirst({ where: { id: input.roomUnitId, roomTypeId: input.roomTypeId, propertyId: input.propertyId, status: "AVAILABLE", deletedAt: null } });
    if (!unit) throw new ApiError(409, "ROOM_UNAVAILABLE", "Kamar tidak tersedia");
  }

  const duplicate = await prisma.booking.count({
    where: { applicantId: profile.id, propertyId: input.propertyId, status: { in: ["PENDING", "APPROVED_AWAITING_PAYMENT", "ACTIVE"] } },
  });
  if (duplicate) throw new ApiError(409, "ACTIVE_BOOKING_EXISTS", "Anda masih memiliki booking aktif untuk properti ini");

  const booking = await prisma.booking.create({
    data: {
      code: bookingCode(),
      applicantId: profile.id,
      propertyId: input.propertyId,
      roomTypeId: input.roomTypeId,
      roomUnitId: input.roomUnitId,
      startDate,
      durationMonths: input.durationMonths,
      note: input.note,
      monthlyPriceSnapshot: roomType.pricePerMonth,
      depositSnapshot: roomType.property.depositAmount,
      history: { create: { status: "PENDING", actorId: profile.id } },
    },
    include: bookingInclude,
  });
  return bookingDto(booking);
}

export async function listBookings(profile: Profile, page: number, limit: number, status?: BookingStatus) {
  const scope: Prisma.BookingWhereInput =
    profile.role === "ADMIN"
      ? {}
      : profile.role === "OWNER"
        ? { property: { ownerId: profile.id } }
        : { applicantId: profile.id };
  const where = { ...scope, ...(status ? { status } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({ where, include: bookingInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.booking.count({ where }),
  ]);
  return { items: items.map(bookingDto), total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getBooking(profile: Profile, id: string) {
  const booking = await prisma.booking.findFirst({ where: { OR: [{ id }, { code: id }] }, include: bookingInclude });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking tidak ditemukan");
  const allowed = profile.role === "ADMIN" || booking.applicantId === profile.id || booking.property.ownerId === profile.id;
  if (!allowed) throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke booking ini");
  return bookingDto(booking);
}

export async function transitionBooking(
  profile: Profile,
  id: string,
  input: { status: "APPROVED_AWAITING_PAYMENT"; roomUnitId?: string; note?: string } | { status: "REJECTED" | "CANCELLED"; note?: string },
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { property: { select: { ownerId: true } } },
    });
    if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking tidak ditemukan");
    const ownsProperty = booking.property.ownerId === profile.id;
    const ownsBooking = booking.applicantId === profile.id;
    if (profile.role === "OWNER" && !ownsProperty) throw new ApiError(403, "FORBIDDEN", "Booking ini bukan untuk properti Anda");
    if (profile.role === "SEEKER" && !ownsBooking) throw new ApiError(403, "FORBIDDEN", "Booking ini bukan milik Anda");
    if (!canTransitionBooking(booking.status, input.status, profile.role)) throw new ApiError(409, "INVALID_BOOKING_TRANSITION", "Perubahan status booking tidak diizinkan");

    let roomUnitId = booking.roomUnitId;
    if (input.status === "APPROVED_AWAITING_PAYMENT") {
      let targetUnitId = input.roomUnitId ?? booking.roomUnitId;
      if (!targetUnitId) {
        const availableUnit = await tx.roomUnit.findFirst({
          where: { propertyId: booking.propertyId, roomTypeId: booking.roomTypeId, status: "AVAILABLE", deletedAt: null },
          orderBy: { number: "asc" },
        });
        if (!availableUnit) throw new ApiError(409, "ROOM_UNAVAILABLE", "Tidak ada kamar tersedia untuk tipe ini");
        targetUnitId = availableUnit.id;
      }
      const reserved = await tx.roomUnit.updateMany({
        where: { id: targetUnitId, propertyId: booking.propertyId, roomTypeId: booking.roomTypeId, status: "AVAILABLE", deletedAt: null },
        data: { status: "RESERVED" },
      });
      if (reserved.count !== 1) throw new ApiError(409, "ROOM_UNAVAILABLE", "Kamar sudah tidak tersedia");
      roomUnitId = targetUnitId;
    }

    if (input.status === "CANCELLED" && roomUnitId) {
      await tx.roomUnit.updateMany({ where: { id: roomUnitId, status: "RESERVED" }, data: { status: "AVAILABLE" } });
    }

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: input.status,
        roomUnitId,
        statusNote: input.note,
        ...(input.status === "APPROVED_AWAITING_PAYMENT" ? { approvedAt: new Date(), paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) } : {}),
        ...(input.status === "REJECTED" ? { rejectedAt: new Date() } : {}),
        ...(input.status === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        history: { create: { status: input.status, note: input.note, actorId: profile.id } },
      },
      include: bookingInclude,
    });
    return bookingDto(updated);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

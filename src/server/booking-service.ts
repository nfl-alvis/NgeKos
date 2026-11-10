import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type BookingStatus, type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canTransitionBooking } from "@/server/booking-policy";
import { bookingIdentifierWhere } from "@/server/booking-identifier";
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
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  if (startDate < yesterday) {
    throw new ApiError(422, "INVALID_START_DATE", "Tanggal mulai sewa tidak boleh di masa lalu");
  }

  const roomType = await prisma.roomType.findFirst({
    where: { id: input.roomTypeId, propertyId: input.propertyId, deletedAt: null, property: { status: "VERIFIED", deletedAt: null } },
    include: { property: { select: { depositAmount: true, ownerId: true, name: true } } },
  });
  if (!roomType) throw new ApiError(404, "ROOM_TYPE_NOT_FOUND", "Tipe kamar tidak tersedia atau belum terverifikasi");

  if (input.roomUnitId) {
    const unit = await prisma.roomUnit.findFirst({ where: { id: input.roomUnitId, roomTypeId: input.roomTypeId, propertyId: input.propertyId, status: "AVAILABLE", deletedAt: null } });
    if (!unit) throw new ApiError(409, "ROOM_UNAVAILABLE", "Unit kamar yang dipilih sedang tidak tersedia");
  }

  const duplicate = await prisma.booking.count({
    where: { applicantId: profile.id, propertyId: input.propertyId, status: { in: ["PENDING", "APPROVED_AWAITING_PAYMENT", "ACTIVE"] } },
  });
  if (duplicate) {
    throw new ApiError(409, "ACTIVE_BOOKING_EXISTS", "Anda sudah memiliki pengajuan sewa aktif untuk kos ini yang sedang diproses. Silakan cek menu Booking Saya.");
  }

  let booking;
  try {
    booking = await prisma.booking.create({
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
  } catch (error) {
    // Sesi bisa sah tanpa baris Profile (fallback akun demo di auth.ts);
    // jangan biarkan FK violation keluar sebagai 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003" &&
      String(error.meta?.constraint ?? "").includes("applicant_id")
    ) {
      throw new ApiError(401, "PROFILE_MISSING", "User profile not found. Please sign in again.");
    }
    throw error;
  }

  try {
    await prisma.notification.create({
      data: {
        profileId: roomType.property.ownerId,
        type: "BOOKING",
        title: "Pengajuan Sewa Baru",
        body: `Ada pengajuan sewa baru untuk ${roomType.property.name} (${roomType.name}) dari ${profile.fullName || "Penyewa"}.`,
        linkUrl: "/owner/bookings",
      },
    });
  } catch (notifErr) {
    console.error("Failed to notify owner of new booking:", notifErr);
  }

  return bookingDto(booking);
}

export async function listBookings(
  profile: Profile,
  page: number,
  limit: number,
  status?: BookingStatus,
  rolePerspective?: "applicant" | "owner",
) {
  const scope: Prisma.BookingWhereInput =
    rolePerspective === "applicant"
      ? { applicantId: profile.id }
      : rolePerspective === "owner"
        ? { property: { ownerId: profile.id } }
        : profile.role === "ADMIN"
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
  const booking = await prisma.booking.findFirst({ where: bookingIdentifierWhere(id), include: bookingInclude });
  if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Data pengajuan sewa tidak ditemukan");
  const allowed = profile.role === "ADMIN" || booking.applicantId === profile.id || booking.property.ownerId === profile.id;
  if (!allowed) throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pengajuan ini");
  return bookingDto(booking);
}

export async function transitionBooking(
  profile: Profile,
  id: string,
  input: { status: "APPROVED_AWAITING_PAYMENT"; roomUnitId?: string; note?: string } | { status: "REJECTED" | "CANCELLED"; note?: string },
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: bookingIdentifierWhere(id),
      include: { property: { select: { ownerId: true, name: true } } },
    });
    if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Data pengajuan sewa tidak ditemukan");
    const ownsProperty = booking.property.ownerId === profile.id;
    const ownsBooking = booking.applicantId === profile.id;

    if (input.status === "CANCELLED") {
      if (!ownsBooking && !ownsProperty && profile.role !== "ADMIN") {
        throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses untuk membatalkan pengajuan ini");
      }
    } else {
      if (profile.role === "OWNER" && !ownsProperty) {
        throw new ApiError(403, "FORBIDDEN", "Pengajuan ini bukan untuk properti kos milik Anda");
      }
      if (profile.role === "SEEKER" && !ownsBooking) {
        throw new ApiError(403, "FORBIDDEN", "Pengajuan ini bukan milik akun Anda");
      }
    }

    if (!canTransitionBooking(booking.status, input.status, profile.role)) {
      throw new ApiError(409, "INVALID_BOOKING_TRANSITION", "Perubahan status pengajuan sewa tidak diizinkan");
    }

    let roomUnitId = booking.roomUnitId;
    if (input.status === "APPROVED_AWAITING_PAYMENT") {
      let targetUnitId = input.roomUnitId ?? booking.roomUnitId;
      if (!targetUnitId) {
        const availableUnit = await tx.roomUnit.findFirst({
          where: { propertyId: booking.propertyId, roomTypeId: booking.roomTypeId, status: "AVAILABLE", deletedAt: null },
          orderBy: { number: "asc" },
        });
        if (!availableUnit) throw new ApiError(409, "ROOM_UNAVAILABLE", "No rooms are available for this room type");
        targetUnitId = availableUnit.id;
      }
      const reserved = await tx.roomUnit.updateMany({
        where: { id: targetUnitId, propertyId: booking.propertyId, roomTypeId: booking.roomTypeId, status: "AVAILABLE", deletedAt: null },
        data: { status: "RESERVED" },
      });
      if (reserved.count !== 1) throw new ApiError(409, "ROOM_UNAVAILABLE", "The room is no longer available");
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

    try {
      if (input.status === "APPROVED_AWAITING_PAYMENT") {
        await tx.notification.create({
          data: {
            profileId: booking.applicantId,
            type: "BOOKING",
            title: "Rental Request Approved",
            body: `Your rental request for "${booking.property.name}" has been approved! Please complete the payment before the deadline.`,
            linkUrl: "/dashboard",
          },
        });
      } else if (input.status === "REJECTED") {
        await tx.notification.create({
          data: {
            profileId: booking.applicantId,
            type: "BOOKING",
            title: "Rental Request Rejected",
            body: `Your rental request for "${booking.property.name}" could not be approved.${input.note ? ` Reason: ${input.note}` : ""}`,
            linkUrl: "/dashboard",
          },
        });
      } else if (input.status === "CANCELLED" && profile.role === "SEEKER") {
        await tx.notification.create({
          data: {
            profileId: booking.property.ownerId,
            type: "BOOKING",
            title: "Booking Cancelled",
            body: `The rental request for "${booking.property.name}" has been cancelled by the applicant.`,
            linkUrl: "/owner/bookings",
          },
        });
      }
    } catch (notifErr) {
      console.error("Failed to notify user on booking transition:", notifErr);
    }

    return bookingDto(updated);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000, maxWait: 10000 });
}

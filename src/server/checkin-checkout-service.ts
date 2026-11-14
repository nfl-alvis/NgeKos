import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { recordAuditLog } from "@/server/audit-service";
import { bookingIdentifierWhere } from "@/server/booking-identifier";
import {
  canTenantCheckIn,
  canOwnerCheckIn,
  canTenantRequestCheckOut,
  canOwnerConfirmCheckOut,
} from "@/server/checkin-checkout-policy";
import { Prisma, type Profile, type RoomStatus } from "@prisma/client";

export interface TenantCheckInInput {
  bookingId: string;
  profile: Profile;
  checkInNotes?: string | null;
}

export interface OwnerCheckInInput {
  bookingId: string;
  profile: Profile;
  checkInNotes?: string | null;
}

export interface TenantRequestCheckOutInput {
  bookingId: string;
  profile: Profile;
  checkOutDate?: string | null;
  checkOutNotes?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
}

export interface OwnerConfirmCheckOutInput {
  bookingId: string;
  profile: Profile;
  inspectionNotes?: string | null;
  depositRefundAmount?: number | null;
  roomStatus?: RoomStatus;
}

export async function tenantCheckIn({
  bookingId,
  profile,
  checkInNotes,
}: TenantCheckInInput) {
  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(bookingId),
    include: {
      property: true,
      roomUnit: true,
      agreement: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Data sewa / booking tidak ditemukan");
  }

  if (profile.role !== "ADMIN" && booking.applicantId !== profile.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses untuk check-in sewa ini");
  }

  const check = canTenantCheckIn(booking);
  if (!check.allowed) {
    if (check.reason === "ALREADY_CHECKED_IN") {
      throw new ApiError(400, "ALREADY_CHECKED_IN", "Sewa ini sudah berstatus check-in");
    }
    throw new ApiError(400, "INVALID_STATUS", "Hanya sewa yang berstatus aktif yang dapat melakukan check-in");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        checkedInAt: now,
        checkInNotes: checkInNotes?.trim() || null,
        history: {
          create: {
            status: booking.status,
            actorId: profile.id,
            note: `Penyewa melakukan check-in mandiri${checkInNotes ? `: ${checkInNotes.trim()}` : ""}`,
          },
        },
      },
      include: {
        property: true,
        roomType: true,
        roomUnit: true,
      },
    });

    if (booking.roomUnitId) {
      await tx.roomUnit.update({
        where: { id: booking.roomUnitId },
        data: { status: "OCCUPIED" },
      });
    }

    if (booking.agreement) {
      await tx.rentalAgreement.update({
        where: { id: booking.agreement.id },
        data: { status: "ACTIVE" },
      });
    }

    await recordAuditLog({
      tx,
      actor: profile,
      action: "booking.check_in",
      entityType: "BOOKING",
      entityId: booking.id,
      description: `Tenant ${profile.fullName} performed check-in for booking ${booking.code}`,
      metadata: {
        bookingId: booking.id,
        checkedInAt: now.toISOString(),
        checkInNotes,
      },
    });

    return updatedBooking;
  });

  return updated;
}

export async function ownerCheckIn({
  bookingId,
  profile,
  checkInNotes,
}: OwnerCheckInInput) {
  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(bookingId),
    include: {
      property: true,
      roomUnit: true,
      agreement: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Data sewa / booking tidak ditemukan");
  }

  if (profile.role !== "ADMIN" && booking.property.ownerId !== profile.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda bukan pemilik dari properti kos ini");
  }

  const check = canOwnerCheckIn(booking);
  if (!check.allowed) {
    if (check.reason === "ALREADY_CHECKED_IN") {
      throw new ApiError(400, "ALREADY_CHECKED_IN", "Sewa ini sudah berstatus check-in");
    }
    throw new ApiError(400, "INVALID_STATUS", "Hanya sewa yang berstatus aktif yang dapat melakukan check-in");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        checkedInAt: now,
        checkInNotes: checkInNotes?.trim() || null,
        history: {
          create: {
            status: booking.status,
            actorId: profile.id,
            note: `Pemilik kos mengonfirmasi check-in penyewa${checkInNotes ? `: ${checkInNotes.trim()}` : ""}`,
          },
        },
      },
      include: {
        property: true,
        roomType: true,
        roomUnit: true,
      },
    });

    if (booking.roomUnitId) {
      await tx.roomUnit.update({
        where: { id: booking.roomUnitId },
        data: { status: "OCCUPIED" },
      });
    }

    if (booking.agreement) {
      await tx.rentalAgreement.update({
        where: { id: booking.agreement.id },
        data: { status: "ACTIVE" },
      });
    }

    await recordAuditLog({
      tx,
      actor: profile,
      action: "booking.owner_check_in",
      entityType: "BOOKING",
      entityId: booking.id,
      description: `Owner ${profile.fullName} verified check-in for booking ${booking.code}`,
      metadata: {
        bookingId: booking.id,
        checkedInAt: now.toISOString(),
        checkInNotes,
      },
    });

    return updatedBooking;
  });

  return updated;
}

export async function tenantRequestCheckOut({
  bookingId,
  profile,
  checkOutDate,
  checkOutNotes,
  bankName,
  accountNumber,
  accountHolder,
}: TenantRequestCheckOutInput) {
  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(bookingId),
    include: {
      property: true,
      roomUnit: true,
      agreement: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Data sewa / booking tidak ditemukan");
  }

  if (profile.role !== "ADMIN" && booking.applicantId !== profile.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses untuk mengajukan check-out sewa ini");
  }

  const check = canTenantRequestCheckOut(booking);
  if (!check.allowed) {
    if (check.reason === "NOT_CHECKED_IN") {
      throw new ApiError(400, "NOT_CHECKED_IN", "Penyewa belum melakukan check-in, tidak dapat mengajukan check-out");
    }
    if (check.reason === "CHECKOUT_ALREADY_REQUESTED") {
      throw new ApiError(400, "CHECKOUT_ALREADY_REQUESTED", "Pengajuan check-out sudah pernah diajukan dan sedang diproses");
    }
    if (check.reason === "ALREADY_CHECKED_OUT") {
      throw new ApiError(400, "ALREADY_CHECKED_OUT", "Sewa ini sudah selesai dan check-out");
    }
    throw new ApiError(400, "INVALID_STATUS", "Status sewa tidak valid untuk pengajuan check-out");
  }

  const now = new Date();
  const parsedDate = checkOutDate ? new Date(`${checkOutDate}T00:00:00Z`) : null;
  const refundInfo = bankName || accountNumber || accountHolder
    ? { bankName, accountNumber, accountHolder }
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        checkOutRequestedAt: now,
        checkOutDate: parsedDate,
        checkOutNotes: checkOutNotes?.trim() || null,
        refundBankInfo: refundInfo ? (refundInfo as Prisma.InputJsonValue) : Prisma.JsonNull,
        history: {
          create: {
            status: booking.status,
            actorId: profile.id,
            note: `Penyewa mengajukan check-out${checkOutNotes ? `: ${checkOutNotes.trim()}` : ""}`,
          },
        },
      },
      include: {
        property: true,
        roomType: true,
        roomUnit: true,
      },
    });

    await recordAuditLog({
      tx,
      actor: profile,
      action: "booking.check_out_request",
      entityType: "BOOKING",
      entityId: booking.id,
      description: `Tenant ${profile.fullName} requested checkout for booking ${booking.code}`,
      metadata: {
        bookingId: booking.id,
        checkOutDate,
        checkOutNotes,
        refundInfo,
      },
    });

    return updatedBooking;
  });

  return updated;
}

export async function ownerConfirmCheckOut({
  bookingId,
  profile,
  inspectionNotes,
  depositRefundAmount,
  roomStatus = "AVAILABLE",
}: OwnerConfirmCheckOutInput) {
  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(bookingId),
    include: {
      property: true,
      roomUnit: true,
      agreement: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Data sewa / booking tidak ditemukan");
  }

  if (profile.role !== "ADMIN" && booking.property.ownerId !== profile.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda bukan pemilik dari properti kos ini");
  }

  const check = canOwnerConfirmCheckOut(booking);
  if (!check.allowed) {
    if (check.reason === "NOT_CHECKED_IN") {
      throw new ApiError(400, "NOT_CHECKED_IN", "Penyewa belum check-in, tidak dapat menyelesaikan check-out");
    }
    if (check.reason === "ALREADY_CHECKED_OUT") {
      throw new ApiError(400, "ALREADY_CHECKED_OUT", "Sewa ini sudah selesai dan check-out");
    }
    throw new ApiError(400, "INVALID_STATUS", "Status sewa tidak valid untuk penyelesaian check-out");
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        checkedOutAt: now,
        inspectionNotes: inspectionNotes?.trim() || null,
        depositRefundAmount: depositRefundAmount != null ? Math.round(depositRefundAmount) : null,
        status: "COMPLETED",
        history: {
          create: {
            status: "COMPLETED",
            actorId: profile.id,
            note: `Pemilik kos mengonfirmasi check-out dan inspeksi kamar${inspectionNotes ? `: ${inspectionNotes.trim()}` : ""}`,
          },
        },
      },
      include: {
        property: true,
        roomType: true,
        roomUnit: true,
      },
    });

    if (booking.roomUnitId) {
      await tx.roomUnit.update({
        where: { id: booking.roomUnitId },
        data: { status: roomStatus },
      });
    }

    if (booking.agreement) {
      await tx.rentalAgreement.update({
        where: { id: booking.agreement.id },
        data: {
          status: "TERMINATED",
          terminatedAt: now,
        },
      });
    }

    await recordAuditLog({
      tx,
      actor: profile,
      action: "booking.confirm_checkout",
      entityType: "BOOKING",
      entityId: booking.id,
      description: `Owner ${profile.fullName} confirmed checkout for booking ${booking.code}`,
      metadata: {
        bookingId: booking.id,
        checkedOutAt: now.toISOString(),
        inspectionNotes,
        depositRefundAmount,
        roomStatus,
      },
    });

    return updatedBooking;
  });

  return updated;
}

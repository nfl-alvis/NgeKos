import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { recordAuditLog } from "@/server/audit-service";
import { bookingIdentifierWhere } from "@/server/booking-identifier";
import {
  calculateDailyProrataRefund,
  canRequestTermination,
  canConfirmTermination,
} from "@/server/mutual-termination-policy";
import { creditWallet } from "@/server/wallet-service";
import type { Profile } from "@prisma/client";

export interface RequestTerminationInput {
  bookingId: string;
  profile: Profile;
  reason: string;
  damageDeduction?: number;
  requestedTerminationDate?: string | Date;
}

export interface ConfirmTerminationInput {
  bookingId: string;
  profile: Profile;
  action: "APPROVE" | "REJECT";
  rejectionReason?: string;
}

export async function requestTermination(input: RequestTerminationInput) {
  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(input.bookingId),
    include: {
      property: true,
      roomUnit: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Data sewa tidak ditemukan");
  }

  const isTenant = booking.applicantId === input.profile.id;
  const isOwner = booking.property.ownerId === input.profile.id;
  const isAdmin = input.profile.role === "ADMIN";

  if (!isTenant && !isOwner && !isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke sewa ini");
  }

  const check = canRequestTermination(booking);
  if (!check.allowed) {
    if (check.reason === "ALREADY_REQUESTED") {
      throw new ApiError(400, "ALREADY_REQUESTED", "Permohonan berhenti sewa sudah pernah diajukan dan sedang menunggu persetujuan");
    }
    throw new ApiError(400, "INVALID_STATUS", "Hanya sewa yang berstatus aktif yang dapat mengajukan penghentian sewa");
  }

  const requestedBy = isTenant ? "TENANT" : "OWNER";
  const now = new Date();
  const termDate = input.requestedTerminationDate
    ? new Date(input.requestedTerminationDate)
    : now;

  // Calculate prorata refund
  const startDate = new Date(booking.startDate);
  const durationMonths = booking.durationMonths || 1;
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const refundCalc = calculateDailyProrataRefund({
    periodStart: startDate,
    periodEnd: endDate,
    terminationDate: termDate,
    periodRentAmount: Number(booking.monthlyPriceSnapshot || 0) * durationMonths,
    depositAmount: Number(booking.depositSnapshot || 0),
    damageDeductionAmount: Number(input.damageDeduction || 0),
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        terminationStatus: "REQUESTED",
        terminationRequestedBy: requestedBy,
        terminationReason: input.reason.trim(),
        terminationRefundAmount: refundCalc.totalRefundToTenant,
        history: {
          create: {
            status: booking.status,
            actorId: input.profile.id,
            note: `Permohonan berhenti sewa diajukan oleh ${requestedBy === "TENANT" ? "Penyewa" : "Pemilik Kos"}: ${input.reason.trim()}`,
          },
        },
      },
      include: {
        property: true,
        roomUnit: true,
      },
    });

    await recordAuditLog({
      tx,
      actor: input.profile,
      action: "booking.termination_request",
      entityType: "BOOKING",
      entityId: booking.id,
      description: `Termination requested by ${requestedBy} for booking ${booking.code}`,
      metadata: {
        reason: input.reason,
        refundAmount: refundCalc.totalRefundToTenant,
      },
    });

    return updated;
  });
}

export async function confirmTermination(input: ConfirmTerminationInput) {
  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(input.bookingId),
    include: {
      property: true,
      roomUnit: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Data sewa tidak ditemukan");
  }

  const isTenant = booking.applicantId === input.profile.id;
  const isOwner = booking.property.ownerId === input.profile.id;
  const isAdmin = input.profile.role === "ADMIN";

  if (!isTenant && !isOwner && !isAdmin) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke sewa ini");
  }

  const currentActorRole = isTenant ? "TENANT" : isOwner ? "OWNER" : "ADMIN";
  const check = canConfirmTermination({
    status: booking.status,
    terminationStatus: booking.terminationStatus,
    requestedBy: booking.terminationRequestedBy,
    currentActorRole,
  });

  if (!check.allowed) {
    if (check.reason === "CANNOT_CONFIRM_OWN_REQUEST") {
      throw new ApiError(
        400,
        "CANNOT_CONFIRM_OWN_REQUEST",
        "Anda tidak dapat menyetujui permohonan yang Anda ajukan sendiri. Menunggu konfirmasi pihak lawan."
      );
    }
    if (check.reason === "NOT_REQUESTED") {
      throw new ApiError(400, "NOT_REQUESTED", "Tidak ada permohonan berhenti sewa yang aktif");
    }
    throw new ApiError(400, "INVALID_STATUS", "Status sewa tidak valid untuk diproses");
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    if (input.action === "APPROVE") {
      // 1. Credit refund to Tenant Wallet
      const refundAmount = Number(booking.terminationRefundAmount || 0);
      if (refundAmount > 0) {
        await creditWallet({
          profileId: booking.applicantId,
          amount: refundAmount,
          type: "RENT_REFUND",
          description: `Pengembalian dana (refund prorata sewa & deposit) berhenti sewa kos ${booking.property.name} (#${booking.code})`,
          referenceId: booking.id,
        });
      }

      // 2. Mark RoomUnit as AVAILABLE
      if (booking.roomUnitId) {
        await tx.roomUnit.update({
          where: { id: booking.roomUnitId },
          data: { status: "AVAILABLE" },
        });
      }

      // 3. Update booking status
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "COMPLETED",
          terminationStatus: "APPROVED",
          checkedOutAt: now,
          history: {
            create: {
              status: "COMPLETED",
              actorId: input.profile.id,
              note: `Penghentian sewa disetujui bersama. Dana refund sebesar ${refundAmount} otomatis dikembalikan ke Dompet Penyewa.`,
            },
          },
        },
        include: { property: true, roomUnit: true },
      });

      await recordAuditLog({
        tx,
        actor: input.profile,
        action: "booking.termination_approved",
        entityType: "BOOKING",
        entityId: booking.id,
        description: `Termination approved by ${currentActorRole} for booking ${booking.code}`,
        metadata: { refundAmount },
      });

      return updated;
    } else {
      // REJECT: Revert termination status
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          terminationStatus: "REJECTED",
          history: {
            create: {
              status: booking.status,
              actorId: input.profile.id,
              note: `Permohonan berhenti sewa ditolak oleh ${currentActorRole}${input.rejectionReason ? `: ${input.rejectionReason.trim()}` : ""}`,
            },
          },
        },
        include: { property: true, roomUnit: true },
      });

      await recordAuditLog({
        tx,
        actor: input.profile,
        action: "booking.termination_rejected",
        entityType: "BOOKING",
        entityId: booking.id,
        description: `Termination rejected by ${currentActorRole} for booking ${booking.code}`,
        metadata: { reason: input.rejectionReason },
      });

      return updated;
    }
  });
}

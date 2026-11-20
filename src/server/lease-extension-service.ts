import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { recordAuditLog } from "@/server/audit-service";
import { bookingIdentifierWhere } from "@/server/booking-identifier";
import {
  calculateLeaseEndDate,
  getLeaseExpirationInfo,
  canExtendLease,
  calculateExtensionInvoice,
  type LeaseExpirationInfo,
} from "@/server/lease-extension-policy";
import type { BillingCycle } from "@/server/billing-cycle-service";
import { Prisma, type Profile } from "@prisma/client";

function generateExtensionInvoiceCode(): string {
  const dateStr = new Date().toISOString().slice(2, 7).replace("-", "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `INV-EXT-${dateStr}-${rand}`;
}

export interface ExtendLeaseInput {
  bookingId: string;
  profile: Profile;
  additionalMonths: number;
  billingCycle?: BillingCycle;
}

export interface ExtendLeaseResult {
  booking: any;
  invoice: any;
  calculation: any;
  newEndDate: Date;
}

/**
 * Extends the active lease of a tenant:
 * - Extends durationMonths and end date
 * - Keeps existing deposit (rollover deposit, zero new deposit charged)
 * - Emits a new invoice for the extended lease cycle
 */
export async function extendLease({
  bookingId,
  profile,
  additionalMonths,
  billingCycle,
}: ExtendLeaseInput): Promise<ExtendLeaseResult> {
  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(bookingId),
    include: {
      property: true,
      roomType: true,
      roomUnit: true,
      agreement: true,
    },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Data sewa / booking tidak ditemukan");
  }

  // Authorization: must be applicant (tenant) or admin
  if (profile.role !== "ADMIN" && booking.applicantId !== profile.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses untuk memperpanjang sewa ini");
  }

  // Check state validity
  const check = canExtendLease(booking);
  if (!check.allowed) {
    if (check.reason === "NOT_ACTIVE") {
      throw new ApiError(400, "NOT_ACTIVE", "Hanya sewa yang berstatus aktif yang dapat diperpanjang");
    }
    if (check.reason === "ALREADY_CHECKED_OUT") {
      throw new ApiError(400, "ALREADY_CHECKED_OUT", "Sewa ini sudah selesai dan check-out, tidak dapat diperpanjang");
    }
    if (check.reason === "TERMINATION_PENDING") {
      throw new ApiError(
        400,
        "TERMINATION_PENDING",
        "Terdapat permohonan berhenti sewa yang sedang diproses. Selesaikan permohonan terlebih dahulu"
      );
    }
    throw new ApiError(400, "INVALID_STATUS", "Status sewa tidak valid untuk perpanjangan");
  }

  if (additionalMonths < 1 || additionalMonths > 24) {
    throw new ApiError(400, "INVALID_DURATION", "Durasi perpanjangan harus antara 1 sampai 24 bulan");
  }

  // Calculate new dates
  const prevEndDate = calculateLeaseEndDate(booking.startDate, booking.durationMonths);
  const newTotalMonths = booking.durationMonths + additionalMonths;
  const newEndDate = calculateLeaseEndDate(booking.startDate, newTotalMonths);

  // Billing cycle
  const selectedCycle: BillingCycle =
    billingCycle || (booking.billingCycle as BillingCycle) || "MONTHLY";

  // Calculate extension invoice (0 new deposit)
  const monthlyPrice = Number(booking.monthlyPriceSnapshot);
  const existingDeposit = Number(booking.depositSnapshot || 0);
  const invoiceCalc = calculateExtensionInvoice({
    monthlyPrice,
    additionalMonths,
    billingCycle: selectedCycle,
    existingDeposit,
  });

  const now = new Date();
  // Due date: 7 days before previous lease ends, or tomorrow if already past/near
  const defaultDueDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const invoiceDueDate =
    defaultDueDate > now ? defaultDueDate : new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    // 1. Ensure / update RentalAgreement
    let agreementId = booking.agreement?.id;
    if (agreementId) {
      await tx.rentalAgreement.update({
        where: { id: agreementId },
        data: {
          endDate: newEndDate,
          status: "ACTIVE",
        },
      });
    } else {
      const agreement = await tx.rentalAgreement.create({
        data: {
          bookingId: booking.id,
          tenantId: booking.applicantId,
          propertyId: booking.propertyId,
          roomUnitId: booking.roomUnitId || (await getFallbackRoomUnitId(tx, booking.propertyId)),
          startDate: booking.startDate,
          endDate: newEndDate,
          monthlyRent: booking.monthlyPriceSnapshot,
          depositAmount: booking.depositSnapshot,
          status: "ACTIVE",
        },
      });
      agreementId = agreement.id;
    }

    // 2. Create extension Invoice
    const invoiceCode = generateExtensionInvoiceCode();
    const createdInvoice = await tx.invoice.create({
      data: {
        code: invoiceCode,
        agreementId,
        tenantId: booking.applicantId,
        propertyId: booking.propertyId,
        periodStart: prevEndDate,
        periodEnd: newEndDate,
        dueDate: invoiceDueDate,
        amount: new Prisma.Decimal(invoiceCalc.totalFirstPaymentDue),
        status: "ISSUED",
        issuedAt: now,
        notes: `Perpanjangan sewa ${additionalMonths} bulan (${selectedCycle}). ${invoiceCalc.rolloverNotice}`,
      },
      include: {
        property: { select: { id: true, name: true, slug: true } },
      },
    });

    // 3. Update Booking
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        durationMonths: newTotalMonths,
        billingCycle: selectedCycle,
        history: {
          create: {
            status: "ACTIVE",
            actorId: profile.id,
            note: `Penyewa memperpanjang masa sewa ${additionalMonths} bulan (hingga ${newEndDate.toISOString().slice(0, 10)}). Uang jaminan bergulir tanpa tagihan deposit baru.`,
          },
        },
      },
      include: {
        property: true,
        roomType: true,
        roomUnit: true,
      },
    });

    // 4. Notifications
    try {
      await tx.notification.create({
        data: {
          profileId: booking.applicantId,
          type: "BOOKING",
          title: "Perpanjangan Sewa Berhasil",
          body: `Masa sewa ${booking.property.name} telah diperpanjang hingga ${newEndDate.toISOString().slice(0, 10)}. Tagihan termin baru telah diterbitkan.`,
          linkUrl: "/tenant/contract",
        },
      });

      if (booking.property.ownerId) {
        await tx.notification.create({
          data: {
            profileId: booking.property.ownerId,
            type: "BOOKING",
            title: "Penyewa Memperpanjang Sewa",
            body: `Penyewa kamar ${booking.roomUnit?.number || ""} di ${booking.property.name} memperpanjang sewa selama ${additionalMonths} bulan.`,
            linkUrl: "/owner/tenants",
          },
        });
      }
    } catch {
      // Non-blocking notification
    }

    // 5. Audit Log
    await recordAuditLog({
      tx,
      actor: profile,
      action: "booking.extend_lease",
      entityType: "BOOKING",
      entityId: booking.id,
      description: `Tenant ${profile.fullName} extended lease for booking ${booking.code} by ${additionalMonths} months`,
      metadata: {
        additionalMonths,
        previousEndDate: prevEndDate.toISOString(),
        newEndDate: newEndDate.toISOString(),
        invoiceCode: createdInvoice.code,
        invoiceAmount: Number(createdInvoice.amount),
        rolloverDeposit: invoiceCalc.rolloverDepositAmount,
      },
    });

    return {
      booking: updatedBooking,
      invoice: {
        ...createdInvoice,
        amount: Number(createdInvoice.amount),
      },
      calculation: invoiceCalc,
      newEndDate,
    };
  });
}

/**
 * Finds all active leases nearing expiration (H-30 or H-7) for an owner or tenant.
 */
export async function getExpiringLeases(params: {
  ownerId?: string;
  tenantId?: string;
  referenceDate?: Date;
}) {
  const where: Prisma.BookingWhereInput = {
    status: "ACTIVE",
    checkedOutAt: null,
    ...(params.tenantId ? { applicantId: params.tenantId } : {}),
    ...(params.ownerId ? { property: { ownerId: params.ownerId } } : {}),
  };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      property: true,
      roomType: true,
      roomUnit: true,
      applicant: true,
    },
    orderBy: { startDate: "asc" },
  });

  const ref = params.referenceDate || new Date();

  return bookings
    .map((b) => {
      const expirationInfo = getLeaseExpirationInfo({
        startDate: b.startDate,
        durationMonths: b.durationMonths,
        referenceDate: ref,
        status: b.status,
        checkedOutAt: b.checkedOutAt,
      });

      return {
        booking: b,
        expiration: expirationInfo,
      };
    })
    .filter((item) => item.expiration.isExpiringNotice);
}

async function getFallbackRoomUnitId(tx: Prisma.TransactionClient, propertyId: string): Promise<string> {
  const unit = await tx.roomUnit.findFirst({
    where: { propertyId, deletedAt: null },
    select: { id: true },
  });
  if (unit) return unit.id;

  const roomType = await tx.roomType.findFirst({
    where: { propertyId, deletedAt: null },
    select: { id: true },
  });
  const created = await tx.roomUnit.create({
    data: {
      propertyId,
      roomTypeId: roomType?.id || propertyId,
      number: "101",
      status: "OCCUPIED",
    },
  });
  return created.id;
}

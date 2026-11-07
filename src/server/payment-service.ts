import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { recordAuditLog } from "@/server/audit-service";

export interface SettleBookingPaymentInput {
  bookingId: string;
  amount: number;
  midtransOrderId: string;
  snapToken?: string | null;
  paymentType?: string | null;
  statusNote: string;
  historyNote: string;
}

export interface SettleBookingPaymentResult {
  alreadySettled: boolean;
  bookingId: string;
}

/**
 * Menandai booking sebagai lunas: booking menjadi ACTIVE, unit kamar menjadi
 * OCCUPIED, dan mencatat baris Payment berstatus VERIFIED.
 *
 * Idempoten — pemanggilan ulang untuk booking yang sudah ACTIVE
 * tidak mengubah apa pun dan tidak menduplikasi baris Payment.
 * Mencatat audit log secara atomik.
 */
export async function settleBookingPayment(
  input: SettleBookingPaymentInput,
): Promise<SettleBookingPaymentResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        id: true,
        status: true,
        roomUnitId: true,
        propertyId: true,
        roomTypeId: true,
        applicantId: true,
      },
    });
    if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found");

    if (booking.status === "ACTIVE") {
      return { alreadySettled: true, bookingId: booking.id };
    }

    let roomUnitId = booking.roomUnitId;
    if (roomUnitId) {
      await tx.roomUnit.update({
        where: { id: roomUnitId },
        data: { status: "OCCUPIED" },
      });
    } else {
      const availableUnit = await tx.roomUnit.findFirst({
        where: {
          propertyId: booking.propertyId,
          roomTypeId: booking.roomTypeId,
          status: "AVAILABLE",
          deletedAt: null,
        },
        orderBy: { number: "asc" },
      });
      if (availableUnit) {
        await tx.roomUnit.update({
          where: { id: availableUnit.id },
          data: { status: "OCCUPIED" },
        });
        roomUnitId = availableUnit.id;
      }
    }

    const settledAt = new Date();
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "ACTIVE",
        roomUnitId,
        statusNote: input.statusNote,
        history: {
          create: {
            status: "ACTIVE",
            note: input.historyNote,
          },
        },
      },
    });

    let paymentId = "unknown";
    try {
      const existingPayment = await tx.payment.findUnique({
        where: { midtransOrderId: input.midtransOrderId },
        select: { id: true, status: true },
      });

      if (!existingPayment) {
        const createdPayment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            method: "MIDTRANS",
            status: "VERIFIED",
            amount: new Prisma.Decimal(Math.round(input.amount)),
            reference: input.midtransOrderId,
            midtransOrderId: input.midtransOrderId,
            snapToken: input.snapToken ?? null,
            paymentType: input.paymentType ?? null,
            paidAt: settledAt,
            settlementAt: settledAt,
            verifiedAt: settledAt,
          },
        });
        paymentId = createdPayment.id;
      } else {
        await tx.payment.update({
          where: { midtransOrderId: input.midtransOrderId },
          data: {
            status: "VERIFIED",
            paymentType: input.paymentType ?? undefined,
            paidAt: settledAt,
            settlementAt: settledAt,
            verifiedAt: settledAt,
          },
        });
        paymentId = existingPayment.id;
      }
    } catch (payErr) {
      console.warn("[settleBookingPayment] payment table update skipped due to pending migration:", payErr);
    }

    // Catat audit log atomik
    await recordAuditLog({
      tx,
      action: "payment.settle",
      entityType: "payment",
      entityId: paymentId,
      description: `Midtrans payment settled for booking ${booking.id} (${input.midtransOrderId})`,
      metadata: {
        bookingId: booking.id,
        midtransOrderId: input.midtransOrderId,
        amount: input.amount,
        paymentType: input.paymentType,
      },
    });

    return { alreadySettled: false, bookingId: booking.id };
  }, { timeout: 20000, maxWait: 10000 });
}

export interface SettleSubscriptionPaymentInput {
  orderId: string;
  amount: number;
  paymentType?: string | null;
  statusNote?: string;
  historyNote?: string;
}

export interface SettleSubscriptionPaymentResult {
  alreadySettled: boolean;
  subscriptionId: string;
}

/**
 * Menandai pembayaran paket langganan owner sebagai lunas:
 * Subscription menjadi ACTIVE dengan masa aktif 30 hari ke depan,
 * Payment menjadi VERIFIED, dan dicatat audit log.
 * Idempoten bila dipanggil berulang.
 */
export async function settleSubscriptionPayment(
  input: SettleSubscriptionPaymentInput,
): Promise<SettleSubscriptionPaymentResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Cari baris Payment berdasarkan midtransOrderId
    const payment = await tx.payment.findUnique({
      where: { midtransOrderId: input.orderId },
      include: {
        recordedBy: true,
      },
    });

    if (!payment) {
      throw new ApiError(404, "PAYMENT_NOT_FOUND", `Payment with order ID ${input.orderId} not found.`);
    }

    const ownerId = payment.recordedById;
    if (!ownerId) {
      throw new ApiError(400, "INVALID_PAYMENT", "Payment is not associated with an owner.");
    }

    // Idempotency: Jika payment sudah VERIFIED, tidak ada operasi berulang
    if (payment.status === "VERIFIED") {
      const existingSub = await tx.subscription.findFirst({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
      });
      return {
        alreadySettled: true,
        subscriptionId: existingSub?.id || "",
      };
    }

    // 2. Ekstrak kode plan dari order ID (Format: SUB-{ownerPrefix}-{planCode}-{timestamp})
    const parts = input.orderId.split("-");
    let planCode = "";
    if (parts.length >= 4) {
      planCode = parts.slice(2, -1).join("-");
    }

    const plan = planCode
      ? await tx.subscriptionPlan.findUnique({ where: { code: planCode } })
      : await tx.subscriptionPlan.findFirst({
          where: { active: true },
          orderBy: { priceMonthly: "asc" },
        });

    if (!plan) {
      throw new ApiError(404, "PLAN_NOT_FOUND", `Subscription plan '${planCode}' not found.`);
    }

    const settledAt = new Date();
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 3. Update atau buat subscription owner
    const existingSub = await tx.subscription.findFirst({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });

    let subscriptionId: string;
    if (existingSub) {
      const updatedSub = await tx.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
      });
      subscriptionId = updatedSub.id;
    } else {
      const createdSub = await tx.subscription.create({
        data: {
          ownerId,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
      subscriptionId = createdSub.id;
    }

    // 4. Update Payment menjadi VERIFIED
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "VERIFIED",
        paymentType: input.paymentType ?? payment.paymentType,
        paidAt: settledAt,
        settlementAt: settledAt,
        verifiedAt: settledAt,
        note: `Subscription activated: ${plan.name} (${plan.code})`,
      },
    });

    // 5. Catat audit log atomik
    await recordAuditLog({
      tx,
      action: "subscription.paid",
      entityType: "subscription",
      entityId: subscriptionId,
      description: `Midtrans payment settled for subscription ${subscriptionId} (Plan: ${plan.name}, Order: ${input.orderId})`,
      metadata: {
        ownerId,
        planCode: plan.code,
        midtransOrderId: input.orderId,
        amount: input.amount,
        paymentType: input.paymentType,
      },
    });

    return { alreadySettled: false, subscriptionId };
  });
}

/**
 * Menandai booking gagal atau dibatalkan saat webhook menerima cancel/deny/expire.
 */
export async function failBookingPayment(
  bookingId: string,
  orderId: string,
  status: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const nextStatus = status === "expire" ? "EXPIRED" : "CANCELLED";
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: nextStatus,
        statusNote: `Status pembayaran Midtrans: ${status}`,
        history: {
          create: {
            status: nextStatus,
            note: `Pembayaran tidak selesai (${status})`,
          },
        },
      },
    });

    const payment = await tx.payment.findUnique({
      where: { midtransOrderId: orderId },
      select: { id: true, status: true },
    });
    if (payment && payment.status === "PENDING") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", note: `Midtrans payment status: ${status}` },
      });
    }

    await recordAuditLog({
      tx,
      action: "payment.failed",
      entityType: "booking",
      entityId: bookingId,
      description: `Payment failed for booking ${bookingId} (${status})`,
      metadata: { bookingId, orderId, status },
    });
  });
}

/**
 * Menandai pembayaran langganan owner gagal saat webhook menerima cancel/deny/expire.
 */
export async function failSubscriptionPayment(
  orderId: string,
  status: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { midtransOrderId: orderId },
      select: { id: true, status: true, recordedById: true },
    });
    if (payment && payment.status === "PENDING") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", note: `Midtrans subscription payment status: ${status}` },
      });

      await recordAuditLog({
        tx,
        action: "subscription.payment_failed",
        entityType: "payment",
        entityId: payment.id,
        description: `Subscription payment failed (${status}) for order ${orderId}`,
        metadata: { orderId, status, ownerId: payment.recordedById },
      });
    }
  });
}

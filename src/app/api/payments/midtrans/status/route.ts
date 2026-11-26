import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { bookingIdentifierWhere } from "@/server/booking-identifier";
import {
  getMidtransTransactionStatus,
  type MidtransTransactionStatusResponse,
} from "@/server/midtrans";
import {
  settleBookingPayment,
  settleSubscriptionPayment,
  failBookingPayment,
  failSubscriptionPayment,
} from "@/server/payment-service";

const statusSchema = z
  .object({
    orderId: z.string().trim().min(1).optional(),
    bookingId: z.string().trim().min(1).optional(),
  })
  .refine((val) => Boolean(val.orderId || val.bookingId), {
    message: "Order ID or Booking ID is required",
  });

function isMidtransPaidStatus(status: MidtransTransactionStatusResponse): boolean {
  return (
    status.transaction_status === "settlement" ||
    (status.transaction_status === "capture" && status.fraud_status === "accept")
  );
}

function isMidtransFailedStatus(status: MidtransTransactionStatusResponse): boolean {
  return (
    status.transaction_status === "cancel" ||
    status.transaction_status === "deny" ||
    status.transaction_status === "expire"
  );
}

async function applyBookingMidtransStatus(params: {
  bookingId: string;
  orderId: string;
  status: MidtransTransactionStatusResponse;
  snapToken?: string | null;
  allowFail?: boolean;
}) {
  const { bookingId, orderId, status, snapToken, allowFail = true } = params;
  if (isMidtransPaidStatus(status)) {
    const settleRes = await settleBookingPayment({
      bookingId,
      amount: Number(status.gross_amount),
      midtransOrderId: orderId,
      snapToken: snapToken ?? null,
      paymentType: status.payment_type ?? null,
      statusNote: "Payment verified via Midtrans Status API",
      historyNote: `Pembayaran terkonfirmasi via Midtrans Status API (${status.payment_type || "online"})`,
    });

    return {
      settled: true,
      alreadySettled: settleRes.alreadySettled,
      transactionStatus: status.transaction_status,
      bookingId,
      orderId,
    };
  }

  if (allowFail && isMidtransFailedStatus(status)) {
    await failBookingPayment(bookingId, orderId, status.transaction_status);
  }

  return {
    settled: false,
    transactionStatus: status.transaction_status,
    bookingId,
    orderId,
  };
}

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const input = await parseJson(request, statusSchema);

  // 1. Jika orderId diberikan, cek langsung ke Midtrans Core API
  if (input.orderId) {
    let status: MidtransTransactionStatusResponse | null = null;
    try {
      status = await getMidtransTransactionStatus(input.orderId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        if (!input.bookingId) {
          throw new ApiError(404, "TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan di Midtrans.");
        }
        status = null;
      } else {
        throw error;
      }
    }

    if (status && input.orderId.startsWith("BOOK-")) {
      const lastDash = input.orderId.lastIndexOf("-");
      const bookingIdentifier =
        lastDash > 5 ? input.orderId.slice(5, lastDash) : input.orderId.slice(5);

      const booking = await prisma.booking.findFirst({
        where: bookingIdentifierWhere(bookingIdentifier),
        include: { property: { select: { ownerId: true } } },
      });

      if (!booking) {
        throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking tidak ditemukan.");
      }

      if (
        profile.role !== "ADMIN" &&
        booking.applicantId !== profile.id &&
        booking.property?.ownerId !== profile.id
      ) {
        throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke booking ini.");
      }

      return successResponse(
        await applyBookingMidtransStatus({
          bookingId: booking.id,
          orderId: input.orderId,
          status,
        })
      );
    }

    if (status && input.orderId.startsWith("SUB-")) {
      const payment = await prisma.payment.findUnique({
        where: { midtransOrderId: input.orderId },
        select: { id: true, recordedById: true },
      });

      if (!payment) {
        throw new ApiError(404, "PAYMENT_NOT_FOUND", "Record pembayaran langganan tidak ditemukan.");
      }

      if (profile.role !== "ADMIN" && payment.recordedById !== profile.id) {
        throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke transaksi ini.");
      }

      if (isMidtransPaidStatus(status)) {
        const settleRes = await settleSubscriptionPayment({
          orderId: input.orderId,
          amount: Number(status.gross_amount),
          paymentType: status.payment_type ?? null,
          statusNote: "Subscription verified via Midtrans Status API",
        });

        return successResponse({
          settled: true,
          alreadySettled: settleRes.alreadySettled,
          transactionStatus: status.transaction_status,
          subscriptionId: settleRes.subscriptionId,
        });
      }

      if (isMidtransFailedStatus(status)) {
        await failSubscriptionPayment(input.orderId, status.transaction_status);
      }

      return successResponse({
        settled: false,
        transactionStatus: status.transaction_status,
      });
    }

    if (status) {
      throw new ApiError(400, "INVALID_ORDER_ID", "Format orderId tidak dikenali.");
    }
  }

  // 2. Fallback / Lookup berdasarkan bookingId (mis. saat return URL tidak membawa ?order_id=)
  if (!input.bookingId) {
    throw new ApiError(400, "INVALID_REQUEST", "Order ID atau Booking ID diperlukan.");
  }

  const booking = await prisma.booking.findFirst({
    where: bookingIdentifierWhere(input.bookingId),
    include: { property: { select: { ownerId: true } } },
  });

  if (!booking) {
    throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking tidak ditemukan.");
  }

  if (
    profile.role !== "ADMIN" &&
    booking.applicantId !== profile.id &&
    booking.property?.ownerId !== profile.id
  ) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke booking ini.");
  }

  if (booking.status === "ACTIVE") {
    return successResponse({
      settled: true,
      alreadySettled: true,
      transactionStatus: "settlement",
      bookingId: booking.id,
    });
  }

  const recentPayments = prisma.payment?.findMany
    ? await prisma.payment.findMany({
        where: {
          bookingId: booking.id,
          midtransOrderId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { midtransOrderId: true, snapToken: true },
      })
    : [];

  let latestTransactionStatus = "pending";
  for (let i = 0; i < recentPayments.length; i++) {
    const orderId = recentPayments[i]?.midtransOrderId;
    if (!orderId) continue;

    let status: MidtransTransactionStatusResponse;
    try {
      status = await getMidtransTransactionStatus(orderId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        continue;
      }
      throw error;
    }

    if (i === 0) {
      latestTransactionStatus = status.transaction_status;
    }

    if (isMidtransPaidStatus(status)) {
      return successResponse(
        await applyBookingMidtransStatus({
          bookingId: booking.id,
          orderId,
          status,
          snapToken: recentPayments[i]?.snapToken ?? null,
        })
      );
    }

    if (i === 0 && isMidtransFailedStatus(status)) {
      return successResponse(
        await applyBookingMidtransStatus({
          bookingId: booking.id,
          orderId,
          status,
          snapToken: recentPayments[i]?.snapToken ?? null,
          allowFail: true,
        })
      );
    }
  }

  return successResponse({
    settled: false,
    transactionStatus: latestTransactionStatus,
    bookingId: booking.id,
  });
});

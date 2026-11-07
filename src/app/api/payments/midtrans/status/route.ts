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

const statusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const input = await parseJson(request, statusSchema);

  // 1. Dapatkan status transaksi langsung dari Midtrans Core API
  let status: MidtransTransactionStatusResponse;
  try {
    status = await getMidtransTransactionStatus(input.orderId);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      throw new ApiError(404, "TRANSACTION_NOT_FOUND", "Transaksi tidak ditemukan di Midtrans.");
    }
    throw error;
  }

  const isPaid =
    status.transaction_status === "settlement" ||
    (status.transaction_status === "capture" && status.fraud_status === "accept");

  const isFailed =
    status.transaction_status === "cancel" ||
    status.transaction_status === "deny" ||
    status.transaction_status === "expire";

  // 2. Alur Booking Kos (BOOK-*)
  if (input.orderId.startsWith("BOOK-")) {
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

    // Otorisasi: hanya pemesan, pemilik properti, atau admin yang berhak
    if (
      profile.role !== "ADMIN" &&
      booking.applicantId !== profile.id &&
      booking.property?.ownerId !== profile.id
    ) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke booking ini.");
    }

    if (isPaid) {
      const settleRes = await settleBookingPayment({
        bookingId: booking.id,
        amount: Number(status.gross_amount),
        midtransOrderId: input.orderId,
        paymentType: status.payment_type ?? null,
        statusNote: "Payment verified via Midtrans Status API",
        historyNote: `Pembayaran terkonfirmasi via Midtrans Status API (${status.payment_type || "online"})`,
      });

      return successResponse({
        settled: true,
        alreadySettled: settleRes.alreadySettled,
        transactionStatus: status.transaction_status,
        bookingId: booking.id,
      });
    }

    if (isFailed) {
      await failBookingPayment(booking.id, input.orderId, status.transaction_status);
    }

    return successResponse({
      settled: false,
      transactionStatus: status.transaction_status,
      bookingId: booking.id,
    });
  }

  // 3. Alur Langganan Owner (SUB-*)
  if (input.orderId.startsWith("SUB-")) {
    const payment = await prisma.payment.findUnique({
      where: { midtransOrderId: input.orderId },
      select: { id: true, recordedById: true },
    });

    if (!payment) {
      throw new ApiError(404, "PAYMENT_NOT_FOUND", "Record pembayaran langganan tidak ditemukan.");
    }

    // Otorisasi: hanya pemilik langganan atau admin yang berhak
    if (profile.role !== "ADMIN" && payment.recordedById !== profile.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke transaksi ini.");
    }

    if (isPaid) {
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

    if (isFailed) {
      await failSubscriptionPayment(input.orderId, status.transaction_status);
    }

    return successResponse({
      settled: false,
      transactionStatus: status.transaction_status,
    });
  }

  throw new ApiError(400, "INVALID_ORDER_ID", "Format orderId tidak dikenali.");
});

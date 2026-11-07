import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingIdentifierWhere } from "@/server/booking-identifier";
import {
  settleBookingPayment,
  settleSubscriptionPayment,
  failBookingPayment,
  failSubscriptionPayment,
} from "@/server/payment-service";
import {
  verifyMidtransNotification,
  type MidtransNotificationPayload,
} from "@/server/midtrans";

/**
 * Midtrans Webhook Notification Handler.
 * Menerima callback HTTP POST dari Midtrans saat status transaksi berubah:
 * - Memvalidasi signature SHA-512 dengan perbandingan waktu konstan.
 * - Memverifikasi kesesuaian gross_amount untuk mencegah manipulasi harga.
 * - Menangani pesanan booking kos (BOOK-*) dan langganan owner (SUB-*).
 * - Pembaruan database atomik dan idempoten (aman terhadap callback duplikat).
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MidtransNotificationPayload;

    // 1. Verifikasi keaslian signature dari Midtrans (Fail-closed)
    const isValid = verifyMidtransNotification(payload);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Midtrans signature" },
        { status: 401 }
      );
    }

    const { order_id, transaction_status, fraud_status } = payload;
    if (!order_id) {
      return NextResponse.json({ received: true, ignored: "Missing order_id" });
    }

    const isPaid =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    const isFailed =
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire";

    // 2. Alur Pembayaran Booking Kos (BOOK-*)
    if (order_id.startsWith("BOOK-")) {
      const lastDash = order_id.lastIndexOf("-");
      const bookingIdentifier =
        lastDash > 5 ? order_id.slice(5, lastDash) : order_id.slice(5);

      const booking = await prisma.booking.findFirst({
        where: bookingIdentifierWhere(bookingIdentifier),
        select: {
          id: true,
          depositSnapshot: true,
          monthlyPriceSnapshot: true,
        },
      });

      if (!booking) {
        return NextResponse.json({ received: true, error: "Booking not found" });
      }

      // Verifikasi nominal transaksi terhadap data tagihan internal
      const expectedAmount =
        booking.depositSnapshot !== null && booking.depositSnapshot !== undefined
          ? Number(booking.depositSnapshot)
          : booking.monthlyPriceSnapshot !== null && booking.monthlyPriceSnapshot !== undefined
          ? Number(booking.monthlyPriceSnapshot)
          : null;

      if (
        expectedAmount !== null &&
        Math.abs(Number(payload.gross_amount) - expectedAmount) > 1
      ) {
        console.error(
          `[Midtrans Webhook] Gross amount mismatch for booking ${booking.id}: received ${payload.gross_amount}, expected ${expectedAmount}`
        );
        return NextResponse.json(
          { error: "Gross amount mismatch", received: payload.gross_amount, expected: expectedAmount },
          { status: 400 }
        );
      }

      if (isPaid) {
        await settleBookingPayment({
          bookingId: booking.id,
          amount: Number(payload.gross_amount),
          midtransOrderId: order_id,
          paymentType: payload.payment_type ?? null,
          statusNote: "Payment verified successfully via Midtrans",
          historyNote: `Pembayaran lunas via Midtrans (${payload.payment_type || "online"})`,
        });
      } else if (isFailed) {
        await failBookingPayment(booking.id, order_id, transaction_status);
      }

      return NextResponse.json({ success: true });
    }

    // 3. Alur Pembayaran Langganan Owner (SUB-*)
    if (order_id.startsWith("SUB-")) {
      const payment = await prisma.payment.findUnique({
        where: { midtransOrderId: order_id },
        select: { id: true, amount: true },
      });

      if (!payment) {
        return NextResponse.json({ received: true, error: "Payment not found" });
      }

      // Verifikasi nominal transaksi terhadap nominal tagihan paket
      if (Math.abs(Number(payload.gross_amount) - Number(payment.amount)) > 1) {
        console.error(
          `[Midtrans Webhook] Gross amount mismatch for subscription payment ${payment.id}: received ${payload.gross_amount}, expected ${payment.amount}`
        );
        return NextResponse.json(
          { error: "Gross amount mismatch", received: payload.gross_amount, expected: Number(payment.amount) },
          { status: 400 }
        );
      }

      if (isPaid) {
        await settleSubscriptionPayment({
          orderId: order_id,
          amount: Number(payload.gross_amount),
          paymentType: payload.payment_type ?? null,
          statusNote: "Subscription verified via Midtrans",
          historyNote: `Langganan aktif via Midtrans (${payload.payment_type || "online"})`,
        });
      } else if (isFailed) {
        await failSubscriptionPayment(order_id, transaction_status);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true, ignored: "Unrecognized order_id prefix" });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

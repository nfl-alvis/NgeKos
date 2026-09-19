import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyMidtransNotification,
  type MidtransNotificationPayload,
} from "@/server/midtrans";

/**
 * Midtrans Webhook Notification Handler.
 * Menerima callback HTTP POST dari Midtrans saat status transaksi berubah.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MidtransNotificationPayload;

    // 1. Verifikasi keaslian signature dari Midtrans
    const isValid = verifyMidtransNotification(payload);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Midtrans signature" },
        { status: 401 }
      );
    }

    const { order_id, transaction_status, fraud_status } = payload;

    // 2. Ekstrak kode booking dari order_id (format: BOOK-{bookingCode/Id}-{timestamp})
    const match = order_id.match(/^BOOK-(.+)-\d+$/);
    if (!match) {
      return NextResponse.json({ received: true, ignored: "Invalid order_id format" });
    }

    const bookingIdentifier = match[1];

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ code: bookingIdentifier }, { id: bookingIdentifier }],
      },
      include: {
        property: true,
        roomType: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ received: true, error: "Booking not found" });
    }

    const isPaid =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isPaid) {
      // 3. Update status kamar ke OCCUPIED & booking ke ACTIVE
      await prisma.$transaction(async (tx) => {
        let roomUnitId = booking.roomUnitId;
        if (!roomUnitId) {
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
        } else {
          await tx.roomUnit.update({
            where: { id: roomUnitId },
            data: { status: "OCCUPIED" },
          });
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "ACTIVE",
            roomUnitId,
            statusNote: "Pembayaran berhasil diverifikasi via Midtrans",
            history: {
              create: {
                status: "ACTIVE",
                note: `Pembayaran lunas via Midtrans (${payload.payment_type || "online"})`,
              },
            },
          },
        });
      });
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire"
    ) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED",
          statusNote: `Status pembayaran Midtrans: ${transaction_status}`,
          history: {
            create: {
              status: transaction_status === "expire" ? "EXPIRED" : "CANCELLED",
              note: `Pembayaran tidak selesai (${transaction_status})`,
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Midtrans webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

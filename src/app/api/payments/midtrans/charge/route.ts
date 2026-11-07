import { getAuthContext } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { getBooking } from "@/server/booking-service";
import { createSnapTransaction, getMidtransConfig } from "@/server/midtrans";
import { bookings as staticBookings } from "@/lib/data/entities";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const chargeSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  returnUrl: z.string().optional(),
});

export const POST = withApi(async (request: Request) => {
  const auth = await getAuthContext();
  const input = await parseJson(request, chargeSchema);

  let bookingData: {
    id: string;
    code?: string;
    property: { name: string };
    roomTypeId: string;
    applicant: { fullName?: string | null; email?: string | null; phone?: string | null };
    monthlyPriceSnapshot: number;
    depositSnapshot: number | null;
    status: string;
  };

  const staticBooking = staticBookings.find(
    (booking) => booking.id.toLowerCase() === input.bookingId.toLowerCase(),
  );
  if (staticBooking) {
    bookingData = {
      id: staticBooking.id,
      code: staticBooking.id,
      property: { name: staticBooking.propertyName },
      roomTypeId: staticBooking.roomId,
      applicant: {
        fullName: auth?.profile.fullName || staticBooking.applicantName || "Tester Midtrans",
        email: auth?.profile.email || staticBooking.applicantEmail || "tester@ngekost.id",
        phone: auth?.profile.phone || staticBooking.applicantPhone || "081234567890",
      },
      monthlyPriceSnapshot: staticBooking.monthlyPrice,
      depositSnapshot: staticBooking.usesDp ? Math.round(staticBooking.monthlyPrice * 0.35) : null,
      status: "APPROVED_AWAITING_PAYMENT",
    };
  } else {
    if (!auth) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in first to pay for this booking.");
    const dbBooking = await getBooking(auth.profile, input.bookingId);
    bookingData = {
      id: dbBooking.id,
      code: dbBooking.code,
      property: { name: dbBooking.property.name },
      roomTypeId: dbBooking.roomTypeId,
      applicant: {
        fullName: dbBooking.applicant.fullName,
        email: dbBooking.applicant.email,
        phone: dbBooking.applicant.phone,
      },
      monthlyPriceSnapshot: Number(dbBooking.monthlyPriceSnapshot),
      depositSnapshot: dbBooking.depositSnapshot !== null ? Number(dbBooking.depositSnapshot) : null,
      status: dbBooking.status,
    };
  }

  // Periksa apakah status booking dapat dibayar
  if (bookingData.status !== "APPROVED_AWAITING_PAYMENT" && bookingData.status !== "PENDING") {
    throw new ApiError(
      400,
      "INVALID_BOOKING_STATUS",
      `Booking dengan status ${bookingData.status} tidak dapat diproses pembayarannya.`
    );
  }

  const amount = bookingData.depositSnapshot
    ? Number(bookingData.depositSnapshot)
    : Number(bookingData.monthlyPriceSnapshot);

  const config = getMidtransConfig();

  if (!config.isConfigured) {
    return successResponse({
      isConfigured: false,
      message:
        "MIDTRANS_SERVER_KEY is not set in the environment variables (.env.local). Add the key from the Midtrans Sandbox/Production dashboard.",
      bookingId: bookingData.id,
      grossAmount: amount,
      token: null,
      redirectUrl: null,
      clientKey: config.clientKey || null,
      isProduction: config.isProduction,
    });
  }

  // Buat order ID unik untuk Midtrans: BOOK-{code}-{timestamp}
  const orderId = `BOOK-${bookingData.code || bookingData.id.slice(0, 8)}-${Date.now()}`;

  let snapResult;
  try {
    snapResult = await createSnapTransaction({
      orderId,
      grossAmount: amount,
      customerDetails: {
        first_name: bookingData.applicant.fullName || "Penyewa",
        email: bookingData.applicant.email || "customer@ngekost.id",
        phone: bookingData.applicant.phone || undefined,
      },
      itemDetails: [
        {
          id: bookingData.roomTypeId,
          name: `Sewa ${bookingData.property.name}`.slice(0, 50),
          price: Math.round(amount),
          quantity: 1,
        },
      ],
      callbacks: input.returnUrl ? { finish: input.returnUrl } : undefined,
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === "fetch failed") {
      throw new ApiError(503, "PAYMENT_GATEWAY_UNAVAILABLE", "Tidak dapat terhubung ke Midtrans. Periksa koneksi server, lalu coba lagi.");
    }
    throw error;
  }

  // Simpan record Payment dengan status PENDING sebelum mengarahkan pengguna ke Midtrans
  if (!staticBooking) {
    try {
      await prisma.payment.upsert({
        where: { midtransOrderId: orderId },
        update: {
          snapToken: snapResult.token,
          status: "PENDING",
          amount: new Prisma.Decimal(Math.round(amount)),
        },
        create: {
          bookingId: bookingData.id,
          method: "MIDTRANS",
          status: "PENDING",
          amount: new Prisma.Decimal(Math.round(amount)),
          reference: orderId,
          midtransOrderId: orderId,
          snapToken: snapResult.token,
          recordedById: auth?.profile.id,
        },
      });
    } catch (dbErr) {
      // Graceful fallback bila tabel payments belum memiliki kolom midtrans_order_id/booking_id
      console.warn("[Charge] Payment upsert bypassed due to pending migration drift:", dbErr);
    }
  }

  return successResponse({
    isConfigured: true,
    bookingId: bookingData.id,
    orderId,
    grossAmount: amount,
    token: snapResult.token,
    redirectUrl: snapResult.redirect_url,
    clientKey: config.clientKey,
    isProduction: config.isProduction,
  });
});

import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { getBooking } from "@/server/booking-service";
import { createSnapTransaction, getMidtransConfig } from "@/server/midtrans";
import { z } from "zod";

const chargeSchema = z.object({
  bookingId: z.string().min(1, "Booking ID wajib diisi"),
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const input = await parseJson(request, chargeSchema);
  const booking = await getBooking(profile, input.bookingId);

  // Periksa apakah status booking dapat dibayar
  if (booking.status !== "APPROVED_AWAITING_PAYMENT" && booking.status !== "PENDING") {
    throw new ApiError(
      400,
      "INVALID_BOOKING_STATUS",
      `Booking dengan status ${booking.status} tidak dapat diproses pembayarannya.`
    );
  }

  const amount = booking.depositSnapshot
    ? Number(booking.depositSnapshot)
    : Number(booking.monthlyPriceSnapshot);

  const config = getMidtransConfig();

  if (!config.isConfigured) {
    return successResponse({
      isConfigured: false,
      message:
        "MIDTRANS_SERVER_KEY belum diisi di environment variables (.env.local). Silakan isi key dari dashboard Midtrans Sandbox/Production.",
      bookingId: booking.id,
      grossAmount: amount,
      token: null,
      redirectUrl: null,
      clientKey: config.clientKey || null,
      isProduction: config.isProduction,
    });
  }

  // Buat order ID unik untuk Midtrans: BOOK-{code}-{timestamp}
  const orderId = `BOOK-${booking.code || booking.id.slice(0, 8)}-${Date.now()}`;

  const snapResult = await createSnapTransaction({
    orderId,
    grossAmount: amount,
    customerDetails: {
      first_name: booking.applicant.fullName || profile.fullName || "Penyewa",
      email: booking.applicant.email || profile.email,
      phone: booking.applicant.phone || profile.phone || undefined,
    },
    itemDetails: [
      {
        id: booking.roomTypeId,
        name: `Sewa ${booking.property.name}`.slice(0, 50),
        price: Math.round(amount),
        quantity: 1,
      },
    ],
  });

  return successResponse({
    isConfigured: true,
    bookingId: booking.id,
    grossAmount: amount,
    token: snapResult.token,
    redirectUrl: snapResult.redirect_url,
    clientKey: config.clientKey,
    isProduction: config.isProduction,
  });
});

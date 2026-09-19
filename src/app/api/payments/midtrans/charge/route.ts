import { getAuthContext } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { getBooking } from "@/server/booking-service";
import { createSnapTransaction, getMidtransConfig } from "@/server/midtrans";
import { bookings as staticBookings } from "@/lib/data/entities";
import { z } from "zod";

const chargeSchema = z.object({
  bookingId: z.string().min(1, "Booking ID wajib diisi"),
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

  if (auth) {
    try {
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
    } catch {
      const staticB = staticBookings.find(
        (b) => b.id.toLowerCase() === input.bookingId.toLowerCase()
      );
      if (staticB) {
        bookingData = {
          id: staticB.id,
          code: staticB.id,
          property: { name: staticB.propertyName },
          roomTypeId: staticB.roomId,
          applicant: {
            fullName: auth.profile.fullName || staticB.applicantName,
            email: auth.profile.email || staticB.applicantEmail,
            phone: auth.profile.phone || staticB.applicantPhone,
          },
          monthlyPriceSnapshot: staticB.monthlyPrice,
          depositSnapshot: staticB.usesDp ? Math.round(staticB.monthlyPrice * 0.35) : null,
          status: "APPROVED_AWAITING_PAYMENT",
        };
      } else {
        throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking tidak ditemukan");
      }
    }
  } else {
    // Guest or unauthenticated test for static demo bookings
    const staticB = staticBookings.find(
      (b) => b.id.toLowerCase() === input.bookingId.toLowerCase()
    );
    if (staticB) {
      bookingData = {
        id: staticB.id,
        code: staticB.id,
        property: { name: staticB.propertyName },
        roomTypeId: staticB.roomId,
        applicant: {
          fullName: staticB.applicantName || "Tester Midtrans",
          email: staticB.applicantEmail || "tester@ngekost.id",
          phone: staticB.applicantPhone || "081234567890",
        },
        monthlyPriceSnapshot: staticB.monthlyPrice,
        depositSnapshot: staticB.usesDp ? Math.round(staticB.monthlyPrice * 0.35) : null,
        status: "APPROVED_AWAITING_PAYMENT",
      };
    } else {
      throw new ApiError(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu untuk membayar booking ini.");
    }
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
        "MIDTRANS_SERVER_KEY belum diisi di environment variables (.env.local). Silakan isi key dari dashboard Midtrans Sandbox/Production.",
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

  const snapResult = await createSnapTransaction({
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
  });

  return successResponse({
    isConfigured: true,
    bookingId: bookingData.id,
    grossAmount: amount,
    token: snapResult.token,
    redirectUrl: snapResult.redirect_url,
    clientKey: config.clientKey,
    isProduction: config.isProduction,
  });
});

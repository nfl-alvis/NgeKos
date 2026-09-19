import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { getBooking } from "@/server/booking-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const simulateSchema = z.object({
  bookingId: z.string().min(1),
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const input = await parseJson(request, simulateSchema);
  const booking = await getBooking(profile, input.bookingId);

  if (booking.status !== "APPROVED_AWAITING_PAYMENT" && booking.status !== "PENDING") {
    throw new ApiError(
      400,
      "INVALID_STATUS",
      `Booking berstatus ${booking.status} tidak dapat diselesaikan.`
    );
  }

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
        statusNote: "Pembayaran terkonfirmasi (Simulasi Sandbox)",
        history: {
          create: {
            status: "ACTIVE",
            note: "Pembayaran lunas via Simulasi Sandbox",
            actorId: profile.id,
          },
        },
      },
    });
  });

  return successResponse({
    success: true,
    bookingId: booking.id,
    message: "Pembayaran berhasil disimulasikan. Status booking kini ACTIVE.",
  });
});

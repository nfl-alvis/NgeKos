import { z } from "zod";
import { requireUser } from "@/server/auth";
import { createBooking, listBookings } from "@/server/booking-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { bookingCreateSchema, paginationSchema } from "@/server/validation";

const statusSchema = z.enum(["PENDING", "APPROVED_AWAITING_PAYMENT", "ACTIVE", "REJECTED", "EXPIRED", "CANCELLED", "COMPLETED"]);

export const GET = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const params = new URL(request.url).searchParams;
  const { page, limit } = paginationSchema.parse({ page: params.get("page") ?? undefined, limit: params.get("limit") ?? undefined });
  const status = params.get("status") ? statusSchema.parse(params.get("status")) : undefined;
  const result = await listBookings(profile, page, limit, status);
  return successResponse(result.items, { meta: { total: result.total, page, limit, pages: result.pages } });
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser(["SEEKER"]);
  const input = await parseJson(request, bookingCreateSchema);
  return successResponse(await createBooking(profile, input), { status: 201 });
});

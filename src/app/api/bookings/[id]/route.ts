import { requireUser } from "@/server/auth";
import { getBooking, transitionBooking } from "@/server/booking-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { bookingDecisionSchema } from "@/server/validation";

type Context = { params: Promise<{ id: string }> };

export const GET = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  return successResponse(await getBooking(profile, id));
});

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const input = await parseJson(request, bookingDecisionSchema);
  return successResponse(await transitionBooking(profile, id, input));
});

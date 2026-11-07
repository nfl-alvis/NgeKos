import { requireUser } from "@/server/auth";
import { getBooking, transitionBooking } from "@/server/booking-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { bookingDecisionSchema } from "@/server/validation";
import { recordAuditLog } from "@/server/audit-service";

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
  const result = await transitionBooking(profile, id, input);

  if (profile.role === "ADMIN") {
    await recordAuditLog({
      actor: profile,
      action: "booking.transition",
      entityType: "BOOKING",
      entityId: id,
      description: `Admin ${profile.fullName} transitioned booking ${id} to ${input.status}`,
      metadata: {
        bookingId: id,
        newStatus: input.status,
        note: input.note,
      },
      request,
    });
  }

  return successResponse(result);
});

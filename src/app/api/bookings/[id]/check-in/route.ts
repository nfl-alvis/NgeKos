import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { checkInSchema } from "@/server/validation";
import { tenantCheckIn } from "@/server/checkin-checkout-service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const input = await parseJson(request, checkInSchema);
  const result = await tenantCheckIn({
    bookingId: id,
    profile,
    checkInNotes: input.checkInNotes,
  });

  return successResponse(result);
});

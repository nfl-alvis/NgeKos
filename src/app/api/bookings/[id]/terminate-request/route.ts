import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { terminationRequestSchema } from "@/server/validation";
import { requestTermination } from "@/server/mutual-termination-service";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const input = await parseJson(request, terminationRequestSchema);

  const result = await requestTermination({
    bookingId: id,
    profile,
    reason: input.reason,
    damageDeduction: input.damageDeduction,
    requestedTerminationDate: input.requestedTerminationDate,
  });

  return successResponse(result);
});

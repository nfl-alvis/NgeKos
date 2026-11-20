import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { terminationConfirmSchema } from "@/server/validation";
import { confirmTermination } from "@/server/mutual-termination-service";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const input = await parseJson(request, terminationConfirmSchema);

  const result = await confirmTermination({
    bookingId: id,
    profile,
    action: input.action,
    rejectionReason: input.rejectionReason,
  });

  return successResponse(result);
});

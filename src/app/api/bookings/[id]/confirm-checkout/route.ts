import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { checkOutConfirmSchema } from "@/server/validation";
import { ownerConfirmCheckOut } from "@/server/checkin-checkout-service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const input = await parseJson(request, checkOutConfirmSchema);
  const result = await ownerConfirmCheckOut({
    bookingId: id,
    profile,
    inspectionNotes: input.inspectionNotes,
    depositRefundAmount: input.depositRefundAmount,
    roomStatus: input.roomStatus,
  });

  return successResponse(result);
});

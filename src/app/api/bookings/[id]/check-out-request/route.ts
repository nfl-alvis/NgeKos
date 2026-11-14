import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { checkOutRequestSchema } from "@/server/validation";
import { tenantRequestCheckOut } from "@/server/checkin-checkout-service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const input = await parseJson(request, checkOutRequestSchema);
  const result = await tenantRequestCheckOut({
    bookingId: id,
    profile,
    checkOutDate: input.checkOutDate,
    checkOutNotes: input.checkOutNotes,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountHolder: input.accountHolder,
  });

  return successResponse(result);
});

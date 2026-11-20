import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { extendLeaseSchema } from "@/server/validation";
import { extendLease } from "@/server/lease-extension-service";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const input = await parseJson(request, extendLeaseSchema);

  const result = await extendLease({
    bookingId: id,
    profile,
    additionalMonths: input.additionalMonths,
    billingCycle: input.billingCycle,
  });

  return successResponse(result);
});

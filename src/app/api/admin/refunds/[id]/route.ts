import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { decideRefundRequest, getRefundRequest } from "@/server/refund-service";
import { refundDecisionSchema } from "@/server/validation";

type Context = { params: Promise<{ id: string }> };

export const GET = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["ADMIN"]);
  const refund = await getRefundRequest(profile, id);
  return successResponse(refund);
});

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["ADMIN"]);
  const input = await parseJson(request, refundDecisionSchema);
  const result = await decideRefundRequest(profile, id, input, request);
  return successResponse(result);
});

import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { cancelRefundRequest, getRefundRequest } from "@/server/refund-service";

type Context = { params: Promise<{ id: string }> };

const cancelActionSchema = z.object({
  action: z.literal("CANCEL"),
});

export const GET = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  const refund = await getRefundRequest(profile, id);
  return successResponse(refund);
});

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  await parseJson(request, cancelActionSchema);
  const result = await cancelRefundRequest(profile, id, request);
  return successResponse(result);
});

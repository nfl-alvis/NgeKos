import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { updateInvoice } from "@/server/owner-service";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["ISSUED", "PAID", "CANCELLED"]), note: z.string().trim().max(2000).optional() }).strict();

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, schema);
  return successResponse(await updateInvoice(profile, id, input.status, input.note));
});

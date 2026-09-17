import { z } from "zod";
import { requireUser } from "@/server/auth";
import { updateComplaint } from "@/server/engagement-service";
import { parseJson, successResponse, withApi } from "@/server/http";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]), note: z.string().trim().max(2000).optional() }).strict();

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, schema);
  return successResponse(await updateComplaint(profile, id, input.status, input.note));
});

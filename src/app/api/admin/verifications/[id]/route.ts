import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { decidePropertyVerification } from "@/server/owner-service";

type Context = { params: Promise<{ id: string }> };
const schema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVED") }).strict(),
  z.object({ decision: z.literal("REJECTED"), reason: z.string().trim().min(3).max(2000) }).strict(),
]);
export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["ADMIN"]);
  const input = await parseJson(request, schema);
  return successResponse(await decidePropertyVerification(profile, id, input.decision, "reason" in input ? input.reason : undefined));
});

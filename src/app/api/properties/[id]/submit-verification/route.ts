import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { submitPropertyVerification } from "@/server/owner-service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const result = await submitPropertyVerification(profile, id);
  return successResponse(result);
});

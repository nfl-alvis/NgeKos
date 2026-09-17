import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { markNotificationRead } from "@/server/owner-service";

type Context = { params: Promise<{ id: string }> };
export const PATCH = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser();
  await markNotificationRead(profile, id);
  return successResponse({ read: true });
});

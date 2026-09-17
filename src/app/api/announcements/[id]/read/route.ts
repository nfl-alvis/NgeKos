import { requireUser } from "@/server/auth";
import { markAnnouncementRead } from "@/server/owner-service";
import { successResponse, withApi } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["SEEKER"]);
  await markAnnouncementRead(profile, id);
  return successResponse({ read: true });
});

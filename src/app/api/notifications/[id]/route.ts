import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { markNotificationRead, deleteNotification } from "@/server/owner-service";

type Context = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  try {
    const { profile } = await requireUser();
    await markNotificationRead(profile, id);
  } catch {}
  return successResponse({ read: true, id });
});

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  try {
    const { profile } = await requireUser();
    await deleteNotification(profile, id);
  } catch {}
  return successResponse({ deleted: true, id });
});

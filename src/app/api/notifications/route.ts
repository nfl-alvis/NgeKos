import { requireUser } from "@/server/auth";
import { listNotifications, markNotificationRead } from "@/server/owner-service";
import { successResponse, withApi } from "@/server/http";

export const GET = withApi(async () => successResponse(await listNotifications((await requireUser()).profile)));

export const PATCH = withApi(async () => {
  const { profile } = await requireUser();
  await markNotificationRead(profile);
  return successResponse({ read: true });
});

import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { disconnectTelegram } from "@/server/telegram-service";

export const POST = withApi(async () => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  await disconnectTelegram(auth.profile.id);
  return successResponse({ disconnected: true });
});

export const DELETE = POST;

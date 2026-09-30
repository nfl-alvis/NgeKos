import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { disconnectTelegram } from "@/server/telegram-service";

export const POST = withApi(async () => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  await disconnectTelegram(auth.profile.id);

  try {
    const { getSessionCookie, setSessionCookie } = await import("@/server/user-store");
    const session = await getSessionCookie();
    if (session) {
      await setSessionCookie({
        ...session,
        telegramChatId: null,
        telegramUsername: null,
        telegramConnectedAt: null,
      });
    }
  } catch {}

  return successResponse({ disconnected: true });
});

export const DELETE = POST;

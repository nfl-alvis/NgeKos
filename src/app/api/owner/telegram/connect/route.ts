import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { generateTelegramConnectLink } from "@/server/telegram-service";

export const POST = withApi(async () => {
  const auth = await requireUser(["OWNER"]);
  const result = await generateTelegramConnectLink(auth.profile.id);
  return successResponse(result);
});

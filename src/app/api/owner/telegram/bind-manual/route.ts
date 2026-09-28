import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { bindTelegramManual } from "@/server/telegram-service";
import { z } from "zod";

const bindSchema = z.object({
  telegramUsername: z.string().trim().optional(),
  telegramChatId: z.string().trim().optional(),
}).refine((data) => Boolean(data.telegramUsername || data.telegramChatId), {
  message: "Harap masukkan Username Telegram atau Chat ID",
});

export const POST = withApi(async (request: Request) => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const input = await parseJson(request, bindSchema);
  const result = await bindTelegramManual(auth.profile.id, input);
  return successResponse(result);
});

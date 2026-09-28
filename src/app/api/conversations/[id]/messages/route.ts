import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/server/telegram-service";
import { z } from "zod";

const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000, "Pesan maksimal 4000 karakter"),
});

export const POST = withApi(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["OWNER"]);
  const { id } = await context.params;
  const { text } = await parseJson(request, sendMessageSchema);

  // Cari conversation di database
  let conv = await prisma.conversation.findFirst({
    where: { id, deletedAt: null },
  });

  // Jika tidak ditemukan di DB (misal sedang membalas thread mock/demo), buat atau sinkronkan
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        id: id.startsWith("c-") ? undefined : id,
        ownerId: auth.profile.id,
        channel: "TELEGRAM",
        externalName: "Lawan Bicara",
      },
    });
  }

  // Simpan balasan owner ke database
  const createdMsg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: auth.profile.id,
      senderRole: "OWNER",
      channel: conv.channel,
      body: text,
    },
  });

  // Update timestamp conversation
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  });

  // Jika channel Telegram dan ada externalChatId, teruskan ke bot Telegram user
  let telegramSent = false;
  if (conv.externalChatId) {
    const teleRes = await sendTelegramMessage(conv.externalChatId, text);
    telegramSent = teleRes.ok;
  }

  return successResponse({
    id: createdMsg.id,
    from: "owner",
    text: createdMsg.body,
    at: createdMsg.createdAt.toISOString(),
    channel: conv.channel.toLowerCase(),
    telegramSent,
  });
});

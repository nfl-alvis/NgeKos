import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/server/telegram-service";
import { z } from "zod";

const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000, "Pesan maksimal 4000 karakter"),
});

export const POST = withApi(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const { id } = await context.params;
  const { text } = await parseJson(request, sendMessageSchema);

  // Cari conversation di database
  let conv = await prisma.conversation.findFirst({
    where: { id, deletedAt: null },
    include: {
      owner: true,
      contact: true,
      property: true,
    },
  });

  // Jika tidak ditemukan di DB (misal sedang membalas thread mock/demo pada owner), buat atau sinkronkan
  if (!conv) {
    if (auth.profile.role === "OWNER") {
      conv = await prisma.conversation.create({
        data: {
          id: id.startsWith("c-") ? undefined : id,
          ownerId: auth.profile.id,
          channel: "TELEGRAM",
          externalName: "Lawan Bicara",
        },
        include: {
          owner: true,
          contact: true,
          property: true,
        },
      });
    } else {
      throw new ApiError(404, "NOT_FOUND", "Percakapan tidak ditemukan.");
    }
  }

  // Verifikasi akses
  const isOwner = auth.profile.id === conv.ownerId;
  const isContact = conv.contactId ? auth.profile.id === conv.contactId : false;

  // Jika bukan owner dan bukan contact (kecuali contactId masih null dan auth bukan owner)
  if (!isOwner && !isContact && conv.contactId !== null) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke percakapan ini.");
  }

  // Jika contactId masih kosong dan yang mengirim bukan owner, tautkan contactId
  if (!isOwner && !conv.contactId) {
    conv = await prisma.conversation.update({
      where: { id: conv.id },
      data: { contactId: auth.profile.id },
      include: {
        owner: true,
        contact: true,
        property: true,
      },
    });
  }

  const senderRole = isOwner ? "OWNER" : "CONTACT";

  // Simpan pesan ke database
  const createdMsg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: auth.profile.id,
      senderRole,
      channel: conv.channel,
      body: text,
    },
  });

  // Update timestamp conversation
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  });

  // Kirim notifikasi Telegram ke lawan bicara jika terhubung
  let telegramSent = false;
  if (isOwner) {
    // Owner mengirim ke Seeker
    const targetChatId = conv.contact?.telegramChatId || conv.externalChatId;
    if (targetChatId) {
      const ownerName = conv.owner?.fullName || auth.profile.fullName || "Pemilik Kost";
      const propText = conv.property?.name ? ` (${conv.property.name})` : "";
      const notifText =
        `📩 <b>Balasan dari Pemilik Kost${propText}!</b>\n\n` +
        `👤 <b>Pemilik:</b> ${ownerName}\n` +
        `💬 <b>Pesan:</b>\n<i>"${text}"</i>\n\n` +
        `👉 <i>Buka website NgeKos untuk melihat dan membalas percakapan.</i>`;
      const teleRes = await sendTelegramMessage(targetChatId, notifText);
      telegramSent = teleRes.ok;
    }
  } else {
    // Seeker mengirim ke Owner
    const targetChatId = conv.owner?.telegramChatId;
    if (targetChatId) {
      const seekerName = auth.profile.fullName || conv.externalName || "Calon Penyewa";
      const propText = conv.property?.name ? ` (${conv.property.name})` : "";
      const notifText =
        `📩 <b>Pesan Baru dari Calon Penyewa${propText}!</b>\n\n` +
        `👤 <b>Dari:</b> ${seekerName}\n` +
        `💬 <b>Pesan:</b>\n<i>"${text}"</i>\n\n` +
        `👉 <i>Buka Dashboard NgeKos Anda untuk membalas langsung dari website.</i>`;
      const teleRes = await sendTelegramMessage(targetChatId, notifText);
      telegramSent = teleRes.ok;
    }
  }

  return successResponse({
    id: createdMsg.id,
    from: senderRole === "OWNER" ? "owner" : "contact",
    isMe: true,
    text: createdMsg.body,
    at: createdMsg.createdAt.toISOString(),
    channel: conv.channel.toLowerCase(),
    telegramSent,
    status: telegramSent ? "delivered" : "sent",
    readAt: null,
  });
});

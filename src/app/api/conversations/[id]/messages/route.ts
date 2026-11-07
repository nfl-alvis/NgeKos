import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/server/telegram-service";
import {
  encodeMessageCursor,
  MESSAGE_PAGE_DEFAULT,
  MESSAGE_PAGE_MAX,
  messagePageWhere,
  parseMessageCursor,
} from "@/server/message-cursor";
import { z } from "zod";

const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Message must not be empty").max(4000, "Message must be at most 4000 characters"),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MESSAGE_PAGE_MAX).default(MESSAGE_PAGE_DEFAULT),
  cursor: z.string().trim().optional(),
});

// Baca riwayat pesan: identitas via sesi server-side, akses terbatas pada
// peserta percakapan (owner, atau contact terkait; `contact_id` NULL hanya
// owner). Read tidak pernah bermutasi — tidak ada auto-link seperti POST.
export const GET = withApi(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
  }
  const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const cursor = query.cursor ? parseMessageCursor(query.cursor) : null;
  if (query.cursor && !cursor) {
    throw new ApiError(400, "INVALID_CURSOR", "Invalid pagination cursor");
  }

  const conv = await prisma.conversation.findFirst({ where: { id, deletedAt: null } });
  if (!conv) {
    throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
  }
  const isOwner = auth.profile.id === conv.ownerId;
  const isContact = conv.contactId !== null && auth.profile.id === conv.contactId;
  if (!isOwner && !isContact) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this conversation.");
  }

  const rows = await prisma.message.findMany({
    where: { conversationId: conv.id, deletedAt: null, ...(cursor ? messagePageWhere(cursor) : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
  });
  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const messages = [...page].reverse().map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderRole: m.senderRole,
    channel: m.channel,
    body: m.body,
    readAt: m.readAt ? m.readAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));

  return successResponse({
    messages,
    nextCursor: hasMore ? encodeMessageCursor(page[page.length - 1]) : null,
  });
});

export const POST = withApi(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
  }
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
      throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
    }
  }

  // Verifikasi akses
  const isOwner = auth.profile.id === conv.ownerId;
  const isContact = conv.contactId ? auth.profile.id === conv.contactId : false;

  // Jika bukan owner dan bukan contact (kecuali contactId masih null dan auth bukan owner)
  if (!isOwner && !isContact && conv.contactId !== null) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this conversation.");
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

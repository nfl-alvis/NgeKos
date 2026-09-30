import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/server/telegram-service";
import { conversations as mockConversations } from "@/lib/data/entities";
import { z } from "zod";

const createConversationSchema = z.object({
  propertySlug: z.string().optional(),
  propertyId: z.string().optional(),
  initialMessage: z.string().trim().min(1, "Pesan tidak boleh kosong").max(4000),
});

export const GET = withApi(async () => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const userId = auth.profile.id;
  const isOwner = auth.profile.role === "OWNER";

  try {
    const dbConversations = await prisma.conversation.findMany({
      where: isOwner
        ? { ownerId: userId, deletedAt: null }
        : { contactId: userId, deletedAt: null },
      include: {
        owner: true,
        contact: true,
        property: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedDb = dbConversations.map((c) => {
      const isTelegram = c.channel.toLowerCase() === "telegram";
      const otherName = isOwner
        ? (c.contact?.fullName || c.externalName || "Pengguna Telegram")
        : (c.owner?.fullName || "Pemilik Kost");

      const telegramConnected = isOwner
        ? Boolean(c.externalChatId || c.contact?.telegramChatId)
        : Boolean(c.owner?.telegramChatId);

      const unreadCount = c.messages.filter((m) =>
        isOwner
          ? m.senderRole === "CONTACT" && !m.readAt
          : m.senderRole === "OWNER" && !m.readAt
      ).length;

      return {
        id: c.id,
        name: otherName,
        channel: (isTelegram ? "telegram" : "in_app") as "telegram" | "email",
        telegramConnected,
        unread: unreadCount,
        propertyName: c.property?.name,
        propertySlug: c.property?.slug,
        externalChatId: c.externalChatId,
        messages: c.messages.map((m) => {
          const isMe = isOwner ? m.senderRole === "OWNER" : m.senderRole === "CONTACT";
          return {
            id: m.id,
            from: (m.senderRole === "OWNER" ? "owner" : "contact") as "owner" | "contact",
            isMe,
            text: m.body,
            at: m.createdAt.toISOString(),
            readAt: m.readAt ? m.readAt.toISOString() : null,
            status: (m.readAt
              ? "read"
              : telegramConnected || isTelegram
              ? "delivered"
              : "sent") as "sent" | "delivered" | "read",
            channel: (m.channel.toLowerCase() === "telegram" ? "telegram" : "in_app") as "telegram" | "email",
          };
        }),
      };
    });

    // Mock data fallback only for owner demo
    if (isOwner) {
      const combined = [...formattedDb];
      for (const mock of mockConversations) {
        if (!combined.some((item) => item.id === mock.id)) {
          combined.push({
            ...mock,
            propertyName: undefined,
            propertySlug: undefined,
            externalChatId: null,
            messages: mock.messages.map((m) => {
              const hasReply = mock.messages.some(
                (other) => other.from !== m.from && new Date(other.at).getTime() >= new Date(m.at).getTime()
              );
              const status = m.status || (hasReply ? "read" : mock.telegramConnected ? "delivered" : "sent");
              return {
                ...m,
                isMe: m.from === "owner",
                readAt: m.readAt ?? (status === "read" ? m.at : null),
                status: status as "sent" | "delivered" | "read",
              };
            }),
          });
        }
      }
      return successResponse(combined);
    }

    return successResponse(formattedDb);
  } catch (err) {
    console.warn("[Conversations API] Error fetching DB conversations:", err);
    return successResponse(isOwner ? mockConversations : []);
  }
});

export const POST = withApi(async (request: Request) => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const input = await parseJson(request, createConversationSchema);

  if (!input.propertySlug && !input.propertyId) {
    throw new ApiError(400, "BAD_REQUEST", "Properti harus ditentukan (propertySlug atau propertyId).");
  }

  // Cari properti beserta pemiliknya
  const property = await prisma.property.findFirst({
    where: {
      ...(input.propertyId ? { id: input.propertyId } : {}),
      ...(input.propertySlug ? { slug: input.propertySlug } : {}),
      deletedAt: null,
    },
    include: {
      owner: true,
    },
  });

  if (!property) {
    throw new ApiError(404, "NOT_FOUND", "Properti tidak ditemukan.");
  }

  // Cari atau buat percakapan
  let conv = await prisma.conversation.findFirst({
    where: {
      ownerId: property.ownerId,
      contactId: auth.profile.id,
      propertyId: property.id,
      deletedAt: null,
    },
    include: {
      owner: true,
      contact: true,
      property: true,
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        ownerId: property.ownerId,
        contactId: auth.profile.id,
        propertyId: property.id,
        channel: "IN_APP",
        externalName: auth.profile.fullName || "Penyewa",
      },
      include: {
        owner: true,
        contact: true,
        property: true,
      },
    });
  }

  const isOwner = auth.profile.id === property.ownerId;
  const senderRole = isOwner ? "OWNER" : "CONTACT";

  // Simpan pesan awal
  const createdMsg = await prisma.message.create({
    data: {
      conversationId: conv.id,
      senderId: auth.profile.id,
      senderRole,
      channel: conv.channel,
      body: input.initialMessage,
    },
  });

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { updatedAt: new Date() },
  });

  // Kirim notifikasi Telegram ke Pemilik jika pemilik menghubungkan akun Telegramnya
  let telegramSent = false;
  if (!isOwner && property.owner?.telegramChatId) {
    const seekerName = auth.profile.fullName || "Calon Penyewa";
    const notifText =
      `📩 <b>Pesan Baru dari Calon Penyewa!</b>\n\n` +
      `👤 <b>Dari:</b> ${seekerName}\n` +
      `🏠 <b>Properti:</b> ${property.name}\n` +
      `💬 <b>Pesan:</b>\n<i>"${input.initialMessage}"</i>\n\n` +
      `👉 <i>Buka Dashboard NgeKos Anda untuk membalas langsung dari website.</i>`;

    const teleRes = await sendTelegramMessage(property.owner.telegramChatId, notifText);
    telegramSent = teleRes.ok;
  }

  return successResponse({
    conversationId: conv.id,
    messageId: createdMsg.id,
    telegramSent,
  });
});

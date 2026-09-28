import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { conversations as mockConversations } from "@/lib/data/entities";

export const GET = withApi(async () => {
  const auth = await requireUser(["OWNER"]);
  const ownerId = auth.profile.id;

  try {
    const dbConversations = await prisma.conversation.findMany({
      where: {
        ownerId,
        deletedAt: null,
      },
      include: {
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
      const contactName = c.contact?.fullName || c.externalName || "Pengguna Telegram";
      const isTelegram = c.channel.toLowerCase() === "telegram";
      const unreadCount = c.messages.filter((m) => m.senderRole === "CONTACT" && !m.readAt).length;

      return {
        id: c.id,
        name: contactName,
        channel: (isTelegram ? "telegram" : "in_app") as "telegram" | "email",
        telegramConnected: Boolean(c.externalChatId || auth.profile.telegramChatId),
        unread: unreadCount,
        propertyName: c.property?.name,
        externalChatId: c.externalChatId,
        messages: c.messages.map((m) => ({
          id: m.id,
          from: (m.senderRole === "OWNER" ? "owner" : "contact") as "owner" | "contact",
          text: m.body,
          at: m.createdAt.toISOString(),
          channel: (m.channel.toLowerCase() === "telegram" ? "telegram" : "in_app") as "telegram" | "email",
        })),
      };
    });

    // Gabungkan dengan mock conversations jika belum ada atau untuk melengkapi demo
    const combined = [...formattedDb];
    for (const mock of mockConversations) {
      if (!combined.some((item) => item.id === mock.id)) {
        combined.push({
          ...mock,
          propertyName: undefined,
          externalChatId: null,
        });
      }
    }

    return successResponse(combined);
  } catch (err) {
    console.warn("[Conversations API] Error fetching DB conversations, using mock fallback:", err);
    return successResponse(mockConversations);
  }
});

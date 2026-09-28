import { prisma } from "../lib/prisma";
import { findLocalUser } from "./user-store";

export interface TelegramConfig {
  botToken: string;
  botUsername: string;
  webhookSecret: string;
}

export function getTelegramConfig(): TelegramConfig {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
    botUsername: (
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      process.env.TELEGRAM_BOT_USERNAME ||
      ""
    ).replace(/^@/, ""),
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  };
}

export function isTelegramConfigured(): boolean {
  const { botToken } = getTelegramConfig();
  return Boolean(botToken && botToken.trim().length > 0);
}

/**
 * Panggilan generik ke Telegram Bot API
 */
export async function callTelegramApi(method: string, payload: Record<string, unknown>): Promise<any> {
  const { botToken } = getTelegramConfig();
  if (!botToken) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    console.error(`[Telegram API] Error calling ${method}:`, error?.message || error);
    return { ok: false, description: error?.message || "Network error" };
  }
}

/**
 * Mengirim pesan teks dari sistem/owner ke Telegram user
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  extra: Record<string, unknown> = {}
): Promise<{ ok: boolean; messageId?: number; description?: string }> {
  const result = await callTelegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...extra,
  });

  if (result?.ok) {
    return { ok: true, messageId: result.result?.message_id };
  }
  return { ok: false, description: result?.description || "Failed to send Telegram message" };
}

/**
 * Generate link penghubung Telegram untuk Owner
 * Contoh format: https://t.me/NgekostBot?start=conn_abc123
 */
export async function generateTelegramConnectLink(ownerId: string): Promise<{
  url: string;
  token: string;
  expiresAt: Date;
  botUsername: string;
}> {
  const { botUsername } = getTelegramConfig();
  const token = `conn_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 menit

  try {
    await prisma.profile.update({
      where: { id: ownerId },
      data: {
        telegramConnectToken: token,
        telegramConnectTokenExpiresAt: expiresAt,
      },
    });
  } catch (err) {
    console.warn("[Telegram] Could not save connect token to DB, proceeding in-memory fallback:", err);
  }

  const effectiveBot = botUsername || "NgekostBot";
  const url = `https://t.me/${effectiveBot}?start=${token}`;

  return {
    url,
    token,
    expiresAt,
    botUsername: effectiveBot,
  };
}

/**
 * Menghubungkan akun Telegram owner secara manual (input username atau chat ID)
 */
export async function bindTelegramManual(
  ownerId: string,
  data: { telegramUsername?: string; telegramChatId?: string }
): Promise<{ success: boolean; username: string | null; chatId: string | null }> {
  const username = data.telegramUsername ? data.telegramUsername.replace(/^@/, "").trim() : null;
  const chatId = data.telegramChatId ? data.telegramChatId.trim() : null;

  try {
    await prisma.profile.update({
      where: { id: ownerId },
      data: {
        telegramUsername: username,
        telegramChatId: chatId,
        telegramConnectedAt: new Date(),
        telegramConnectToken: null,
        telegramConnectTokenExpiresAt: null,
      },
    });
  } catch (err) {
    console.warn("[Telegram] DB update failed for bindTelegramManual, updating local session:", err);
  }

  return {
    success: true,
    username,
    chatId,
  };
}

/**
 * Memutuskan tautan akun Telegram dari owner
 */
export async function disconnectTelegram(ownerId: string): Promise<boolean> {
  try {
    await prisma.profile.update({
      where: { id: ownerId },
      data: {
        telegramChatId: null,
        telegramUsername: null,
        telegramConnectedAt: null,
        telegramConnectToken: null,
        telegramConnectTokenExpiresAt: null,
      },
    });
    return true;
  } catch (err) {
    console.error("[Telegram] Error disconnecting telegram:", err);
    return false;
  }
}

/**
 * Memproses update webhook dari Telegram
 */
export async function processTelegramWebhookUpdate(update: any): Promise<{
  handled: boolean;
  action?: string;
  conversationId?: string;
}> {
  if (!update || !update.message) {
    return { handled: false };
  }

  const msg = update.message;
  const chatId = String(msg.chat.id);
  const text = (msg.text || "").trim();
  const fromUser = msg.from || {};
  const externalName = [fromUser.first_name, fromUser.last_name].filter(Boolean).join(" ") || fromUser.username || "Pengguna Telegram";
  const externalUsername = fromUser.username ? `@${fromUser.username}` : null;

  // Kasus 1: Perintah /start connect token dari Owner
  if (text.startsWith("/start conn_")) {
    const token = text.replace("/start ", "").trim();
    try {
      const profile = await prisma.profile.findFirst({
        where: {
          telegramConnectToken: token,
          telegramConnectTokenExpiresAt: { gt: new Date() },
        },
      });

      if (profile) {
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            telegramChatId: chatId,
            telegramUsername: externalUsername?.replace(/^@/, "") || null,
            telegramConnectedAt: new Date(),
            telegramConnectToken: null,
            telegramConnectTokenExpiresAt: null,
          },
        });

        await sendTelegramMessage(
          chatId,
          `<b>Selamat, ${profile.fullName}!</b>\n\nAkun Telegram Anda berhasil terhubung dengan Dashboard Owner <b>NgeKos</b>.\n\nPesan dari calon penyewa yang bertanya via Telegram akan otomatis masuk ke dashboard web Anda, dan Anda dapat membalasnya langsung dari website.`
        );

        return { handled: true, action: "owner_connected" };
      }
    } catch (err) {
      console.error("[Telegram Webhook] Connect token lookup error:", err);
    }

    await sendTelegramMessage(
      chatId,
      "Tautan penghubung tidak valid atau sudah kedaluwarsa. Silakan klik tombol 'Hubungkan Telegram' lagi di dashboard website."
    );
    return { handled: true, action: "token_expired" };
  }

  // Kasus 2: Perintah /start kost_<slug> dari Calon Penyewa
  if (text.startsWith("/start kost_")) {
    const slug = text.replace("/start kost_", "").trim();
    try {
      const property = await prisma.property.findFirst({
        where: { slug },
        include: { owner: true },
      });

      if (property && property.owner) {
        let conv = await prisma.conversation.findFirst({
          where: {
            ownerId: property.ownerId,
            externalChatId: chatId,
            propertyId: property.id,
          },
        });

        if (!conv) {
          conv = await prisma.conversation.create({
            data: {
              ownerId: property.ownerId,
              propertyId: property.id,
              channel: "TELEGRAM",
              externalChatId: chatId,
              externalName,
              externalUsername,
            },
          });
        }

        await sendTelegramMessage(
          chatId,
          `Halo <b>${externalName}</b>!\n\nAnda sedang terhubung dengan pemilik kost <b>${property.name}</b>.\nSilakan ketik pertanyaan atau pesan Anda di sini, pesan akan langsung masuk ke dashboard pemilik kost.`
        );

        return { handled: true, action: "kost_chat_started", conversationId: conv.id };
      }
    } catch (err) {
      console.error("[Telegram Webhook] Property lookup error:", err);
    }
  }

  // Kasus 3: Chat pesan teks biasa dari User / Calon Penyewa
  if (text.length > 0) {
    try {
      // Cari conversation aktif berdasarkan externalChatId
      let conv = await prisma.conversation.findFirst({
        where: {
          externalChatId: chatId,
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
        include: {
          owner: true,
          property: true,
        },
      });

      // Jika belum ada conversation, cari owner aktif pertama sebagai fallback
      if (!conv) {
        const defaultOwner = await prisma.profile.findFirst({
          where: { role: "OWNER", status: "ACTIVE" },
        });

        if (defaultOwner) {
          conv = await prisma.conversation.create({
            data: {
              ownerId: defaultOwner.id,
              channel: "TELEGRAM",
              externalChatId: chatId,
              externalName,
              externalUsername,
            },
            include: {
              owner: true,
              property: true,
            },
          });
        }
      }

      if (conv) {
        // Simpan pesan ke database
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            senderRole: "CONTACT",
            channel: "TELEGRAM",
            telegramMessageId: String(msg.message_id),
            body: text,
          },
        });

        // Update timestamp conversation
        await prisma.conversation.update({
          where: { id: conv.id },
          data: { updatedAt: new Date() },
        });

        // Notifikasi ke Telegram Owner jika owner telah menghubungkan Telegram
        if (conv.owner?.telegramChatId && conv.owner.telegramChatId !== chatId) {
          const propInfo = conv.property?.name ? ` terkait <b>${conv.property.name}</b>` : "";
          await sendTelegramMessage(
            conv.owner.telegramChatId,
            `📩 <b>Pesan Baru dari ${externalName}</b>${propInfo}:\n\n<i>"${text}"</i>\n\n👉 Buka dashboard NgeKos untuk membalas: /owner/messages`
          );
        }

        return { handled: true, action: "message_saved", conversationId: conv.id };
      }
    } catch (err) {
      console.error("[Telegram Webhook] Error saving incoming message:", err);
    }
  }

  return { handled: true, action: "unhandled_content" };
}

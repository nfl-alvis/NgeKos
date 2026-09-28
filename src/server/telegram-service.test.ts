import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    profile: {
      update: vi.fn().mockResolvedValue({ id: "owner-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    conversation: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "conv-1" }),
      update: vi.fn().mockResolvedValue({ id: "conv-1" }),
    },
    message: {
      create: vi.fn().mockResolvedValue({ id: "msg-1" }),
    },
    property: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

import {
  getTelegramConfig,
  isTelegramConfigured,
  generateTelegramConnectLink,
  bindTelegramManual,
  disconnectTelegram,
  processTelegramWebhookUpdate,
} from "./telegram-service";

describe("telegram-service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("checks if telegram is configured properly", () => {
    expect(isTelegramConfigured()).toBe(false);
    process.env.TELEGRAM_BOT_TOKEN = "123456:fake_token";
    expect(isTelegramConfigured()).toBe(true);
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it("generates connect link with valid token and url", async () => {
    process.env.TELEGRAM_BOT_USERNAME = "NgekostTestBot";
    const link = await generateTelegramConnectLink("owner-uuid-123");
    expect(link.url).toContain("https://t.me/NgekostTestBot?start=conn_");
    expect(link.token).toMatch(/^conn_/);
    expect(link.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("handles manual binding for owner", async () => {
    const res = await bindTelegramManual("owner-uuid-123", {
      telegramUsername: "@ratri_owner",
      telegramChatId: "987654321",
    });
    expect(res.success).toBe(true);
    expect(res.username).toBe("ratri_owner");
    expect(res.chatId).toBe("987654321");
  });

  it("handles disconnect telegram", async () => {
    const res = await disconnectTelegram("owner-uuid-123");
    expect(res).toBe(true);
  });

  it("processes empty or invalid webhook update safely", async () => {
    const res = await processTelegramWebhookUpdate(null);
    expect(res.handled).toBe(false);

    const res2 = await processTelegramWebhookUpdate({});
    expect(res2.handled).toBe(false);
  });
});

import { NextResponse } from "next/server";
import { getTelegramConfig, processTelegramWebhookUpdate } from "@/server/telegram-service";

export async function POST(request: Request) {
  try {
    const { webhookSecret } = getTelegramConfig();

    // Verifikasi secret token jika disetel di environment
    if (webhookSecret) {
      const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (incomingSecret !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const update = await request.json();
    const result = await processTelegramWebhookUpdate(update);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("[Webhook Telegram] Handler error:", err?.message || err);
    // Tetap kembalikan 200 agar Telegram tidak melakukan flood retry terus menerus
    return NextResponse.json({ ok: false, error: err?.message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Telegram webhook endpoint is active" });
}

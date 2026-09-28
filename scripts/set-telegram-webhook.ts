import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

async function setWebhook() {
  if (!token) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN is not set in .env.local");
    process.exit(1);
  }

  const publicUrl = process.argv[2];
  if (!publicUrl) {
    console.log("Penggunaan: npx tsx scripts/set-telegram-webhook.ts <HTTPS_PUBLIC_URL>");
    console.log("Contoh: npx tsx scripts/set-telegram-webhook.ts https://your-subdomain.trycloudflare.com");
    console.log("\nStatus Webhook Saat Ini:");
    const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json());
    console.log(info);
    return;
  }

  const cleanUrl = publicUrl.replace(/\/$/, "");
  const webhookEndpoint = `${cleanUrl}/api/webhooks/telegram`;

  console.log(`Mendaftarkan webhook ke: ${webhookEndpoint}...`);

  const payload: any = {
    url: webhookEndpoint,
    allowed_updates: ["message"],
  };

  if (webhookSecret) {
    payload.secret_token = webhookSecret;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (json.ok) {
    console.log("✅ Webhook Telegram BERHASIL didaftarkan!");
    console.log("Hasil:", json);
  } else {
    console.error("❌ Gagal mendaftarkan webhook:", json);
  }
}

setWebhook().catch(console.error);

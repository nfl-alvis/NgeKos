import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const token = process.env.TELEGRAM_BOT_TOKEN;
const localUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function startPolling() {
  if (!token) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN belum disetel di .env.local");
    process.exit(1);
  }

  // Hapus webhook agar mode getUpdates (polling) diizinkan oleh Telegram
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  } catch {}

  console.log("=================================================");
  console.log("🚀 Telegram Bot Polling BERJALAN!");
  console.log("Mode ini 100% lokal TANPA Cloudflare Tunnel / Ngrok.");
  console.log(`Meneruskan pesan ke: ${localUrl}/api/webhooks/telegram`);
  console.log("Bot siap menerima pesan dari @Help_NgeKos_bot");
  console.log("Tekan Ctrl+C untuk berhenti.");
  console.log("=================================================\n");

  let offset = 0;

  while (true) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`,
        { cache: "no-store" }
      );
      const json = await res.json();

      if (json.ok && Array.isArray(json.result)) {
        for (const update of json.result) {
          offset = update.update_id + 1;
          const sender = update.message?.from?.first_name || "User";
          const text = update.message?.text || "";
          console.log(`📩 [Pesan Diterima] ${sender}: "${text}"`);

          try {
            const forwardRes = await fetch(`${localUrl}/api/webhooks/telegram`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(update),
            });
            const forwardJson = await forwardRes.json();
            console.log(`   └─> Diteruskan ke Webhook: status = ${forwardRes.status}, action = ${forwardJson?.result?.action || "sukses"}`);
          } catch (forwardErr: any) {
            console.error(`   └─> Gagal meneruskan ke localhost (apakah 'npm run dev' menyala?):`, forwardErr.message);
          }
        }
      } else if (!json.ok) {
        console.error("Telegram API error:", json.description);
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err: any) {
      console.error("Polling error:", err?.message || err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

startPolling().catch(console.error);

"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { CheckCircle2, ExternalLink, RefreshCw, Send, Unlink } from "lucide-react";

interface TelegramStatus {
  connected: boolean;
  username: string | null;
  connectedAt: string | null;
}

export default function TelegramConnectCard({
  onStatusChange,
  isOwner = true,
}: {
  onStatusChange?: (status: TelegramStatus) => void;
  isOwner?: boolean;
}) {
  const locale = useLocale();
  const isEn = locale === "en";

  const [status, setStatus] = useState<TelegramStatus>({
    connected: false,
    username: null,
    connectedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [showManualReconnect, setShowManualReconnect] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/me");
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.telegram) {
          setStatus(json.data.telegram);
          onStatusChange?.(json.data.telegram);
        }
      }
    } catch (err) {
      console.error("Gagal memeriksa status Telegram:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartConnect = async () => {
    setConnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/owner/telegram/connect", { method: "POST" });
      const json = await res.json();
      if (res.ok && json?.data?.url) {
        setConnectUrl(json.data.url);
        window.open(json.data.url, "_blank", "noopener,noreferrer");
        setMessage({
          type: "success",
          text: isEn
            ? "New Telegram link opened in a new tab! Press 'START' in the Telegram app to reconnect, then click 'Refresh Status' below."
            : "Tautan Telegram baru telah dibuka di tab baru! Tekan 'START' di aplikasi Telegram untuk menghubungkan ulang, lalu klik 'Perbarui Status' di bawah.",
        });
      } else {
        setMessage({
          type: "error",
          text: json?.error?.message || (isEn ? "Failed to generate Telegram connection link." : "Gagal membuat tautan koneksi Telegram."),
        });
      }
    } catch {
      setMessage({ type: "error", text: isEn ? "Network error occurred." : "Terjadi kesalahan jaringan." });
    } finally {
      setConnecting(false);
    }
  };

  const handleManualBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setManualLoading(true);
    setMessage(null);
    try {
      const isChatId = /^\d+$/.test(manualInput.trim());
      const body = isChatId
        ? { telegramChatId: manualInput.trim() }
        : { telegramUsername: manualInput.trim().replace(/^@/, "") };

      const res = await fetch("/api/owner/telegram/bind-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (res.ok && json?.data?.success) {
        setMessage({
          type: "success",
          text: isEn ? "Telegram account linked successfully!" : "Akun Telegram berhasil dihubungkan secara manual!",
        });
        setManualInput("");
        setShowManualReconnect(false);
        await fetchStatus();
      } else {
        setMessage({
          type: "error",
          text: json?.error?.message || (isEn ? "Failed to link Telegram account." : "Gagal menghubungkan Telegram."),
        });
      }
    } catch {
      setMessage({ type: "error", text: isEn ? "Error while connecting." : "Terjadi kesalahan saat menghubungkan." });
    } finally {
      setManualLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmPrompt = isEn
      ? "Are you sure you want to disconnect your Telegram account?"
      : "Apakah Anda yakin ingin memutuskan tautan Telegram?";
    if (!confirm(confirmPrompt)) return;

    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/owner/telegram/disconnect", { method: "POST" });
      if (res.ok) {
        setMessage({
          type: "success",
          text: isEn ? "Telegram link disconnected successfully." : "Tautan Telegram berhasil diputuskan.",
        });
        setConnectUrl(null);
        await fetchStatus();
      } else {
        setMessage({
          type: "error",
          text: isEn ? "Failed to disconnect Telegram." : "Gagal memutuskan tautan Telegram.",
        });
      }
    } catch {
      setMessage({ type: "error", text: isEn ? "Connection error." : "Terjadi kesalahan koneksi." });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-nk-border bg-nk-surface p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#2AABEE]/15 text-[#2AABEE]">
            <Send className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-medium text-nk-text">
                {isEn
                  ? isOwner ? "Telegram Bot Integration" : "Telegram Bot Notifications"
                  : isOwner ? "Integrasi Telegram Bot" : "Notifikasi Telegram Bot"}
              </h2>
              {status.connected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-sm">
                  <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {isEn ? "Connected" : "Sudah Konek"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {isEn ? "Not Connected" : "Belum Terhubung"}
                </span>
              )}
            </div>
            <p className="text-xs text-nk-text-muted mt-0.5">
              {status.connected
                ? isEn
                  ? "Your Telegram account is actively connected and ready to receive real-time notifications."
                  : "Akun Telegram Anda sudah aktif terhubung dan siap menerima notifikasi instan."
                : isOwner
                  ? isEn
                    ? "Receive chat messages from prospective tenants and reply directly from the dashboard."
                    : "Terima chat dari calon penyewa dan balas langsung dari website."
                  : isEn
                    ? "Get instant alerts for owner replies and rental status updates on Telegram."
                    : "Terima notifikasi balasan pesan pemilik kost dan update sewa langsung di Telegram."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading}
          title={isEn ? "Refresh status" : "Perbarui status"}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-nk-border text-nk-text-muted hover:bg-nk-warm hover:text-nk-text disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md p-3 text-xs leading-relaxed ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {status.connected ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-emerald-950">
                    {isEn ? "Telegram Connected" : "Telegram Sudah Konek"}
                  </p>
                  <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900">
                    {isEn ? "Active" : "Aktif"}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {status.username ? `@${status.username}` : (isEn ? "Verified Account" : "Akun Terverifikasi")}
                  {status.connectedAt && (
                    <span className="ml-2 text-emerald-700/80">
                      • {isEn ? "Connected since " : "Terhubung sejak "}
                      {new Date(status.connectedAt).toLocaleDateString(isEn ? "en-US" : "id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Tombol Aksi: Rekonek & Putuskan Tautan */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={connecting}
                onClick={handleStartConnect}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2AABEE] bg-white px-3.5 py-1.5 text-xs font-medium text-[#2AABEE] hover:bg-[#2AABEE]/10 active:scale-[0.98] transition-all disabled:opacity-50"
                title={isEn ? "Open Telegram bot to reconnect your account" : "Buka Telegram bot untuk menghubungkan ulang akun"}
              >
                <RefreshCw className={`size-3.5 ${connecting ? "animate-spin" : ""}`} />
                <span>{connecting ? (isEn ? "Preparing..." : "Menyiapkan...") : (isEn ? "Reconnect Telegram" : "Rekonek Telegram")}</span>
              </button>

              <button
                type="button"
                disabled={disconnecting}
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50"
                title={isEn ? "Disconnect Telegram bot" : "Putuskan koneksi bot Telegram"}
              >
                <Unlink className="size-3.5" />
                <span>{disconnecting ? (isEn ? "Disconnecting..." : "Memutuskan...") : (isEn ? "Disconnect" : "Putuskan")}</span>
              </button>
            </div>
          </div>

          {/* Tautan langsung jika tombol Rekonek diklik */}
          {connectUrl && (
            <div className="rounded-lg border border-[#2AABEE]/30 bg-[#2AABEE]/5 p-3.5 text-xs">
              <p className="font-medium text-nk-text">
                {isEn ? "Telegram Reconnection Link Generated:" : "Tautan Rekonek Telegram Telah Dibuat:"}
              </p>
              <p className="text-nk-text-muted mt-0.5">
                {isEn
                  ? "Open Telegram and tap the START button to complete your account reconnection."
                  : "Buka aplikasi Telegram dan klik tombol START untuk menyelesaikan proses rekonek akun Anda."}
              </p>
              <a
                href={connectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-medium text-[#2AABEE] underline underline-offset-2"
              >
                <span>{isEn ? "Open Telegram Bot Now" : "Buka Bot Telegram Sekarang"}</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          <p className="text-xs text-nk-text-muted leading-relaxed">
            {isOwner
              ? isEn
                ? "Every time a prospective tenant sends a message, you will receive an instant Telegram alert and can reply directly from the Messages dashboard."
                : "Setiap ada calon penyewa yang mengirim pesan, notifikasi akan otomatis masuk dan percakapan dapat dibalas langsung dari menu Pesan."
              : isEn
                ? "Whenever the owner replies or your rental agreement is updated, the NgeKos bot will alert you on Telegram."
                : "Setiap ada pesan balasan dari pemilik kost atau update sewa, bot NgeKos akan mengirim notifikasi langsung ke Telegram Anda."}
          </p>

          {/* Opsi Rekonek Manual via Toggle */}
          <div className="border-t border-nk-border/80 pt-3">
            <button
              type="button"
              onClick={() => setShowManualReconnect(!showManualReconnect)}
              className="text-xs text-nk-text-muted hover:text-nk-text underline underline-offset-2 flex items-center gap-1"
            >
              <span>
                {showManualReconnect
                  ? isEn ? "Close manual reconnect form" : "Tutup input rekonek manual"
                  : isEn ? "Or switch Telegram account via manual username / Chat ID" : "Atau ganti akun Telegram via username/ID manual"}
              </span>
            </button>

            {showManualReconnect && (
              <div className="mt-3 rounded-lg border border-nk-border bg-nk-section p-3.5">
                <p className="mb-2 text-xs font-medium text-nk-text">
                  {isEn ? "Enter New Username or Chat ID" : "Masukkan Username Baru atau Chat ID"}
                </p>
                <form onSubmit={handleManualBind} className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder={isEn ? "e.g. @your_username or Chat ID" : "Contoh: @username_baru atau Chat ID"}
                    className="h-9 flex-1 rounded-lg border border-nk-border bg-nk-bg px-3 text-xs text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={manualLoading || !manualInput.trim()}
                    className="rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {manualLoading ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Save Account" : "Simpan Akun Baru")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-nk-border bg-nk-section p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-nk-text">
                  {isEn ? "Connect Telegram Account" : "Hubungkan Akun Telegram"}
                </p>
                <p className="text-xs text-nk-text-muted">
                  {isEn
                    ? "Open our official bot in Telegram, then tap Start to link your account."
                    : "Buka bot resmi di Telegram, lalu klik Start untuk menautkan akun Anda."}
                </p>
              </div>
              <button
                type="button"
                disabled={connecting}
                onClick={handleStartConnect}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                <Send className="size-3.5" />
                {connecting ? (isEn ? "Opening..." : "Membuka...") : (isEn ? "Open Telegram Bot" : "Buka Telegram Bot")}
                <ExternalLink className="size-3" />
              </button>
            </div>

            {connectUrl && (
              <div className="mt-3 border-t border-nk-border pt-3">
                <p className="text-[11px] text-nk-text-muted">
                  {isEn ? "Or click this direct link if the window did not open automatically: " : "Atau klik link langsung ini jika jendela tidak terbuka otomatis: "}
                  <a
                    href={connectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#2AABEE] underline underline-offset-2"
                  >
                    {isEn ? "Open Telegram Bot" : "Buka Bot Telegram"}
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Opsi Input Manual */}
          <div className="border-t border-nk-border pt-4">
            <p className="mb-2 text-xs font-medium text-nk-text">
              {isEn ? "Or Enter Telegram Username / ID Manually" : "Atau Masukkan Username / ID Telegram Manual"}
            </p>
            <form onSubmit={handleManualBind} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={isEn ? "e.g. @ratri_owner or Chat ID" : "Contoh: @ratri_owner atau Chat ID"}
                className="h-9 flex-1 rounded-lg border border-nk-border bg-nk-bg px-3 text-xs text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={manualLoading || !manualInput.trim()}
                className="rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {manualLoading ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Connect" : "Hubungkan")}
              </button>
            </form>
            <p className="mt-1.5 text-[11px] text-nk-text-muted">
              {isEn
                ? "Use this option if you want to link your Telegram username or Chat ID directly."
                : "Gunakan opsi ini jika Anda ingin langsung menautkan username Telegram atau Chat ID Anda."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

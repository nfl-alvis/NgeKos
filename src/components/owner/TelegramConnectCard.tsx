"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, MessageSquare, RefreshCw, Send, Unlink } from "lucide-react";

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
          text: "Tautan Telegram dibuka di tab baru! Tekan 'START' di aplikasi Telegram, lalu klik 'Perbarui Status' di bawah.",
        });
      } else {
        setMessage({
          type: "error",
          text: json?.error?.message || "Gagal membuat tautan koneksi Telegram.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
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
        setMessage({ type: "success", text: "Akun Telegram berhasil dihubungkan secara manual!" });
        setManualInput("");
        await fetchStatus();
      } else {
        setMessage({
          type: "error",
          text: json?.error?.message || "Gagal menghubungkan Telegram.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan saat menghubungkan." });
    } finally {
      setManualLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan tautan Telegram?")) return;

    setDisconnecting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/owner/telegram/disconnect", { method: "POST" });
      if (res.ok) {
        setMessage({ type: "success", text: "Tautan Telegram berhasil diputuskan." });
        setConnectUrl(null);
        await fetchStatus();
      } else {
        setMessage({ type: "error", text: "Gagal memutuskan tautan Telegram." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan koneksi." });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="rounded-lg border border-nk-border bg-nk-surface p-6">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#2AABEE]/15 text-[#2AABEE]">
            <Send className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-medium text-nk-text">
              {isOwner ? "Integrasi Telegram Bot" : "Notifikasi Telegram Bot"}
            </h2>
            <p className="text-xs text-nk-text-muted">
              {isOwner
                ? "Terima chat dari calon penyewa dan balas langsung dari website."
                : "Terima notifikasi balasan pesan pemilik kost dan update sewa langsung di Telegram."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading}
          title="Perbarui status"
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-nk-border text-nk-text-muted hover:bg-nk-warm hover:text-nk-text disabled:opacity-50"
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-950">Telegram Terhubung</p>
                <p className="text-xs text-emerald-800">
                  {status.username ? `@${status.username}` : "Akun Terverifikasi"}
                  {status.connectedAt && (
                    <span className="ml-2 text-emerald-700/70">
                      • Terhubung sejak {new Date(status.connectedAt).toLocaleDateString("id-ID")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={disconnecting}
              onClick={handleDisconnect}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Unlink className="size-3.5" />
              {disconnecting ? "Memutuskan..." : "Putuskan Tautan"}
            </button>
          </div>

          <p className="text-xs text-nk-text-muted">
            {isOwner
              ? "Setiap ada calon penyewa yang mengirim pesan, notifikasi akan otomatis masuk dan percakapan dapat dibalas langsung dari menu Pesan."
              : "Setiap ada pesan balasan dari pemilik kost atau update sewa, bot NgeKos akan mengirim notifikasi langsung ke Telegram Anda."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-nk-border bg-nk-section p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-nk-text">Hubungkan Akun Telegram</p>
                <p className="text-xs text-nk-text-muted">
                  Buka bot resmi di Telegram, lalu klik <b>Start</b> untuk menautkan akun Anda.
                </p>
              </div>
              <button
                type="button"
                disabled={connecting}
                onClick={handleStartConnect}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                <Send className="size-3.5" />
                {connecting ? "Membuka..." : "Buka Telegram Bot"}
                <ExternalLink className="size-3" />
              </button>
            </div>

            {connectUrl && (
              <div className="mt-3 border-t border-nk-border pt-3">
                <p className="text-[11px] text-nk-text-muted">
                  Atau klik link langsung ini jika jendela tidak terbuka otomatis:{" "}
                  <a
                    href={connectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#2AABEE] underline underline-offset-2"
                  >
                    Buka Bot Telegram
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Opsi Input Manual */}
          <div className="border-t border-nk-border pt-4">
            <p className="mb-2 text-xs font-medium text-nk-text">Atau Masukkan Username / ID Telegram Manual</p>
            <form onSubmit={handleManualBind} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Contoh: @ratri_owner atau Chat ID"
                className="h-9 flex-1 rounded-lg border border-nk-border bg-nk-bg px-3 text-xs text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={manualLoading || !manualInput.trim()}
                className="rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {manualLoading ? "Menyimpan..." : "Hubungkan"}
              </button>
            </form>
            <p className="mt-1.5 text-[11px] text-nk-text-muted">
              Gunakan opsi ini jika Anda ingin langsung menautkan username Telegram atau Chat ID Anda.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

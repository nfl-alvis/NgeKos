"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { formatIDR } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/navigation";
import BookingCta from "@/components/BookingCta";
import { useBookingFlow, type BookingRoom } from "@/components/BookingFlowProvider";
import { useSession } from "@/components/SessionProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MessageSquare, Send, ShieldCheck } from "lucide-react";

/**
 * Aksi booking di sidebar detail kost. Sebelum pengajuan dipilih:
 * tombol "Sewa Sekarang" (buka popup). Setelah Lanjut di popup: section
 * ini terupdate sendiri - tidak pindah halaman - menampilkan rincian
 * uang muka (DP) vs pembayaran penuh ala Mamikos + tombol Ubah/Lanjut.
 */
export default function BookingSidebarActions({
  propertyName,
  rooms,
  dpAmount,
}: {
  propertyName: string;
  rooms: BookingRoom[];
  dpAmount: number;
}) {
  const t = useTranslations("booking");
  const params = useParams<{ locale: string; slug: string }>();
  const router = useRouter();
  const { flow, setFlow } = useBookingFlow();
  const { user } = useSession();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const quickQuestions = [
    "Apakah kamar ini masih tersedia?",
    "Bisa jadwalkan survei ke lokasi?",
    "Apakah harga sewa sudah termasuk listrik?",
  ];

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || sendingChat) return;

    setSendingChat(true);
    setChatError(null);

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertySlug: params.slug,
          initialMessage: chatMessage.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Gagal mengirim pesan.");
      }

      setChatOpen(false);
      setChatMessage("");
      router.push(`/dashboard/messages?slug=${params.slug}`);
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim pesan.");
    } finally {
      setSendingChat(false);
    }
  };

  if (!flow) {
    return (
      <div className="flex flex-col gap-3">
        <BookingCta
          propertyName={propertyName}
          dpAmount={dpAmount}
          rooms={rooms}
          className="inline-flex w-full items-center justify-center border border-nk-border bg-nk-accent px-6 py-3.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {t("detailBook")}
        </BookingCta>

        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-nk-border bg-nk-surface px-6 py-2.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm"
        >
          <MessageSquare className="size-3.5 text-nk-accent" />
          Chat Pemilik Kost
        </button>

        {dpAmount > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-nk-warm p-3 text-xs leading-relaxed text-nk-text-muted">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-nk-accent"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>
              <span className="font-medium text-nk-text">{t("dpAvailableTitle")}</span>{" "}
              {t("dpAvailableBody")}
            </span>
          </div>
        )}

        {/* Dialog Chat Pemilik */}
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-nk-text">
                Hubungi Pemilik Kost
              </DialogTitle>
              <DialogDescription className="text-xs text-nk-text-muted mt-0.5">
                {propertyName}
              </DialogDescription>
            </DialogHeader>

            {!user ? (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-nk-border bg-nk-warm p-3.5 text-xs text-nk-text leading-relaxed">
                  <p className="font-medium mb-1">Masuk untuk Mengirim Pesan</p>
                  <p className="text-nk-text-muted">
                    Untuk kenyamanan dan mencegah spam, percakapan dilakukan melalui sistem NgeKos dan otomatis diteruskan ke Telegram pemilik.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/login?next=/kost/${params.slug}`)}
                  className="w-full rounded-lg bg-nk-accent py-2.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90"
                >
                  Masuk ke Akun
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendChat} className="space-y-4 py-2">
                {chatError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                    {chatError}
                  </div>
                )}

                <div>
                  <label htmlFor="chat-msg" className="block text-xs font-medium text-nk-text mb-1.5">
                    Pesan Anda
                  </label>
                  <textarea
                    id="chat-msg"
                    rows={3}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Tuliskan pertanyaan atau kebutuhan Anda..."
                    required
                    className="w-full rounded-lg border border-nk-border bg-nk-bg p-3 text-xs text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent"
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-nk-text-muted">Pertanyaan Cepat:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickQuestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setChatMessage(q)}
                        className="rounded-full border border-nk-border bg-nk-surface px-2.5 py-1 text-[11px] text-nk-text transition-colors hover:border-nk-accent hover:bg-nk-warm text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-900">
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="leading-relaxed">
                    Obrolan diproses aman melalui website. Pemilik kost yang menghubungkan Telegram akan otomatis menerima notifikasi instan.
                  </p>
                </div>

                <DialogFooter className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    className="rounded-lg border border-nk-border px-4 py-2 text-xs font-medium text-nk-text hover:bg-nk-warm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={sendingChat || !chatMessage.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {sendingChat ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    <span>{sendingChat ? "Mengirim..." : "Kirim Pesan"}</span>
                  </button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const fullFirst = flow.pricePerMonth + flow.dpAmount;
  const hasDp = flow.dpAmount > 0;

  return (
    <div className="flex flex-col gap-4 text-left">
      {/* pilihan saat ini */}
      <div className="rounded-lg border border-nk-border bg-nk-surface p-4 text-sm">
        <p className="font-medium text-nk-text">{flow.roomName}</p>
        <p className="mt-1 text-nk-text-muted">
          {t("monthsCount", { count: flow.months })} ·{" "}
          {new Date(flow.date + "T00:00:00").toLocaleDateString(
            params.locale === "id" ? "id-ID" : "en-GB",
            { day: "numeric", month: "long", year: "numeric" }
          )}
        </p>
      </div>

      {hasDp ? (
        <div className="flex flex-col gap-3">
          {/* rincian DP vs bayar penuh: satu panel ber-border abu tipis */}
          <div className="rounded-lg border border-nk-border bg-nk-surface p-4">
            <div>
              <p className="text-xs font-medium text-nk-text-muted">{t("ifDp")}</p>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-nk-text">{t("dpLabel2")}</span>
                <span className="text-nk-text">{formatIDR(flow.dpAmount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-nk-text">{t("midLabel")}</span>
                <span className="text-nk-text">{formatIDR(flow.pricePerMonth)}</span>
              </div>
            </div>
            {/* garis pemisah antara pelunasan dan opsi bayar penuh */}
            <div className="my-3 h-px bg-nk-border" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-nk-text-muted">{t("ifFull")}</p>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-nk-text">{t("fullLabel2")}</span>
                <span className="text-nk-text">{formatIDR(fullFirst)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-nk-border pt-3 text-sm">
            <span className="font-medium text-nk-text">{t("firstTotal")}</span>
            <span className="font-semibold text-nk-text">{formatIDR(fullFirst)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-nk-border pt-3 text-sm">
          <span className="font-medium text-nk-text">{t("firstTotal")}</span>
          <span className="font-semibold text-nk-text">{formatIDR(fullFirst)}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Link
          href={`/kost/${params.slug}/book?kamar=${flow.roomId}&tanggal=${flow.date}&bulan=${flow.months}`}
          className="inline-flex min-h-11 items-center justify-center border border-nk-border bg-nk-accent px-5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90"
        >
          {t("proceedWizard")}
        </Link>
        <button
          type="button"
          onClick={() => setFlow(null)}
          className="inline-flex min-h-11 items-center justify-center border border-nk-border bg-nk-bg px-5 text-sm text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
        >
          {t("change")}
        </button>
      </div>
    </div>
  );
}

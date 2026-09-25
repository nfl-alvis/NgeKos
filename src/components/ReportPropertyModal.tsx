"use client";

import { useState } from "react";
import { Flag, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import SeekerAuthModal from "@/components/SeekerAuthModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  "Informasi atau foto tidak sesuai aslinya",
  "Dugaan penipuan atau kos fiktif",
  "Harga atau biaya sewa tidak akurat",
  "Pelayanan atau pengelola mencurigakan",
  "Masalah keamanan atau ketertiban lingkungan",
  "Lainnya",
];

interface ReportPropertyModalProps {
  propertyId?: string;
  propertySlug: string;
  propertyName: string;
  className?: string;
}

export default function ReportPropertyModal({
  propertyId,
  propertySlug,
  propertyName,
  className,
}: ReportPropertyModalProps) {
  const { user } = useSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpen = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setErrorMsg(null);
    setSuccess(false);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "PROPERTY",
          targetId: propertyId || propertySlug,
          reason,
          details: details.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error?.message || json?.message || "Gagal mengirim laporan. Silakan coba lagi.");
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setDetails("");
        setReason(REPORT_REASONS[0]);
      }, 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim laporan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-nk-text-muted transition-colors hover:text-rose-600 focus:outline-none",
          className
        )}
        title="Laporkan kejanggalan kos ke admin"
      >
        <Flag className="size-3.5" />
        <span>Laporkan Kos</span>
      </button>

      {/* Auth modal jika belum masuk */}
      <SeekerAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          setAuthOpen(false);
          setOpen(true);
        }}
      />

      {/* Dialog Modal Laporan */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-6 sm:rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Flag className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-nk-text">
                Laporkan Kos Ini
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-nk-text-muted mt-1">
              Bantu tim NgeKos memverifikasi keaslian dan kenyamanan properti <strong>{propertyName}</strong>.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="size-10 text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-nk-text">Laporan Berhasil Terkirim</p>
              <p className="mt-1 text-xs text-nk-text-muted max-w-xs">
                Terima kasih telah berkontribusi menjaga komunitas NgeKos. Tim kami akan meninjau laporan ini dalam 1x24 jam kerja.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-nk-text mb-1.5">
                  Alasan Pelaporan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer transition-all",
                        reason === r
                          ? "border-nk-accent bg-nk-warm/40 font-medium text-nk-text"
                          : "border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text hover:bg-nk-warm/20"
                      )}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                        className="size-3.5 text-nk-accent focus:ring-nk-accent"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-nk-text mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Tuliskan detail atau bukti pendukung agar tim kami dapat menindaklanjuti dengan cepat..."
                  className="w-full rounded-lg border border-nk-border bg-nk-surface p-2.5 text-xs text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="rounded-lg border border-nk-border bg-nk-surface px-4 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                >
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  <span>Kirim Laporan</span>
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

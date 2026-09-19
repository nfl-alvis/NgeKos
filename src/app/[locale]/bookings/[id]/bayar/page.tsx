"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useRouter as useI18nRouter } from "@/i18n/navigation";
import { bookings as staticBookings } from "@/lib/data/entities";
import { markPaymentPaid } from "@/lib/userOpsStore";
import { formatIDR } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, CreditCard, Info, Loader2, ShieldCheck } from "lucide-react";
import type { Booking } from "@/lib/data/types";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export default function PaymentPage() {
  const t = useTranslations("payment");
  const params = useParams<{ id: string }>();
  const i18nRouter = useI18nRouter();

  const [booking, setBooking] = useState<Booking | null>(
    staticBookings.find((b) => b.id === params.id) ?? null
  );
  const [loadingBooking, setLoadingBooking] = useState(!booking);
  const [secondsLeft, setSecondsLeft] = useState(29 * 60 + 45);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [midtransInfo, setMidtransInfo] = useState<{
    isConfigured: boolean;
    message?: string;
  } | null>(null);

  // Ambil booking dari database jika tidak ditemukan di static array
  useEffect(() => {
    if (!booking && params.id) {
      setLoadingBooking(true);
      fetch(`/api/bookings/${params.id}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Booking tidak ditemukan");
          return res.json();
        })
        .then((json) => {
          if (json?.data) {
            const b = json.data;
            setBooking({
              id: b.id,
              propertySlug: b.property?.slug || b.propertyId || "",
              propertyName: b.property?.name || "Kost",
              city: b.property?.city || "",
              roomType: b.roomType?.name || "Kamar",
              roomId: b.roomUnitId || b.roomTypeId || "",
              roomNumber: b.roomUnit?.number || "-",
              startDate: typeof b.startDate === "string" ? b.startDate.slice(0, 10) : "",
              status: b.status === "ACTIVE" ? "active" : "approved-awaiting-payment",
              applicantName: b.applicant?.fullName || "",
              applicantPhone: b.applicant?.phone || "",
              applicantEmail: b.applicant?.email || "",
              createdAt: b.createdAt,
              payDeadlineMin: 1440,
              usesDp: Boolean(b.depositSnapshot),
              monthlyPrice: b.monthlyPriceSnapshot || 0,
              timeline: [],
              payments: [],
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoadingBooking(false));
    }
  }, [booking, params.id]);

  useEffect(() => {
    if (paid) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [paid]);

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
  const snapScriptUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  if (loadingBooking) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
        <Loader2 className="size-8 animate-spin text-nk-accent" />
        <p className="mt-3 text-sm text-nk-text-muted">Memuat rincian pembayaran...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-sm text-nk-text-muted">
        {t("notFound")}
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const urgent = secondsLeft < 5 * 60;
  const amount = booking.usesDp
    ? Math.round(booking.monthlyPrice * 0.35)
    : booking.monthlyPrice;

  const payId = `PAY-${booking.id.replace("BK-", "")}`;

  /** Proses Pembayaran Midtrans Snap */
  const handleMidtransPayment = async () => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/payments/midtrans/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal memproses transaksi Midtrans");
      }

      if (!json.data.isConfigured) {
        // Kunci Midtrans belum diisi di .env.local
        setMidtransInfo({
          isConfigured: false,
          message: json.data.message,
        });
        return;
      }

      // Kunci Midtrans aktif -> buka Snap popup
      const snapToken = json.data.token;
      if (snapToken && window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: () => {
            markPaymentPaid(payId, booking.propertyName, amount);
            setPaid(true);
          },
          onPending: () => {
            i18nRouter.push("/dashboard/bookings");
          },
          onError: (err: any) => {
            setErrorMessage(err?.status_message || "Pembayaran gagal diproses.");
          },
          onClose: () => {
            // Pengguna menutup popup
          },
        });
      } else {
        throw new Error("SDK Midtrans Snap belum selesai dimuat.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan pembayaran");
    } finally {
      setProcessing(false);
    }
  };

  /** Simulasi Pembayaran Instan (Sandbox / Development) */
  const handleSimulatePayment = async () => {
    setProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!res.ok) {
        const json = await res.json();
        // Fallback jika id hanya ada di memori statis
        markPaymentPaid(payId, booking.propertyName, amount);
      } else {
        markPaymentPaid(payId, booking.propertyName, amount);
      }
      setPaid(true);
    } catch {
      markPaymentPaid(payId, booking.propertyName, amount);
      setPaid(true);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {clientKey && (
        <Script
          src={snapScriptUrl}
          data-client-key={clientKey}
          strategy="lazyOnload"
        />
      )}

      <div className="mx-auto w-full max-w-2xl px-6 py-10 lg:px-10">
        {/* countdown */}
        <section
          className={`mb-8 rounded-lg border p-6 text-center ${
            urgent ? "border-[#EBC4C0] bg-[#FAEAE8]" : "border-nk-border bg-nk-surface"
          }`}
          aria-live="polite"
        >
          <p className="text-sm text-nk-text-muted">{t("countdown")}</p>
          <p
            className={`mt-1 font-mono text-4xl tabular-nums ${
              urgent ? "text-[#9C3B32]" : "text-nk-text"
            }`}
          >
            {mm}:{ss}
          </p>
        </section>

        {errorMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="size-4" />
            <AlertTitle>Kendala Pembayaran</AlertTitle>
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {midtransInfo && !midtransInfo.isConfigured && (
          <Alert className="mb-6 border-nk-accent/30 bg-nk-warm">
            <Info className="size-4 text-nk-accent" />
            <AlertTitle className="text-nk-accent font-medium">Konfigurasi Midtrans</AlertTitle>
            <AlertDescription className="mt-1 text-xs text-nk-text leading-relaxed">
              {midtransInfo.message}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={processing}
                  className="rounded-md bg-nk-accent px-3 py-1.5 text-xs font-medium text-nk-text-inverse hover:opacity-90 active:scale-95"
                >
                  Gunakan Simulasi Pembayaran (Development)
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ringkasan tagihan */}
        <section className="rounded-lg border border-nk-border bg-nk-surface p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-nk-border pb-4">
            <h1 className="text-lg font-medium text-nk-text">{t("billing")}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-nk-accent/10 px-2.5 py-1 text-xs font-medium text-nk-accent">
              <ShieldCheck className="size-3.5" />
              Midtrans Ready
            </span>
          </div>

          <p className="mt-3 text-sm text-nk-text-muted">
            {booking.propertyName} · {booking.roomType} · Kamar {booking.roomNumber}
          </p>

          <div className="mt-5 border-t border-nk-border pt-5">
            <p className="text-sm text-nk-text-muted">
              {booking.usesDp ? t("dpLabel") : t("fullLabel")}
            </p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-nk-text">
              {formatIDR(amount)}
            </p>
          </div>

          <div className="mt-5 border-t border-nk-border pt-5">
            <p className="text-sm text-nk-text-muted">{t("midtrans")}</p>
            <p className="mt-2 text-xs text-nk-text-muted">Metode pembayaran resmi yang didukung:</p>
            <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
              {[
                "QRIS (GoPay, OVO, Dana, ShopeePay)",
                "BCA Virtual Account",
                "Mandiri Bill Payment",
                "BNI Virtual Account",
                "BRI Virtual Account",
                "Permata VA",
                "Kartu Kredit / Debit",
              ].map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-nk-border bg-nk-bg px-2.5 py-1 text-xs font-medium text-nk-text-muted"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleMidtransPayment}
            disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-nk-accent px-6 py-4 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Memproses Pembayaran...
              </>
            ) : (
              <>
                <CreditCard className="size-4" />
                Bayar Sekarang dengan Midtrans
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSimulatePayment}
            disabled={processing}
            className="w-full rounded-lg border border-nk-border bg-nk-surface px-6 py-2.5 text-xs font-medium text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text"
          >
            Simulasi Bayar Langsung (Testing Cepat)
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-nk-text-muted">{t("warning")}</p>

        {/* modal simulasi sukses */}
        <Dialog open={paid} onOpenChange={(o) => !o && setPaid(false)}>
          <DialogContent className="max-w-sm text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#E9F4EC] text-[#2F6B3C]">
              <CheckCircle2 className="size-6" />
            </div>
            <h2 className="text-lg font-medium text-nk-text">Pembayaran Berhasil!</h2>
            <p className="mt-2 text-sm text-nk-text-muted">
              Pembayaran sewa sebesar {formatIDR(amount)} telah berhasil diproses. Status booking
              Anda kini telah aktif.
            </p>
            <button
              type="button"
              onClick={() => i18nRouter.push("/dashboard/bookings")}
              className="mt-6 w-full rounded-lg bg-nk-accent px-5 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              Lihat Booking Saya
            </button>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

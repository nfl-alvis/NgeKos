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
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

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

export default function DashboardPaymentPage() {
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
      <UserDashboardShell title="Pembayaran Booking">
        <div className="mx-auto flex min-h-[50vh] max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
          <Loader2 className="size-8 animate-spin text-nk-accent" />
          <p className="mt-3 text-sm text-nk-text-muted">Memuat rincian pembayaran...</p>
        </div>
      </UserDashboardShell>
    );
  }

  if (!booking) {
    return (
      <UserDashboardShell title="Pembayaran Booking">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center text-sm text-nk-text-muted">
          {t("notFound")}
        </div>
      </UserDashboardShell>
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
          onSuccess: async () => {
            try {
              await fetch("/api/payments/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: booking.id }),
              });
            } catch {}
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
            // Pengguna menutup popup Snap
          },
        });
      } else {
        throw new Error("SDK Midtrans Snap belum selesai dimuat.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses pembayaran."
      );
    } finally {
      setProcessing(false);
    }
  };

  /** Simulasi cepat */
  const handleSimulatePayment = async () => {
    setProcessing(true);
    setErrorMessage(null);
    try {
      await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      markPaymentPaid(payId, booking.propertyName, amount);
      setPaid(true);
    } catch {
      markPaymentPaid(payId, booking.propertyName, amount);
      setPaid(true);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <UserDashboardShell title="Pembayaran Booking">
      {/* Midtrans Snap JS SDK */}
      {clientKey && (
        <Script
          src={snapScriptUrl}
          data-client-key={clientKey}
          strategy="lazyOnload"
        />
      )}

      <div className="mx-auto w-full max-w-xl pb-16">
        {/* Error Alert jika terjadi kegagalan */}
        {errorMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="size-4" />
            <AlertTitle>Gagal Memproses Pembayaran</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Info jika Midtrans belum diisi */}
        {midtransInfo && !midtransInfo.isConfigured && (
          <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-900">
            <Info className="size-4 text-amber-600" />
            <AlertTitle>Midtrans Belum Terkonfigurasi</AlertTitle>
            <AlertDescription className="mt-1 text-xs">
              {midtransInfo.message}
              <div className="mt-2 text-nk-text">
                Anda tetap dapat menggunakan tombol <b>Simulasi Bayar Langsung</b> di bawah untuk menguji alur sistem tanpa Midtrans.
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Countdown strip */}
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
            urgent
              ? "border-[#EBC4C0] bg-[#FAEAE8] text-[#A8382E]"
              : "border-nk-border bg-nk-section text-nk-text"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                urgent ? "animate-pulse bg-[#A8382E]" : "bg-nk-accent"
              }`}
            />
            <span className="text-xs font-medium">Batas Waktu Pembayaran</span>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {mm}:{ss}
          </span>
        </div>

        {/* Ringkasan Pesanan */}
        <section className="mt-6 rounded-lg border border-nk-border bg-nk-surface p-6">
          <div className="flex items-start justify-between border-b border-nk-border pb-4">
            <div>
              <p className="text-xs font-medium text-nk-text-muted">Kode Booking: {booking.id}</p>
              <h1 className="mt-1 text-lg font-medium text-nk-text">{booking.propertyName}</h1>
              <p className="text-xs text-nk-text-muted">{booking.city}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-[#E9F4EC] px-3 py-1 text-xs font-medium text-[#2F6B3C]">
              <ShieldCheck className="size-3.5" />
              <span>Terverifikasi</span>
            </div>
          </div>

          <dl className="divide-y divide-nk-border text-xs">
            <div className="flex justify-between py-2.5">
              <dt className="text-nk-text-muted">Tipe Kamar</dt>
              <dd className="font-medium text-nk-text">{booking.roomType} (No. {booking.roomNumber})</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-nk-text-muted">Tanggal Mulai Sewa</dt>
              <dd className="font-medium text-nk-text">{booking.startDate}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-nk-text-muted">Nama Penyewa</dt>
              <dd className="font-medium text-nk-text">{booking.applicantName}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-nk-text-muted">Biaya Sewa / Bulan</dt>
              <dd className="font-medium text-nk-text">{formatIDR(booking.monthlyPrice)}</dd>
            </div>
            {booking.usesDp && (
              <div className="flex justify-between py-2.5">
                <dt className="text-nk-text-muted">Uang Muka (DP 35%)</dt>
                <dd className="font-medium text-nk-text">{formatIDR(amount)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-3 text-sm font-semibold text-nk-text">
              <dt>{booking.usesDp ? "Total Bayar Sekarang (DP)" : "Total Tagihan Pertama"}</dt>
              <dd className="tabular-nums text-nk-accent">{formatIDR(amount)}</dd>
            </div>
          </dl>
        </section>

        {/* Opsi Pembayaran Midtrans Snap */}
        <section className="mt-6 rounded-lg border border-nk-border bg-nk-surface p-6">
          <h2 className="text-sm font-medium text-nk-text">Metode Pembayaran Online</h2>
          <p className="mt-1 text-xs text-nk-text-muted">
            Didukung oleh Midtrans Payment Gateway. Mendukung semua bank transfer, e-Wallet, dan QRIS.
          </p>

          <div className="mt-4 rounded-lg border border-nk-border bg-nk-section/60 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-nk-text">
              <CreditCard className="size-4 text-nk-accent" />
              <span>Pilihan Saluran Pembayaran di Midtrans:</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {["QRIS (Semua E-Wallet)", "BCA Virtual Account", "Mandiri Bill", "BNI VA", "BRI VA", "GoPay", "ShopeePay", "Kartu Kredit"].map((m) => (
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
    </UserDashboardShell>
  );
}

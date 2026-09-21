"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter as useI18nRouter } from "@/i18n/navigation";
import { bookings as staticBookings } from "@/lib/data/entities";
import { markPaymentPaid } from "@/lib/userOpsStore";
import { formatIDR } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Building2,
  User,
  Calendar,
  Check,
} from "lucide-react";
import type { Booking, BookingStatus } from "@/lib/data/types";

function DashboardPaymentContent() {
  const t = useTranslations("payment");
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const i18nRouter = useI18nRouter();

  const [booking, setBooking] = useState<Booking | null>(
    staticBookings.find((b) => b.id === params.id) ?? null
  );
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(29 * 60 + 45);
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [midtransInfo, setMidtransInfo] = useState<{
    isConfigured: boolean;
    message?: string;
  } | null>(null);

  // Ambil booking dari database atau fallback ke static array
  useEffect(() => {
    if (params.id) {
      setLoadingBooking(true);
      fetch(`/api/bookings/${params.id}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Booking tidak ditemukan");
          return res.json();
        })
        .then((json) => {
          if (json?.data) {
            const b = json.data;
            const statusMap: Record<string, BookingStatus> = {
              PENDING: "pending",
              APPROVED_AWAITING_PAYMENT: "approved-awaiting-payment",
              ACTIVE: "active",
              REJECTED: "rejected",
              EXPIRED: "expired",
              CANCELLED: "cancelled",
              COMPLETED: "active",
            };
            setBooking({
              id: b.code || b.id,
              propertySlug: b.property?.slug || b.propertyId || "",
              propertyName: b.property?.name || "Kost",
              city: b.property?.city || "",
              roomType: b.roomType?.name || "Kamar",
              roomId: b.roomUnitId || b.roomTypeId || "",
              roomNumber: b.roomUnit?.number || "-",
              startDate: typeof b.startDate === "string" ? b.startDate.slice(0, 10) : "",
              status: statusMap[b.status] || "pending",
              applicantName: b.applicant?.fullName || "",
              applicantPhone: b.applicant?.phone || "",
              applicantEmail: b.applicant?.email || "",
              createdAt: b.createdAt,
              payDeadlineMin: 1440,
              usesDp: Boolean(b.depositSnapshot),
              monthlyPrice: Number(b.monthlyPriceSnapshot || b.roomType?.pricePerMonth || 0),
              timeline: [],
              payments: [],
            });
          }
        })
        .catch(() => {
          const fallback = staticBookings.find((b) => b.id === params.id) ?? null;
          if (fallback) setBooking(fallback);
        })
        .finally(() => setLoadingBooking(false));
    } else {
      setLoadingBooking(false);
    }
  }, [params.id]);

  const amount = booking
    ? booking.usesDp
      ? Math.round(booking.monthlyPrice * 0.35)
      : booking.monthlyPrice
    : 0;

  const payId = booking ? `PAY-${booking.id.replace("BK-", "")}` : "";

  // Deteksi status pembayaran dari query parameters (hasil redirect Midtrans)
  useEffect(() => {
    const status = searchParams.get("status");
    const transactionStatus = searchParams.get("transaction_status");

    if (
      status === "success" ||
      transactionStatus === "settlement" ||
      transactionStatus === "capture"
    ) {
      setPaid(true);
      if (booking && payId) {
        markPaymentPaid(payId, booking.propertyName, amount);
        fetch("/api/payments/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id }),
        }).catch(() => {});
      }
    }
  }, [searchParams, booking, payId, amount]);

  // Countdown timer
  useEffect(() => {
    if (paid) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [paid]);

  if (loadingBooking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nk-bg p-6">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="size-8 animate-spin text-nk-accent" />
          <p className="mt-3 text-sm font-medium text-nk-text">Memuat sesi checkout...</p>
          <p className="mt-1 text-xs text-nk-text-muted">Menyiapkan rincian tagihan Anda</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-nk-bg p-6 text-center">
        <AlertCircle className="size-10 text-destructive mb-3" />
        <h1 className="text-lg font-semibold text-nk-text">Tagihan Tidak Ditemukan</h1>
        <p className="mt-1 max-w-sm text-xs text-nk-text-muted">{t("notFound")}</p>
        <button
          type="button"
          onClick={() => i18nRouter.push("/dashboard/bookings")}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-xs font-medium text-nk-text-inverse hover:opacity-90"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Booking
        </button>
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const urgent = secondsLeft < 5 * 60;

  /** Proses Pembayaran Full Screen via Midtrans */
  const handleMidtransPayment = async () => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}?status=success`;
      const res = await fetch("/api/payments/midtrans/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          returnUrl,
        }),
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

      // Kunci Midtrans aktif -> Redirect langsung ke checkout full-screen Midtrans (bukan popup)
      if (json.data.redirectUrl) {
        window.location.href = json.data.redirectUrl;
      } else {
        throw new Error("URL pembayaran full screen Midtrans tidak tersedia.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses pembayaran."
      );
      setProcessing(false);
    }
  };

  /** Simulasi cepat untuk pengetesan */
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

  // TAMPILAN FULL SCREEN JIKA SUDAH LUNAS (STRIPE SUCCESS STATE)
  if (paid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-nk-border bg-white p-8 sm:p-10 shadow-sm text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#E9F4EC] text-[#2F6B3C]">
            <CheckCircle2 className="size-9" />
          </div>

          <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#E9F4EC] px-3 py-1 text-xs font-medium text-[#2F6B3C]">
            <ShieldCheck className="size-3.5" />
            <span>Pembayaran Terverifikasi</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-nk-text">
            Pembayaran Berhasil!
          </h1>
          <p className="mt-2 text-sm text-nk-text-muted">
            Terima kasih! Pembayaran sewa kost Anda telah kami terima dan diverifikasi secara otomatis.
          </p>

          <div className="mt-6 rounded-xl border border-nk-border bg-nk-section/50 p-4 text-left text-xs">
            <div className="flex justify-between py-1.5 border-b border-nk-border">
              <span className="text-nk-text-muted">ID Transaksi</span>
              <span className="font-mono font-medium text-nk-text">{payId}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-nk-border">
              <span className="text-nk-text-muted">Properti Kost</span>
              <span className="font-medium text-nk-text">{booking.propertyName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-nk-border">
              <span className="text-nk-text-muted">Tipe Kamar</span>
              <span className="font-medium text-nk-text">{booking.roomType} (No. {booking.roomNumber})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-nk-border">
              <span className="text-nk-text-muted">Tanggal Mulai Sewa</span>
              <span className="font-medium text-nk-text">{booking.startDate}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-semibold text-nk-text">
              <span>Total Terbayar</span>
              <span className="text-nk-accent tabular-nums">{formatIDR(amount)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => i18nRouter.push("/dashboard/bookings")}
              className="w-full rounded-xl bg-nk-accent px-6 py-3.5 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] shadow-sm"
            >
              Lihat Booking Saya
            </button>
            <button
              type="button"
              onClick={() => i18nRouter.push("/dashboard")}
              className="w-full rounded-xl border border-nk-border bg-white px-6 py-3 text-xs font-medium text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TAMPILAN CHECKOUT FULL SCREEN (STRIPE CHECKOUT STYLE)
  return (
    <div className="min-h-screen bg-nk-bg text-nk-text flex flex-col lg:grid lg:grid-cols-12">
      {/* KOLOM KIRI (SUMMARY TAGIHAN) */}
      <aside className="lg:col-span-5 bg-[#FAF8F5] border-b lg:border-b-0 lg:border-r border-nk-border flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        <div>
          {/* Navigasi Balik */}
          <button
            type="button"
            onClick={() => i18nRouter.push("/dashboard/bookings")}
            className="inline-flex items-center gap-2 text-xs font-medium text-nk-text-muted hover:text-nk-text transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Kembali ke Pesanan</span>
          </button>

          {/* Header Brand */}
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-nk-accent text-white font-bold text-base shadow-sm">
                N
              </div>
              <div>
                <span className="text-sm font-semibold text-nk-text tracking-tight block">
                  NgeKost Checkout
                </span>
                <span className="text-[11px] text-nk-text-muted block">
                  Sistem Pembayaran Resmi
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-nk-border bg-white px-2.5 py-1 text-[11px] font-medium text-nk-text-muted shadow-2xs">
              <Lock className="size-3 text-[#2F6B3C]" />
              <span>SSL 256-bit</span>
            </div>
          </div>

          {/* Nominal Tagihan Utama */}
          <div className="mt-10">
            <p className="text-xs font-medium tracking-wider text-nk-text-muted uppercase">
              Total yang harus dibayar
            </p>
            <div className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-nk-text tabular-nums">
              {formatIDR(amount)}
            </div>
            <p className="mt-1 text-xs text-nk-text-muted">
              {booking.usesDp
                ? "Uang Muka (DP 35%) untuk konfirmasi pesanan"
                : "Pembayaran sewa bulan pertama"}
            </p>
          </div>

          {/* Countdown timer strip */}
          <div
            className={`mt-6 flex items-center justify-between rounded-xl border px-4 py-3 text-xs transition-colors ${
              urgent
                ? "border-[#EBC4C0] bg-[#FAEAE8] text-[#A8382E]"
                : "border-nk-border bg-white text-nk-text"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className={`size-4 ${urgent ? "animate-pulse text-[#A8382E]" : "text-nk-accent"}`} />
              <span className="font-medium">Selesaikan sebelum waktu habis</span>
            </div>
            <span className="font-mono text-sm font-bold tabular-nums">
              {mm}:{ss}
            </span>
          </div>

          {/* Rincian Pesanan Kost */}
          <div className="mt-8 rounded-xl border border-nk-border bg-white p-5 shadow-2xs">
            <div className="flex items-start justify-between pb-4 border-b border-nk-border">
              <div>
                <span className="text-[11px] font-medium text-nk-text-muted uppercase tracking-wider">
                  Kode: {booking.id}
                </span>
                <h2 className="mt-0.5 text-base font-semibold text-nk-text">
                  {booking.propertyName}
                </h2>
                <p className="text-xs text-nk-text-muted">{booking.city}</p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-[#E9F4EC] px-2.5 py-0.5 text-[11px] font-medium text-[#2F6B3C]">
                <ShieldCheck className="size-3" />
                <span>Terverifikasi</span>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-nk-text-muted flex items-center gap-1.5">
                  <Building2 className="size-3.5" />
                  Kamar
                </dt>
                <dd className="font-medium text-nk-text">
                  {booking.roomType} (No. {booking.roomNumber})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-nk-text-muted flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Mulai Sewa
                </dt>
                <dd className="font-medium text-nk-text">{booking.startDate}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-nk-text-muted flex items-center gap-1.5">
                  <User className="size-3.5" />
                  Penyewa
                </dt>
                <dd className="font-medium text-nk-text">{booking.applicantName}</dd>
              </div>
              <div className="pt-3 border-t border-nk-border flex justify-between">
                <dt className="text-nk-text-muted">Biaya Sewa / Bulan</dt>
                <dd className="font-medium text-nk-text">{formatIDR(booking.monthlyPrice)}</dd>
              </div>
              {booking.usesDp && (
                <div className="flex justify-between">
                  <dt className="text-nk-text-muted">DP Disepakati (35%)</dt>
                  <dd className="font-medium text-nk-text">{formatIDR(amount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-nk-text-muted">Biaya Layanan Platform</dt>
                <dd className="font-medium text-[#2F6B3C]">Gratis (Rp 0)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-nk-text-muted">Biaya Admin Gateway</dt>
                <dd className="font-medium text-[#2F6B3C]">Ditanggung NgeKost</dd>
              </div>
              <div className="pt-3 border-t border-nk-border flex justify-between text-sm font-semibold text-nk-text">
                <dt>Total Tagihan</dt>
                <dd className="text-nk-accent tabular-nums">{formatIDR(amount)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Footer Kolom Kiri */}
        <div className="mt-8 pt-6 border-t border-nk-border/80 flex items-center justify-between text-[11px] text-nk-text-muted">
          <span>Didukung oleh Midtrans Payment Gateway</span>
          <span className="flex items-center gap-1">
            <Lock className="size-3" /> Transaksi Terlindungi
          </span>
        </div>
      </aside>

      {/* KOLOM KANAN (FORM CHECKOUT & METODE BAYAR) */}
      <main className="lg:col-span-7 bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        <div className="max-w-xl">
          {/* Header Section */}
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-nk-section px-2.5 py-1 text-[11px] font-semibold text-nk-accent tracking-wide uppercase">
              Full Screen Checkout
            </span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-nk-text">
            Selesaikan Pembayaran Anda
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-nk-text-muted leading-relaxed">
            Pilih metode pembayaran favorit Anda. Anda akan diarahkan ke halaman pembayaran full screen resmi Midtrans yang aman untuk menyelesaikan transaksi.
          </p>

          {booking.status === "approved-awaiting-payment" && (
            <Alert className="mt-6 border-emerald-300 bg-emerald-50 text-emerald-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertTitle className="text-xs font-semibold">Pengajuan Telah Disetujui Pemilik Kos</AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                Pemilik kos telah menyetujui permintaan sewa Anda. Silakan selesaikan pembayaran di bawah ini untuk mengonfirmasi dan mengunci kamar Anda.
              </AlertDescription>
            </Alert>
          )}

          {booking.status === "pending" && (
            <Alert className="mt-6 border-blue-300 bg-blue-50 text-blue-900">
              <Info className="size-4 text-blue-600" />
              <AlertTitle className="text-xs font-semibold">Menunggu Persetujuan Pemilik Kos</AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                Pengajuan sewa Anda saat ini masih menunggu persetujuan dari pemilik kos. Anda dapat menunggu pemilik menyetujui, atau melakukan simulasi pembayaran langsung untuk pengujian.
              </AlertDescription>
            </Alert>
          )}

          {/* Alert jika ada error */}
          {errorMessage && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="size-4" />
              <AlertTitle>Gagal Memproses Transaksi</AlertTitle>
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Info jika Midtrans belum diisi */}
          {midtransInfo && !midtransInfo.isConfigured && (
            <Alert className="mt-6 border-amber-300 bg-amber-50 text-amber-900">
              <Info className="size-4 text-amber-600" />
              <AlertTitle className="text-xs font-semibold">Midtrans Belum Terkonfigurasi</AlertTitle>
              <AlertDescription className="mt-1 text-xs">
                {midtransInfo.message}
                <div className="mt-2 text-nk-text">
                  Gunakan tombol <b>Simulasi Bayar Langsung</b> di bawah untuk menguji alur sistem tanpa Midtrans.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Kartu Pilihan Saluran Pembayaran (Stripe style payment method display) */}
          <div className="mt-8 space-y-3.5">
            {/* Opsi 1: QRIS & E-Wallet */}
            <div className="rounded-xl border border-nk-border bg-[#FAF8F5]/60 p-4 transition-all hover:border-nk-accent/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-nk-border text-nk-accent shadow-2xs">
                    <QrCode className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-nk-text">
                      QRIS & E-Wallet
                    </h3>
                    <p className="text-[11px] text-nk-text-muted">
                      GoPay, ShopeePay, DANA, OVO, LinkAja, BCA QR
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#E9F4EC] px-2 py-0.5 text-[10px] font-medium text-[#2F6B3C]">
                  Instan
                </span>
              </div>
            </div>

            {/* Opsi 2: Virtual Account */}
            <div className="rounded-xl border border-nk-border bg-[#FAF8F5]/60 p-4 transition-all hover:border-nk-accent/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-nk-border text-nk-accent shadow-2xs">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-nk-text">
                      Virtual Account (Bank Transfer)
                    </h3>
                    <p className="text-[11px] text-nk-text-muted">
                      BCA, Mandiri, BNI, BRI, Permata, Danamon, CIMB
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-nk-warm px-2 py-0.5 text-[10px] font-medium text-nk-text-muted">
                  24 Jam
                </span>
              </div>
            </div>

            {/* Opsi 3: Kartu Kredit & Debit */}
            <div className="rounded-xl border border-nk-border bg-[#FAF8F5]/60 p-4 transition-all hover:border-nk-accent/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-nk-border text-nk-accent shadow-2xs">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-nk-text">
                      Kartu Kredit & Debit Online
                    </h3>
                    <p className="text-[11px] text-nk-text-muted">
                      Visa, Mastercard, JCB, American Express
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-nk-warm px-2 py-0.5 text-[10px] font-medium text-nk-text-muted">
                  3D Secure
                </span>
              </div>
            </div>
          </div>

          {/* Keunggulan & Jaminan */}
          <div className="mt-8 rounded-xl border border-dashed border-nk-border bg-white p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-nk-text">
              <Check className="size-3.5 text-[#2F6B3C] shrink-0" />
              <span>Verifikasi otomatis dalam hitungan detik setelah pembayaran berhasil.</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-nk-text">
              <Check className="size-3.5 text-[#2F6B3C] shrink-0" />
              <span>Garansi unit kamar terkunci eksklusif untuk nama Anda.</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-nk-text">
              <Check className="size-3.5 text-[#2F6B3C] shrink-0" />
              <span>Bebas biaya administrasi tambahan atau biaya tersembunyi.</span>
            </div>
          </div>

          {/* Tombol Aksi Utama */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleMidtransPayment}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-nk-accent px-6 py-4 text-sm font-semibold text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {processing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Mengarahkan ke Midtrans Full Screen...
                </>
              ) : (
                <>
                  <span>Bayar {formatIDR(amount)} dengan Midtrans</span>
                  <ExternalLink className="size-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={processing}
              className="w-full rounded-xl border border-nk-border bg-white px-6 py-3 text-xs font-medium text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text"
            >
              Simulasi Bayar Langsung (Mode Pengujian Instan)
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-nk-text-muted">
            {t("warning")}
          </p>
        </div>

        {/* Footer Legal Right Side */}
        <div className="mt-12 pt-6 border-t border-nk-border text-[11px] text-nk-text-muted flex flex-wrap items-center justify-between gap-2">
          <span>Dengan melanjutkan, Anda menyetujui Ketentuan Layanan NgeKost.</span>
          <span className="font-mono text-[10px]">MIDTRANS SECURE CHECKOUT</span>
        </div>
      </main>
    </div>
  );
}

function PaymentLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-nk-bg p-6">
      <div className="flex flex-col items-center text-center">
        <Loader2 className="size-8 animate-spin text-nk-accent" />
        <p className="mt-3 text-sm font-medium text-nk-text">Memuat sesi checkout...</p>
      </div>
    </div>
  );
}

export default function DashboardPaymentPage() {
  return (
    <Suspense fallback={<PaymentLoadingFallback />}>
      <DashboardPaymentContent />
    </Suspense>
  );
}

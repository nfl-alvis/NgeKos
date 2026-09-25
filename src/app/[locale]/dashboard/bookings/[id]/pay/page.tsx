"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import { bookings as staticBookings } from "@/lib/data/entities";
import type { Booking, BookingStatus } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";

type PaymentBooking = {
  id: string;
  propertyName: string;
  city: string;
  roomType: string;
  roomNumber: string;
  startDate: string;
  status: BookingStatus;
  monthlyPrice: number;
  amount: number;
  isDeposit: boolean;
  isDemo: boolean;
};

type ApiBooking = {
  id: string;
  code: string;
  status: string;
  startDate: string;
  monthlyPriceSnapshot: number;
  depositSnapshot: number | null;
  roomUnit?: { number: string } | null;
  roomType?: { name: string } | null;
  property?: { name: string; city: string } | null;
};

const statusLabels: Record<BookingStatus, string> = {
  pending: "Menunggu persetujuan",
  "approved-awaiting-payment": "Menunggu pembayaran",
  active: "Pembayaran terkonfirmasi",
  rejected: "Pengajuan ditolak",
  expired: "Batas pembayaran lewat",
  cancelled: "Dibatalkan",
};

function fromStaticBooking(booking: Booking): PaymentBooking {
  return {
    id: booking.id,
    propertyName: booking.propertyName,
    city: booking.city,
    roomType: booking.roomType,
    roomNumber: booking.roomNumber,
    startDate: booking.startDate,
    status: booking.status,
    monthlyPrice: booking.monthlyPrice,
    amount: booking.usesDp ? Math.round(booking.monthlyPrice * 0.35) : booking.monthlyPrice,
    isDeposit: booking.usesDp,
    isDemo: true,
  };
}

function fromApiBooking(booking: ApiBooking): PaymentBooking {
  const statusMap: Record<string, BookingStatus> = {
    PENDING: "pending",
    APPROVED_AWAITING_PAYMENT: "approved-awaiting-payment",
    ACTIVE: "active",
    COMPLETED: "active",
    REJECTED: "rejected",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
  };
  return {
    id: booking.code || booking.id,
    propertyName: booking.property?.name || "Kos",
    city: booking.property?.city || "",
    roomType: booking.roomType?.name || "Kamar",
    roomNumber: booking.roomUnit?.number || "-",
    startDate: booking.startDate.slice(0, 10),
    status: statusMap[booking.status] || "pending",
    monthlyPrice: Number(booking.monthlyPriceSnapshot),
    amount: booking.depositSnapshot === null
      ? Number(booking.monthlyPriceSnapshot)
      : Number(booking.depositSnapshot),
    isDeposit: booking.depositSnapshot !== null,
    isDemo: false,
  };
}

async function fetchBooking(id: string): Promise<PaymentBooking> {
  const response = await fetch(`/api/bookings/${encodeURIComponent(id)}`, { cache: "no-store" });
  const body = await response.json();
  if (!response.ok || !body?.data) {
    throw new Error(body?.error?.message || "Booking tidak dapat dimuat.");
  }
  return fromApiBooking(body.data as ApiBooking);
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-nk-bg px-5 pb-16 pt-5 text-nk-text sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-nk-border pb-5">
          <Logo className="h-8 w-auto" />
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center gap-2 text-sm text-nk-text-muted transition-colors hover:text-nk-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nk-accent"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Booking saya</span>
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}

function PaymentContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const staticBooking = staticBookings.find((item) => item.id === id);
  const [booking, setBooking] = useState<PaymentBooking | null>(
    staticBooking ? fromStaticBooking(staticBooking) : null,
  );
  const [loading, setLoading] = useState(!staticBooking);
  const [checking, setChecking] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staticBooking) return;
    let active = true;
    fetchBooking(id)
      .then((result) => {
        if (active) {
          setBooking(result);
          setError(null);
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Booking tidak dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, staticBooking]);

  const returnedFromMidtrans = searchParams.has("payment_return") || searchParams.has("transaction_status");

  async function checkPaymentStatus() {
    setChecking(true);
    try {
      setBooking(await fetchBooking(id));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status pembayaran belum dapat diperiksa.");
    } finally {
      setChecking(false);
    }
  }

  async function continueToMidtrans() {
    if (!booking) return;
    setProcessing(true);
    setError(null);
    try {
      const returnUrl = new URL(window.location.href);
      returnUrl.search = "?payment_return=1";
      const response = await fetch("/api/payments/midtrans/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, returnUrl: returnUrl.toString() }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message || "Pembayaran belum dapat dimulai. Coba lagi.");
      }
      if (!body?.data?.isConfigured) {
        throw new Error("Midtrans belum dikonfigurasi untuk proyek ini.");
      }
      if (!body?.data?.redirectUrl) {
        throw new Error("Midtrans tidak mengirim halaman pembayaran. Coba lagi.");
      }
      window.location.assign(body.data.redirectUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pembayaran belum dapat dimulai. Coba lagi.");
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <PageFrame>
        <div className="max-w-xl space-y-4 py-16" role="status" aria-label="Memuat rincian booking">
          <div className="h-4 w-32 animate-pulse bg-nk-warm" />
          <div className="h-10 w-3/4 animate-pulse bg-nk-warm" />
          <div className="h-24 animate-pulse bg-nk-warm" />
        </div>
      </PageFrame>
    );
  }

  if (!booking) {
    return (
      <PageFrame>
        <section className="max-w-xl py-16">
          <h1 className="text-3xl font-semibold tracking-tight">Booking tidak ditemukan</h1>
          <p className="mt-3 text-nk-text-muted">{error || "Periksa kembali kode booking Anda."}</p>
          <Link href="/dashboard/bookings" className="mt-8 inline-flex border-b border-nk-accent pb-1 text-sm font-medium">
            Kembali ke daftar booking
          </Link>
        </section>
      </PageFrame>
    );
  }

  const paid = booking.status === "active" && !booking.isDemo;
  const canPay = booking.status === "approved-awaiting-payment" || booking.status === "pending";

  return (
    <PageFrame>
      <main className="grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-20">
        <section>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-nk-text-muted">Pembayaran · {booking.id}</p>
          <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">
            {paid ? "Pembayaran terkonfirmasi" : "Selesaikan pembayaran"}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-nk-text-muted">
            {paid
              ? "Status booking Anda sudah diperbarui. Rincian sewa tetap dapat dilihat di bawah."
              : "Periksa rincian sewa, lalu lanjutkan ke Midtrans untuk memilih cara bayar."}
          </p>

          <div className="mt-10 border-t border-nk-border pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{booking.propertyName}</h2>
              <span className="text-xs text-nk-text-muted">{booking.city}</span>
            </div>
            <dl className="mt-5 divide-y divide-nk-border text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-nk-text-muted">Kamar</dt>
                <dd className="text-right font-medium">{booking.roomType} · {booking.roomNumber}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-nk-text-muted">Mulai sewa</dt>
                <dd className="text-right font-medium">{booking.startDate}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-nk-text-muted">Status</dt>
                <dd className="text-right font-medium">{statusLabels[booking.status]}</dd>
              </div>
            </dl>
          </div>
        </section>

        <aside className="self-start border border-nk-border bg-nk-surface p-6 sm:p-8" aria-label="Ringkasan pembayaran">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-nk-text-muted">
            {booking.isDeposit ? "Uang muka" : "Sewa bulan pertama"}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">{formatIDR(booking.amount)}</p>
          <div className="mt-7 flex justify-between gap-4 border-t border-nk-border pt-5 text-sm">
            <span className="text-nk-text-muted">Sewa per bulan</span>
            <span className="font-medium tabular-nums">{formatIDR(booking.monthlyPrice)}</span>
          </div>
          {booking.isDeposit && (
            <p className="mt-2 text-xs leading-5 text-nk-text-muted">Nominal uang muka mengikuti tagihan booking ini.</p>
          )}

          {returnedFromMidtrans && !paid && (
            <div className="mt-6 border-l-2 border-nk-accent bg-nk-section px-4 py-3 text-sm leading-6" role="status">
              {booking.isDemo
                ? "Ini booking contoh. Hasil pembayaran Midtrans tidak disimpan sebagai booking riil."
                : "Anda kembali dari Midtrans. Pembayaran belum terkonfirmasi di sistem; periksa lagi setelah beberapa saat."}
            </div>
          )}
          {booking.isDemo && !returnedFromMidtrans && (
            <p className="mt-6 text-xs leading-5 text-nk-text-muted">Booking contoh untuk menguji alur checkout Midtrans.</p>
          )}
          {error && <p className="mt-6 text-sm text-destructive" role="alert">{error}</p>}

          {canPay && (
            <button
              type="button"
              onClick={() => void continueToMidtrans()}
              disabled={processing}
              className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 bg-nk-accent px-5 py-3 text-sm font-semibold text-nk-text-inverse transition-colors hover:bg-nk-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent disabled:cursor-wait disabled:opacity-60"
            >
              {processing ? "Menghubungkan ke Midtrans…" : "Lanjut ke Midtrans"}
              {!processing && <ArrowUpRight className="size-4" aria-hidden="true" />}
            </button>
          )}
          {paid && (
            <div className="mt-7 flex items-center gap-2 border-t border-nk-border pt-5 text-sm font-medium" role="status">
              <Check className="size-4" aria-hidden="true" />
              Pembayaran sudah tercatat
            </div>
          )}
          {returnedFromMidtrans && !booking.isDemo && !paid && (
            <button
              type="button"
              onClick={() => void checkPaymentStatus()}
              disabled={checking}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-nk-text-muted underline underline-offset-4 hover:text-nk-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nk-accent disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
              Periksa status pembayaran
            </button>
          )}
          <p className="mt-5 text-xs leading-5 text-nk-text-muted">Metode pembayaran dipilih di halaman Midtrans.</p>
        </aside>
      </main>
    </PageFrame>
  );
}

function PaymentLoadingFallback() {
  return <div className="min-h-dvh bg-nk-bg" aria-busy="true" />;
}

export default function DashboardPaymentPage() {
  return (
    <Suspense fallback={<PaymentLoadingFallback />}>
      <PaymentContent />
    </Suspense>
  );
}

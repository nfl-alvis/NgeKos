"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, KeyRound, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import { bookings as staticBookings } from "@/lib/data/entities";
import type { Booking, BookingStatus } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
  const checkingRef = useRef(false);
  const initialSyncedRef = useRef<string | null>(null);
  const notifiedPaidRef = useRef(false);

  const storageKey = (key: string) => `ngekos_midtrans_order_${key}`;

  const getStoredOrderId = useCallback((key: string): string | null => {
    try {
      return window.sessionStorage.getItem(storageKey(key));
    } catch {
      return null;
    }
  }, []);

  const clearStoredOrderIds = useCallback((keys: string[]) => {
    try {
      for (const k of keys) {
        if (k) window.sessionStorage.removeItem(storageKey(k));
      }
    } catch {
      // Abaikan bila sessionStorage tidak tersedia
    }
  }, []);

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
  const bookingId = booking?.id ?? id;
  const bookingStatus = booking?.status;
  const orderIdFromUrl = searchParams.get("order_id");

  const checkPaymentStatus = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (checkingRef.current) return;
    checkingRef.current = true;
    if (!silent) setChecking(true);

    try {
      const storedOrderId = getStoredOrderId(id) || (bookingId !== id ? getStoredOrderId(bookingId) : null);
      const orderIdToSync = orderIdFromUrl || storedOrderId;
      let settledNow = false;

      try {
        const syncRes = await fetch("/api/payments/midtrans/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(orderIdToSync ? { orderId: orderIdToSync } : {}),
            bookingId,
          }),
        });
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          settledNow = Boolean(syncJson?.data?.settled);
        }
      } catch {
        // Abaikan bila sinkronisasi status gateway gagal, lanjut ke refresh booking
      }

      const latestBooking = await fetchBooking(id);
      setBooking(latestBooking);
      setError(null);

      const isNowPaid = latestBooking.status === "active" || settledNow;
      if (isNowPaid) {
        clearStoredOrderIds([id, bookingId, latestBooking.id]);
        if (!notifiedPaidRef.current) {
          notifiedPaidRef.current = true;
          toast({
            title: "Pembayaran berhasil dikonfirmasi",
            description: "Status booking Anda telah aktif.",
            variant: "success",
          });
        }
      } else if (!silent) {
        toast("Pembayaran belum terkonfirmasi", {
          description: "Jika baru saja melakukan transfer via Midtrans atau Simulator, tunggu beberapa detik lalu periksa kembali.",
        });
      }
    } catch (reason) {
      if (!silent) {
        const message = reason instanceof Error ? reason.message : "Status pembayaran belum dapat diperiksa.";
        setError(message);
        toast({
          title: "Gagal memeriksa status pembayaran",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      checkingRef.current = false;
      if (!silent) setChecking(false);
    }
  }, [bookingId, clearStoredOrderIds, getStoredOrderId, id, orderIdFromUrl]);

  useEffect(() => {
    if (staticBooking || bookingStatus !== "approved-awaiting-payment") return;

    if (initialSyncedRef.current !== bookingId) {
      initialSyncedRef.current = bookingId;
      void checkPaymentStatus({ silent: true });
    }

    const handleReturnOrFocus = () => {
      if (document.visibilityState === "visible") {
        void checkPaymentStatus({ silent: true });
      }
    };

    window.addEventListener("focus", handleReturnOrFocus);
    document.addEventListener("visibilitychange", handleReturnOrFocus);

    const hasPendingContext =
      returnedFromMidtrans || Boolean(orderIdFromUrl) || Boolean(getStoredOrderId(id)) || Boolean(getStoredOrderId(bookingId));

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (hasPendingContext) {
      let pollCount = 0;
      intervalId = setInterval(() => {
        if (pollCount >= 24) {
          if (intervalId) clearInterval(intervalId);
          return;
        }
        if (document.visibilityState === "visible") {
          pollCount += 1;
          void checkPaymentStatus({ silent: true });
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener("focus", handleReturnOrFocus);
      document.removeEventListener("visibilitychange", handleReturnOrFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [bookingId, bookingStatus, checkPaymentStatus, getStoredOrderId, id, orderIdFromUrl, returnedFromMidtrans, staticBooking]);

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
        throw new Error("Layanan pembayaran Midtrans belum dikonfigurasi di server.");
      }
      if (!body?.data?.redirectUrl) {
        throw new Error("Midtrans tidak mengirim halaman pembayaran. Coba lagi.");
      }
      if (body?.data?.orderId) {
        try {
          window.sessionStorage.setItem(storageKey(id), body.data.orderId);
          window.sessionStorage.setItem(storageKey(booking.id), body.data.orderId);
        } catch {
          // Abaikan bila sessionStorage tidak tersedia
        }
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
  const isPending = booking.status === "pending";
  const canPay = booking.status === "approved-awaiting-payment";

  return (
    <PageFrame>
      <main className="grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:gap-20">
        <section>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-nk-text-muted">Pembayaran · {booking.id}</p>
          <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">
            {paid
              ? "Pembayaran terkonfirmasi"
              : isPending
              ? "Menunggu persetujuan pemilik"
              : canPay
              ? "Selesaikan pembayaran"
              : "Rincian pengajuan sewa"}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-nk-text-muted">
            {paid
              ? "Status booking Anda sudah diperbarui. Rincian sewa tetap dapat dilihat di bawah."
              : isPending
              ? "Pengajuan sewa Anda masih menunggu persetujuan dari pemilik kos. Tombol pembayaran akan aktif setelah pengajuan disetujui."
              : canPay
              ? "Periksa rincian sewa, lalu lanjutkan ke Midtrans untuk memilih cara bayar."
              : "Status booking saat ini tidak memerlukan pembayaran."}
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
              Pembayaran sedang diverifikasi secara otomatis. Bila status belum berubah setelah Anda menyelesaikan transfer, klik{" "}
              <strong>Periksa status pembayaran</strong> di bawah.
            </div>
          )}

          {error && <p className="mt-6 text-sm text-destructive" role="alert">{error}</p>}

          {isPending && (
            <div className="mt-6 border-l-2 border-amber-500 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900" role="status">
              <p className="font-semibold text-amber-800">Menunggu Persetujuan Pemilik Kos</p>
              <p className="mt-1 text-amber-700/90">
                Pengajuan sewa Anda sedang menunggu konfirmasi dari pihak pemilik kos. Pembayaran via Midtrans hanya dapat dilakukan setelah pemilik menyetujui pengajuan Anda.
              </p>
            </div>
          )}

          {canPay && (
            <button
              type="button"
              onClick={() => void continueToMidtrans()}
              disabled={processing}
              className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 bg-nk-accent px-5 py-3 text-sm font-semibold text-nk-text-inverse transition-colors hover:bg-nk-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent disabled:cursor-wait disabled:opacity-60"
            >
              {processing ? "Menghubungkan ke Midtrans..." : "Lanjut ke Midtrans"}
              {!processing && <ArrowUpRight className="size-4" aria-hidden="true" />}
            </button>
          )}
          {paid && (
            <div className="mt-7 space-y-4 border-t border-nk-border pt-5" role="status">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Check className="size-4 shrink-0" aria-hidden="true" />
                Pembayaran sudah tercatat
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs leading-relaxed text-emerald-950">
                <p className="font-semibold text-emerald-900">Langkah Selanjutnya: Check-in ke Kamar</p>
                <p className="mt-1 text-emerald-800/90">
                  Setelah Anda tiba di lokasi kos dan melakukan serah terima kunci dengan pemilik kos, klik{" "}
                  <strong>Check-in Sekarang</strong> untuk mengaktifkan masa sewa (dana sewa diteruskan ke pemilik H+1 setelah check-in).
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href={`/tenant/contract?action=checkin&bookingId=${booking.id}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <KeyRound className="size-3.5" aria-hidden="true" />
                    Check-in Sekarang
                  </Link>
                  <Link
                    href="/tenant/dashboard"
                    className="inline-flex items-center justify-center border border-emerald-300 bg-white px-4 py-2 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
                  >
                    Buka Dashboard Penghuni
                  </Link>
                </div>
              </div>
            </div>
          )}
          {!booking.isDemo && canPay && !paid && (
            <button
              type="button"
              onClick={() => void checkPaymentStatus()}
              disabled={checking}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-nk-text-muted underline underline-offset-4 hover:text-nk-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nk-accent disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
              {checking ? "Memeriksa status..." : "Periksa status pembayaran"}
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

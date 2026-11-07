"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";

/**
 * Halaman simulasi halaman pembayaran Midtrans (mode sandbox mock).
 * Hanya menjadi target redirect ketika MIDTRANS_SANDBOX_MOCK=true —
 * pembayaran nyata diarahkan langsung ke app.sandbox.midtrans.com.
 */
function SandboxContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "-";

  return (
    <div className="min-h-dvh bg-nk-bg px-5 pb-16 pt-5 text-nk-text sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-xl">
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

        <main className="py-12">
          <section
            className="border border-nk-border bg-nk-surface p-6 sm:p-8"
            aria-label="Status pembayaran Midtrans sandbox"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
              Halaman Pembayaran Midtrans (Sandbox)
            </h1>
            <p className="mt-4 text-sm leading-6 text-nk-text-muted">
              Ini simulasi halaman pembayaran Midtrans untuk mode uji coba.
              Pembayaran langsung dicatat otomatis di NgeKos, jadi status booking
              Anda sudah diperbarui menjadi lunas tanpa transfer sungguhan.
            </p>

            <dl className="mt-7 divide-y divide-nk-border border-t border-nk-border text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-nk-text-muted">Order ID</dt>
                <dd className="break-all text-right font-mono text-xs font-medium">{orderId}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-nk-text-muted">Status transaksi</dt>
                <dd className="flex items-center justify-end gap-1.5 font-medium text-emerald-700">
                  <Check className="size-4" aria-hidden="true" />
                  Settlement (disimulasikan)
                </dd>
              </div>
            </dl>

            <Link
              href="/dashboard/bookings"
              className="mt-8 flex min-h-12 w-full items-center justify-center bg-nk-accent px-5 py-3 text-sm font-semibold text-nk-text-inverse transition-colors hover:bg-nk-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
            >
              Kembali ke Booking Saya
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function SandboxMidtransPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-nk-bg" aria-busy="true" />}>
      <SandboxContent />
    </Suspense>
  );
}

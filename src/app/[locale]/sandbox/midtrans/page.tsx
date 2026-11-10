"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Info, ShieldAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";

/**
 * Panduan Simulasi Pembayaran Midtrans Sandbox Resmi.
 * Sistem auto-paid / mock internal telah dinonaktifkan. Seluruh pengujian pembayaran
 * diproses melalui Midtrans Sandbox resmi (app.sandbox.midtrans.com) dan
 * disimulasikan melalui Midtrans Simulator (simulator.sandbox.midtrans.com).
 */
function SandboxContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <div className="min-h-dvh bg-nk-bg px-5 pb-16 pt-5 text-nk-text sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-2xl">
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

        <main className="py-10">
          <section
            className="border border-nk-border bg-nk-surface p-6 sm:p-8"
            aria-label="Panduan simulasi pembayaran Midtrans Sandbox"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </span>

            <h1 className="mt-5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              Panduan Pembayaran Midtrans Sandbox
            </h1>

            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50/80 p-4 text-xs leading-relaxed text-amber-900">
              <strong>Auto-paid dinonaktifkan:</strong> Sistem tidak lagi menandai transaksi lunas secara otomatis tanpa pembayaran.
              Seluruh pengujian pembayaran di lingkungan staging/sandbox kini wajib melalui alur resmi Midtrans Sandbox.
            </div>

            {orderId && (
              <div className="mt-6 border-b border-t border-nk-border py-3 text-xs">
                <span className="text-nk-text-muted">Order ID Referensi: </span>
                <span className="font-mono font-medium text-nk-text">{orderId}</span>
              </div>
            )}

            <div className="mt-6 space-y-4 text-sm text-nk-text">
              <h2 className="font-semibold text-nk-text">Cara Melakukan Simulasi Pembayaran Sandbox:</h2>

              <ol className="list-decimal space-y-3 pl-5 text-xs leading-relaxed text-nk-text-muted">
                <li>
                  <strong className="text-nk-text">Buka Halaman Pembayaran:</strong> Klik tombol &ldquo;Bayar Sekarang&rdquo; pada booking yang telah disetujui pemilik, lalu klik &ldquo;Lanjut ke Midtrans&rdquo;.
                </li>
                <li>
                  <strong className="text-nk-text">Pilih Metode Pembayaran:</strong> Di antarmuka Midtrans Snap, pilih metode yang ingin Anda uji (Virtual Account BCA/BNI/BRI/Mandiri, QRIS, atau Kartu Kredit).
                </li>
                <li>
                  <strong className="text-nk-text">Salin Nomor VA / Kode Pembayaran:</strong> Catat nomor Virtual Account atau nomor tagihan yang diberikan oleh Midtrans Snap.
                </li>
                <li>
                  <strong className="text-nk-text">Buka Midtrans Simulator:</strong> Kunjungi portal simulator resmi Midtrans di{" "}
                  <a
                    href="https://simulator.sandbox.midtrans.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-nk-accent underline underline-offset-2"
                  >
                    simulator.sandbox.midtrans.com
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>.
                </li>
                <li>
                  <strong className="text-nk-text">Lakukan Pembayaran Uji Coba:</strong> Masukkan nomor VA pada tab bank yang sesuai, klik <em>Inquire</em> lalu <em>Pay</em>. Midtrans akan otomatis mengirimkan webhook verifikasi ke NgeKos dan status booking Anda akan berubah menjadi lunas.
                </li>
              </ol>
            </div>

            <div className="mt-6 rounded-lg border border-nk-border bg-nk-surface-alt p-4 text-xs text-nk-text-muted">
              <div className="flex items-center gap-2 font-medium text-nk-text">
                <Info className="size-4 text-nk-accent" aria-hidden="true" />
                <span>Kredensial Kartu Uji Coba Midtrans (Opsional):</span>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Nomor Kartu: <code className="rounded bg-nk-surface px-1.5 py-0.5 font-mono text-nk-text">4811 1111 1111 1114</code></li>
                <li>Masa Berlaku: sembarang bulan/tahun masa depan (contoh: <code className="rounded bg-nk-surface px-1.5 py-0.5 font-mono text-nk-text">12/28</code>)</li>
                <li>CVV: <code className="rounded bg-nk-surface px-1.5 py-0.5 font-mono text-nk-text">123</code></li>
                <li>OTP 3D Secure: <code className="rounded bg-nk-surface px-1.5 py-0.5 font-mono text-nk-text">112233</code></li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://simulator.sandbox.midtrans.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-nk-accent px-5 py-3 text-sm font-semibold text-nk-text-inverse transition-colors hover:bg-nk-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                <span>Buka Midtrans Simulator</span>
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
              <Link
                href="/dashboard/bookings"
                className="inline-flex min-h-12 items-center justify-center border border-nk-border bg-nk-surface px-5 py-3 text-sm font-medium text-nk-text transition-colors hover:bg-nk-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                Kembali ke Booking Saya
              </Link>
            </div>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useUserOps } from "@/lib/userOpsStore";
import type { BookingPayment, BookingPaymentStatus } from "@/lib/data/userData";
import { formatIDR, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar,
  CreditCard,
  Building2,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  Download,
} from "lucide-react";

type FilterTab = "all" | "pending" | "paid" | "other";

const PAY_COLOR: Record<BookingPaymentStatus, "yellow" | "green" | "red" | "gray"> = {
  pending: "yellow",
  paid: "green",
  failed: "red",
  refunding: "red",
  refunded: "gray",
};

export default function PaymentList() {
  const t = useTranslations("userDash.payments");
  const locale = useLocale();
  const router = useRouter();
  const ops = useUserOps();

  const [dbPayments, setDbPayments] = useState<BookingPayment[]>([]);
  const [tab, setTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<BookingPayment | null>(null);

  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: BookingPayment[] = json.data.map((inv: any) => ({
            id: inv.code || inv.id,
            bookingId: inv.booking?.code || inv.bookingId || inv.code || inv.id,
            propertyName: inv.property?.name || inv.propertyName || "Kost",
            amount: Number(inv.amount || inv.amountSnapshot || 0),
            status: (inv.status === "PAID" ? "paid" : "pending") as BookingPaymentStatus,
            at: typeof inv.dueDate === "string" ? inv.dueDate : new Date().toISOString(),
          }));
          setDbPayments(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const allPayments = useMemo(() => {
    const list = dbPayments.length > 0 ? dbPayments : ops.payments;
    return [...list].sort((a, b) => b.at.localeCompare(a.at));
  }, [dbPayments, ops.payments]);

  const counts = useMemo(() => {
    return {
      all: allPayments.length,
      pending: allPayments.filter((p) => p.status === "pending").length,
      paid: allPayments.filter((p) => p.status === "paid").length,
      other: allPayments.filter((p) => p.status !== "pending" && p.status !== "paid").length,
    };
  }, [allPayments]);

  const filtered = useMemo(() => {
    return allPayments.filter((p) => {
      if (tab === "pending" && p.status !== "pending") return false;
      if (tab === "paid" && p.status !== "paid") return false;
      if (tab === "other" && (p.status === "pending" || p.status === "paid")) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.propertyName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.bookingId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allPayments, tab, search]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statCards = [
    {
      key: "all" as const,
      label: "Total Transaksi",
      value: counts.all,
      sub: "Semua riwayat",
      tint: "bg-[#E8EFF8]",
      iconTint: "bg-[#D3E0F0] text-[#33517C]",
      icon: Receipt,
    },
    {
      key: "pending" as const,
      label: "Menunggu Bayar",
      value: counts.pending,
      sub: "Perlu diselesaikan",
      tint: "bg-[#FBF3DC]",
      iconTint: "bg-[#F3E3B8] text-[#8A6A1F]",
      icon: Clock,
    },
    {
      key: "paid" as const,
      label: "Berhasil / Lunas",
      value: counts.paid,
      sub: "Terverifikasi",
      tint: "bg-[#E9F4EC]",
      iconTint: "bg-[#CFE8D6] text-[#2F6B3C]",
      icon: CheckCircle2,
    },
    {
      key: "other" as const,
      label: "Batal / Refund",
      value: counts.other,
      sub: "Dibatalkan / refund",
      tint: "bg-[#FAEAE8]",
      iconTint: "bg-[#F3D7D3] text-[#9C3B32]",
      icon: AlertCircle,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className={cn(
              "flex flex-col gap-1 overflow-hidden rounded-xl text-left ring-1 ring-foreground/10 transition-all hover:ring-nk-accent/40",
              s.tint,
              tab === s.key ? "ring-2 ring-nk-accent" : ""
            )}
          >
            <p className="px-4 pb-1 pt-3 text-xs font-semibold text-nk-text">{s.label}</p>
            <div className="flex flex-1 flex-col rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", s.iconTint)}>
                  <s.icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {s.value}
                  </p>
                  <p className="truncate text-[11px] text-nk-text-muted">{s.sub}</p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-nk-border bg-nk-section/50 p-1">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === "all"
                ? "bg-nk-surface text-nk-text shadow-sm"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Semua</span>
            <span className="rounded-full bg-nk-border px-1.5 py-0.5 text-[10px] font-semibold text-nk-text-muted">
              {counts.all}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === "pending"
                ? "bg-[#FBF3DC] text-[#8A6A1F] shadow-sm font-semibold"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Menunggu Bayar</span>
            {counts.pending > 0 && (
              <span className="rounded-full bg-[#F3E3B8] px-1.5 py-0.5 text-[10px] font-bold text-[#8A6A1F]">
                {counts.pending}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("paid")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === "paid"
                ? "bg-[#E9F4EC] text-[#2F6B3C] shadow-sm font-semibold"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Lunas</span>
            <span className="rounded-full bg-nk-border px-1.5 py-0.5 text-[10px] font-semibold text-nk-text-muted">
              {counts.paid}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("other")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === "other"
                ? "bg-nk-surface text-nk-text shadow-sm font-semibold"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Batal / Refund</span>
            <span className="rounded-full bg-nk-border px-1.5 py-0.5 text-[10px] font-semibold text-nk-text-muted">
              {counts.other}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-nk-text-muted" />
          <input
            type="text"
            placeholder="Cari transaksi atau kos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-nk-border bg-nk-surface pl-9 pr-3 text-xs text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent"
          />
        </div>
      </div>

      {/* Payment List Container */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-nk-border bg-nk-surface/50 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-nk-warm text-nk-accent">
            <Receipt className="size-7" />
          </div>
          <h3 className="mt-4 text-base font-medium text-nk-text">Tidak ada riwayat transaksi</h3>
          <p className="mt-1.5 max-w-sm text-xs text-nk-text-muted">
            {search
              ? "Tidak ditemukan transaksi pembayaran yang cocok dengan pencarian Anda."
              : "Belum ada transaksi pembayaran dalam kategori ini."}
          </p>
          <Link
            href="/kost"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            <span>Jelajahi Kos</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((payment) => (
            <PaymentCardItem
              key={payment.id}
              payment={payment}
              onDetail={setSelectedPayment}
              copiedId={copiedId}
              onCopyId={copyCode}
            />
          ))}
        </div>
      )}

      {/* Detail Modal Dialog */}
      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        {selectedPayment && (
          <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-2xl">
            <DialogHeader className="border-b border-nk-border bg-nk-section/40 p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-nk-border bg-nk-surface px-2.5 py-1 font-mono text-xs font-semibold text-nk-text">
                  #{selectedPayment.id}
                </span>
                <StatusBadge color={PAY_COLOR[selectedPayment.status]}>
                  {t(`status.${selectedPayment.status}`)}
                </StatusBadge>
              </div>
              <DialogTitle className="mt-2 text-lg font-semibold text-nk-text">
                {selectedPayment.propertyName}
              </DialogTitle>
              <p className="text-xs text-nk-text-muted flex items-center gap-1.5 mt-0.5">
                <Calendar className="size-3.5" />
                {new Date(selectedPayment.at).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </p>
            </DialogHeader>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Rincian Transaksi */}
              <div className="rounded-xl border border-nk-border bg-nk-section/30 p-4 space-y-3">
                <p className="text-xs font-semibold text-nk-text">Rincian Pembayaran</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-nk-text-muted">Kode Transaksi:</span>
                    <span className="font-mono font-medium text-nk-text">#{selectedPayment.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nk-text-muted">ID Booking:</span>
                    <span className="font-mono font-medium text-nk-text">#{selectedPayment.bookingId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-nk-text-muted">Metode:</span>
                    <span className="font-medium text-nk-text">Midtrans Payment Gateway</span>
                  </div>
                  <div className="flex justify-between border-t border-nk-border pt-2">
                    <span className="font-semibold text-nk-text">Total Bayar:</span>
                    <span className="font-semibold text-nk-text text-sm tabular-nums">
                      {formatIDR(selectedPayment.amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Catatan */}
              {selectedPayment.status === "pending" && (
                <div className="rounded-xl border border-[#F3E3B8] bg-[#FBF3DC]/60 p-4 text-xs text-[#8A6A1F]">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Menunggu Penyelesaian Pembayaran
                  </p>
                  <p className="mt-1">
                    Silakan klik tombol di bawah untuk melanjutkan ke halaman pembayaran full-screen aman.
                  </p>
                </div>
              )}

              {selectedPayment.status === "paid" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-800">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    Pembayaran Lunas & Terverifikasi
                  </p>
                  <p className="mt-1">
                    Dana telah diterima aman di sistem escrow NgeKost dan diteruskan ke pemilik kos.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {selectedPayment.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPayment(null);
                      router.push(`/dashboard/bookings/${selectedPayment.bookingId}/pay`);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-nk-accent px-4 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
                  >
                    <CreditCard className="size-4" />
                    <span>Lanjutkan Pembayaran Sekarang</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="w-full rounded-lg border border-nk-border px-4 py-2.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function PaymentCardItem({
  payment,
  onDetail,
  copiedId,
  onCopyId,
}: {
  payment: BookingPayment;
  onDetail: (p: BookingPayment) => void;
  copiedId: string | null;
  onCopyId: (id: string) => void;
}) {
  const router = useRouter();
  const t = useTranslations("userDash.payments");
  const locale = useLocale();
  const isPending = payment.status === "pending";

  const formattedDate = new Date(payment.at).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-nk-surface p-5 transition-all",
        isPending
          ? "border-[#F3E3B8] ring-1 ring-[#F3E3B8]"
          : "border-nk-border hover:border-nk-accent/30"
      )}
    >
      {/* Header Info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-lg bg-nk-section sm:size-16">
            <Receipt className="size-6 text-nk-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-nk-text">
              {payment.propertyName}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-nk-text-muted">
              <span>Booking ID: #{payment.bookingId}</span>
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-nk-text">
              {formatIDR(payment.amount)}
            </p>
          </div>
        </div>

        {/* Payment ID & Date */}
        <div className="flex shrink-0 flex-row items-center justify-between gap-1.5 sm:flex-col sm:items-end">
          <button
            type="button"
            onClick={() => onCopyId(payment.id)}
            title="Salin ID Transaksi"
            className="inline-flex items-center gap-1.5 rounded-md border border-nk-border bg-nk-section/60 px-2.5 py-1 font-mono text-xs font-semibold text-nk-text hover:bg-nk-warm"
          >
            <span>#{payment.id}</span>
            {copiedId === payment.id ? (
              <Check className="size-3 text-emerald-600" />
            ) : (
              <Copy className="size-3 text-nk-text-muted" />
            )}
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] text-nk-text-muted">
            <Calendar className="size-3" />
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Dual Status Indicators */}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-nk-border bg-nk-bg p-3">
          <dt className="text-xs text-nk-text-muted">Status Transaksi</dt>
          <dd className="mt-1.5">
            <StatusBadge color={PAY_COLOR[payment.status]}>
              {t(`status.${payment.status}`)}
            </StatusBadge>
          </dd>
        </div>
        <div className="rounded-lg border border-nk-border bg-nk-bg p-3">
          <dt className="text-xs text-nk-text-muted">Metode Pembayaran</dt>
          <dd className="mt-1.5 text-xs font-medium text-nk-text">
            Midtrans Gateway
          </dd>
        </div>
      </dl>

      {/* Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-nk-border pt-3">
        {isPending ? (
          <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[#8A6A1F]">
            <Clock className="size-3.5 animate-pulse text-[#8A6A1F]" />
            <span>Selesaikan sebelum jatuh tempo</span>
          </div>
        ) : (
          <p className="text-xs text-nk-text-muted">
            {payment.status === "paid"
              ? "Pembayaran berhasil diverifikasi"
              : payment.status === "refunding"
                ? "Dalam proses pengembalian dana"
                : "Transaksi selesai"}
          </p>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDetail(payment)}
            className="rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
          >
            Lihat Rincian
          </button>

          {isPending && (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/bookings/${payment.bookingId}/pay`)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3.5 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              <CreditCard className="size-3.5" />
              <span>Bayar Sekarang</span>
            </button>
          )}

          <a
            href={`https://wa.me/6281122334455?text=Halo%20Admin%20NgeKost,%20saya%20ingin%20menanyakan%20status%20transaksi%20saya%20%23${payment.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-7 items-center justify-center rounded-lg border border-nk-border bg-nk-surface text-nk-text-muted transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            title="Bantuan WhatsApp"
          >
            <MessageCircle className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

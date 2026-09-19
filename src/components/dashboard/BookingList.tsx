"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { bookings as staticBookings } from "@/lib/data/entities";
import type { Booking, BookingStatus } from "@/lib/data/types";
import { formatIDR, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Calendar,
  CreditCard,
  DoorOpen,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Search,
  Building2,
  ArrowRight,
  ShieldCheck,
  Receipt,
  User,
  Phone,
  Mail,
} from "lucide-react";

function useCountdown(deadlineMin: number) {
  const [left, setLeft] = useState(deadlineMin * 60);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function mapDbBooking(b: any): Booking {
  const statusMap: Record<string, BookingStatus> = {
    PENDING: "pending",
    APPROVED_AWAITING_PAYMENT: "approved-awaiting-payment",
    ACTIVE: "active",
    REJECTED: "rejected",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
    COMPLETED: "active",
  };

  return {
    id: b.code || b.id,
    propertySlug: b.property?.slug || b.propertyId || "",
    propertyName: b.property?.name || "Kost",
    city: b.property?.city || "Indonesia",
    roomType: b.roomType?.name || "Kamar",
    roomId: b.roomUnitId || b.roomTypeId || "",
    roomNumber: b.roomUnit?.number || "-",
    startDate: typeof b.startDate === "string" ? b.startDate.slice(0, 10) : "",
    status: statusMap[b.status] || "pending",
    applicantName: b.applicant?.fullName || "",
    applicantPhone: b.applicant?.phone || "",
    applicantEmail: b.applicant?.email || "",
    createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date().toISOString(),
    payDeadlineMin: 1440,
    usesDp: Boolean(b.depositSnapshot),
    monthlyPrice: Number(b.monthlyPriceSnapshot || b.roomType?.pricePerMonth || 0),
    timeline: [
      { at: typeof b.createdAt === "string" ? b.createdAt.slice(0, 10) : "", stage: "diajukan" },
      ...(b.status === "APPROVED_AWAITING_PAYMENT" || b.status === "ACTIVE"
        ? [{ at: typeof b.approvedAt === "string" ? b.approvedAt.slice(0, 10) : "", stage: "disetujui" as const }]
        : []),
      ...(b.status === "ACTIVE"
        ? [{ at: typeof b.updatedAt === "string" ? b.updatedAt.slice(0, 10) : "", stage: "lunas" as const }]
        : []),
    ],
    payments: [],
  };
}

export default function BookingList() {
  const t = useTranslations("myBookings");
  const locale = useLocale();
  const router = useRouter();

  const [items, setItems] = useState<Booking[]>(staticBookings);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [tab, setTab] = useState<"all" | "awaiting" | "active" | "history">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.items && Array.isArray(json.data.items) && json.data.items.length > 0) {
          const dbItems = json.data.items.map(mapDbBooking);
          const combined = [
            ...dbItems,
            ...staticBookings.filter((sb) => !dbItems.some((di: any) => di.id === sb.id)),
          ];
          setItems(combined);
        }
      })
      .catch(() => {});
  }, []);

  const counts = useMemo(() => {
    return {
      all: items.length,
      awaiting: items.filter((b) => b.status === "approved-awaiting-payment").length,
      active: items.filter((b) => b.status === "active" || b.status === "pending").length,
      history: items.filter((b) => ["rejected", "expired", "cancelled"].includes(b.status)).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((b) => {
      // Tab filter
      if (tab === "awaiting" && b.status !== "approved-awaiting-payment") return false;
      if (tab === "active" && b.status !== "active" && b.status !== "pending") return false;
      if (tab === "history" && !["rejected", "expired", "cancelled"].includes(b.status)) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          b.propertyName.toLowerCase().includes(q) ||
          b.id.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          b.roomType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, tab, search]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-nk-border bg-nk-surface p-4 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium text-nk-text-muted">Total Pengajuan</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-nk-text">{counts.all}</p>
          <p className="mt-1 text-[11px] text-nk-text-muted">Semua pesanan</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium text-amber-800">Menunggu Bayar</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-amber-900">{counts.awaiting}</p>
          <p className="mt-1 text-[11px] text-amber-700">Perlu diselesaikan</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium text-emerald-800">Sewa Berjalan</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-900">{counts.active}</p>
          <p className="mt-1 text-[11px] text-emerald-700">Aktif & diproses</p>
        </div>
        <div className="rounded-xl border border-nk-border bg-nk-section/60 p-4 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-medium text-nk-text-muted">Riwayat Selesai</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-nk-text">{counts.history}</p>
          <p className="mt-1 text-[11px] text-nk-text-muted">Selesai / Dibatalkan</p>
        </div>
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
            <span className="rounded-full bg-nk-border px-1.5 py-0.2 text-[10px] font-semibold text-nk-text-muted">
              {counts.all}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("awaiting")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === "awaiting"
                ? "bg-amber-100 text-amber-900 shadow-sm"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Menunggu Bayar</span>
            {counts.awaiting > 0 && (
              <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
                {counts.awaiting}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === "active"
                ? "bg-emerald-100 text-emerald-900 shadow-sm"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Aktif & Menunggu</span>
            <span className="rounded-full bg-nk-border px-1.5 py-0.2 text-[10px] font-semibold text-nk-text-muted">
              {counts.active}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              tab === "history"
                ? "bg-nk-surface text-nk-text shadow-sm"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Riwayat</span>
            <span className="rounded-full bg-nk-border px-1.5 py-0.2 text-[10px] font-semibold text-nk-text-muted">
              {counts.history}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-nk-text-muted" />
          <input
            type="text"
            placeholder="Cari kos atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-nk-border bg-nk-surface pl-9 pr-3 text-xs text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent"
          />
        </div>
      </div>

      {/* Booking List Container */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-nk-border bg-nk-surface/50 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-nk-warm text-nk-accent">
            <Building2 className="size-7" />
          </div>
          <h3 className="mt-4 text-base font-medium text-nk-text">Tidak ada pengajuan sewa</h3>
          <p className="mt-1.5 max-w-sm text-xs text-nk-text-muted">
            {search
              ? "Tidak ditemukan pengajuan sewa yang cocok dengan pencarian Anda."
              : "Anda belum memiliki pengajuan sewa dalam kategori ini. Temukan kos terverifikasi impian Anda sekarang."}
          </p>
          <Link
            href="/kost"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            <span>Jelajahi Kos Terverifikasi</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <BookingCardItem
              key={booking.id}
              booking={booking}
              onDetail={setSelectedBooking}
              copiedId={copiedId}
              onCopyId={copyCode}
            />
          ))}
        </div>
      )}

      {/* Detail Modal Dialog */}
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        {selectedBooking && (
          <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl">
            <DialogHeader className="border-b border-nk-border bg-nk-section/40 p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-nk-border bg-nk-surface px-2.5 py-1 font-mono text-xs font-semibold text-nk-text">
                  #{selectedBooking.id}
                </span>
                <StatusBadge color={getStatusBadgeColor(selectedBooking.status)}>
                  {getStatusLabel(selectedBooking.status)}
                </StatusBadge>
              </div>
              <DialogTitle className="mt-2 text-lg font-semibold text-nk-text">
                {selectedBooking.propertyName}
              </DialogTitle>
              <p className="text-xs text-nk-text-muted flex items-center gap-1.5 mt-0.5">
                <MapPin className="size-3.5" />
                {selectedBooking.city}
              </p>
            </DialogHeader>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Stepper Timeline */}
              <div>
                <p className="text-xs font-medium text-nk-text-muted mb-3">Status Pengajuan</p>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-nk-border">
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 flex size-4 items-center justify-center rounded-full bg-nk-accent text-white ring-4 ring-nk-bg">
                      <Check className="size-2.5" />
                    </span>
                    <p className="text-xs font-semibold text-nk-text">Pengajuan Diajukan</p>
                    <p className="text-[11px] text-nk-text-muted">
                      {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleString("id-ID", { dateStyle: "medium" }) : "-"}
                    </p>
                  </div>
                  <div className="relative">
                    <span className={cn(
                      "absolute -left-6 top-0.5 flex size-4 items-center justify-center rounded-full ring-4 ring-nk-bg",
                      selectedBooking.status !== "pending" && selectedBooking.status !== "rejected" && selectedBooking.status !== "cancelled"
                        ? "bg-nk-accent text-white"
                        : "bg-nk-border text-nk-text-muted"
                    )}>
                      <Check className="size-2.5" />
                    </span>
                    <p className="text-xs font-semibold text-nk-text">Disetujui Pemilik Kos</p>
                    <p className="text-[11px] text-nk-text-muted">
                      {selectedBooking.status === "pending"
                        ? "Menunggu konfirmasi pemilik kos"
                        : selectedBooking.status === "rejected"
                        ? "Pengajuan ditolak oleh pemilik"
                        : "Permintaan Anda telah disetujui"}
                    </p>
                  </div>
                  <div className="relative">
                    <span className={cn(
                      "absolute -left-6 top-0.5 flex size-4 items-center justify-center rounded-full ring-4 ring-nk-bg",
                      selectedBooking.status === "active"
                        ? "bg-emerald-600 text-white"
                        : selectedBooking.status === "approved-awaiting-payment"
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-nk-border text-nk-text-muted"
                    )}>
                      <Check className="size-2.5" />
                    </span>
                    <p className="text-xs font-semibold text-nk-text">Pembayaran Sewa</p>
                    <p className="text-[11px] text-nk-text-muted">
                      {selectedBooking.status === "active"
                        ? "Pembayaran lunas terverifikasi"
                        : selectedBooking.status === "approved-awaiting-payment"
                        ? "Menunggu pembayaran via Midtrans"
                        : "Menunggu tahap persetujuan"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rincian Kamar & Biaya */}
              <div className="rounded-xl border border-nk-border bg-nk-section/30 p-4 space-y-3">
                <p className="text-xs font-semibold text-nk-text">Rincian Kamar & Periode</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-nk-text-muted block">Tipe Kamar:</span>
                    <span className="font-medium text-nk-text">{selectedBooking.roomType}</span>
                  </div>
                  <div>
                    <span className="text-nk-text-muted block">Nomor Kamar:</span>
                    <span className="font-medium text-nk-text">No. {selectedBooking.roomNumber}</span>
                  </div>
                  <div>
                    <span className="text-nk-text-muted block">Tanggal Mulai:</span>
                    <span className="font-medium text-nk-text">{selectedBooking.startDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-nk-text-muted block">Harga Sewa:</span>
                    <span className="font-medium text-nk-text">{formatIDR(selectedBooking.monthlyPrice)} / bln</span>
                  </div>
                </div>
              </div>

              {/* Rincian Pemohon */}
              <div className="rounded-xl border border-nk-border bg-nk-surface p-4 space-y-2 text-xs">
                <p className="font-semibold text-nk-text">Data Pemesan</p>
                <div className="flex items-center gap-2 text-nk-text-muted">
                  <User className="size-3.5" />
                  <span className="text-nk-text font-medium">{selectedBooking.applicantName || "Penyewa"}</span>
                </div>
                {selectedBooking.applicantPhone && (
                  <div className="flex items-center gap-2 text-nk-text-muted">
                    <Phone className="size-3.5" />
                    <span>{selectedBooking.applicantPhone}</span>
                  </div>
                )}
                {selectedBooking.applicantEmail && (
                  <div className="flex items-center gap-2 text-nk-text-muted">
                    <Mail className="size-3.5" />
                    <span>{selectedBooking.applicantEmail}</span>
                  </div>
                )}
              </div>

              {/* Actions in Dialog */}
              <div className="flex flex-col gap-2 pt-2">
                {selectedBooking.status === "approved-awaiting-payment" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBooking(null);
                      router.push(`/dashboard/bookings/${selectedBooking.id}/pay`);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-nk-accent px-4 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
                  >
                    <CreditCard className="size-4" />
                    <span>Lanjutkan Pembayaran Sekarang</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
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

function BookingCardItem({
  booking,
  onDetail,
  copiedId,
  onCopyId,
}: {
  booking: Booking;
  onDetail: (b: Booking) => void;
  copiedId: string | null;
  onCopyId: (id: string) => void;
}) {
  const router = useRouter();
  const countdown = useCountdown(booking.status === "approved-awaiting-payment" ? 1472 : 1080);
  const isAwaiting = booking.status === "approved-awaiting-payment";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-nk-surface p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:gap-5",
        isAwaiting ? "border-amber-300 ring-1 ring-amber-200" : "border-nk-border"
      )}
    >
      {/* Property Thumbnail */}
      <div className="relative mb-4 h-36 w-full shrink-0 overflow-hidden rounded-xl bg-nk-section sm:mb-0 sm:size-28">
        <img
          src={`https://picsum.photos/seed/${booking.propertySlug}/200/200`}
          alt={booking.propertyName}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-2 left-2 rounded-md bg-nk-dark/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
          {booking.city}
        </span>
      </div>

      {/* Main Info */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCopyId(booking.id)}
            title="Klik untuk menyalin kode booking"
            className="inline-flex items-center gap-1 rounded-md border border-nk-border bg-nk-section/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-nk-text hover:bg-nk-warm"
          >
            <span>#{booking.id}</span>
            {copiedId === booking.id ? (
              <Check className="size-3 text-emerald-600" />
            ) : (
              <Copy className="size-3 text-nk-text-muted" />
            )}
          </button>

          <StatusBadge color={getStatusBadgeColor(booking.status)}>
            {getStatusLabel(booking.status)}
          </StatusBadge>
        </div>

        <div>
          <Link
            href={`/kost/${booking.propertySlug}`}
            className="group/link inline-flex items-center gap-1.5 text-base font-semibold text-nk-text hover:text-nk-accent"
          >
            <span className="truncate">{booking.propertyName}</span>
            <ExternalLink className="size-3 text-nk-text-muted group-hover/link:text-nk-accent" />
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-nk-text-muted">
            <span className="inline-flex items-center gap-1 font-medium text-nk-text">
              <DoorOpen className="size-3.5 text-nk-text-muted" />
              {booking.roomType} (Kamar {booking.roomNumber})
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5 text-nk-text-muted" />
              Mulai {booking.startDate || "Fleksibel"}
            </span>
          </div>
        </div>

        {/* Price Tag */}
        <div className="flex items-baseline gap-1.5 pt-1">
          <span className="text-sm font-semibold tabular-nums text-nk-text">
            {formatIDR(booking.monthlyPrice)}
          </span>
          <span className="text-xs text-nk-text-muted">/ bulan</span>
        </div>
      </div>

      {/* Action Strip */}
      <div className="mt-4 flex flex-col gap-2 border-t border-nk-border pt-4 sm:mt-0 sm:border-t-0 sm:pt-0 sm:items-end sm:justify-center">
        {isAwaiting ? (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <Clock className="size-3.5 animate-pulse" />
              <span>Bayar dalam: {countdown}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDetail(booking)}
                className="rounded-lg border border-nk-border px-3 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
              >
                Detail
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/bookings/${booking.id}/pay`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-semibold text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] shadow-sm"
              >
                <CreditCard className="size-3.5" />
                <span>Bayar Sekarang</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDetail(booking)}
              className="rounded-lg border border-nk-border bg-nk-surface px-4 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
            >
              Lihat Rincian
            </button>
            <a
              href={`https://wa.me/6281122334455?text=Halo%20Pemilik%20${encodeURIComponent(booking.propertyName)},%20saya%20ingin%20menanyakan%20status%20booking%20saya%20%23${booking.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-8 items-center justify-center rounded-lg border border-nk-border bg-nk-surface text-nk-text-muted hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              title="Hubungi Pengelola via WhatsApp"
            >
              <MessageCircle className="size-4" />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}

function getStatusBadgeColor(status: BookingStatus): "yellow" | "blue" | "green" | "red" | "gray" {
  switch (status) {
    case "pending":
      return "yellow";
    case "approved-awaiting-payment":
      return "blue";
    case "active":
      return "green";
    case "rejected":
    case "expired":
      return "red";
    default:
      return "gray";
  }
}

function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "pending":
      return "Menunggu Persetujuan";
    case "approved-awaiting-payment":
      return "Menunggu Pembayaran";
    case "active":
      return "Aktif / Lunas";
    case "rejected":
      return "Ditolak";
    case "expired":
      return "Kedaluwarsa";
    case "cancelled":
      return "Dibatalkan";
    default:
      return status;
  }
}

export function CompactBookingList({ limit = 3 }: { limit?: number }) {
  const router = useRouter();
  const [items, setItems] = useState<Booking[]>(staticBookings.slice(0, limit));

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.items && Array.isArray(json.data.items)) {
          setItems(json.data.items.slice(0, limit).map(mapDbBooking));
        }
      })
      .catch(() => {});
  }, [limit]);

  return (
    <div className="divide-y divide-nk-border">
      {items.map((b) => (
        <div key={b.id} className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-semibold text-nk-text">{b.propertyName}</p>
            <p className="text-xs text-nk-text-muted">{b.roomType} · {b.city}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/bookings`)}
            className="text-xs font-medium text-nk-accent hover:underline"
          >
            Lihat
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { formatIDR, cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useSession } from "@/components/SessionProvider";
import { getLeaseExpirationInfo } from "@/server/lease-extension-policy";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ApiBooking = {
  id: string;
  code?: string;
  status: string;
  startDate: string;
  endDate?: string;
  durationMonths: number;
  monthlyPriceSnapshot: number;
  depositSnapshot?: number | null;
  checkedInAt?: string | null;
  checkInNotes?: string | null;
  checkOutRequestedAt?: string | null;
  checkOutDate?: string | null;
  checkOutNotes?: string | null;
  refundBankInfo?: { bankName?: string; accountNumber?: string; accountHolder?: string } | null;
  checkedOutAt?: string | null;
  inspectionNotes?: string | null;
  depositRefundAmount?: number | null;
  terminationStatus?: string | null;
  terminationRequestedBy?: string | null;
  terminationReason?: string | null;
  terminationRefundAmount?: number | null;
  property?: {
    id: string;
    slug: string;
    name: string;
    city?: string;
    address?: string;
  };
  roomType?: {
    id: string;
    name: string;
  };
  roomUnit?: {
    id: string;
    number: string;
    status: string;
  };
  applicant?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
};

type ApiInvoice = {
  id: string;
  code?: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate: string;
  amount: number;
  status: string;
  notes?: string | null;
  paidAt?: string | null;
};

const DEFAULT_HOUSE_RULES = [
  { id: "Jam malam pintu utama pukul 23.00.", en: "Main gate closes at 23:00." },
  { id: "Tamu menginap wajib lapor ke pengelola.", en: "Overnight guests must be reported to the manager." },
  { id: "Dilarang merokok di dalam kamar.", en: "No smoking inside rooms." },
  { id: "Sampah dibuang di titik kumpul setiap malam.", en: "Take out trash to the collection point every evening." },
  { id: "Kebisingan dibatasi setelah pukul 22.00.", en: "Noise is limited after 22:00." },
];

function calculateEndDate(startDateIso?: string | null, durationMonths: number = 1): string {
  if (!startDateIso) return "";
  try {
    const d = new Date(startDateIso.includes("T") ? startDateIso : `${startDateIso}T00:00:00Z`);
    if (isNaN(d.getTime())) return "";
    const end = new Date(d);
    end.setUTCMonth(end.getUTCMonth() + durationMonths);
    return end.toISOString();
  } catch {
    return "";
  }
}

/** Kontrak / Masa Sewa - periode tenancy, syarat, dan peraturan kos. */
export default function TenantContractPage() {
  const t = useTranslations("tenantPages.contract");
  const locale = useLocale();
  const { user, ready } = useSession();

  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);

  // Check-In state
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState("");
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const autoOpenedCheckInRef = useRef(false);

  // Check-Out state
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkOutDate, setCheckOutDate] = useState("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);

  // Mutual Early Termination state
  const [terminationOpen, setTerminationOpen] = useState(false);
  const [terminationReason, setTerminationReason] = useState("");
  const [isSubmittingTermination, setIsSubmittingTermination] = useState(false);
  const [isConfirmingTermination, setIsConfirmingTermination] = useState(false);

  // Lease Extension state
  const [extendOpen, setExtendOpen] = useState(false);
  const [additionalMonths, setAdditionalMonths] = useState(3);
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "extend") {
        setExtendOpen(true);
      } else if (params.get("action") === "checkout") {
        setCheckOutOpen(true);
      }
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setIsFetching(true);
    setErrorMessage(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    setIsSubmittingCheckIn(true);
    try {
      const res = await fetch(`/api/bookings/${activeBooking.id}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInNotes: checkInNotes.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Gagal melakukan check-in");
      }
      setCheckInOpen(false);
      setCheckInNotes("");
      const successMsg =
        locale === "id"
          ? "Check-in berhasil dikonfirmasi! Selamat menikmati kamar Anda."
          : "Check-in confirmed successfully! Welcome to your room.";
      toast({
        title: locale === "id" ? "Check-in berhasil" : "Check-in confirmed",
        description: successMsg,
        variant: "success",
      });
      handleRefresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat check-in.";
      toast({
        title: locale === "id" ? "Gagal melakukan check-in" : "Check-in failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const handleCheckOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    setIsSubmittingCheckOut(true);
    try {
      const res = await fetch(`/api/bookings/${activeBooking.id}/check-out-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkOutDate: checkOutDate || undefined,
          checkOutNotes: checkOutNotes.trim() || undefined,
          bankName: bankName.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          accountHolder: accountHolder.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Gagal mengajukan check-out");
      }
      setCheckOutOpen(false);
      setCheckOutDate("");
      setCheckOutNotes("");
      setBankName("");
      setAccountNumber("");
      setAccountHolder("");
      const msg =
        locale === "id"
          ? "Pengajuan check-out berhasil dikirim! Menunggu konfirmasi dan inspeksi dari pemilik kos."
          : "Checkout request submitted successfully! Awaiting owner inspection.";
      toast.success(msg);
      handleRefresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengajukan check-out.";
      toast.error(errMsg);
    } finally {
      setIsSubmittingCheckOut(false);
    }
  };

  const handleTerminationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    setIsSubmittingTermination(true);
    try {
      const res = await fetch(`/api/bookings/${activeBooking.id}/terminate-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: terminationReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Gagal mengajukan berhenti sewa");
      }
      setTerminationOpen(false);
      setTerminationReason("");
      const msg =
        locale === "id"
          ? "Permohonan berhenti sewa berhasil diajukan. Menunggu konfirmasi pemilik kos."
          : "Termination request submitted successfully. Awaiting owner confirmation.";
      toast.success(msg);
      handleRefresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengajukan berhenti sewa.";
      toast.error(errMsg);
    } finally {
      setIsSubmittingTermination(false);
    }
  };

  const handleTerminationConfirm = async (action: "APPROVE" | "REJECT") => {
    if (!activeBooking) return;
    setIsConfirmingTermination(true);
    try {
      const res = await fetch(`/api/bookings/${activeBooking.id}/terminate-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Gagal memproses permohonan");
      }
      const msg =
        action === "APPROVE"
          ? (locale === "id"
              ? "Penghentian sewa disetujui! Dana refund telah dikreditkan ke saldo dompet Anda."
              : "Termination approved! Refund has been credited to your wallet balance.")
          : (locale === "id"
              ? "Permohonan penghentian sewa ditolak."
              : "Termination request rejected.");
      toast.success(msg);
      handleRefresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses permohonan.";
      toast.error(errMsg);
    } finally {
      setIsConfirmingTermination(false);
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    setIsSubmittingExtend(true);
    try {
      const res = await fetch(`/api/bookings/${activeBooking.id}/extend-lease`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalMonths,
          billingCycle,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Gagal memperpanjang sewa");
      }
      setExtendOpen(false);
      const msg =
        locale === "id"
          ? `Masa sewa berhasil diperpanjang ${additionalMonths} bulan! Tagihan termin baru telah diterbitkan dengan deposit otomatis bergulir.`
          : `Lease extended by ${additionalMonths} months! New invoice created with rollover deposit.`;
      toast.success(msg);
      handleRefresh();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat memperpanjang sewa.";
      toast.error(errMsg);
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;

    Promise.allSettled([
      fetch("/api/bookings").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/invoices").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([bookingsRes, invoicesRes]) => {
        if (ignore) return;
        if (bookingsRes.status === "fulfilled" && bookingsRes.value?.data) {
          const rawBookings: ApiBooking[] = Array.isArray(bookingsRes.value.data)
            ? bookingsRes.value.data
            : [];
          setBookings(rawBookings);

          const searchParams =
            typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const requestedBookingId = searchParams?.get("bookingId");
          const requestedAction = searchParams?.get("action");

          const active =
            (requestedBookingId
              ? rawBookings.find(
                  (b) =>
                    (b.id === requestedBookingId || b.code === requestedBookingId) &&
                    (b.status === "ACTIVE" || b.status === "APPROVED_AWAITING_PAYMENT")
                )
              : undefined) ||
            rawBookings.find((b) => b.status === "ACTIVE") ||
            rawBookings.find((b) => b.status === "APPROVED_AWAITING_PAYMENT");
          setActiveBooking(active || null);

          if (
            requestedAction === "checkin" &&
            !autoOpenedCheckInRef.current &&
            active?.status === "ACTIVE" &&
            !active.checkedInAt &&
            !active.checkedOutAt
          ) {
            autoOpenedCheckInRef.current = true;
            setCheckInOpen(true);
          }
        } else {
          setBookings([]);
          setActiveBooking(null);
        }

        if (invoicesRes.status === "fulfilled" && invoicesRes.value?.data) {
          const rawInvoices: ApiInvoice[] = Array.isArray(invoicesRes.value.data)
            ? invoicesRes.value.data
            : [];
          setInvoices(rawInvoices);
        } else {
          setInvoices([]);
        }
        setIsFetching(false);
      })
      .catch(() => {
        if (!ignore) {
          setErrorMessage(
            locale === "id"
              ? "Gagal memuat rincian kontrak sewa. Silakan muat ulang halaman."
              : "Failed to load contract details. Please reload the page."
          );
          setIsFetching(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [ready, user, locale, refreshKey]);

  const isLoading = !ready || (Boolean(user) && isFetching);

  const fmt = (iso?: string | Date | null) => {
    if (!iso) return "-";
    try {
      const d = typeof iso === "string" ? new Date(iso.includes("T") ? iso : `${iso}T00:00:00Z`) : iso;
      if (isNaN(d.getTime())) return typeof iso === "string" ? iso : "-";
      return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return "-";
    }
  };

  const getPeriodLabel = (inv: ApiInvoice) => {
    if (inv.notes && inv.notes.trim().length > 0) return inv.notes;
    if (inv.periodStart) {
      try {
        const d = new Date(inv.periodStart);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          });
        }
      } catch {}
    }
    if (inv.dueDate) {
      try {
        const d = new Date(inv.dueDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          });
        }
      } catch {}
    }
    return locale === "id" ? "Periode Berjalan" : "Current Period";
  };

  const paidRows = invoices
    .filter((inv) => {
      const s = String(inv.status || "").toUpperCase();
      return s === "PAID" || Boolean(inv.paidAt);
    })
    .map((inv) => ({
      id: inv.code || inv.id,
      period: getPeriodLabel(inv),
      amount: Number(inv.amount || 0),
    }));

  const historyBookings = bookings
    .filter((b) => ["ACTIVE", "COMPLETED", "APPROVED_AWAITING_PAYMENT"].includes(b.status))
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

  const tenantDisplayName =
    user?.name ||
    activeBooking?.applicant?.fullName ||
    (locale === "id" ? "Penyewa" : "Tenant");

  const activeEndIso = activeBooking
    ? activeBooking.endDate || calculateEndDate(activeBooking.startDate, activeBooking.durationMonths)
    : "";

  const leaseExpiration = activeBooking
    ? getLeaseExpirationInfo({
        startDate: activeBooking.startDate,
        durationMonths: activeBooking.durationMonths,
        status: activeBooking.status,
        checkedOutAt: activeBooking.checkedOutAt,
      })
    : null;

  const activePeriodString = activeBooking
    ? `${fmt(activeBooking.startDate)} - ${fmt(activeEndIso)}`
    : "";

  const activeRows = activeBooking
    ? [
        {
          k: t("fProperty"),
          v: activeBooking.property?.name || (locale === "id" ? "Kost Saya" : "My Kost"),
        },
        {
          k: t("fRoom"),
          v: activeBooking.roomUnit?.number
            ? `${t("roomLabel")} ${activeBooking.roomUnit.number}`
            : activeBooking.roomType?.name || "-",
        },
        { k: t("fStart"), v: fmt(activeBooking.startDate) },
        { k: t("fEnd"), v: fmt(activeEndIso) },
        {
          k: "Sisa Masa Sewa",
          v: leaseExpiration ? `${leaseExpiration.daysRemaining} hari` : "-",
        },
        {
          k: "Status Kontrak",
          v:
            leaseExpiration?.expiringStatus === "EXPIRING_H7" ||
            leaseExpiration?.expiringStatus === "EXPIRED"
              ? "Kritis (H-7 / Jatuh Tempo)"
              : leaseExpiration?.expiringStatus === "EXPIRING_H30"
              ? "Mendekati Berakhir (H-30)"
              : "Aktif Normal",
        },
        {
          k: t("fDuration"),
          v: t("monthsValue", { count: activeBooking.durationMonths || 1 }),
        },
        {
          k: t("fRent"),
          v: `${formatIDR(Number(activeBooking.monthlyPriceSnapshot) || 0)} ${t("perMonth")}`,
        },
        {
          k: t("fDeposit"),
          v: activeBooking.depositSnapshot
            ? formatIDR(Number(activeBooking.depositSnapshot))
            : locale === "id"
            ? "Tidak ada uang jaminan"
            : "No deposit",
        },
        {
          k: t("fNotice"),
          v:
            locale === "id"
              ? "30 hari sebelum masa sewa berakhir"
              : "30 days before lease end date",
        },
      ]
    : [];

  return (
    <UserDashboardShell
      role="tenant"
      title={t("title")}
      greeting={
        user?.name
          ? `${locale === "id" ? "Halo" : "Hello"}, ${user.name.split(" ")[0]}`
          : undefined
      }
      actions={
        user ? (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition hover:bg-nk-warm disabled:opacity-50"
            title={locale === "id" ? "Segarkan data kontrak" : "Refresh contract data"}
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>{locale === "id" ? "Perbarui" : "Refresh"}</span>
          </button>
        ) : undefined
      }
    >
      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-md bg-red-100 px-3 py-1 font-medium text-red-900 hover:bg-red-200"
          >
            {locale === "id" ? "Coba Lagi" : "Retry"}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-pulse"
          aria-label="Loading contract"
        >
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="h-64 rounded-xl bg-nk-section" />
            <div className="h-32 rounded-xl bg-nk-section" />
            <div className="h-48 rounded-xl bg-nk-section" />
          </div>
          <div className="lg:col-span-1">
            <div className="h-72 rounded-xl bg-nk-section" />
          </div>
        </div>
      ) : !user ? (
        /* Unauthenticated State */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-12 text-center shadow-sm">
          <LogIn className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h2 className="text-lg font-semibold text-nk-text">
            {locale === "id" ? "Masuk ke Akun Anda" : "Sign In to Your Account"}
          </h2>
          <p className="mt-1 text-sm text-nk-text-muted max-w-md mx-auto">
            {locale === "id"
              ? "Silakan masuk dengan akun penyewa Anda untuk melihat rincian kontrak sewa, peraturan kos, dan bukti pembayaran."
              : "Please sign in with your tenant account to view your lease agreement, house rules, and paid receipts."}
          </p>
          <Link
            href="/login?from=/tenant/contract"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : !activeBooking && historyBookings.length === 0 ? (
        /* Empty State: No active booking and no history */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-8 text-center sm:p-12 shadow-sm">
          <Building2 className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h3 className="text-base font-semibold text-nk-text">
            {locale === "id" ? "Belum Ada Kontrak Sewa Aktif" : "No Active Lease Contract"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-nk-text-muted">
            {locale === "id"
              ? "Anda belum memiliki kontrak sewa aktif saat ini. Cari kamar dan ajukan sewa untuk melihat rincian kontrak di sini."
              : "You do not have an active lease contract at this time. Browse available rooms and submit a booking to see your contract details here."}
          </p>
          <div className="mt-6">
            <Link
              href="/kost"
              className="inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-semibold text-nk-text-inverse hover:opacity-90"
            >
              {locale === "id" ? "Jelajahi Kos" : "Explore Kosts"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Authenticated View */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {activeBooking ? (
              <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E8EFF8]">
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <h2 className="text-sm font-semibold text-nk-text">{t("activeTitle")}</h2>
                  <StatusBadge color="blue">{t("statusActive")}</StatusBadge>
                </div>
                <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
                  {/* Status Check-In & Check-Out */}
                  <div className="mb-4 rounded-lg border border-nk-border bg-nk-section/40 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-nk-text-muted">
                          {locale === "id" ? "Status Kedatangan & Kamar" : "Occupancy Status"}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          {activeBooking.checkedOutAt ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-nk-text-muted">
                              <CheckCircle2 className="size-4 text-gray-500" />
                              {locale === "id"
                                ? `Sudah Check-out (${fmt(activeBooking.checkedOutAt)})`
                                : `Checked Out (${fmt(activeBooking.checkedOutAt)})`}
                            </span>
                          ) : activeBooking.checkOutRequestedAt ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <Clock className="size-4 text-amber-600 animate-pulse" />
                              {locale === "id"
                                ? `Pengajuan Check-out Diproses (${fmt(activeBooking.checkOutDate || activeEndIso)})`
                                : `Checkout Pending (${fmt(activeBooking.checkOutDate || activeEndIso)})`}
                            </span>
                          ) : activeBooking.checkedInAt ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="size-4 text-emerald-600" />
                              {locale === "id"
                                ? `Sudah Check-in (${fmt(activeBooking.checkedInAt)})`
                                : `Checked In (${fmt(activeBooking.checkedInAt)})`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                              <Clock className="size-4 text-blue-600" />
                              {locale === "id" ? "Belum Check-in" : "Not Checked In"}
                            </span>
                          )}
                        </div>
                        {activeBooking.checkInNotes && (
                          <p className="mt-1 text-xs text-nk-text-muted">
                            <span className="font-medium">{locale === "id" ? "Catatan Check-in:" : "Check-in Note:"}</span>{" "}
                            {activeBooking.checkInNotes}
                          </p>
                        )}
                        {activeBooking.checkOutNotes && (
                          <p className="mt-1 text-xs text-nk-text-muted">
                            <span className="font-medium">{locale === "id" ? "Catatan Check-out:" : "Check-out Note:"}</span>{" "}
                            {activeBooking.checkOutNotes}
                          </p>
                        )}

                        {/* Lease Expiration Interactive Notice (H-30 & H-7) */}
                        {leaseExpiration?.isExpiringNotice &&
                          activeBooking.status === "ACTIVE" &&
                          !activeBooking.checkedOutAt &&
                          activeBooking.terminationStatus !== "REQUESTED" && (
                            <div
                              className={`mt-3 p-3.5 border text-xs ${
                                leaseExpiration.expiringStatus === "EXPIRING_H7" ||
                                leaseExpiration.expiringStatus === "EXPIRED"
                                  ? "bg-rose-50 border-rose-200"
                                  : "bg-amber-50 border-amber-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div
                                    className={`font-bold flex items-center gap-1.5 text-sm ${
                                      leaseExpiration.expiringStatus === "EXPIRING_H7" ||
                                      leaseExpiration.expiringStatus === "EXPIRED"
                                        ? "text-rose-900"
                                        : "text-amber-900"
                                    }`}
                                  >
                                    <Clock className="w-4 h-4 shrink-0" />
                                    {leaseExpiration.daysRemaining <= 0
                                      ? locale === "id"
                                        ? "Perhatian: Masa Sewa Telah Jatuh Tempo / Berakhir"
                                        : "Notice: Lease Has Reached Expiration"
                                      : leaseExpiration.expiringStatus === "EXPIRING_H7"
                                      ? locale === "id"
                                        ? `Perhatian: Masa Sewa Berakhir dalam ${leaseExpiration.daysRemaining} Hari!`
                                        : `Critical: Lease Ending in ${leaseExpiration.daysRemaining} Days!`
                                      : locale === "id"
                                      ? `Pemberitahuan: Masa Sewa Berakhir dalam ${leaseExpiration.daysRemaining} Hari`
                                      : `Notice: Lease Ending in ${leaseExpiration.daysRemaining} Days`}
                                  </div>
                                  <p className="text-neutral-700 mt-1">
                                    {locale === "id"
                                      ? `Kontrak sewa kamar Anda berakhir pada ${fmt(
                                          leaseExpiration.endDate.toISOString()
                                        )}. Anda dapat memperpanjang masa sewa sekarang (uang deposit otomatis bergulir tanpa biaya baru), atau bersiap untuk proses check-out.`
                                      : `Your room lease ends on ${fmt(
                                          leaseExpiration.endDate.toISOString()
                                        )}. You can renew with rollover deposit, or request checkout.`}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`mt-3 flex flex-wrap gap-2 pt-2 border-t ${
                                  leaseExpiration.expiringStatus === "EXPIRING_H7" ||
                                  leaseExpiration.expiringStatus === "EXPIRED"
                                    ? "border-rose-200"
                                    : "border-amber-200"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setExtendOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  {locale === "id" ? "Perpanjang Sewa (Deposit Bergulir)" : "Extend Lease (Rollover Deposit)"}
                                </button>
                                {!activeBooking.checkOutRequestedAt && (
                                  <button
                                    type="button"
                                    onClick={() => setCheckOutOpen(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 bg-white text-neutral-800 font-semibold text-xs hover:bg-neutral-50 transition cursor-pointer"
                                  >
                                    <LogOut className="w-3.5 h-3.5 text-neutral-600" />
                                    {locale === "id" ? "Akhiri Sewa & Check-Out" : "End Lease & Checkout"}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Mutual Termination Status Banner */}
                        {activeBooking.terminationStatus === "REQUESTED" && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-xs">
                            {activeBooking.terminationRequestedBy === "TENANT" ? (
                              <div>
                                <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  Permohonan Berhenti Sewa Menunggu Konfirmasi Pemilik
                                </div>
                                <p className="text-neutral-600 mt-1">Alasan: {activeBooking.terminationReason}</p>
                                <p className="text-neutral-700 font-medium mt-1">
                                  Estimasi refund sisa sewa & deposit:{" "}
                                  <span className="font-bold text-emerald-700">
                                    {formatIDR(activeBooking.terminationRefundAmount || 0)}
                                  </span>{" "}
                                  (otomatis masuk ke dompet Anda jika disetujui).
                                </p>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-amber-900">
                                  Pemilik Kos Mengajukan Penghentian Sewa Lebih Awal
                                </div>
                                <p className="text-neutral-600 mt-1">Alasan: {activeBooking.terminationReason}</p>
                                <p className="text-neutral-700 font-medium mt-1">
                                  Sisa sewa dihitung prorata harian bersih + deposit sebesar{" "}
                                  <span className="font-bold text-emerald-700">
                                    {formatIDR(activeBooking.terminationRefundAmount || 0)}
                                  </span>{" "}
                                  akan langsung cair ke Saldo Dompet Anda.
                                </p>
                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTerminationConfirm("APPROVE")}
                                    disabled={isConfirmingTermination}
                                    className="px-3 py-1 bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Setujui & Terima Refund
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTerminationConfirm("REJECT")}
                                    disabled={isConfirmingTermination}
                                    className="px-3 py-1 border border-neutral-300 bg-white text-xs font-semibold hover:bg-neutral-50 disabled:opacity-50"
                                  >
                                    Tolak Penghentian
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Extend Lease Button */}
                        {activeBooking.status === "ACTIVE" &&
                          !activeBooking.checkedOutAt &&
                          activeBooking.terminationStatus !== "REQUESTED" && (
                            <button
                              type="button"
                              onClick={() => setExtendOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-none border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              <RefreshCw className="size-3.5 text-emerald-600" />
                              {locale === "id" ? "Perpanjang Sewa" : "Extend Lease"}
                            </button>
                          )}

                        {/* Check-In Button */}
                        {!activeBooking.checkedInAt && activeBooking.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => setCheckInOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-none bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
                          >
                            <KeyRound className="size-3.5" />
                            {locale === "id" ? "Check-in Sekarang" : "Self Check-in"}
                          </button>
                        )}

                        {/* Check-Out Button */}
                        {activeBooking.checkedInAt &&
                          !activeBooking.checkedOutAt &&
                          !activeBooking.checkOutRequestedAt && (
                            <button
                              type="button"
                              onClick={() => setCheckOutOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-none border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text hover:bg-nk-warm transition cursor-pointer"
                            >
                              <LogOut className="size-3.5 text-nk-text-muted" />
                              {locale === "id" ? "Ajukan Check-Out" : "Request Checkout"}
                            </button>
                          )}

                        {/* Mutual Termination Button */}
                        {activeBooking.checkedInAt &&
                          !activeBooking.checkedOutAt &&
                          !activeBooking.checkOutRequestedAt &&
                          (!activeBooking.terminationStatus ||
                            activeBooking.terminationStatus === "NONE" ||
                            activeBooking.terminationStatus === "REJECTED") && (
                            <button
                              type="button"
                              onClick={() => setTerminationOpen(true)}
                              className="inline-flex items-center gap-1.5 rounded-none border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                            >
                              <LogOut className="size-3.5 text-rose-500" />
                              {locale === "id" ? "Berhenti Sewa Dini" : "Early Termination"}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  <dl className="flex flex-col divide-y divide-nk-border">
                    {activeRows.map((r) => (
                      <div
                        key={r.k}
                        className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                      >
                        <dt className="text-sm text-nk-text-muted">{r.k}</dt>
                        <dd className="text-right text-sm font-medium text-nk-text">{r.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-nk-border pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        downloadContract(
                          t("fileName"),
                          activeBooking,
                          tenantDisplayName,
                          fmt(activeEndIso),
                          fmt(activeBooking.startDate),
                          locale
                        )
                      }
                      className="inline-flex items-center gap-1.5 border border-nk-border bg-nk-surface px-3.5 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      {t("download")}
                    </button>
                    <Link
                      href="/tenant/bills"
                      className="inline-flex items-center gap-1.5 bg-nk-accent px-4 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                    >
                      {t("seeBills")}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </section>
            ) : (
              <div className="rounded-xl border border-nk-border bg-nk-surface p-6 text-center">
                <p className="text-sm text-nk-text-muted">
                  {locale === "id"
                    ? "Anda tidak memiliki sewa aktif berjalan saat ini. Riwayat kontrak sebelumnya dapat dilihat di bawah."
                    : "You do not currently have an active lease. Previous contract history is listed below."}
                </p>
              </div>
            )}

            {/* Renewal Policy */}
            <DashSection title={t("renewalTitle")} bodyClass="p-4">
              <p className="text-sm text-nk-text">
                {locale === "id"
                  ? "Perpanjangan kontrak sewa dapat diajukan kepada pemilik kost sekurang-kurangnya 30 hari sebelum masa sewa berakhir."
                  : "Lease renewal can be submitted to the property owner at least 30 days before the lease expires."}
              </p>
              {activePeriodString && (
                <p className="mt-2 text-xs text-nk-text-muted">
                  {t("renewalNote", { period: activePeriodString })}
                </p>
              )}
            </DashSection>

            {/* History List */}
            <DashSection title={t("historyTitle")} bodyClass="divide-y divide-nk-border">
              {historyBookings.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-nk-text-muted">
                  {locale === "id"
                    ? "Belum ada riwayat perpanjangan kontrak."
                    : "No contract renewal history yet."}
                </p>
              ) : (
                <ol className="flex flex-col">
                  {historyBookings.map((ra) => {
                    const isItemActive = ra.id === activeBooking?.id;
                    const raEndIso =
                      ra.endDate || calculateEndDate(ra.startDate, ra.durationMonths);
                    const periodLabel = `${fmt(ra.startDate)} - ${fmt(raEndIso)}`;
                    const roomDisplay = ra.roomUnit?.number
                      ? `${t("roomLabel")} ${ra.roomUnit.number}`
                      : ra.roomType?.name || "-";

                    return (
                      <li key={ra.id} className="flex items-start gap-3 px-4 py-3.5">
                        {isItemActive ? (
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-[#2F6B3C]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="mt-0.5 size-4 shrink-0 text-nk-text-muted"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-nk-text">{periodLabel}</p>
                          <p className="text-xs text-nk-text-muted">
                            {ra.property?.name || (locale === "id" ? "Kost" : "Kost")} · {roomDisplay}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums text-nk-text">
                            {formatIDR(Number(ra.monthlyPriceSnapshot) || 0)}
                          </p>
                          <StatusBadge color={isItemActive ? "green" : "gray"}>
                            {isItemActive ? t("statusActive") : t("statusEnded")}
                          </StatusBadge>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </DashSection>

            {/* House Rules */}
            <DashSection title={t("rulesTitle")} bodyClass="p-4">
              <ul className="flex flex-col gap-2.5">
                {DEFAULT_HOUSE_RULES.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-nk-text">
                    <Check className="mt-0.5 size-4 shrink-0 text-nk-accent" aria-hidden="true" />
                    <span>{locale === "id" ? r.id : r.en}</span>
                  </li>
                ))}
              </ul>
            </DashSection>
          </div>

          {/* Right Aside: Paid Invoices */}
          <aside className="flex flex-col gap-6">
            <DashSection title={t("paidTitle")} bodyClass="divide-y divide-nk-border">
              {paidRows.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-nk-text-muted">
                  {locale === "id"
                    ? "Belum ada riwayat tagihan terbayar."
                    : "No paid invoice history yet."}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {paidRows.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-nk-text">{inv.period}</p>
                        <p className="font-mono text-xs text-nk-text-muted">{inv.id}</p>
                      </div>
                      <p className="shrink-0 text-sm font-medium tabular-nums text-nk-text">
                        {formatIDR(inv.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </DashSection>
          </aside>
        </div>
      )}

      {/* Dialog Konfirmasi Check-In */}
      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {locale === "id" ? "Konfirmasi Check-In Mandiri" : "Self Check-In Confirmation"}
            </DialogTitle>
            <DialogDescription>
              {locale === "id"
                ? "Konfirmasikan bahwa Anda telah tiba di kos dan menerima kunci kamar."
                : "Confirm that you have arrived at the property and received your room key."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckInSubmit} className="mt-4 space-y-4">
            <div className="rounded-md border border-nk-border bg-nk-section/50 p-3 text-xs space-y-1">
              <p>
                <span className="font-semibold">{locale === "id" ? "Kos:" : "Property:"}</span>{" "}
                {activeBooking?.property?.name || "-"}
              </p>
              <p>
                <span className="font-semibold">{locale === "id" ? "Kamar:" : "Room:"}</span>{" "}
                {activeBooking?.roomUnit?.number || activeBooking?.roomType?.name || "-"}
              </p>
              <p>
                <span className="font-semibold">{locale === "id" ? "Tanggal Mulai:" : "Start Date:"}</span>{" "}
                {fmt(activeBooking?.startDate)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-nk-text mb-1">
                {locale === "id"
                  ? "Catatan Tambahan (opsional)"
                  : "Additional Notes (optional)"}
              </label>
              <textarea
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder={
                  locale === "id"
                    ? "Contoh: Kunci diterima dari penjaga kos, kondisi kamar bersih."
                    : "e.g. Key received from caretaker, room is in clean condition."
                }
                rows={3}
                className="w-full rounded-none border border-nk-border bg-nk-surface px-3 py-2 text-xs text-nk-text focus:outline-none focus:ring-1 focus:ring-nk-accent"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckInOpen(false)}
                disabled={isSubmittingCheckIn}
                className="border border-nk-border px-3 py-1.5 text-xs font-medium text-nk-text hover:bg-nk-warm transition"
              >
                {locale === "id" ? "Batal" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmittingCheckIn}
                className="bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isSubmittingCheckIn
                  ? locale === "id"
                    ? "Memproses..."
                    : "Processing..."
                  : locale === "id"
                  ? "Konfirmasi Check-In"
                  : "Confirm Check-In"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Pengajuan Check-Out */}
      <Dialog open={checkOutOpen} onOpenChange={setCheckOutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {locale === "id" ? "Pengajuan Check-Out Kamar" : "Room Check-Out Request"}
            </DialogTitle>
            <DialogDescription>
              {locale === "id"
                ? "Isi tanggal rencana keluar kos dan info pengembalian uang jaminan (deposit)."
                : "Enter your planned departure date and refund account for your deposit."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCheckOutSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-nk-text mb-1">
                {locale === "id" ? "Tanggal Rencana Keluar *" : "Planned Checkout Date *"}
              </label>
              <input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full rounded-none border border-nk-border bg-nk-surface px-3 py-1.5 text-xs text-nk-text focus:outline-none focus:ring-1 focus:ring-nk-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-nk-text mb-1">
                {locale === "id" ? "Alasan / Catatan Keluar" : "Departure Reason / Note"}
              </label>
              <textarea
                value={checkOutNotes}
                onChange={(e) => setCheckOutNotes(e.target.value)}
                placeholder={
                  locale === "id"
                    ? "Contoh: Masa studi selesai, rencana serah terima kunci jam 12:00."
                    : "e.g. Studies completed, keys will be handed over at 12:00."
                }
                rows={2}
                className="w-full rounded-none border border-nk-border bg-nk-surface px-3 py-2 text-xs text-nk-text focus:outline-none focus:ring-1 focus:ring-nk-accent"
              />
            </div>

            {/* Refund Bank Info */}
            <div className="space-y-2 border-t border-nk-border pt-3">
              <span className="text-xs font-semibold text-nk-text">
                {locale === "id"
                  ? "Rekening Pengembalian Deposit"
                  : "Deposit Refund Bank Details"}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-nk-text-muted mb-0.5">
                    {locale === "id" ? "Nama Bank" : "Bank Name"}
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="BCA / Mandiri / BRI"
                    className="w-full rounded-none border border-nk-border bg-nk-surface px-2.5 py-1 text-xs text-nk-text focus:outline-none focus:ring-1 focus:ring-nk-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-nk-text-muted mb-0.5">
                    {locale === "id" ? "Nomor Rekening" : "Account Number"}
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="w-full rounded-none border border-nk-border bg-nk-surface px-2.5 py-1 text-xs text-nk-text focus:outline-none focus:ring-1 focus:ring-nk-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-nk-text-muted mb-0.5">
                  {locale === "id" ? "Nama Pemilik Rekening" : "Account Holder Name"}
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Nama Lengkap Pemilik Rekening"
                  className="w-full rounded-none border border-nk-border bg-nk-surface px-2.5 py-1 text-xs text-nk-text focus:outline-none focus:ring-1 focus:ring-nk-accent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckOutOpen(false)}
                disabled={isSubmittingCheckOut}
                className="border border-nk-border px-3 py-1.5 text-xs font-medium text-nk-text hover:bg-nk-warm transition"
              >
                {locale === "id" ? "Batal" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmittingCheckOut}
                className="bg-nk-accent px-4 py-1.5 text-xs font-semibold text-nk-text-inverse hover:opacity-90 transition disabled:opacity-50"
              >
                {isSubmittingCheckOut
                  ? locale === "id"
                    ? "Mengirim..."
                    : "Submitting..."
                  : locale === "id"
                  ? "Kirim Pengajuan"
                  : "Submit Request"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Early Termination Dialog */}
      <Dialog open={terminationOpen} onOpenChange={setTerminationOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <LogOut className="size-4 text-rose-600" />
              {locale === "id" ? "Ajukan Berhenti Sewa Lebih Awal" : "Request Early Lease Termination"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {locale === "id"
                ? "Penghentian sewa sebelum masa kontrak habis membutuhkan persetujuan pemilik kos. Sisa hari sewa yang belum terpakai akan dihitung secara prorata harian bersih dan dikembalikan ke Dompet Anda bersama uang deposit."
                : "Early termination requires owner mutual consent. Unused days will be refunded prorata to your tenant wallet along with deposit."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTerminationSubmit} className="space-y-4 mt-2">
            <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
              <div className="flex justify-between">
                <span>Harga Sewa Bulanan:</span>
                <span className="font-semibold text-neutral-900">{formatIDR(Number(activeBooking?.monthlyPriceSnapshot || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span>Uang Jaminan (Deposit):</span>
                <span className="font-semibold text-neutral-900">{formatIDR(Number(activeBooking?.depositSnapshot || 0))}</span>
              </div>
              <p className="text-[11px] text-emerald-700 pt-1 font-medium">
                • Formula refund: (Sisa Hari Belum Terpakai / Total Hari) × Sewa Periode + Deposit utuh.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {locale === "id" ? "Alasan Berhenti Sewa *" : "Reason for Termination *"}
              </label>
              <textarea
                required
                rows={3}
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder={
                  locale === "id"
                    ? "Contoh: Pindah tugas kantor ke luar kota, kendala keluarga, dll..."
                    : "e.g. Relocating to another city, family emergency..."
                }
                className="w-full px-3 py-2 text-xs border border-neutral-300 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTerminationOpen(false)}
                className="px-4 py-2 border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {locale === "id" ? "Batal" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmittingTermination || terminationReason.trim().length < 5}
                className="px-5 py-2 bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {isSubmittingTermination
                  ? (locale === "id" ? "Mengirim..." : "Submitting...")
                  : (locale === "id" ? "Kirim Pengajuan" : "Submit Request")}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Extend Lease Dialog with Rollover Deposit */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <RefreshCw className="size-4 text-emerald-600" />
              {locale === "id" ? "Perpanjang Masa Sewa Kost" : "Extend Room Lease"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {locale === "id"
                ? "Perpanjang masa sewa Anda di kamar ini. Uang jaminan (deposit) otomatis bergulir tanpa perlu dibayar ulang."
                : "Extend your lease for this room. Existing security deposit automatically rolls over with zero new deposit charges."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExtendSubmit} className="space-y-4 mt-2">
            {/* Rollover Deposit Notice */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <span className="font-semibold">Deposit Otomatis Bergulir: </span>
                <span>
                  Uang jaminan sebesar{" "}
                  <strong>{formatIDR(Number(activeBooking?.depositSnapshot || 0))}</strong> akan
                  langsung dipakai untuk periode sewa baru (Rp 0 biaya deposit tambahan).
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Pilih Tambahan Durasi Sewa
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAdditionalMonths(m)}
                    className={`py-2 text-xs font-medium border text-center transition cursor-pointer ${
                      additionalMonths === m
                        ? "border-emerald-600 bg-emerald-600 text-white font-bold"
                        : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100"
                    }`}
                  >
                    {m} Bulan
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Skema Termin Pembayaran
              </label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full border border-neutral-300 p-2 text-xs bg-white focus:outline-none focus:border-emerald-600"
              >
                <option value="MONTHLY">Bulanan (Bayar per 1 bulan)</option>
                <option value="QUARTERLY">3 Bulanan (Bayar per 3 bulan)</option>
                <option value="SEMI_ANNUALLY">6 Bulanan (Bayar per 6 bulan)</option>
                <option value="ANNUALLY">Tahunan (Bayar per 1 tahun)</option>
                <option value="WEEKLY">Mingguan (Bayar per minggu)</option>
              </select>
            </div>

            {/* Price Preview */}
            <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Harga Sewa Bulanan:</span>
                <span className="font-semibold text-neutral-900">
                  {formatIDR(Number(activeBooking?.monthlyPriceSnapshot || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tambahan Durasi:</span>
                <span className="font-semibold text-neutral-900">{additionalMonths} Bulan</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Deposit Baru:</span>
                <span>Rp 0 (Rollover)</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-neutral-200 text-xs font-bold text-neutral-900">
                <span>Tagihan Termin Pertama:</span>
                <span className="text-emerald-700">
                  {formatIDR(
                    billingCycle === "WEEKLY"
                      ? Math.round(Number(activeBooking?.monthlyPriceSnapshot || 0) / 4)
                      : billingCycle === "QUARTERLY"
                      ? Number(activeBooking?.monthlyPriceSnapshot || 0) * 3
                      : billingCycle === "SEMI_ANNUALLY"
                      ? Number(activeBooking?.monthlyPriceSnapshot || 0) * 6
                      : billingCycle === "ANNUALLY"
                      ? Number(activeBooking?.monthlyPriceSnapshot || 0) * 12
                      : Number(activeBooking?.monthlyPriceSnapshot || 0)
                  )}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExtendOpen(false)}
                disabled={isSubmittingExtend}
                className="px-4 py-2 border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {locale === "id" ? "Batal" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmittingExtend}
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isSubmittingExtend
                  ? locale === "id"
                    ? "Memproses..."
                    : "Processing..."
                  : locale === "id"
                  ? "Konfirmasi Perpanjang Sewa"
                  : "Confirm Extension"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </UserDashboardShell>
  );
}

/** Ringkasan kontrak sewa unduhan client-side */
function downloadContract(
  fileName: string,
  booking: ApiBooking,
  tenantName: string,
  endDateFormatted: string,
  startDateFormatted: string,
  locale: string
) {
  const lines = [
    locale === "id" ? "NgeKos - Ringkasan Kontrak Sewa" : "NgeKos - Rental Contract Summary",
    "====================================",
    `${locale === "id" ? "Kos" : "Property"}: ${booking.property?.name || "-"}`,
    `${locale === "id" ? "Kamar" : "Room"}: ${
      booking.roomUnit?.number || booking.roomType?.name || "-"
    }`,
    `${locale === "id" ? "Penyewa" : "Tenant"}: ${tenantName}`,
    `${locale === "id" ? "Tanggal Mulai" : "Start Date"}: ${startDateFormatted}`,
    `${locale === "id" ? "Tanggal Berakhir" : "End Date"}: ${endDateFormatted}`,
    `${locale === "id" ? "Sewa/bulan" : "Monthly Rent"}: ${formatIDR(
      Number(booking.monthlyPriceSnapshot) || 0
    )}`,
    `${locale === "id" ? "Durasi" : "Duration"}: ${booking.durationMonths || 1} ${
      locale === "id" ? "bulan" : "month(s)"
    }`,
    `${locale === "id" ? "Uang Jaminan" : "Deposit"}: ${
      booking.depositSnapshot
        ? formatIDR(Number(booking.depositSnapshot))
        : locale === "id"
        ? "Tidak ada uang jaminan"
        : "No deposit"
    }`,
    `${locale === "id" ? "Kode Booking" : "Booking Code"}: ${booking.code || booking.id}`,
    `${locale === "id" ? "Status" : "Status"}: ${booking.status}`,
    "====================================",
    locale === "id"
      ? "Dicetak secara otomatis melalui Sistem NgeKos"
      : "Generated automatically via NgeKos System",
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}\n`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

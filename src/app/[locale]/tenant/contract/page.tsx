"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Circle,
  Download,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { formatIDR, cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useSession } from "@/components/SessionProvider";

type ApiBooking = {
  id: string;
  code?: string;
  status: string;
  startDate: string;
  endDate?: string;
  durationMonths: number;
  monthlyPriceSnapshot: number;
  depositSnapshot?: number | null;
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

  const handleRefresh = useCallback(() => {
    setIsFetching(true);
    setErrorMessage(null);
    setRefreshKey((k) => k + 1);
  }, []);

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

          const active = rawBookings.find(
            (b) => b.status === "ACTIVE" || b.status === "APPROVED_AWAITING_PAYMENT"
          );
          setActiveBooking(active || null);
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

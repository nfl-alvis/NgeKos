"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  LogIn,
  MessageSquare,
  Receipt,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import FacilityIcon from "@/components/FacilityIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { getKosImage } from "@/lib/kosImages";
import { cn, formatIDR } from "@/lib/utils";
import { useSession } from "@/components/SessionProvider";
import { FACILITY_META } from "@/lib/data/facilities";
import type { Facility } from "@/lib/data/types";

type ApiFacility = {
  key: string;
  nameId?: string;
  nameEn?: string;
  icon?: string | null;
};

type ApiBooking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyPriceSnapshot: number;
  depositSnapshot?: number | null;
  property: {
    id: string;
    slug: string;
    name: string;
    city: string;
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
  invoiceNumber?: string;
  amount: number;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  status: string;
  paidAt?: string | null;
  property?: { id: string; name: string; slug: string };
};

type ApiConversation = {
  id: string;
  name: string;
  channel: "telegram" | "email" | "in_app";
  unread: number;
  propertyName?: string;
  propertySlug?: string;
  messages: Array<{
    id: string;
    from: "owner" | "contact";
    isMe: boolean;
    text: string;
    at: string;
    status: string;
  }>;
};

type ApiPropertyDetail = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  facilities: ApiFacility[];
};

export default function TenantDashboardPage() {
  const t = useTranslations("tenant");
  const locale = useLocale();
  const months = t.raw("months") as string[];
  const { user, ready } = useSession();

  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [propertyDetail, setPropertyDetail] = useState<ApiPropertyDetail | null>(null);

  const handleRefresh = useCallback(() => {
    setIsFetching(true);
    setErrorMessage(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;

    Promise.allSettled([
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/invoices").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/conversations").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(async ([bookingsRes, invoicesRes, convsRes]) => {
        if (ignore) return;

        let loadedBookings: ApiBooking[] = [];
        if (bookingsRes.status === "fulfilled" && bookingsRes.value?.data) {
          loadedBookings = Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : [];
          setBookings(loadedBookings);

          const active = loadedBookings.find(
            (b) => b.status === "ACTIVE" || b.status === "APPROVED_AWAITING_PAYMENT"
          );
          setActiveBooking(active || null);

          const identifier = active?.property?.slug || active?.property?.id;
          if (identifier) {
            try {
              const r = await fetch(`/api/properties/${identifier}`);
              if (r.ok) {
                const json = await r.json();
                if (!ignore && json?.data) {
                  setPropertyDetail(json.data);
                }
              }
            } catch {
              // Non-fatal property detail enrichment
            }
          }
        }

        if (invoicesRes.status === "fulfilled" && invoicesRes.value?.data) {
          const rawInvoices = Array.isArray(invoicesRes.value.data) ? invoicesRes.value.data : [];
          setInvoices(rawInvoices);
        }

        if (convsRes.status === "fulfilled" && convsRes.value?.data) {
          const rawConvs = Array.isArray(convsRes.value.data) ? convsRes.value.data : [];
          setConversations(rawConvs);
        }

        setIsFetching(false);
      })
      .catch(() => {
        if (!ignore) {
          setErrorMessage(
            locale === "id"
              ? "Gagal memuat data dasbor penyewa. Silakan muat ulang halaman."
              : "Failed to load tenant dashboard data. Please reload the page."
          );
          setIsFetching(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [ready, user, locale, refreshKey]);

  const isLoading = !ready || (Boolean(user) && isFetching);

  const fmtDate = (isoOrDate?: string | Date | null) => {
    if (!isoOrDate) return "-";
    try {
      const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return "-";
    }
  };

  // Derive tenant display info from live authenticated state
  const tenantName = user?.name || activeBooking?.applicant?.fullName || (locale === "id" ? "Penyewa" : "Tenant");
  const roomNumber = activeBooking?.roomUnit?.number || activeBooking?.roomType?.name || "-";
  const monthlyRent = Number(activeBooking?.monthlyPriceSnapshot) || 0;
  const propertyName = propertyDetail?.name || activeBooking?.property?.name || (locale === "id" ? "Kost Saya" : "My Room");
  const propertyAddress = propertyDetail?.address || activeBooking?.property?.address || activeBooking?.property?.city || "";
  const propertySlug = propertyDetail?.slug || activeBooking?.property?.slug || "";

  // Days left in lease
  const today = new Date();
  const leaseEndDate = activeBooking?.endDate ? new Date(activeBooking.endDate) : null;
  const daysLeft = leaseEndDate
    ? Math.max(0, Math.round((leaseEndDate.getTime() - today.getTime()) / 86_400_000))
    : 0;

  // Invoice calculations
  const isInvoicePaid = (inv: ApiInvoice) =>
    inv.status?.toUpperCase() === "PAID" || inv.status?.toLowerCase() === "lunas" || Boolean(inv.paidAt);

  const pendingInvoice = invoices.find((inv) => !isInvoicePaid(inv));
  const currentInvoice = pendingInvoice || invoices[0];
  const isCurrentPaid = currentInvoice ? isInvoicePaid(currentInvoice) : false;

  // Conversations & unread messages
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread || 0), 0);
  const activeConv = conversations.find(
    (c) =>
      c.unread > 0 ||
      (propertySlug && c.propertySlug === propertySlug) ||
      (propertyName && c.propertyName === propertyName)
  ) || conversations[0];

  // Agreement records from live booking history
  const agreements = bookings
    .filter((b) => ["ACTIVE", "COMPLETED", "APPROVED_AWAITING_PAYMENT"].includes(b.status))
    .map((b) => ({
      id: b.id,
      period: `${fmtDate(b.startDate)} - ${fmtDate(b.endDate)}`,
      property: b.property?.name || propertyName,
      room: b.roomUnit?.number ? `${t("roomLabel")} ${b.roomUnit.number}` : b.roomType?.name || t("roomLabel"),
      rent: Number(b.monthlyPriceSnapshot) || 0,
      isActive: b.id === activeBooking?.id,
    }));

  // Dynamic chart data based on invoices or current lease
  const chartData = months.map((label, i) => {
    // If invoice exists for this month index, use its amount, otherwise reflect monthlyRent
    const matchedInvoice = invoices[i];
    return {
      label,
      value: matchedInvoice?.amount || (activeBooking ? monthlyRent : 0),
    };
  });

  const chartConfig = {
    value: { label: t("chartSeries"), color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const stats = [
    {
      label: t("statRent"),
      value: formatIDR(monthlyRent),
      note: t("statRentFlat"),
      icon: Wallet,
      tint: { card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" },
    },
    {
      label: t("statInvoice"),
      value: currentInvoice ? formatIDR(currentInvoice.amount) : "-",
      note: t("statInvoiceDue", { date: currentInvoice ? fmtDate(currentInvoice.dueDate) : "-" }),
      icon: Receipt,
      tint: { card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" },
      badge: currentInvoice ? (
        isCurrentPaid ? (
          <StatusBadge color="green">{t("paid")}</StatusBadge>
        ) : (
          <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
        )
      ) : undefined,
    },
    {
      label: t("statAgreement"),
      value: t("statDaysLeft", { count: daysLeft }),
      note: activeBooking ? `${fmtDate(activeBooking.startDate)} - ${fmtDate(activeBooking.endDate)}` : "",
      icon: CalendarClock,
      tint: { card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" },
    },
    {
      label: t("statMessages"),
      value: String(totalUnread),
      note: totalUnread > 0 ? t("statNeedsReply") : t("statAllRead"),
      icon: MessageSquare,
      tint: {
        card: totalUnread > 0 ? "bg-[#FAEAE8]" : "bg-[#E9F4EC]",
        icon: totalUnread > 0 ? "bg-[#F3D7D3] text-[#9C3B32]" : "bg-[#CFE8D6] text-[#2F6B3C]",
      },
      badge: totalUnread > 0 ? <StatusBadge color="red">{t("statNeedsReply")}</StatusBadge> : undefined,
    },
  ];

  const quickActions = [
    { key: "qaBill", href: "/tenant/bills", icon: Receipt },
    { key: "qaComplaint", href: "/tenant/complaints", icon: AlertCircle },
    { key: "qaMessages", href: "#pesan", icon: MessageSquare },
  ] as const;

  return (
    <DashboardShell role="tenant">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-nk-text sm:text-3xl">
            {t("welcome", { name: tenantName.split(" ")[0] })}
          </h1>
          <p className="mt-1 text-sm text-nk-text-muted">
            {today.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {user && (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition hover:bg-nk-warm disabled:opacity-50 sm:self-auto"
            title={locale === "id" ? "Segarkan data dasbor" : "Refresh dashboard data"}
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>{locale === "id" ? "Perbarui" : "Refresh"}</span>
          </button>
        )}
      </div>

      {/* Error state */}
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
        <div className="flex flex-col gap-6 animate-pulse" aria-label="Loading dashboard">
          <div className="h-44 rounded-xl bg-nk-section" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-16 rounded-xl bg-nk-section" />
            <div className="h-16 rounded-xl bg-nk-section" />
            <div className="h-16 rounded-xl bg-nk-section" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-28 rounded-xl bg-nk-section" />
            <div className="h-28 rounded-xl bg-nk-section" />
            <div className="h-28 rounded-xl bg-nk-section" />
            <div className="h-28 rounded-xl bg-nk-section" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-96 rounded-xl bg-nk-section lg:col-span-2" />
            <div className="h-96 rounded-xl bg-nk-section" />
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
              ? "Silakan masuk dengan akun penyewa Anda untuk melihat informasi sewa, tagihan, dan pesan pemilik kos."
              : "Please sign in with your tenant account to access your active lease, bills, and owner messages."}
          </p>
          <Link
            href="/login?from=/tenant/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : !activeBooking ? (
        /* Empty State: No active booking */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-12 text-center shadow-sm">
          <CalendarClock className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h2 className="text-lg font-semibold text-nk-text">
            {locale === "id" ? "Belum Ada Sewa Aktif" : "No Active Rental"}
          </h2>
          <p className="mt-1 text-sm text-nk-text-muted max-w-md mx-auto">
            {locale === "id"
              ? "Anda belum memiliki sewa kost yang aktif saat ini. Jelajahi kost pilihan dan ajukan sewa sekarang."
              : "You do not have an active room rental at the moment. Explore available rooms and submit a booking."}
          </p>
          <Link
            href="/kost"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            {locale === "id" ? "Jelajahi Kost" : "Explore Rooms"}
          </Link>
        </div>
      ) : (
        /* Authenticated & Active Lease View */
        <>
          {/* Active room card */}
          <section className="mb-6 flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E9F4EC]">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("myRoom")}</h2>
              <StatusBadge color="green">{t("activeLease")}</StatusBadge>
            </div>
            <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
              <Image
                src={getKosImage(propertySlug || "default", "main")}
                alt={propertyName}
                width={96}
                height={96}
                className="size-24 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-nk-text">{propertyName}</p>
                <p className="mt-0.5 text-xs text-nk-text-muted">
                  {propertyAddress} · {t("roomLabel")} {roomNumber}
                </p>
                <p className="mt-2 text-sm text-nk-text">
                  {t("statRent")}:{" "}
                  <span className="font-semibold tabular-nums">{formatIDR(monthlyRent)}</span>
                  <span className="text-nk-text-muted">{t("perMonth")}</span>
                </p>
              </div>
              <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 border-t border-nk-border pt-3 text-sm sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <dt className="text-nk-text-muted">{t("since")}</dt>
                <dd className="text-right font-medium tabular-nums text-nk-text">
                  {fmtDate(activeBooking.startDate)}
                </dd>
                <dt className="text-nk-text-muted">{t("agreement")}</dt>
                <dd className="text-right font-medium text-nk-text">
                  {fmtDate(activeBooking.startDate)} - {fmtDate(activeBooking.endDate)}
                </dd>
                <dt className="text-nk-text-muted">{t("statAgreement")}</dt>
                <dd className="text-right font-medium tabular-nums text-nk-text">
                  {t("statDaysLeft", { count: daysLeft })}
                </dd>
                <dt className="sr-only">{t("quickActions")}</dt>
              </dl>
              <div className="flex shrink-0 flex-row gap-2 border-t border-nk-border pt-3 sm:w-40 sm:flex-col sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <Link
                  href={propertySlug ? `/kost/${propertySlug}` : "/tenant/property"}
                  className="inline-flex items-center justify-center rounded-lg border border-nk-border bg-nk-surface px-3 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  {t("propertyDetail")}
                </Link>
                <Link
                  href="/tenant/room"
                  className="inline-flex items-center justify-center rounded-lg bg-nk-accent px-3 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  {t("roomDetail")}
                </Link>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <nav aria-label={t("quickActions")} className="mb-10 grid gap-4 sm:grid-cols-3">
            {quickActions.map((a) => (
              <Link
                key={a.key}
                href={a.href}
                className="flex items-center gap-3 rounded-xl bg-nk-section p-4 ring-1 ring-foreground/10 transition-colors hover:bg-nk-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                <a.icon className="size-5 shrink-0 text-nk-text-muted" aria-hidden="true" />
                <span className="text-sm font-medium text-nk-text">{t(a.key)}</span>
              </Link>
            ))}
          </nav>

          {/* Stat cards */}
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className={cn(
                  "flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10",
                  s.tint.card
                )}
              >
                <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{s.label}</p>
                <div className="flex flex-1 flex-col rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        s.tint.icon
                      )}
                    >
                      <s.icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-2xl font-semibold tracking-tight text-nk-text">
                        {s.value}
                      </p>
                      {s.badge ? (
                        <div className="mt-1">{s.badge}</div>
                      ) : (
                        s.note && (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="truncate text-xs text-nk-text-muted">{s.note}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column: Invoices + Chart */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <section id="tagihan" className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <h2 className="text-sm font-semibold text-nk-text">{t("invoiceTitle")}</h2>
                  <span className="text-xs text-nk-text-muted">
                    {t("paidCount", {
                      paid: invoices.filter(isInvoicePaid).length,
                      total: invoices.length,
                    })}
                  </span>
                </div>
                <div className="flex-1 overflow-hidden rounded-lg bg-nk-surface ring-1 ring-foreground/10">
                  <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                      <TableHeader>
                        <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                          <TableHead className="px-4 py-3 font-medium">{t("colPeriod")}</TableHead>
                          <TableHead className="px-4 py-3 font-medium">{t("colDue")}</TableHead>
                          <TableHead className="px-4 py-3 font-medium">{t("colAmount")}</TableHead>
                          <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="px-4 py-8 text-center text-nk-text-muted">
                              {locale === "id" ? "Belum ada riwayat tagihan." : "No invoices found."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoices.map((inv) => {
                            const paid = isInvoicePaid(inv);
                            const periodLabel = inv.periodStart && inv.periodEnd
                              ? `${fmtDate(inv.periodStart)} - ${fmtDate(inv.periodEnd)}`
                              : fmtDate(inv.dueDate);
                            return (
                              <TableRow key={inv.id} className="border-b border-nk-border last:border-b-0">
                                <TableCell className="px-4 py-3">
                                  <p className="font-medium text-nk-text">{periodLabel}</p>
                                  <p className="font-mono text-xs text-nk-text-muted">{inv.invoiceNumber || inv.id}</p>
                                </TableCell>
                                <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text-muted">
                                  {fmtDate(inv.dueDate)}
                                </TableCell>
                                <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">
                                  {formatIDR(inv.amount)}
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  {paid ? (
                                    <span className="flex items-center gap-1.5">
                                      <StatusBadge color="green">{t("paid")}</StatusBadge>
                                      {inv.paidAt && (
                                        <span className="hidden text-xs text-nk-text-muted sm:inline">
                                          {fmtDate(inv.paidAt)}
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </section>

              {/* Monthly rent chart */}
              <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
                <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("chartTitle")}</h2>
                <div className="flex-1 rounded-lg bg-nk-surface p-6 ring-1 ring-foreground/10">
                  <p className="text-2xl font-semibold tracking-tight text-nk-text">
                    {formatIDR(monthlyRent)}
                    <span className="ml-1 text-sm font-normal text-nk-text-muted">{t("perMonth")}</span>
                  </p>
                  <p className="mt-1 text-sm text-nk-text-muted">
                    {locale === "id" ? "Sesuai tarif sewa aktif" : "Based on current active lease"}
                  </p>
                  <ChartContainer config={chartConfig} className="mt-6 h-44 w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 8, left: 0, right: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={10}
                        interval={0}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value) => (
                              <span className="font-mono text-[10px] tabular-nums text-nk-text-muted">
                                {formatIDR(Number(value) || 0)}
                              </span>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </section>
            </div>

            {/* Right column: Messages + Facilities + Agreements */}
            <div className="flex flex-col gap-6">
              {/* Owner messages */}
              <aside id="pesan" className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <h2 className="text-sm font-semibold text-nk-text">{t("messagesTitle")}</h2>
                  {totalUnread > 0 && <StatusBadge color="red">{totalUnread}</StatusBadge>}
                </div>
                <div className="flex flex-1 flex-col gap-3 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
                  {!activeConv || !activeConv.messages || activeConv.messages.length === 0 ? (
                    <p className="py-6 text-center text-xs text-nk-text-muted">
                      {locale === "id" ? "Belum ada pesan dengan pemilik." : "No messages with owner yet."}
                    </p>
                  ) : (
                    activeConv.messages.slice(-3).map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[85%] rounded-lg border border-nk-border p-3 text-sm",
                          m.from === "contact"
                            ? "self-end bg-nk-accent-subtle text-nk-text"
                            : "self-start bg-nk-section text-nk-text"
                        )}
                      >
                        <p className="text-xs text-nk-text-muted">
                          {m.from === "contact" ? t("you") : t("ownerSide")} · {fmtDate(m.at)}
                        </p>
                        <p className="mt-1">{m.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </aside>

              {/* Kos facilities */}
              <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
                <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("facilitiesTitle")}</h2>
                <div className="flex flex-wrap gap-2 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
                  {propertyDetail?.facilities && propertyDetail.facilities.length > 0 ? (
                    propertyDetail.facilities.map((f) => {
                      const facilityKey = f.key as keyof typeof FACILITY_META;
                      const label =
                        (locale === "id" ? f.nameId : f.nameEn) ||
                        (FACILITY_META[facilityKey]
                          ? locale === "id"
                            ? FACILITY_META[facilityKey].labelId
                            : FACILITY_META[facilityKey].labelEn
                          : f.key);
                      return (
                        <span
                          key={f.key}
                          className="flex items-center gap-1.5 rounded-md border border-nk-border bg-nk-section px-2.5 py-1 text-xs text-nk-text"
                        >
                          <FacilityIcon facility={f.key as Facility} />
                          {label}
                        </span>
                      );
                    })
                  ) : (
                    <p className="text-xs text-nk-text-muted">
                      {locale === "id" ? "Informasi fasilitas belum tersedia." : "Facilities info not available."}
                    </p>
                  )}
                </div>
              </section>

              {/* Agreement history */}
              <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
                <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("agreementsTitle")}</h2>
                <ol className="flex flex-1 flex-col rounded-lg bg-nk-surface px-5 ring-1 ring-foreground/10">
                  {agreements.length === 0 ? (
                    <li className="py-6 text-center text-xs text-nk-text-muted">
                      {locale === "id" ? "Belum ada riwayat sewa." : "No agreement history yet."}
                    </li>
                  ) : (
                    agreements.map((ra) => (
                      <li
                        key={ra.id}
                        className="flex items-center gap-3 border-b border-nk-border py-3 last:border-b-0"
                      >
                        {ra.isActive ? (
                          <CheckCircle2 className="size-4 shrink-0 text-[#2F6B3C]" aria-hidden="true" />
                        ) : (
                          <AlertCircle className="size-4 shrink-0 text-nk-text-muted" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-nk-text">{ra.period}</p>
                          <p className="text-xs text-nk-text-muted">
                            {ra.property} · {ra.room}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-nk-text">
                          {formatIDR(ra.rent)}
                        </p>
                      </li>
                    ))
                  )}
                </ol>
              </section>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  BedDouble,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Ellipsis,
  Plus,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
import { Progress } from "@/components/ui/progress";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import OwnerDashboardInsights from "@/components/OwnerDashboardInsights";
import { StatusBadge } from "@/components/StatusBadge";
import { getKosImage } from "@/lib/kosImages";
import {
  OWNER_PROFILE,
  ownerBookings,
  ownerReviews,
  roomUnits,
  tenants,
} from "@/lib/data/entities";
import { properties } from "@/lib/data/properties";
import { cn, formatIDR } from "@/lib/utils";
import { useSession } from "@/components/SessionProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REVENUE = [24.1, 26.8, 25.3, 28.9, 31.2, 33.7]; // juta Rp
const REVENUE_RANGES = {
  weekly: [14.2, 16.8, 15.1, 18.6, 17.3, 19.8, 21.4],
  monthly: REVENUE,
  yearly: [142.5, 168.2, 189.9, 214.6],
} as const;

type RevenueRange = keyof typeof REVENUE_RANGES;

const ACTIVITIES = {
  en: [
    { id: "a1", text: "Booking #BK-1234 approved", at: "2 hours ago", type: "approved" },
    { id: "a2", text: "Payment received from Citra Lestari Dewi", at: "3 hours ago", type: "payment" },
    { id: "a3", text: "Booking #BK-1231 submitted by Kevin Hanjaya", at: "5 hours ago", type: "booking" },
    { id: "a4", text: "Room A-104 status set to Maintenance", at: "Yesterday, 16:40", type: "maintenance" },
    { id: "a5", text: "Booking #BK-1155 expired", at: "Yesterday, 10:05", type: "expired" },
  ],
  id: [
    { id: "a1", text: "Booking #BK-1234 disetujui", at: "2 jam lalu", type: "approved" },
    { id: "a2", text: "Pembayaran diterima dari Citra Lestari Dewi", at: "3 jam lalu", type: "payment" },
    { id: "a3", text: "Booking #BK-1231 diajukan Kevin Hanjaya", at: "5 jam lalu", type: "booking" },
    { id: "a4", text: "Kamar A-104 diubah jadi Perawatan", at: "Kemarin, 16.40", type: "maintenance" },
    { id: "a5", text: "Booking #BK-1155 kedaluwarsa", at: "Kemarin, 10.05", type: "expired" },
  ],
} as const;

const ACTIVITY_ICONS = {
  approved: CheckCircle2,
  payment: CreditCard,
  booking: CalendarClock,
  maintenance: Wrench,
  expired: Clock,
};

const ACTIVITY_COLORS = {
  approved: "bg-emerald-100 text-emerald-700",
  payment: "bg-blue-100 text-blue-700",
  booking: "bg-amber-100 text-amber-700",
  maintenance: "bg-purple-100 text-purple-700",
  expired: "bg-gray-100 text-gray-700",
};

const SPARKS = {
  revenue: [19.2, 21.4, 20.1, 23.8, 22.6, 26.9, 29.4, 33.7],
  occupancy: [52, 55, 55, 58, 58, 55, 55, 55],
  arrears: [4.2, 3.9, 3.6, 3.4, 3.0, 2.9, 2.6, 2.5],
  bookings: [1, 2, 2, 3, 4, 4, 5, 5],
};

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function OwnerDashboardPage() {
  const t = useTranslations("owner");
  const router = useRouter();
  const locale = useLocale();
  const isEn = locale === "en";
  const { user, ready } = useSession();

  const [hasProperties, setHasProperties] = useState<boolean | null>(null);
  const [dbBookings, setDbBookings] = useState<any[] | null>(null);
  const [dynMetrics, setDynMetrics] = useState<{
    revenue: number;
    filled: number;
    totalRooms: number;
    arrears: number;
    arrearsSum: number;
    pendingCount: number;
  } | null>(null);

  const [range, setRange] = useState<RevenueRange>("monthly");

  useEffect(() => {
    let cancelled = false;
    async function checkProperties() {
      try {
        const [propRes, bookRes, invRes] = await Promise.all([
          fetch("/api/properties?mine=true"),
          fetch("/api/bookings"),
          fetch("/api/invoices"),
        ]);
        if (propRes.ok) {
          const propJson = await propRes.json();
          const props = Array.isArray(propJson.data) ? propJson.data : [];
          if (!cancelled) {
            if (user && props.length === 0) {
              setHasProperties(false);
              setDbBookings([]);
            } else {
              setHasProperties(true);
              const books = bookRes.ok ? (await bookRes.json())?.data || [] : [];
              setDbBookings(books);
              const invs = invRes.ok ? (await invRes.json())?.data || [] : [];

              let totalRoomsCalc = 0;
              for (const p of props) {
                if (Array.isArray(p.roomTypes)) {
                  for (const rt of p.roomTypes) {
                    totalRoomsCalc += rt.total || 0;
                  }
                }
              }

              const pendingCalc = books.filter((b: any) => b.status === "PENDING").length;
              const filledCalc = books.filter((b: any) => b.status === "ACTIVE").length;
              const paidInvs = invs.filter((i: any) => i.status === "PAID");
              const revenueCalc = paidInvs.reduce(
                (acc: number, i: any) => acc + Number(i.amount || i.amountSnapshot || 0),
                0
              );
              const unpaidInvs = invs.filter((i: any) => i.status !== "PAID");
              const arrearsSumCalc = unpaidInvs.reduce(
                (acc: number, i: any) => acc + Number(i.amount || i.amountSnapshot || 0),
                0
              );

              setDynMetrics({
                revenue: revenueCalc,
                filled: filledCalc,
                totalRooms: totalRoomsCalc,
                arrears: unpaidInvs.length,
                arrearsSum: arrearsSumCalc,
                pendingCount: pendingCalc,
              });
            }
          }
        }
      } catch {
        if (!cancelled && user) {
          setHasProperties(false);
          setDbBookings([]);
        }
      }
    }
    if (ready) {
      checkProperties();
    }
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const monthNames = t.raw("months") as string[];

  // Pending bookings
  const dbPending = (dbBookings || [])
    .filter((b: any) => b.status === "PENDING")
    .map((b: any) => ({
      id: b.id,
      code: b.code || b.id,
      applicantName: b.applicant?.fullName || "Pemohon",
      propertyName: b.property?.name || "Kost",
      roomType: b.roomType?.name || "Kamar",
      roomNumber: b.roomUnit?.number || "-",
      createdAt: b.createdAt,
      status: "pending" as const,
    }));
  const existingPendingIds = new Set(dbPending.map((p) => p.id));
  const pending = [
    ...dbPending,
    ...ownerBookings.filter((b) => b.status === "pending" && !existingPendingIds.has(b.id)),
  ];

  // Property room counts
  const allRooms = Object.values(roomUnits).flat();
  const filled = allRooms.filter((r) => r.status === "terisi").length;
  const totalRooms = allRooms.length;
  const arrears = tenants.filter((tn) => tn.paymentStatus === "menunggak").length;
  const arrearsSum = tenants
    .filter((tn) => tn.paymentStatus === "menunggak")
    .reduce((acc, tn) => acc + tn.monthlyRent, 0);

  const today = new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Property performance rows
  const ownerProps = properties.filter((p) =>
    [
      "kost-griya-cemara-dago",
      "kost-kenanga-setiabudi",
      "kost-al-amin-wonokromo",
      "kost-sara-theresa-cibubur",
      "kost-zinnia-cimahi",
    ].includes(p.slug)
  );
  const perfRows = ownerProps.map((p) => {
    const rooms = roomUnits[p.slug] ?? [];
    const occ = rooms.filter((r) => r.status === "terisi").length;
    const pct = rooms.length > 0 ? Math.round((occ / rooms.length) * 100) : 0;
    const monthly = tenants
      .filter((tn) => tn.propertySlug === p.slug)
      .reduce((sum, tn) => sum + tn.monthlyRent, 0);
    return { property: p, rooms: rooms.length, occ, pct, monthly };
  });

  const best = [...perfRows]
    .filter((r) => r.property.rating > 0)
    .sort((a, b) => b.monthly * b.pct - a.monthly * a.pct)[0];

  const rated = perfRows.filter((r) => r.property.rating > 0);
  const reviewTotal = rated.reduce((s, r) => s + r.property.reviewCount, 0);
  const reviewAvg =
    reviewTotal > 0
      ? rated.reduce((s, r) => s + r.property.rating * r.property.reviewCount, 0) / reviewTotal
      : 0;

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    weight: Math.max(0, Math.exp(-Math.abs(star - reviewAvg) * 1.1)),
  }));
  const distSum = dist.reduce((s, d) => s + d.weight, 0) || 1;

  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const exportCsv = () => {
    const header = ["ID", "Calon penyewa", "Properti", "Kamar", "Status", "Harga/bulan", "Diajukan"];
    const dbRows = (dbBookings || []).map((b: any) => [
      b.code || b.id,
      b.applicant?.fullName || b.applicantName || "-",
      b.property?.name || b.propertyName || "-",
      b.roomType?.name ? `${b.roomType.name} (${b.roomUnit?.number || "-"})` : `${b.roomType} (${b.roomNumber})`,
      b.status,
      String(b.monthlyPriceSnapshot ?? b.monthlyPrice ?? 0),
      b.createdAt,
    ]);
    const existingDbCodes = new Set((dbBookings || []).map((b: any) => b.code || b.id));
    const dummyRows = ownerBookings
      .filter((b) => !existingDbCodes.has(b.id))
      .map((b) => [
        b.id,
        b.applicantName,
        b.propertyName,
        `${b.roomType} (${b.roomNumber})`,
        b.status,
        String(b.monthlyPrice),
        b.createdAt,
      ]);
    const rows = [...dbRows, ...dummyRows];
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "booking-owner.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const revenue = REVENUE_RANGES[range];
  const revenueTotal = revenue.reduce((a, v) => a + v, 0);
  const chartLabels =
    range === "weekly"
      ? (t.raw("days") as string[])
      : range === "yearly"
        ? (t.raw("years") as string[])
        : monthNames;
  const chartData = chartLabels.map((label, i) => ({ label, value: revenue[i] }));
  const chartConfig = {
    value: { label: t("chartSeries"), color: "var(--nk-accent)" },
  } satisfies ChartConfig;

  const displayRevenue = dynMetrics ? dynMetrics.revenue : 33700000;
  const displayFilled = dynMetrics ? dynMetrics.filled : filled;
  const displayTotalRooms = dynMetrics && dynMetrics.totalRooms > 0 ? dynMetrics.totalRooms : totalRooms;
  const displayArrears = dynMetrics ? dynMetrics.arrears : arrears;
  const displayArrearsSum = dynMetrics ? dynMetrics.arrearsSum : arrearsSum;
  const displayPending = dynMetrics ? dynMetrics.pendingCount : pending.length;
  const displayOccupancy = displayTotalRooms > 0 ? Math.round((displayFilled / displayTotalRooms) * 100) : 0;

  const stats = [
    {
      id: "stat-revenue",
      label: t("statRevenue"),
      value: formatIDR(displayRevenue),
      note: t("statRevenueChange"),
      up: true,
      icon: TrendingUp,
      iconColor: "bg-emerald-100 text-emerald-700",
      spark: SPARKS.revenue,
      sparkColor: "#2F6B3C",
    },
    {
      id: "stat-occupancy",
      label: t("statOccupancy"),
      value: `${displayOccupancy}%`,
      note: t("statOccupancyNote", { filled: displayFilled, total: displayTotalRooms }),
      icon: BedDouble,
      iconColor: "bg-blue-100 text-blue-700",
      spark: SPARKS.occupancy,
      sparkColor: "#33517C",
    },
    {
      id: "stat-bookings",
      label: t("statNewBookings"),
      value: String(displayPending),
      note: displayPending > 0 ? t("statNeedsResponse") : (isEn ? "No queue" : "Tidak ada antrean"),
      badge: displayPending > 0,
      icon: CalendarClock,
      iconColor: "bg-amber-100 text-amber-700",
      spark: SPARKS.bookings,
      sparkColor: "#D97706",
    },
    {
      id: "stat-arrears",
      label: t("statArrears"),
      value: formatIDR(displayArrearsSum),
      note: t("statArrearsNote", { count: displayArrears }),
      icon: AlertCircle,
      iconColor: "bg-rose-100 text-rose-700",
      spark: SPARKS.arrears,
      sparkColor: "#DC2626",
    },
  ];

  if (hasProperties === false) {
    const displayName = user?.name ? user.name.split(" ")[0] : "Pemilik Kos";
    return (
      <DashboardShell role="owner">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-nk-accent/10 text-nk-accent">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-nk-text sm:text-4xl">
            Hai, <span className="font-semibold">{displayName}</span>!
          </h1>
          <p className="mt-4 max-w-sm text-base text-nk-text-muted">
            {isEn
              ? "You don't have any listed properties yet. Add your first one to get started."
              : "Belum ada kos yang terdaftar. Tambahkan kos pertama untuk mulai."}
          </p>
          <div className="mt-8">
            <Link
              href="/owner/properties/new"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-nk-accent px-8 text-sm font-medium text-nk-text-inverse shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
            >
              {isEn ? "Add Property" : "Tambah Kos"}
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="owner">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nk-text sm:text-3xl">
            {t("welcome", { name: (user?.name || OWNER_PROFILE.name).split(" ")[0] })}
          </h1>
          <p className="mt-1 text-sm text-nk-text-muted">{today}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/owner/properties/new"
            className="flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-semibold text-nk-text-inverse shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            <span>{t("addProperty")}</span>
          </Link>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3.5 py-2 text-xs font-medium text-nk-text shadow-sm transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-nk-accent"
          >
            <Download className="size-4 text-nk-text-muted" aria-hidden="true" />
            <span>{t("exportCsv")}</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Stat Cards with integrated smooth sparklines */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.id}
            className="flex flex-col justify-between overflow-hidden rounded-xl border border-nk-border bg-nk-surface p-5 shadow-sm transition-shadow hover:shadow"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-nk-text-muted uppercase tracking-wider">
                  {s.label}
                </span>
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    s.iconColor
                  )}
                >
                  <s.icon className="size-4" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-nk-text tabular-nums">
                  {s.value}
                </p>
                {s.note && (
                  <div className="mt-1 flex items-center gap-1.5">
                    {s.badge ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                        {s.note}
                      </span>
                    ) : (
                      <span className="text-xs text-nk-text-muted">{s.note}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Subtle mini wave */}
            <div className="-mx-5 -mb-5 mt-4 h-10 overflow-hidden opacity-75">
              <ChartContainer
                config={{ v: { label: s.label, color: s.sparkColor } }}
                className="h-full w-full"
              >
                <AreaChart
                  data={s.spark.map((v, i) => ({ i, v }))}
                  margin={{ top: 2, left: 0, right: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.sparkColor} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={s.sparkColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={s.sparkColor}
                    strokeWidth={1.8}
                    fill={`url(#grad-${s.id})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Spotlight + Pending Bookings + Revenue Chart + Property Table */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Spotlight / Top Performer Property */}
          {best && (
            <div className="rounded-xl border border-nk-border bg-gradient-to-r from-nk-surface via-nk-section/30 to-nk-surface p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-nk-border shadow-sm">
                    <Image
                      src={getKosImage(best.property.slug || best.property.imageSeed, "main")}
                      alt={best.property.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <StarIcon className="size-3 text-amber-500 fill-amber-500" />
                        <span>{best.property.rating.toFixed(1)}</span>
                      </span>
                      <span className="text-xs font-semibold text-nk-accent">
                        🏆 {t("topPerformer")}
                      </span>
                    </div>
                    <Link
                      href={`/owner/properties/${best.property.slug}`}
                      className="mt-1 block text-base font-semibold text-nk-text hover:underline"
                    >
                      {best.property.name}
                    </Link>
                    <p className="text-xs text-nk-text-muted">
                      {best.property.city} · {t("statOccupancyNote", { filled: best.occ, total: best.rooms })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-nk-border/60 pt-3 sm:border-0 sm:pt-0 sm:text-right">
                  <div>
                    <p className="text-xs text-nk-text-muted">{isEn ? "Active Rent" : "Sewa Berjalan"}</p>
                    <p className="text-lg font-bold text-nk-text tabular-nums">
                      {formatIDR(best.monthly)}
                      <span className="text-xs font-normal text-nk-text-muted">{t("perMonth")}</span>
                    </p>
                  </div>
                  <Link
                    href={`/owner/properties/${best.property.slug}`}
                    className="ml-4 rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 shadow-sm"
                  >
                    {t("manageProperty")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Pending Bookings */}
          <div className="rounded-xl border border-nk-border bg-nk-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-nk-border p-5">
              <div>
                <h2 className="text-base font-semibold text-nk-text">{t("bookingPending")}</h2>
                <p className="text-xs text-nk-text-muted">
                  {isEn ? "Tenant applications requiring your action" : "Pengajuan sewa yang menunggu konfirmasi"}
                </p>
              </div>
              <Link
                href="/owner/bookings"
                className="text-xs font-medium text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
              >
                {t("seeAll")}
              </Link>
            </div>

            <div className="divide-y divide-nk-border">
              {pending.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-nk-warm/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-accent/15 text-xs font-bold text-nk-accent">
                      {b.applicantName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-nk-text">{b.applicantName}</p>
                      <p className="truncate text-xs text-nk-text-muted">
                        {b.propertyName} · {b.roomType} ({b.roomNumber})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-xs text-nk-text-muted">
                      {new Date(b.createdAt).toLocaleString(locale === "id" ? "id-ID" : "en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push("/owner/bookings")}
                        className="rounded-lg bg-[#2F6B3C] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 active:scale-95"
                      >
                        {t("approve")}
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push("/owner/bookings")}
                        className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 active:scale-95"
                      >
                        {t("reject")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {pending.length === 0 && (
                <p className="p-8 text-center text-sm text-nk-text-muted">{t("noPending")}</p>
              )}
            </div>
          </div>

          {/* Revenue Chart with Range Pills */}
          <div className="rounded-xl border border-nk-border bg-nk-surface p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-nk-border pb-5">
              <div>
                <h2 className="text-base font-semibold text-nk-text">{t("chartTitle")}</h2>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-nk-text tabular-nums">
                    {formatIDR(revenueTotal * 1_000_000)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                    {t(`chartTrend${range.charAt(0).toUpperCase()}${range.slice(1)}`)}
                  </span>
                  <span className="text-xs text-nk-text-muted">
                    {t(`chartCompare${range.charAt(0).toUpperCase()}${range.slice(1)}`)}
                  </span>
                </div>
              </div>

              {/* Segmented Control Range */}
              <div className="flex rounded-lg border border-nk-border bg-nk-section/60 p-1 text-xs">
                {(["weekly", "monthly", "yearly"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-md px-3 py-1.5 font-medium transition-all",
                      range === r
                        ? "bg-nk-surface text-nk-text shadow-sm"
                        : "text-nk-text-muted hover:text-nk-text"
                    )}
                  >
                    {t(`range${r.charAt(0).toUpperCase()}${r.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>

            <ChartContainer config={chartConfig} className="mt-6 h-48 w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  interval={0}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value) => (
                        <span className="font-semibold text-xs tabular-nums text-nk-text">
                          Rp {(Number(value) * 1_000_000).toLocaleString("id-ID")}
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="value" fill="#2F6B3C" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Properties Performance Table */}
          <div className="rounded-xl border border-nk-border bg-nk-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-nk-border p-5">
              <div>
                <h2 className="text-base font-semibold text-nk-text">{t("perfTitle")}</h2>
                <p className="text-xs text-nk-text-muted">
                  {isEn ? "Occupancy and rent status across all properties" : "Okupansi dan status sewa properti aktif Anda"}
                </p>
              </div>
              <Link
                href="/owner/properties"
                className="text-xs font-medium text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
              >
                {t("seeAll")}
              </Link>
            </div>

            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                    <TableHead className="px-5 py-3 font-semibold">{t("perfColProperty")}</TableHead>
                    <TableHead className="px-4 py-3 font-semibold">{t("perfColTenants")}</TableHead>
                    <TableHead className="px-4 py-3 font-semibold">{t("perfColOccupancy")}</TableHead>
                    <TableHead className="px-4 py-3 font-semibold">{t("perfColRevenue")}</TableHead>
                    <TableHead className="px-4 py-3 font-semibold">{t("perfColRating")}</TableHead>
                    <TableHead className="w-10 px-2 py-3 text-right">
                      <span className="sr-only">{t("perfColAction")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfRows.map((r) => {
                    const tenantCount = tenants.filter(
                      (tn) => tn.propertySlug === r.property.slug
                    ).length;
                    return (
                      <TableRow
                        key={r.property.slug}
                        className="border-b border-nk-border transition-colors hover:bg-nk-warm/30 last:border-b-0"
                      >
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-nk-border">
                              <Image
                                src={getKosImage(r.property.slug || r.property.imageSeed, "main")}
                                alt={r.property.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/owner/properties/${r.property.slug}`}
                                className="block truncate font-semibold text-nk-text hover:underline text-xs"
                              >
                                {r.property.name}
                              </Link>
                              <p className="truncate text-[11px] text-nk-text-muted">
                                {r.property.city}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 tabular-nums text-xs text-nk-text">
                          {tenantCount}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          {r.rooms > 0 ? (
                            <div className="flex min-w-28 items-center gap-2">
                              <Progress value={r.pct} className="h-1.5 w-20 bg-nk-border [&>div]:bg-[#2F6B3C]" />
                              <span className="text-xs font-semibold tabular-nums text-nk-text">
                                {r.pct}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-nk-text-muted">{t("perfNoRooms")}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold tabular-nums text-nk-text">
                          {r.monthly > 0 ? `${formatIDR(r.monthly)}${t("perMonth")}` : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3.5">
                          {r.property.rating > 0 ? (
                            <span className="flex items-center gap-1 whitespace-nowrap text-xs tabular-nums text-nk-text font-medium">
                              <StarIcon className="size-3.5 text-amber-500 fill-amber-500" />
                              <span>{r.property.rating.toFixed(1)}</span>
                              <span className="text-[11px] text-nk-text-muted">
                                ({r.property.reviewCount})
                              </span>
                            </span>
                          ) : (
                            <StatusBadge color="gray">{t("perfNoRating")}</StatusBadge>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={t("perfColAction")}
                              className="flex size-7 items-center justify-center rounded-lg text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text focus-visible:outline-2 focus-visible:outline-nk-accent"
                            >
                              <Ellipsis className="size-4" aria-hidden="true" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/owner/properties/${r.property.slug}`)}
                              >
                                {t("perfViewDetail")}
                              </DropdownMenuItem>
                              {r.property.verified && (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/kost/${r.property.slug}`)}
                                >
                                  {t("perfViewPublic")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => router.push("/owner/bookings")}>
                                {t("perfManageBookings")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Reviews + Recent Activity */}
        <div className="flex flex-col gap-6">
          {/* Tenant Reviews */}
          <div className="rounded-xl border border-nk-border bg-nk-surface shadow-sm">
            <div className="border-b border-nk-border p-5">
              <h2 className="text-base font-semibold text-nk-text">{t("reviewsTitle")}</h2>
              <p className="text-xs text-nk-text-muted">
                {t("reviewsCount", { count: reviewTotal, properties: rated.length })}
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-5 border-b border-nk-border pb-5">
                <div className="text-center">
                  <p className="text-3xl font-extrabold text-nk-text tabular-nums">
                    {reviewAvg.toFixed(1)}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon
                        key={i}
                        className={cn(
                          "size-3.5 fill-amber-500",
                          i <= Math.round(reviewAvg)
                            ? "text-amber-500"
                            : "text-nk-border fill-nk-border"
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-nk-text-muted">
                    {reviewTotal} {isEn ? "reviews" : "ulasan"}
                  </p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {dist.map((d) => {
                    const count = Math.round((reviewTotal * d.weight) / distSum);
                    const pct = Math.round((d.weight / distSum) * 100);
                    return (
                      <div key={d.star} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-right font-medium text-nk-text-muted">
                          {d.star}
                        </span>
                        <Progress
                          value={pct}
                          className="h-1.5 flex-1 bg-nk-border [&>div]:bg-amber-400"
                        />
                        <span className="w-6 text-right text-[11px] text-nk-text-muted tabular-nums">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Cards */}
              <div className="mt-4 space-y-3">
                {ownerReviews.slice(0, 2).map((rv) => (
                  <div
                    key={rv.id}
                    className="rounded-lg border border-nk-border bg-nk-section/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-nk-text">{rv.authorName}</p>
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: rv.rating }).map((_, i) => (
                          <StarIcon key={i} className="size-3 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-nk-text-muted leading-relaxed">
                      {locale === "id" ? rv.bodyId : rv.bodyEn}
                    </p>
                    <p className="mt-1 text-[10px] text-nk-text-muted">{fmtDate(rv.at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="rounded-xl border border-nk-border bg-nk-surface shadow-sm">
            <div className="border-b border-nk-border p-5">
              <h2 className="text-base font-semibold text-nk-text">{t("activity")}</h2>
              <p className="text-xs text-nk-text-muted">
                {isEn ? "Latest platform and tenant actions" : "Pemberitahuan dan transaksi terbaru"}
              </p>
            </div>

            <div className="space-y-4 p-5">
              {ACTIVITIES[isEn ? "en" : "id"].map((a) => {
                const IconComponent =
                  ACTIVITY_ICONS[a.type as keyof typeof ACTIVITY_ICONS] || CalendarClock;
                const colorClass =
                  ACTIVITY_COLORS[a.type as keyof typeof ACTIVITY_COLORS] || "bg-nk-warm text-nk-text";
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs",
                        colorClass
                      )}
                    >
                      <IconComponent className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-nk-text leading-snug">{a.text}</p>
                      <p className="mt-0.5 text-[11px] text-nk-text-muted">{a.at}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Operations & Room Insights Component */}
      <OwnerDashboardInsights
        pendingBookingsCount={
          (dynMetrics?.pendingCount || 0) +
          ownerBookings.filter((b) => b.status === "pending").length
        }
      />
    </DashboardShell>
  );
}

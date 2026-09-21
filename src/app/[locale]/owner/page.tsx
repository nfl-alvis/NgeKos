"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import {
  AlertCircle,
  BedDouble,
  CalendarClock,
  ChevronDown,
  Download,
  Ellipsis,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
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

const REVENUE = [24.1, 26.8, 25.3, 28.9, 31.2, 33.7]; // juta Rp
// Pendapatan per range (juta Rp)
const REVENUE_RANGES = {
  weekly: [14.2, 16.8, 15.1, 18.6, 17.3, 19.8, 21.4],
  monthly: REVENUE,
  yearly: [142.5, 168.2, 189.9, 214.6],
} as const;

type RevenueRange = keyof typeof REVENUE_RANGES;
const ACTIVITIES = [
  { id: "a1", text: "Booking #BK-1234 disetujui", at: "2 jam lalu" },
  { id: "a2", text: "Pembayaran diterima dari Citra Lestari Dewi", at: "3 jam lalu" },
  { id: "a3", text: "Booking #BK-1231 diajukan Kevin Hanjaya", at: "5 jam lalu" },
  { id: "a4", text: "Kamar A-104 diubah jadi Maintenance", at: "Kemarin, 16.40" },
  { id: "a5", text: "Booking #BK-1155 kedaluwarsa", at: "Kemarin, 10.05" },
];

type StatIcon = React.ComponentType<{ className?: string }>;

type Stat = {
  label: string;
  value: string;
  note: string;
  up?: boolean;
  badge?: boolean;
  icon: StatIcon;
  tint: { card: string; icon: string };
  /** sparkline mini ala kartu MRR di referensi shadcnuikit */
  spark: number[];
  sparkColor: string;
};

// sparkline demo - pola 8 titik terakhir dari tren dataset
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
              const revenueCalc = paidInvs.reduce((acc: number, i: any) => acc + Number(i.amount || i.amountSnapshot || 0), 0);
              const unpaidInvs = invs.filter((i: any) => i.status !== "PAID");
              const arrearsSumCalc = unpaidInvs.reduce((acc: number, i: any) => acc + Number(i.amount || i.amountSnapshot || 0), 0);

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
  const allRooms = Object.values(roomUnits).flat();
  const filled = allRooms.filter((r) => r.status === "terisi").length;
  const totalRooms = allRooms.length;
  const arrears = tenants.filter((tn) => tn.paymentStatus === "menunggak").length;
  const arrearsSum = tenants
    .filter((tn) => tn.paymentStatus === "menunggak")
    .reduce((acc, tn) => acc + tn.monthlyRent, 0);

  const today = new Date("2026-09-03").toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ===== data turunan properti (performa, spotlight, ulasan) =====
  const ownerProps = properties.filter((p) =>
    ["kost-griya-cemara-dago", "kost-kenanga-setiabudi", "kost-al-amin-wonokromo", "kost-sara-theresa-cibubur", "kost-zinnia-cimahi"].includes(p.slug)
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
  // distribusi bintang demo - dihitung deterministik dari rata-rata rating
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

  const exportBtn =
    "flex items-center gap-1.5 rounded-md bg-nk-surface px-3 py-1.5 text-sm text-nk-text ring-1 ring-foreground/10 transition-colors hover:bg-nk-accent-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent";

  const [range, setRange] = useState<RevenueRange>("monthly");
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
    value: { label: t("chartSeries"), color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const displayRevenue = dynMetrics ? dynMetrics.revenue : 33700000;
  const displayFilled = dynMetrics ? dynMetrics.filled : filled;
  const displayTotalRooms = dynMetrics && dynMetrics.totalRooms > 0 ? dynMetrics.totalRooms : totalRooms;
  const displayArrears = dynMetrics ? dynMetrics.arrears : arrears;
  const displayArrearsSum = dynMetrics ? dynMetrics.arrearsSum : arrearsSum;
  const displayPending = dynMetrics ? dynMetrics.pendingCount : pending.length;
  const displayOccupancy = displayTotalRooms > 0 ? Math.round((displayFilled / displayTotalRooms) * 100) : 0;

  // Band judul tinted di atas card putih - tidak membungkus isi card.
  const stats: Stat[] = [
    {
      label: t("statRevenue"),
      value: formatIDR(displayRevenue),
      note: t("statRevenueChange"),
      up: true,
      icon: TrendingUp,
      tint: {
        card: "bg-[#E9F4EC]",
        icon: "bg-[#CFE8D6] text-[#2F6B3C]",
      },
      spark: SPARKS.revenue,
      sparkColor: "var(--chart-3)",
    },
    {
      label: t("statOccupancy"),
      value: `${displayOccupancy}%`,
      note: t("statOccupancyNote", { filled: displayFilled, total: displayTotalRooms }),
      icon: BedDouble,
      tint: {
        card: "bg-[#E8EFF8]",
        icon: "bg-[#D3E0F0] text-[#33517C]",
      },
      spark: SPARKS.occupancy,
      sparkColor: "var(--chart-4)",
    },
    {
      label: t("statArrears"),
      value: formatIDR(displayArrearsSum),
      note: t("statArrearsNote", { count: displayArrears }),
      icon: AlertCircle,
      tint: {
        card: "bg-[#FAEAE8]",
        icon: "bg-[#F3D7D3] text-[#9C3B32]",
      },
      spark: SPARKS.arrears,
      sparkColor: "var(--chart-5)",
    },
    {
      label: t("statNewBookings"),
      value: String(displayPending),
      note: displayPending > 0 ? t("statNeedsResponse") : "",
      badge: displayPending > 0,
      icon: CalendarClock,
      tint: {
        card: "bg-[#FBF3DC]",
        icon: "bg-[#F3E3B8] text-[#8A6A1F]",
      },
      spark: SPARKS.bookings,
      sparkColor: "var(--chart-2)",
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
          <p className="mt-4 max-w-md text-base leading-relaxed text-nk-text-muted">
            Selamat datang di NgeKost! Anda belum memiliki properti kos yang didaftarkan. Ayo mulai daftarkan iklan kos pertama Anda sekarang untuk mulai menjangkau calon penyewa.
          </p>
          <div className="mt-8">
            <Link
              href="/owner/properties/new"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-nk-accent px-8 text-sm font-medium text-nk-text-inverse shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
            >
              Buat Iklan Kos Pertama Anda
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="owner">
      {/* header - judul + tanggal kiri, ekspor kanan (ala baris tanggal+Download di referensi) */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight text-nk-text sm:text-3xl">
            {t("welcome", { name: OWNER_PROFILE.name.split(" ")[0] })}
          </h1>
          <p className="text-sm text-nk-text-muted">{today}</p>
        </div>
        <button type="button" onClick={exportCsv} className={exportBtn}>
          <Download className="size-4 text-nk-text-muted" aria-hidden="true" />
          {t("exportCsv")}
        </button>
      </div>

      {/* stat cards - band judul tinted di atas, card putih menyatu di bawah */}
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
                  {(s.badge || s.note) && (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {s.badge && <StatusBadge color="yellow">{s.note}</StatusBadge>}
                      {!s.badge && s.note && (
                        <>
                          {s.up !== undefined && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={s.up ? "text-[#2F6B3C]" : "text-[#9C3B32]"}
                              style={{ transform: s.up ? "none" : "rotate(180deg)" }}
                              aria-hidden="true"
                            >
                              <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                          )}
                          <span className="truncate text-xs text-nk-text-muted">{s.note}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* sparkline mini ala kartu MRR referensi */}
              <ChartContainer
                config={{ v: { label: s.label, color: s.sparkColor } } satisfies ChartConfig}
                className="mt-3 h-10 w-full"
                aria-hidden="true"
              >
                <AreaChart data={s.spark.map((v, i) => ({ i, v }))} margin={{ top: 2, left: 0, right: 0, bottom: 0 }}>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={s.sparkColor}
                    strokeWidth={1.5}
                    fill={s.sparkColor}
                    fillOpacity={0.12}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* kolom kiri: spotlight + booking pending + chart */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* kartu spotlight - padanan "Best seller of the month" di referensi */}
          {best && (
            <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#FBF3DC]">
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <h2 className="text-sm font-semibold text-nk-text">{t("topPerformer")}</h2>
                <span className="flex items-center gap-1 text-xs font-medium text-[#8A6A1F]">
                  <StarIcon className="text-nk-star" />
                  {best.property.rating.toFixed(1)}
                </span>
              </div>
              <div className="flex flex-1 items-center gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
                <Image
                  src={getKosImage(best.property.slug || best.property.imageSeed, "main")}
                  alt=""
                  width={96}
                  height={96}
                  className="hidden size-24 shrink-0 rounded-lg object-cover sm:block"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-nk-text">{best.property.name}</p>
                  <p className="mt-0.5 truncate text-xs text-nk-text-muted">
                    {best.property.city} · {t("statOccupancyNote", { filled: best.occ, total: best.rooms })}
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {formatIDR(best.monthly)}
                    <span className="ml-1 text-xs font-normal text-nk-text-muted">{t("perMonth")}</span>
                  </p>
                </div>
                <Link
                  href={`/owner/properties/${best.property.slug}`}
                  className="hidden shrink-0 rounded-md bg-nk-accent px-3.5 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent sm:block"
                >
                  {t("manageProperty")}
                </Link>
              </div>
            </section>
          )}

          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("bookingPending")}</h2>
              <Link
                href="/owner/bookings"
                className="rounded-sm text-sm text-nk-text underline underline-offset-4 transition-colors hover:text-nk-text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nk-accent"
              >
                {t("seeAll")}
              </Link>
            </div>
            <div className="flex flex-1 flex-col divide-y divide-nk-border rounded-lg bg-nk-surface ring-1 ring-foreground/10">
              {pending.slice(0, 5).map((b) => (
                <div key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nk-text">{b.applicantName}</p>
                    <p className="truncate text-xs text-nk-text-muted">
                      {b.propertyName} · {b.roomType} ({b.roomNumber})
                    </p>
                  </div>
                  <p className="text-xs text-nk-text-muted">
                    {new Date(b.createdAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {/* tombol SELALU aktif */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/owner/bookings")}
                      className="rounded-md bg-[#2F6B3C] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
                    >
                      {t("approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/owner/bookings")}
                      className="rounded-md border border-[#EBC4C0] px-3 py-1.5 text-xs font-medium text-[#9C3B32] transition-colors hover:bg-[#FAEAE8] active:scale-[0.98]"
                    >
                      {t("reject")}
                    </button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && (
                <p className="p-5 text-sm text-nk-text-muted">{t("noPending")}</p>
              )}
            </div>
          </section>

          {/* revenue stat - pola Revenue Stat hotel dashboard: band judul + dropdown, total + trend, bar chart */}
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("chartTitle")}</h2>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-1.5 rounded-md bg-nk-surface px-3 py-1.5 text-sm text-nk-text ring-1 ring-foreground/10 transition-colors hover:bg-nk-accent-subtle focus:outline-none"
                  aria-label={t("chartTitle")}
                >
                  {t(`range${range.charAt(0).toUpperCase()}${range.slice(1)}`)}
                  <ChevronDown className="size-3.5 text-nk-text-muted" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={range} onValueChange={(v) => setRange(v as RevenueRange)}>
                    <DropdownMenuRadioItem value="weekly">{t("rangeWeekly")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="monthly">{t("rangeMonthly")}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="yearly">{t("rangeYearly")}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex-1 rounded-lg bg-nk-surface p-6 ring-1 ring-foreground/10">
              <p className="text-2xl font-semibold tracking-tight text-nk-text">
                {formatIDR(revenueTotal * 1_000_000)}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium text-[#2F6B3C]">
                  {t(`chartTrend${range.charAt(0).toUpperCase()}${range.slice(1)}`)}
                </span>{" "}
                <span className="text-nk-text-muted">
                  {t(`chartCompare${range.charAt(0).toUpperCase()}${range.slice(1)}`)}
                </span>
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
                            {(Number(value) || 0).toFixed(1)} jt
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

        {/* sidebar kanan: ulasan + aktivitas */}
        <div className="flex flex-col gap-6">
          {/* widget ulasan - padanan "Customer Reviews" di referensi */}
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("reviewsTitle")}</h2>
            <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              <div className="flex items-center gap-4">
                <div className="shrink-0 text-center">
                  <p className="text-3xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {reviewAvg.toFixed(1)}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-0.5 text-nk-star">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon key={i} className={i <= Math.round(reviewAvg) ? "" : "opacity-25"} />
                    ))}
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-1">
                  {dist.map((d) => {
                    const count = Math.round((reviewTotal * d.weight) / distSum);
                    const pct = Math.round((d.weight / distSum) * 100);
                    return (
                      <li key={d.star} className="flex items-center gap-2 text-xs text-nk-text-muted">
                        <span className="flex w-6 shrink-0 items-center gap-0.5 tabular-nums">
                          {d.star}
                          <StarIcon className="size-2.5 text-nk-star" />
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-nk-border">
                          <span
                            className="block h-full rounded-full bg-nk-star"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="w-9 shrink-0 text-right font-medium tabular-nums text-nk-text">
                          {count}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="text-xs text-nk-text-muted">
                {t("reviewsCount", { count: reviewTotal, properties: rated.length })}
              </p>
              <ul className="space-y-3 border-t border-nk-border pt-3">
                {ownerReviews.map((rv) => (
                  <li key={rv.id} className="rounded-md bg-nk-section p-3 ring-1 ring-foreground/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-nk-text">{rv.authorName}</p>
                      <span className="flex shrink-0 items-center gap-0.5 text-nk-star">
                        {Array.from({ length: rv.rating }).map((_, i) => (
                          <StarIcon key={i} className="size-3" />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-nk-text-muted">
                      {locale === "id" ? rv.bodyId : rv.bodyEn}
                    </p>
                    <p className="mt-1 text-[10px] text-nk-text-muted">{fmtDate(rv.at)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* aktivitas */}
          <aside className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("activity")}</h2>
            <ol className="flex flex-1 flex-col rounded-lg bg-nk-surface px-5 ring-1 ring-foreground/10">
              {ACTIVITIES.map((a) => (
                <li key={a.id} className="border-b border-nk-border py-3 last:border-b-0">
                  <p className="text-sm text-nk-text">{a.text}</p>
                  <p className="mt-0.5 text-xs text-nk-text-muted">{a.at}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>

      {/* tabel performa properti - padanan "Recent Orders"/"Best Selling Products" di referensi */}
      <section className="mt-6 flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-3">
          <h2 className="text-sm font-semibold text-nk-text">{t("perfTitle")}</h2>
          <Link
            href="/owner/properties"
            className="rounded-sm text-sm text-nk-text underline underline-offset-4 transition-colors hover:text-nk-text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nk-accent"
          >
            {t("seeAll")}
          </Link>
        </div>
        <div className="flex-1 overflow-hidden rounded-lg bg-nk-surface ring-1 ring-foreground/10">
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                  <TableHead className="px-4 py-3 font-medium">{t("perfColProperty")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("perfColTenants")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("perfColOccupancy")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("perfColRevenue")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("perfColRating")}</TableHead>
                  <TableHead className="w-10 px-2 py-3">
                    <span className="sr-only">{t("perfColAction")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfRows.map((r) => {
                  const tenantCount = tenants.filter((tn) => tn.propertySlug === r.property.slug).length;
                  return (
                    <TableRow key={r.property.slug} className="border-b border-nk-border last:border-b-0">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Image
                            src={getKosImage(r.property.slug || r.property.imageSeed, "main")}
                            alt=""
                            width={32}
                            height={32}
                            className="size-8 shrink-0 rounded-md object-cover"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/owner/properties/${r.property.slug}`}
                              className="block truncate font-medium text-nk-text hover:underline"
                            >
                              {r.property.name}
                            </Link>
                            <p className="truncate text-xs text-nk-text-muted">{r.property.city}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 tabular-nums text-nk-text">{tenantCount}</TableCell>
                      <TableCell className="px-4 py-3">
                        {r.rooms > 0 ? (
                          <div className="flex min-w-28 items-center gap-2">
                            <Progress value={r.pct} className="h-1.5 w-20 bg-nk-border" />
                            <span className="text-xs tabular-nums text-nk-text-muted">{r.pct}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-nk-text-muted">{t("perfNoRooms")}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">
                        {r.monthly > 0 ? `${formatIDR(r.monthly)}${t("perMonth")}` : "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {r.property.rating > 0 ? (
                          <span className="flex items-center gap-1 whitespace-nowrap tabular-nums text-nk-text">
                            <StarIcon className="text-nk-star" />
                            {r.property.rating.toFixed(1)}
                            <span className="text-xs text-nk-text-muted">({r.property.reviewCount})</span>
                          </span>
                        ) : (
                          <StatusBadge color="gray">{t("perfNoRating")}</StatusBadge>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={t("perfColAction")}
                            className="flex size-8 items-center justify-center rounded-md text-nk-text-muted transition-colors hover:bg-nk-accent-subtle hover:text-nk-text focus-visible:outline-2 focus-visible:outline-nk-accent"
                          >
                            <Ellipsis className="size-4" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/owner/properties/${r.property.slug}`)}>
                              {t("perfViewDetail")}
                            </DropdownMenuItem>
                            {r.property.verified && (
                              <DropdownMenuItem onClick={() => router.push(`/kost/${r.property.slug}`)}>
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
      </section>

      <OwnerDashboardInsights
        pendingBookingsCount={
          (dynMetrics?.pendingCount || 0) + ownerBookings.filter((b) => b.status === "pending").length
        }
      />
    </DashboardShell>
  );
}

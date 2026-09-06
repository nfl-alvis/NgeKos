"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AlertCircle, BedDouble, CalendarClock, ChevronDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import OwnerDashboardInsights from "@/components/OwnerDashboardInsights";
import { StatusBadge } from "@/components/StatusBadge";
import { OWNER_PROFILE, ownerBookings, roomUnits, tenants } from "@/lib/data/entities";
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
};

export default function OwnerDashboardPage() {
  const t = useTranslations("owner");
  const router = useRouter();
  const monthNames = t.raw("months") as string[];

  const pending = ownerBookings.filter((b) => b.status === "pending");
  const filled = Object.values(roomUnits)
    .flat()
    .filter((r) => r.status === "terisi").length;
  const totalRooms = Object.values(roomUnits).flat().length;
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

  // Band judul tinted di atas card putih — tidak membungkus isi card.
  const stats: Stat[] = [
    {
      label: t("statRevenue"),
      value: formatIDR(33700000),
      note: t("statRevenueChange"),
      up: true,
      icon: TrendingUp,
      tint: {
        card: "bg-[#E9F4EC]",
        icon: "bg-[#CFE8D6] text-[#2F6B3C]",
      },
    },
    {
      label: t("statOccupancy"),
      value: `${Math.round((filled / totalRooms) * 100)}%`,
      note: t("statOccupancyNote", { filled, total: totalRooms }),
      icon: BedDouble,
      tint: {
        card: "bg-[#E8EFF8]",
        icon: "bg-[#D3E0F0] text-[#33517C]",
      },
    },
    {
      label: t("statArrears"),
      value: formatIDR(arrearsSum),
      note: t("statArrearsNote", { count: arrears }),
      icon: AlertCircle,
      tint: {
        card: "bg-[#FAEAE8]",
        icon: "bg-[#F3D7D3] text-[#9C3B32]",
      },
    },
    {
      label: t("statNewBookings"),
      value: String(pending.length),
      note: pending.length > 0 ? t("statNeedsResponse") : "",
      badge: pending.length > 0,
      icon: CalendarClock,
      tint: {
        card: "bg-[#FBF3DC]",
        icon: "bg-[#F3E3B8] text-[#8A6A1F]",
      },
    },
  ];

  return (
    <DashboardShell role="owner">
      {/* header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-medium tracking-tight text-nk-text sm:text-3xl">
          {t("welcome", { name: OWNER_PROFILE.name.split(" ")[0] })}
        </h1>
        <p className="text-sm text-nk-text-muted">{today}</p>
      </div>

      {/* stat cards — band judul tinted di atas, card putih menyatu di bawah */}
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
            <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
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
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* kolom kiri: booking pending + chart */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("bookingPending")}</h2>
              <Link
                href="/owner/bookings"
                className="text-sm text-nk-text underline underline-offset-4 transition-colors hover:text-nk-text-muted"
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
            </div>
          </section>

          {/* revenue stat — pola Revenue Stat hotel dashboard: band judul + dropdown, total + trend, bar chart */}
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

        {/* sidebar kanan: aktivitas */}
        <aside className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section lg:order-last">
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
      <OwnerDashboardInsights />
    </DashboardShell>
  );
}

"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  CheckCircle2,
  DoorOpen,
  Flag,
  Hourglass,
  Star,
  TrendingUp,
  Undo2,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Link } from "@/i18n/navigation";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminPageShell, { AdminSection, AdminStat } from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";
import { formatIDR } from "@/lib/utils";
import { ageInDays, formatReviewDate, useAdminReviewData } from "@/lib/adminReviewStore";
import {
  monthlyRevenue,
  ownerAccounts,
  platformTransactions,
  refundRequests,
  seekerAccounts,
  userReports,
} from "@/lib/data/adminData";
import { roomUnits } from "@/lib/data/entities";
import { properties } from "@/lib/data/properties";

const chartConfig = {
  fee: { label: "Fee", color: "var(--chart-1)" },
} ;

const SPARKS = {
  revenue: [52, 58, 51, 62, 60, 68, 74, 72, 79, 84, 92, 98],
  bookings: [14, 18, 15, 22, 19, 24, 26, 23, 28, 31, 29, 34],
};

/** Sparkline mini di kartu statistik (pola dashboard owner). */
function Spark({ data, color }: { data: number[]; color: string }) {
  return (
    <ChartContainer config={chartConfig} className="mt-2 h-10 w-full">
      <AreaChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, left: 0, right: 0, bottom: 0 }}>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={color}
          fillOpacity={0.12}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tint,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: { card: string; icon: string };
  spark: number[];
  sparkColor: string;
}) {
  return (
    <div className={`flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 ${tint.card}`}>
      <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{label}</p>
      <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight text-nk-text tabular-nums">{value}</p>
            {note && <p className="mt-0.5 truncate text-xs text-nk-text-muted">{note}</p>}
          </div>
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tint.icon}`}>
            <Icon className="size-4" aria-hidden="true" />
          </div>
        </div>
        <Spark data={spark} color={sparkColor} />
      </div>
    </div>
  );
}

/** Ringkasan kondisi platform — beranda panel admin. */
export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tu = useTranslations("admin.units");
  const locale = useLocale();
  const { queue } = useAdminReviewData();

  const rooms = useMemo(() => Object.values(roomUnits).flat(), []);
  const occupancyPct = rooms.length
    ? Math.round((rooms.filter((r) => r.status === "terisi").length / rooms.length) * 100)
    : 0;
  const activeBookings = platformTransactions.filter((x) => x.status === "settlement").length;
  const refundsOpen = refundRequests.filter((r) => r.status === "diajukan").length;
  const reportsOpen = userReports.filter((r) => r.status === "baru").length;
  const pendingVerif = queue.length;
  const oldestWait = queue.length ? Math.max(...queue.map((p) => ageInDays(p.submittedAt))) : 0;

  const revenueMonth = monthlyRevenue[monthlyRevenue.length - 1];
  const feeMonth = monthlyRevenue.reduce((a, m) => a + m.fee, 0);
  const last6 = monthlyRevenue.slice(-6);
  const chartData = last6.map((m, i) => ({
    label: tu(`m${monthlyRevenue.length - 5 + i}`),
    fee: Math.round(m.fee / 100_000) / 10,
  }));

  const liveProps = properties.filter((p) => p.verificationStatus === "verified" && p.active);
  const topProps = [...liveProps]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 5)
    .map((p) => {
      const units = roomUnits[p.slug] ?? [];
      const filled = units.filter((u) => u.status === "terisi").length;
      return {
        p,
        pct: units.length ? Math.round((filled / units.length) * 100) : 0,
        tenants:
          ownerAccounts.length && seekerAccounts.length
            ? units.filter((u) => u.status === "terisi").length
            : 0,
      };
    });

  const quickActions = [
    { href: "/admin/verification", label: t("qaVerification"), count: pendingVerif, icon: CheckCircle2 },
    { href: "/admin/refunds", label: t("qaRefunds"), count: refundsOpen, icon: Undo2 },
    { href: "/admin/reports", label: t("qaReports"), count: reportsOpen, icon: Flag },
  ];

  return (
    <AdminPageShell title={t("title")}>
      {/* baris stat — band-card + sparkline, konsisten dgn dashboard owner */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("statRevenue")}
          value={formatIDR(revenueMonth.gross)}
          note={t("statRevenueNote", { fee: formatIDR(revenueMonth.fee) })}
          icon={TrendingUp}
          tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }}
          spark={SPARKS.revenue}
          sparkColor="var(--chart-3)"
        />
        <StatCard
          label={t("statBookings")}
          value={String(activeBookings + 41)}
          note={t("statBookingsNote")}
          icon={Building2}
          tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }}
          spark={SPARKS.bookings}
          sparkColor="var(--chart-4)"
        />
        <StatCard
          label={t("statOccupancy")}
          value={`${occupancyPct}%`}
          note={t("statOccupancyNote", { rooms: rooms.length })}
          icon={DoorOpen}
          tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }}
          spark={SPARKS.bookings.slice(2)}
          sparkColor="var(--chart-2)"
        />
        <StatCard
          label={t("statUsers")}
          value={String(ownerAccounts.length + seekerAccounts.length + 18_904)}
          note={t("statUsersNote", { owners: ownerAccounts.length, seekers: seekerAccounts.length })}
          icon={Users}
          tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text-muted" }}
          spark={SPARKS.revenue.slice(4)}
          sparkColor="var(--chart-1)"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* kolom kiri */}
        <div className="flex flex-col gap-6">
          {/* aksi prioritas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded-xl bg-nk-section p-4 ring-1 ring-foreground/10 transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nk-surface text-nk-accent ring-1 ring-foreground/10">
                  <a.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-nk-text">{a.label}</span>
                  <span className="block text-xs text-nk-text-muted">
                    {a.count > 0 ? t("qaOpen", { count: a.count }) : t("qaClear")}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {/* pendapatan & fee platform */}
          <AdminSection
            title={t("revenueTitle")}
            right={
              <span className="text-xs text-nk-text-muted tabular-nums">
                {t("feeYtd", { value: formatIDR(feeMonth) })}
              </span>
            }
            bodyClass="p-4 sm:p-6"
          >
            <p className="text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
              {formatIDR(revenueMonth.gross)}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-medium text-[#2F6B3C]">{t("revenueTrend")}</span>{" "}
              <span className="text-nk-text-muted">{t("revenueCompare")}</span>
            </p>
            <ChartContainer config={chartConfig} className="mt-6 h-44 w-full">
              <AreaChart data={chartData} margin={{ top: 8, left: 0, right: 0 }}>
                <defs>
                  <linearGradient id="adminFeeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-fee)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-fee)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} interval={0} />
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
                <Area
                  type="monotone"
                  dataKey="fee"
                  stroke="var(--color-fee)"
                  strokeWidth={2}
                  fill="url(#adminFeeFill)"
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          </AdminSection>

          {/* properti paling diminati */}
          <AdminSection title={t("topTitle")} bodyClass="overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                    <TableHead className="px-4 py-3 font-medium">{t("topColProperty")}</TableHead>
                    <TableHead className="px-4 py-3 font-medium">{t("topColRating")}</TableHead>
                    <TableHead className="px-4 py-3 font-medium">{t("topColOccupancy")}</TableHead>
                    <TableHead className="px-4 py-3 font-medium">{t("topColCity")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProps.map(({ p, pct }) => (
                    <TableRow key={p.slug} className="border-b border-nk-border last:border-b-0">
                      <TableCell className="px-4 py-3">
                        <Link
                          href={`/kost/${p.slug}`}
                          className="font-medium text-nk-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                        >
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="flex items-center gap-1 tabular-nums text-nk-text">
                          <Star className="size-3.5 fill-none text-nk-star" aria-hidden="true" strokeWidth={1.6} />
                          <span className="text-nk-star">{p.rating.toFixed(1)}</span>
                          <span className="text-xs text-nk-text-muted">({p.reviewCount})</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex min-w-28 items-center gap-2">
                          <Progress value={pct} className="h-1.5 w-20 bg-nk-border" />
                          <span className="text-xs tabular-nums text-nk-text-muted">{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-nk-text-muted">{p.city}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AdminSection>
        </div>

        {/* kolom kanan */}
        <div className="flex flex-col gap-6">
          {/* antrian verifikasi mendesak */}
          <AdminSection
            title={t("verifTitle")}
            right={
              <Link
                href="/admin/verification"
                className="text-xs text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("verifSeeAll")}
              </Link>
            }
            bodyClass="p-0"
          >
            {queue.length === 0 ? (
              <p className="p-5 text-sm text-nk-text-muted">{t("verifEmpty")}</p>
            ) : (
              queue.slice(0, 4).map((e) => {
                const days = ageInDays(e.submittedAt);
                return (
                  <div key={e.id} className="flex items-center gap-3 border-b border-nk-border px-4 py-3 last:border-b-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-nk-warm text-xs font-semibold text-nk-text-muted">
                      {e.ownerName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-nk-text">{e.propertyName}</p>
                      <p className="truncate text-xs text-nk-text-muted">
                        {e.ownerName} · {formatReviewDate(e.submittedAt, locale)}
                      </p>
                    </div>
                    <StatusBadge color={days >= 5 ? "red" : "yellow"}>
                      {tu("days", { count: days })}
                    </StatusBadge>
                  </div>
                );
              })
            )}
          </AdminSection>

          {/* transaksi terbaru */}
          <AdminSection
            title={t("txTitle")}
            right={
              <Link
                href="/admin/payments"
                className="text-xs text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("verifSeeAll")}
              </Link>
            }
            bodyClass="p-0"
          >
            {platformTransactions.slice(0, 5).map((x) => (
              <div key={x.id} className="flex items-center gap-3 border-b border-nk-border px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nk-text">{x.payer}</p>
                  <p className="truncate text-xs text-nk-text-muted">
                    {x.propertyName} · {formatReviewDate(x.at.slice(0, 10), locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums text-nk-text">{formatIDR(x.amount)}</p>
                  <TxStatusBadge status={x.status} />
                </div>
              </div>
            ))}
          </AdminSection>

          {/* kesehatan platform — umur antrian terlama */}
          <AdminStat
            label={t("oldestTitle")}
            value={pendingVerif ? tu("days", { count: oldestWait }) : "—"}
            note={pendingVerif ? t("oldestNote", { count: pendingVerif }) : t("verifEmpty")}
            icon={Hourglass}
            tint={{
              card: oldestWait >= 5 ? "bg-[#FAEAE8]" : "bg-[#E9F4EC]",
              icon: oldestWait >= 5 ? "bg-[#F3D7D3] text-[#9C3B32]" : "bg-[#CFE8D6] text-[#2F6B3C]",
            }}
          />
        </div>
      </div>
    </AdminPageShell>
  );
}

/** Badge status transaksi Midtrans (dipakai juga halaman Pembayaran). */
function TxStatusBadge({ status }: { status: string }) {
  const t = useTranslations("admin.payments");
  const map: Record<string, StatusColor> = {
    settlement: "green",
    pending: "yellow",
    expired: "gray",
    cancel: "gray",
    refund: "red",
  };
  return <StatusBadge color={map[status] ?? "gray"}>{t(`st${status.charAt(0).toUpperCase()}${status.slice(1)}`)}</StatusBadge>;
}

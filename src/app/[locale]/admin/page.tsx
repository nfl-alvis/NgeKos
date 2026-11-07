"use client";

import { useMemo, useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  DoorOpen,
  Flag,
  Star,
  TrendingUp,
  Undo2,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/components/SessionProvider";
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
import AdminPageShell, { AdminSection } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatIDR } from "@/lib/utils";

const chartConfig = {
  fee: { label: "Fee", color: "var(--chart-1)" },
};

const SPARKS = {
  revenue: [52, 58, 51, 62, 60, 68, 74, 72, 79, 84, 92, 98],
  bookings: [14, 18, 15, 22, 19, 24, 26, 23, 28, 31, 29, 34],
};

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

export default function AdminDashboardPage() {
  const t = useTranslations("admin.dashboard");
  const tu = useTranslations("admin.units");
  const locale = useLocale();
  const { user, login } = useSession();
  const [isSwitching, setIsSwitching] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const [uRes, pRes, bRes, vRes, rRes, tRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/properties"),
          fetch("/api/bookings"),
          fetch("/api/admin/verifications"),
          fetch("/api/reports?status=OPEN"),
          fetch("/api/admin/payments"),
        ]);

        if (!cancelled) {
          if (uRes.ok) {
            const j = await uRes.json();
            setUsers(Array.isArray(j.data) ? j.data : []);
          }
          if (pRes.ok) {
            const j = await pRes.json();
            setProperties(Array.isArray(j.data) ? j.data : []);
          }
          if (bRes.ok) {
            const j = await bRes.json();
            setBookings(Array.isArray(j.data) ? j.data : []);
          }
          if (vRes.ok) {
            const j = await vRes.json();
            setVerifications(Array.isArray(j.data) ? j.data : []);
          }
          if (rRes.ok) {
            const j = await rRes.json();
            setReports(Array.isArray(j.data) ? j.data : []);
          }
          if (tRes.ok) {
            const j = await tRes.json();
            setTransactions(Array.isArray(j.data) ? j.data : []);
          }
        }
      } catch {
        // Non-blocking
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const ownersCount = users.filter((u) => u.role === "OWNER").length;
  const seekersCount = users.filter((u) => u.role === "SEEKER").length;
  const activeBookingsCount = bookings.filter(
    (b) => b.status === "ACTIVE" || b.status === "APPROVED_AWAITING_PAYMENT"
  ).length;

  // Calculate rooms and occupancy
  const totalRooms = properties.reduce((acc, p) => {
    if (Array.isArray(p.roomTypes)) {
      return acc + p.roomTypes.reduce((s: number, rt: any) => s + (rt.total || rt.totalRooms || 1), 0);
    }
    return acc + 1;
  }, 0);

  const occupancyPct = totalRooms > 0 ? Math.min(100, Math.round((activeBookingsCount / totalRooms) * 100)) : 0;

  // Payments / Revenue
  const settledTxs = transactions.filter((t) => t.status === "settlement");
  const grossRevenue = settledTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalFee = settledTxs.reduce((sum, t) => sum + Number(t.fee || 0), 0);
  const refundsOpen = transactions.filter((t) => t.status === "refund").length;
  const reportsOpen = reports.length;
  const pendingVerif = verifications.length;

  const chartData = useMemo(() => {
    const months = [1, 2, 3, 4, 5, 6];
    return months.map((m, i) => {
      const share = totalFee > 0 ? (totalFee / 6) * (0.8 + i * 0.1) : (i + 1) * 350000;
      return {
        label: tu(`m${m}`),
        fee: Math.round(share / 100_000) / 10,
      };
    });
  }, [totalFee, tu]);

  const topProps = useMemo(() => {
    return [...properties]
      .sort((a, b) => Number(b.reviewCount || 0) - Number(a.reviewCount || 0))
      .slice(0, 5)
      .map((p) => {
        const pRooms = Array.isArray(p.roomTypes)
          ? p.roomTypes.reduce((s: number, rt: any) => s + (rt.total || 1), 0)
          : 5;
        const pOccupied = bookings.filter((b) => b.propertyId === p.id && b.status === "ACTIVE").length;
        const pct = pRooms > 0 ? Math.min(100, Math.round((pOccupied / pRooms) * 100)) : 0;
        return {
          p,
          pct,
        };
      });
  }, [properties, bookings]);

  const quickActions = [
    { href: "/admin/verification", label: t("qaVerification"), count: pendingVerif, icon: CheckCircle2 },
    { href: "/admin/refunds", label: t("qaRefunds"), count: refundsOpen, icon: Undo2 },
    { href: "/admin/reports", label: t("qaReports"), count: reportsOpen, icon: Flag },
  ];

  return (
    <AdminPageShell title={t("title")}>
      {/* Banner Deteksi Sesi Bukan Admin */}
      {(!user || user.role !== "admin") && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">
                  {user && user.role !== "admin"
                    ? `Perhatian: Anda sedang login sebagai ${user.role === "owner" ? "Pemilik Kos" : "Pengguna"} (${user.email || user.name})`
                    : "Memerlukan Hak Akses Admin"}
                </h3>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  Data statistik dan antrean verifikasi di Dashboard Admin hanya dapat diakses dengan akun <strong>Admin</strong>. Jika Anda ingin memeriksa permohonan verifikasi dari pemilik kos, silakan beralih ke akun Admin.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isSwitching}
              onClick={async () => {
                setIsSwitching(true);
                try {
                  await login("admin@ngekost.id", "Password123!", "admin");
                  window.location.reload();
                } catch {
                  setIsSwitching(false);
                }
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-900 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSwitching ? "Mengalihkan Sesi..." : "Masuk sebagai Admin Demo"}
            </button>
          </div>
        </div>
      )}

      {/* baris stat */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("statRevenue")}
          value={formatIDR(grossRevenue)}
          note={t("statRevenueNote", { fee: formatIDR(totalFee) })}
          icon={TrendingUp}
          tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }}
          spark={SPARKS.revenue}
          sparkColor="var(--chart-3)"
        />
        <StatCard
          label={t("statBookings")}
          value={String(activeBookingsCount)}
          note={t("statBookingsNote")}
          icon={Building2}
          tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }}
          spark={SPARKS.bookings}
          sparkColor="var(--chart-4)"
        />
        <StatCard
          label={t("statOccupancy")}
          value={`${occupancyPct}%`}
          note={t("statOccupancyNote", { rooms: totalRooms })}
          icon={DoorOpen}
          tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }}
          spark={SPARKS.bookings.slice(2)}
          sparkColor="var(--chart-2)"
        />
        <StatCard
          label={t("statUsers")}
          value={String(users.length)}
          note={t("statUsersNote", { owners: ownersCount, seekers: seekersCount })}
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
                {t("feeYtd", { value: formatIDR(totalFee) })}
              </span>
            }
            bodyClass="p-4 sm:p-6"
          >
            <p className="text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
              {formatIDR(grossRevenue)}
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
                    <TableRow key={p.id || p.slug} className="border-b border-nk-border last:border-b-0">
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
                          <span className="text-nk-star">{(Number(p.averageRating) || 0).toFixed(1)}</span>
                          <span className="text-xs text-nk-text-muted">({p.reviewCount || 0})</span>
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
                  {topProps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-nk-text-muted">
                        Belum ada properti terdaftar.
                      </TableCell>
                    </TableRow>
                  )}
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
            {verifications.length === 0 ? (
              <p className="p-5 text-sm text-nk-text-muted">{t("verifEmpty")}</p>
            ) : (
              verifications.slice(0, 4).map((e) => {
                const subDate = new Date(e.submittedAt);
                const days = Math.max(0, Math.floor((Date.now() - subDate.getTime()) / (1000 * 60 * 60 * 24)));
                const ownerName = e.property?.owner?.fullName || "Pemilik";
                const propName = e.property?.name || "Kost";
                return (
                  <div key={e.id} className="flex items-center gap-3 border-b border-nk-border px-4 py-3 last:border-b-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-nk-warm text-xs font-semibold text-nk-text-muted">
                      {ownerName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-nk-text">{propName}</p>
                      <p className="truncate text-xs text-nk-text-muted">
                        {ownerName} · {subDate.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short" })}
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
        </div>
      </div>
    </AdminPageShell>
  );
}

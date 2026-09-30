"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarClock,
  Download,
  Ellipsis,
  MessageSquare,
  Plus,
  TrendingUp,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/components/SessionProvider";
import { getKosImage } from "@/lib/kosImages";
import {
  OWNER_PROFILE,
  ownerBookings,
  roomUnits,
  tenants,
  invoices,
} from "@/lib/data/entities";
import { properties } from "@/lib/data/properties";
import { cn, formatIDR } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  // Bookings pending
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

  // Room status counts
  const allRooms = Object.values(roomUnits).flat();
  const filledRooms = allRooms.filter((r) => r.status === "terisi").length;
  const emptyRooms = allRooms.filter((r) => r.status === "kosong").length;
  const repairRooms = allRooms.filter((r) => r.status === "maintenance").length;
  const totalRoomsCount = allRooms.length;

  // Unpaid invoices
  const unpaidInvoices = invoices
    .filter((i) => i.status === "belum-lunas")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const totalUnpaidSum = unpaidInvoices.reduce((sum, i) => sum + i.amount, 0);

  // Computed metrics
  const displayRevenue = dynMetrics ? dynMetrics.revenue : 33700000;
  const displayFilled = dynMetrics ? dynMetrics.filled : filledRooms;
  const displayTotalRooms =
    dynMetrics && dynMetrics.totalRooms > 0 ? dynMetrics.totalRooms : totalRoomsCount;
  const displayArrears = dynMetrics ? dynMetrics.arrears : unpaidInvoices.length;
  const displayArrearsSum = dynMetrics ? dynMetrics.arrearsSum : totalUnpaidSum;
  const displayPending = dynMetrics ? dynMetrics.pendingCount : pending.length;
  const displayOccupancy =
    displayTotalRooms > 0 ? Math.round((displayFilled / displayTotalRooms) * 100) : 0;

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

  const today = new Date().toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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

  const stats = [
    {
      label: t("statRevenue"),
      value: formatIDR(displayRevenue),
      note: t("statRevenueChange"),
      icon: TrendingUp,
      tint: { card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" },
    },
    {
      label: t("statOccupancy"),
      value: `${displayOccupancy}%`,
      note: t("statOccupancyNote", { filled: displayFilled, total: displayTotalRooms }),
      icon: BedDouble,
      tint: { card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" },
    },
    {
      label: t("statNewBookings"),
      value: String(displayPending),
      note: displayPending > 0 ? t("statNeedsResponse") : (isEn ? "No queue" : "Tidak ada antrean"),
      badge: displayPending > 0,
      icon: CalendarClock,
      tint: { card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" },
    },
    {
      label: t("statArrears"),
      value: formatIDR(displayArrearsSum),
      note: t("statArrearsNote", { count: displayArrears }),
      icon: AlertCircle,
      tint: { card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" },
    },
  ];

  if (hasProperties === false) {
    const displayName = user?.name ? user.name.split(" ")[0] : "Pemilik Kos";
    return (
      <DashboardShell role="owner">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-nk-accent/10 text-nk-accent">
            <Building2 className="size-10" />
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
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-nk-text sm:text-3xl">
            {t("welcome", { name: (user?.name || OWNER_PROFILE.name).split(" ")[0] })}
          </h1>
          <p className="mt-1 text-sm text-nk-text-muted">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/owner/properties/new"
            className="flex items-center gap-1.5 rounded-md bg-nk-accent px-3 py-1.5 text-sm font-medium text-nk-text-inverse shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-nk-accent"
          >
            <Plus className="size-4" />
            <span>{t("addProperty")}</span>
          </Link>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-md bg-nk-surface px-3 py-1.5 text-sm text-nk-text ring-1 ring-foreground/10 transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-nk-accent"
          >
            <Download className="size-4 text-nk-text-muted" aria-hidden="true" />
            <span>{t("exportCsv")}</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {s.value}
                  </p>
                  {s.note && (
                    <div className="mt-1 flex items-center gap-1.5">
                      {s.badge ? (
                        <StatusBadge color="yellow">{s.note}</StatusBadge>
                      ) : (
                        <span className="truncate text-xs text-nk-text-muted">{s.note}</span>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    s.tint.icon
                  )}
                >
                  <s.icon className="size-4" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Bookings + Property Performance Table */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Pending Bookings */}
          <DashSection
            title={t("bookingPending")}
            right={
              <Link
                href="/owner/bookings"
                className="text-xs text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
              >
                {t("seeAll")}
              </Link>
            }
            bodyClass="divide-y divide-nk-border"
          >
            {pending.slice(0, 5).map((b) => (
              <div key={b.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nk-text">{b.applicantName}</p>
                  <p className="truncate text-xs text-nk-text-muted">
                    {b.propertyName} · {b.roomType} ({b.roomNumber})
                  </p>
                </div>
                <p className="text-xs text-nk-text-muted">
                  {new Date(b.createdAt).toLocaleString(locale === "id" ? "id-ID" : "en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
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
          </DashSection>

          {/* Properties Performance Table */}
          <DashSection
            title={t("perfTitle")}
            right={
              <Link
                href="/owner/properties"
                className="text-xs text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
              >
                {t("seeAll")}
              </Link>
            }
            bodyClass="overflow-hidden"
          >
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
                    const tenantCount = tenants.filter(
                      (tn) => tn.propertySlug === r.property.slug
                    ).length;
                    return (
                      <TableRow
                        key={r.property.slug}
                        className="border-b border-nk-border last:border-b-0"
                      >
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
                              <p className="truncate text-xs text-nk-text-muted">
                                {r.property.city}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 tabular-nums text-nk-text">
                          {tenantCount}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {r.rooms > 0 ? (
                            <div className="flex min-w-28 items-center gap-2">
                              <Progress value={r.pct} className="h-1.5 w-20 bg-nk-border" />
                              <span className="text-xs tabular-nums text-nk-text-muted">
                                {r.pct}%
                              </span>
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
                              <span className="text-xs text-nk-text-muted">
                                ({r.property.reviewCount})
                              </span>
                            </span>
                          ) : (
                            <StatusBadge color="gray">{t("perfNoRating")}</StatusBadge>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              aria-label={t("perfColAction")}
                              className="flex size-8 items-center justify-center rounded-md text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text focus-visible:outline-2 focus-visible:outline-nk-accent"
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
          </DashSection>
        </div>

        {/* Right Column: Unpaid Invoices + Room Status + Quick Actions */}
        <div className="flex flex-col gap-6">
          {/* Unpaid Invoices */}
          <DashSection
            title={t("unpaidInvoices")}
            right={
              <Link
                href="/owner/invoices"
                className="text-xs text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
              >
                {t("seeAll")}
              </Link>
            }
            bodyClass="divide-y divide-nk-border"
          >
            <div className="bg-nk-section/40 p-4">
              <p className="text-xs text-nk-text-muted">
                {isEn ? "Total Outstanding" : "Total Belum Lunas"}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-[#9C3B32] tabular-nums">
                {formatIDR(displayArrearsSum)}
              </p>
              <p className="mt-0.5 text-[11px] text-nk-text-muted">
                {isEn ? `${displayArrears} unpaid invoices` : `${displayArrears} tagihan belum dibayar`}
              </p>
            </div>
            {unpaidInvoices.slice(0, 4).map((inv) => (
              <div key={inv.id} className="p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-nk-text">{inv.tenantName}</p>
                  <span className="font-semibold text-xs text-[#9C3B32] tabular-nums">
                    {formatIDR(inv.amount)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-nk-text-muted">
                  {inv.id} · {inv.period}
                </p>
                <p className="mt-1 text-[11px] text-nk-text-muted">
                  {isEn ? `Due ${inv.dueDate}` : `Jatuh tempo: ${inv.dueDate}`}
                </p>
              </div>
            ))}
            {unpaidInvoices.length === 0 && (
              <p className="p-4 text-xs text-nk-text-muted">{t("allInvoicesPaid")}</p>
            )}
          </DashSection>

          {/* Room Status Summary */}
          <DashSection title={t("roomStatus")} bodyClass="p-4">
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs text-nk-text">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#2F6B3C]" />
                    <span>{isEn ? "Occupied" : "Terisi"}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {filledRooms} ({totalRoomsCount > 0 ? Math.round((filledRooms / totalRoomsCount) * 100) : 0}%)
                  </span>
                </div>
                <Progress
                  value={totalRoomsCount > 0 ? Math.round((filledRooms / totalRoomsCount) * 100) : 0}
                  className="mt-1.5 h-1.5 bg-nk-border [&>div]:bg-[#2F6B3C]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-nk-text">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#33517C]" />
                    <span>{isEn ? "Available" : "Kosong"}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {emptyRooms} ({totalRoomsCount > 0 ? Math.round((emptyRooms / totalRoomsCount) * 100) : 0}%)
                  </span>
                </div>
                <Progress
                  value={totalRoomsCount > 0 ? Math.round((emptyRooms / totalRoomsCount) * 100) : 0}
                  className="mt-1.5 h-1.5 bg-nk-border [&>div]:bg-[#33517C]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-nk-text">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-[#D97706]" />
                    <span>{isEn ? "Maintenance" : "Perawatan"}</span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {repairRooms} ({totalRoomsCount > 0 ? Math.round((repairRooms / totalRoomsCount) * 100) : 0}%)
                  </span>
                </div>
                <Progress
                  value={totalRoomsCount > 0 ? Math.round((repairRooms / totalRoomsCount) * 100) : 0}
                  className="mt-1.5 h-1.5 bg-nk-border [&>div]:bg-[#D97706]"
                />
              </div>
            </div>
          </DashSection>

          {/* Quick Shortcuts */}
          <DashSection title={t("quickShortcuts")} bodyClass="p-2 divide-y divide-nk-border">
            <Link
              href="/owner/properties/new"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-nk-text hover:bg-nk-warm rounded-md transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus className="size-3.5 text-nk-accent" />
                <span>{t("addProperty")}</span>
              </span>
              <ArrowUpRight className="size-3 text-nk-text-muted" />
            </Link>
            <Link
              href="/owner/properties"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-nk-text hover:bg-nk-warm rounded-md transition-colors"
            >
              <span className="flex items-center gap-2">
                <Building2 className="size-3.5 text-nk-accent" />
                <span>{isEn ? "Manage Properties" : "Kelola Properti"}</span>
              </span>
              <ArrowUpRight className="size-3 text-nk-text-muted" />
            </Link>
            <Link
              href="/owner/messages"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-nk-text hover:bg-nk-warm rounded-md transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="size-3.5 text-nk-accent" />
                <span>{isEn ? "Tenant Messages" : "Pesan Penyewa"}</span>
              </span>
              <ArrowUpRight className="size-3 text-nk-text-muted" />
            </Link>
          </DashSection>
        </div>
      </div>
    </DashboardShell>
  );
}

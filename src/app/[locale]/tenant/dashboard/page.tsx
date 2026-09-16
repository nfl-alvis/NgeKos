"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  Receipt,
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
import { conversations, invoices, rentalAgreements, tenants } from "@/lib/data/entities";
import { contractInfo } from "@/lib/data/userData";
import { useTenantOps } from "@/lib/tenantOpsStore";
import { properties } from "@/lib/data/properties";
import { FACILITY_META } from "@/lib/data/facilities";
import { cn, formatIDR } from "@/lib/utils";

// tenant demo = t-1 (I made Sudiarta, Kost Griya Cemara A-101)
const DEMO_TENANT_ID = "t-1";
const DEMO_TODAY = new Date("2026-09-03");
// akhir perjanjian aktif — sumber tunggal di userData (dipakai jg halaman kontrak)
const ACTIVE_AGREEMENT_END = contractInfo.endDate;

export default function TenantDashboardPage() {
  const t = useTranslations("tenant");
  const locale = useLocale();
  const months = t.raw("months") as string[];

  const tenant = tenants.find((tn) => tn.id === DEMO_TENANT_ID)!;
  const property = properties.find((p) => p.slug === tenant.propertySlug)!;
  // invoice yang dilunasi sesi ini (dari /tenant/bills) ikut dihitung lunas
  const ops = useTenantOps();
  const invStatus = (inv: (typeof invoices)[number]) =>
    inv.status === "lunas" || ops.paidInvoiceIds.includes(inv.id) ? "lunas" : inv.status;
  const myInvoices = invoices
    .filter((inv) => inv.tenantName === tenant.name)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const thisMonth = myInvoices.find((inv) => inv.period === "September 2026");
  const thisMonthPaid = thisMonth ? invStatus(thisMonth) === "lunas" : false;
  const agreements = rentalAgreements.filter((ra) => ra.tenantId === tenant.id);
  const activeAgreement = agreements[agreements.length - 1];
  const prevAgreement = agreements[agreements.length - 2];
  const rentUp =
    prevAgreement && activeAgreement && activeAgreement.rent > prevAgreement.rent;

  const daysLeft = Math.max(
    0,
    Math.round(
      (new Date(`${ACTIVE_AGREEMENT_END}T00:00:00Z`).getTime() -
        DEMO_TODAY.getTime()) /
        86_400_000
    )
  );
  const tenantConv = conversations.find((c) => c.name === tenant.name);
  const unread = tenantConv?.unread ?? 0;

  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const rentSeries = ["Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep"];
  const chartData = rentSeries.map((label, i) => ({
    label: months[i % months.length],
    value: i < 5 ? 1_150_000 : 1_200_000,
  }));
  const chartConfig = {
    value: { label: t("chartSeries"), color: "var(--chart-1)" },
  } satisfies ChartConfig;

  type Stat = {
    label: string;
    value: string;
    note: string;
    up?: boolean;
    down?: boolean;
    badge?: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    tint: { card: string; icon: string };
  };

  const stats: Stat[] = [
    {
      label: t("statRent"),
      value: formatIDR(tenant.monthlyRent),
      note: rentUp ? t("statRentUp") : t("statRentFlat"),
      up: rentUp,
      icon: Wallet,
      tint: { card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" },
    },
    {
      label: t("statInvoice"),
      value: thisMonth ? formatIDR(thisMonth.amount) : "—",
      note: t("statInvoiceDue", { date: thisMonth ? fmtDate(thisMonth.dueDate) : "—" }),
      icon: Receipt,
      tint: { card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" },
      badge:
        thisMonthPaid ? (
          <StatusBadge color="green">{t("paid")}</StatusBadge>
        ) : (
          <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
        ),
    },
    {
      label: t("statAgreement"),
      value: t("statDaysLeft", { count: daysLeft }),
      note: activeAgreement ? activeAgreement.period : "",
      icon: CalendarClock,
      tint: { card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" },
    },
    {
      label: t("statMessages"),
      value: String(unread),
      note: unread > 0 ? t("statNeedsReply") : t("statAllRead"),
      icon: MessageSquare,
      tint: { card: unread > 0 ? "bg-[#FAEAE8]" : "bg-[#E9F4EC]", icon: unread > 0 ? "bg-[#F3D7D3] text-[#9C3B32]" : "bg-[#CFE8D6] text-[#2F6B3C]" },
      badge: unread > 0 ? <StatusBadge color="red">{t("statNeedsReply")}</StatusBadge> : undefined,
    },
  ];

  const quickActions = [
    { key: "qaBill", href: "/tenant/bills", icon: Receipt },
    { key: "qaComplaint", href: "/tenant/complaints", icon: AlertCircle },
    { key: "qaMessages", href: "#pesan", icon: MessageSquare },
  ] as const;

  return (
    <DashboardShell role="tenant">
      {/* header */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-medium tracking-tight text-nk-text sm:text-3xl">
          {t("welcome", { name: tenant.name.split(" ")[0] })}
        </h1>
        <p className="text-sm text-nk-text-muted">
          {DEMO_TODAY.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* kartu kamar aktif — padanan spotlight referensi */}
      <section className="mb-6 flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E9F4EC]">
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <h2 className="text-sm font-semibold text-nk-text">{t("myRoom")}</h2>
          <StatusBadge color="green">{t("activeLease")}</StatusBadge>
        </div>
        <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
          <Image
            src={`https://picsum.photos/seed/${property.imageSeed}/240/240`}
            alt=""
            width={96}
            height={96}
            className="size-24 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-nk-text">{property.name}</p>
            <p className="mt-0.5 text-xs text-nk-text-muted">
              {property.address} · {t("roomLabel")} {tenant.roomNumber}
            </p>
            <p className="mt-2 text-sm text-nk-text">
              {t("statRent")}:{" "}
              <span className="font-semibold tabular-nums">{formatIDR(tenant.monthlyRent)}</span>
              <span className="text-nk-text-muted">{t("perMonth")}</span>
            </p>
          </div>
          <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 border-t border-nk-border pt-3 text-sm sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <dt className="text-nk-text-muted">{t("since")}</dt>
            <dd className="text-right font-medium tabular-nums text-nk-text">{fmtDate(tenant.joinedAt)}</dd>
            <dt className="text-nk-text-muted">{t("agreement")}</dt>
            <dd className="text-right font-medium text-nk-text">{activeAgreement?.period}</dd>
            <dt className="text-nk-text-muted">{t("statAgreement")}</dt>
            <dd className="text-right font-medium tabular-nums text-nk-text">
              {t("statDaysLeft", { count: daysLeft })}
            </dd>
            <dt className="sr-only">{t("quickActions")}</dt>
          </dl>
          <div className="flex shrink-0 flex-row gap-2 border-t border-nk-border pt-3 sm:w-40 sm:flex-col sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <Link
              href="/tenant/property"
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

      {/* quick actions — padanan nav "perlu ditindaklanjuti" */}
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

      {/* stat cards — band tinted + sparkline ala owner dashboard */}
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
        {/* kiri: tagihan + chart */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section id="tagihan" className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("invoiceTitle")}</h2>
              <span className="text-xs text-nk-text-muted">
                {t("paidCount", { paid: myInvoices.filter((i) => invStatus(i) === "lunas").length, total: myInvoices.length })}
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
                    {myInvoices.map((inv) => (
                      <TableRow key={inv.id} className="border-b border-nk-border last:border-b-0">
                        <TableCell className="px-4 py-3">
                          <p className="font-medium text-nk-text">{inv.period}</p>
                          <p className="font-mono text-xs text-nk-text-muted">{inv.id}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text-muted">
                          {fmtDate(inv.dueDate)}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">
                          {formatIDR(inv.amount)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {invStatus(inv) === "lunas" && inv.paidAt ? (
                            <span className="flex items-center gap-1.5">
                              <StatusBadge color="green">{t("paid")}</StatusBadge>
                              <span className="hidden text-xs text-nk-text-muted sm:inline">
                                {fmtDate(inv.paidAt)}
                              </span>
                            </span>
                          ) : invStatus(inv) === "lunas" ? (
                            <StatusBadge color="green">{t("paid")}</StatusBadge>
                          ) : (
                            <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          {/* chart riwayat sewa */}
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("chartTitle")}</h2>
            <div className="flex-1 rounded-lg bg-nk-surface p-6 ring-1 ring-foreground/10">
              <p className="text-2xl font-semibold tracking-tight text-nk-text">
                {formatIDR(tenant.monthlyRent)}
                <span className="ml-1 text-sm font-normal text-nk-text-muted">{t("perMonth")}</span>
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium text-[#2F6B3C]">{t("statRentUp")}</span>{" "}
                <span className="text-nk-text-muted">{t("chartCompare")}</span>
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

        {/* kanan: pesan pemilik + fasilitas + riwayat perjanjian */}
        <div className="flex flex-col gap-6">
          <aside id="pesan" className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("messagesTitle")}</h2>
              {unread > 0 && <StatusBadge color="red">{unread}</StatusBadge>}
            </div>
            <div className="flex flex-1 flex-col gap-3 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              {tenantConv?.messages.slice(-3).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-lg border border-nk-border p-3 text-sm",
                    m.from === "contact" ? "self-end bg-nk-accent-subtle text-nk-text" : "self-start bg-nk-section text-nk-text"
                  )}
                >
                  <p className="text-xs text-nk-text-muted">
                    {m.from === "contact" ? t("you") : t("ownerSide")} ·{" "}
                    {new Date(m.at).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="mt-1">{m.text}</p>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("facilitiesTitle")}</h2>
            <div className="flex flex-wrap gap-2 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              {property.facilities.map((f) => (
                <span
                  key={f}
                  className="flex items-center gap-1.5 rounded-md border border-nk-border bg-nk-section px-2.5 py-1 text-xs text-nk-text"
                >
                  <FacilityIcon facility={f} />
                  {(locale === "id" ? FACILITY_META[f].labelId : FACILITY_META[f].labelEn)}
                </span>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("agreementsTitle")}</h2>
            <ol className="flex flex-1 flex-col rounded-lg bg-nk-surface px-5 ring-1 ring-foreground/10">
              {agreements.map((ra) => (
                <li key={ra.period} className="flex items-center gap-3 border-b border-nk-border py-3 last:border-b-0">
                  {ra === activeAgreement ? (
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
              ))}
            </ol>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

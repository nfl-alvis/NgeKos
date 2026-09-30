"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  CreditCard,
  MessageSquare,
  Wrench,
} from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
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
import {
  conversations,
  getOwnerProperties,
  invoices,
  ownerBookings,
  roomUnits,
} from "@/lib/data/entities";
import { formatIDR } from "@/lib/utils";

const ROOM_STATUSES = ["terisi", "kosong", "dipesan", "maintenance"] as const;
type RoomStatus = (typeof ROOM_STATUSES)[number];

const STATUS_LABEL_KEYS: Record<RoomStatus, "occupied" | "available" | "reserved" | "repair"> = {
  terisi: "occupied",
  kosong: "available",
  dipesan: "reserved",
  maintenance: "repair",
};

const STATUS_CHART_TOKENS: Record<"occupied" | "available" | "reserved" | "repair", string> = {
  occupied: "#2F6B3C",
  available: "#33517C",
  reserved: "#D97706",
  repair: "#DC2626",
};

export default function OwnerDashboardInsights({
  pendingBookingsCount,
}: {
  pendingBookingsCount?: number;
} = {}) {
  const t = useTranslations("owner.insights");
  const locale = useLocale();
  const isEn = locale === "en";
  const properties = getOwnerProperties();

  const unpaid = invoices
    .filter((invoice) => invoice.status === "belum-lunas")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));

  const pendingCount =
    pendingBookingsCount !== undefined
      ? pendingBookingsCount
      : ownerBookings.filter((booking) => booking.status === "pending").length;

  const actions = [
    {
      label: "bookings",
      count: pendingCount,
      href: "/owner/bookings",
      icon: CalendarClock,
      iconColor: "bg-amber-100 text-amber-700",
    },
    {
      label: "messages",
      count: conversations.reduce((sum, conversation) => sum + conversation.unread, 0),
      href: "/owner/messages",
      icon: MessageSquare,
      iconColor: "bg-blue-100 text-blue-700",
    },
    {
      label: "maintenance",
      count: properties
        .flatMap((property) => roomUnits[property.slug] ?? [])
        .filter((room) => room.status === "maintenance").length,
      href: "/owner/properties",
      icon: Wrench,
      iconColor: "bg-rose-100 text-rose-700",
    },
  ] as const;

  const [selectedSlug, setSelectedSlug] = useState(properties[0]?.slug ?? "");
  const selected = properties.find((property) => property.slug === selectedSlug) ?? properties[0];

  const roomConfig = {
    occupied: { label: t("occupied"), color: STATUS_CHART_TOKENS.occupied },
    available: { label: t("available"), color: STATUS_CHART_TOKENS.available },
    reserved: { label: t("reserved"), color: STATUS_CHART_TOKENS.reserved },
    repair: { label: t("repair"), color: STATUS_CHART_TOKENS.repair },
  } satisfies ChartConfig;

  const selectedRooms = selected ? roomUnits[selected.slug] ?? [] : [];
  const selectedTotal = selectedRooms.length;
  const selectedFilled = selectedRooms.filter((room) => room.status === "terisi").length;
  const selectedCounts = ROOM_STATUSES.map((status) => ({
    key: STATUS_LABEL_KEYS[status],
    count: selectedRooms.filter((room) => room.status === status).length,
  }));
  const pieData = selectedCounts
    .filter((c) => c.count > 0)
    .map((c) => ({ name: c.key, value: c.count, fill: STATUS_CHART_TOKENS[c.key] }));

  return (
    <section className="mt-10 space-y-6" aria-labelledby="operations-title">
      <div>
        <h2 id="operations-title" className="text-xl font-bold tracking-tight text-nk-text">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-nk-text-muted">
          {isEn
            ? "Overview of unit room availability and active rental payment status."
            : "Pantau ketersediaan unit kamar dan status tagihan sewa properti Anda."}
        </p>
      </div>

      {/* 3 Quick Action Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex items-center justify-between rounded-xl border border-nk-border bg-nk-surface p-4 shadow-sm transition-all hover:border-nk-accent hover:shadow"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${action.iconColor}`}
              >
                <action.icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-nk-text tabular-nums">
                  {action.count}
                </p>
                <p className="text-xs font-medium text-nk-text-muted">{t(action.label)}</p>
              </div>
            </div>
            <ArrowUpRight
              className="size-4 text-nk-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-nk-accent"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      {/* 2 Operations Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Room Status by Property */}
        <div className="rounded-xl border border-nk-border bg-nk-surface p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-nk-border pb-4">
            <div>
              <h3 className="text-base font-semibold text-nk-text">{t("properties")}</h3>
              <p className="text-xs text-nk-text-muted">
                {isEn ? "Room unit distribution" : "Distribusi status unit kamar"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-section px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm focus:outline-none"
                  aria-label={t("properties")}
                >
                  <span className="max-w-[140px] truncate">{selected?.name ?? "-"}</span>
                  <ChevronDown className="size-3 text-nk-text-muted" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={selectedSlug} onValueChange={setSelectedSlug}>
                    {properties.map((property) => (
                      <DropdownMenuRadioItem key={property.slug} value={property.slug}>
                        {property.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link
                href="/owner/properties"
                className="text-xs text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
              >
                {t("manage")}
              </Link>
            </div>
          </div>

          {selected && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/owner/properties/${selected.slug}`}
                    className="font-medium text-nk-text hover:underline text-sm"
                  >
                    {selected.name}
                  </Link>
                  <p className="text-xs text-nk-text-muted">
                    {selected.city} · {t(selected.verificationStatus)}
                  </p>
                </div>
                {selectedTotal > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                    {Math.round((selectedFilled / selectedTotal) * 100)}% {isEn ? "Occupied" : "Terisi"}
                  </span>
                )}
              </div>

              {selectedTotal > 0 ? (
                <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
                  <ChartContainer
                    config={roomConfig}
                    className="mx-auto aspect-square h-[190px] flex-shrink-0"
                  >
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={90}
                        strokeWidth={3}
                        stroke="var(--background)"
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy - 6}
                                    className="fill-nk-text text-xl font-bold"
                                  >
                                    {Math.round((selectedFilled / selectedTotal) * 100)}%
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy + 13}
                                    className="fill-nk-text-muted text-[10px]"
                                  >
                                    {t("occupied")}
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  <div className="grid w-full grid-cols-2 gap-3 sm:flex-1 sm:grid-cols-1">
                    {selectedCounts.map(({ key, count }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-nk-border bg-nk-section/40 p-2.5 text-xs"
                      >
                        <span className="flex items-center gap-2 text-nk-text">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: STATUS_CHART_TOKENS[key] }}
                            aria-hidden="true"
                          />
                          <span>{t(key)}</span>
                        </span>
                        <span className="font-bold tabular-nums text-nk-text">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-xs text-nk-text-muted">{t("noRooms")}</p>
              )}
            </div>
          )}
        </div>

        {/* Unpaid Invoices */}
        <div className="rounded-xl border border-nk-border bg-nk-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-nk-border pb-4">
            <div>
              <h3 className="text-base font-semibold text-nk-text">{t("invoices")}</h3>
              <p className="text-xs text-nk-text-muted">
                {isEn ? "Tenants awaiting payment" : "Daftar tagihan yang belum dibayar"}
              </p>
            </div>
            <Link
              href="/owner/invoices"
              className="text-xs text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
            >
              {t("seeInvoices")}
            </Link>
          </div>

          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
            <p className="text-xs font-medium text-rose-800">{t("outstanding")}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-rose-900 tabular-nums">
              {formatIDR(unpaid.reduce((sum, invoice) => sum + invoice.amount, 0))}
            </p>
            <p className="mt-0.5 text-xs text-rose-700/80">
              {t("invoiceCount", { count: unpaid.length })}
            </p>
          </div>

          <div className="divide-y divide-nk-border">
            {unpaid.slice(0, 3).map((invoice) => (
              <div key={invoice.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <p className="font-semibold text-nk-text">{invoice.tenantName}</p>
                  <p className="font-bold text-[#9C3B32] tabular-nums">
                    {formatIDR(invoice.amount)}
                  </p>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-nk-text-muted">
                  <span>
                    {invoice.id} · {invoice.period}
                  </span>
                  <span>
                    {t("due", {
                      date: new Date(`${invoice.dueDate}T00:00:00Z`).toLocaleDateString(
                        locale === "id" ? "id-ID" : "en-GB",
                        { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
                      ),
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {unpaid.length === 0 && (
            <p className="py-6 text-center text-xs text-nk-text-muted">{t("emptyInvoices")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

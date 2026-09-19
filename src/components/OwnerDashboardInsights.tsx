"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, CalendarClock, ChevronDown, MessageSquare, Wrench } from "lucide-react";
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
import { conversations, getOwnerProperties, invoices, ownerBookings, roomUnits } from "@/lib/data/entities";
import { formatIDR } from "@/lib/utils";

const ROOM_STATUSES = ["terisi", "kosong", "dipesan", "maintenance"] as const;
type RoomStatus = (typeof ROOM_STATUSES)[number];

const STATUS_LABEL_KEYS: Record<RoomStatus, "occupied" | "available" | "reserved" | "repair"> = {
  terisi: "occupied",
  kosong: "available",
  dipesan: "reserved",
  maintenance: "repair",
};

// legend berada di luar scope ChartContainer - pakai token --chart-N langsung (ala referensi hotel)
const STATUS_CHART_TOKENS: Record<"occupied" | "available" | "reserved" | "repair", string> = {
  occupied: "--chart-1",
  available: "--chart-3",
  reserved: "--chart-2",
  repair: "--chart-5",
};

export default function OwnerDashboardInsights() {
  const t = useTranslations("owner.insights");
  const locale = useLocale();
  const properties = getOwnerProperties();
  const unpaid = invoices.filter((invoice) => invoice.status === "belum-lunas")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  const actions = [
    { label: "bookings", count: ownerBookings.filter((booking) => booking.status === "pending").length, href: "/owner/bookings", icon: CalendarClock },
    { label: "messages", count: conversations.reduce((sum, conversation) => sum + conversation.unread, 0), href: "/owner/messages", icon: MessageSquare },
    { label: "maintenance", count: properties.flatMap((property) => roomUnits[property.slug] ?? []).filter((room) => room.status === "maintenance").length, href: "/owner/properties", icon: Wrench },
  ] as const;
  const linkStyle = "rounded-sm text-sm underline underline-offset-4 hover:text-nk-text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nk-accent";

  const [selectedSlug, setSelectedSlug] = useState(properties[0]?.slug ?? "");
  const selected = properties.find((property) => property.slug === selectedSlug) ?? properties[0];
  const roomConfig = {
    occupied: { label: t("occupied"), color: "var(--chart-1)" },
    available: { label: t("available"), color: "var(--chart-3)" },
    reserved: { label: t("reserved"), color: "var(--chart-2)" },
    repair: { label: t("repair"), color: "var(--chart-5)" },
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
    .map((c) => ({ name: c.key, value: c.count, fill: `var(${STATUS_CHART_TOKENS[c.key]})` }));

  return (
    <section className="mt-8 space-y-5" aria-labelledby="operations-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="operations-title" className="text-xl font-semibold tracking-tight text-nk-text">{t("title")}</h2>
          <p className="mt-1 text-sm text-nk-text-muted">{t("subtitle")}</p>
        </div>
        <span className="text-xs text-nk-text-muted">{t("demo")}</span>
      </div>

      <nav aria-label={t("actions")} className="grid gap-px overflow-hidden rounded-xl border border-nk-border bg-nk-border md:grid-cols-3">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="flex items-center gap-3 bg-nk-surface p-4 transition-colors hover:bg-nk-accent-subtle focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-nk-accent">
            <action.icon className="size-5 shrink-0 text-nk-text-muted" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold tabular-nums text-nk-text">{action.count}</p>
              <p className="text-sm text-nk-text-muted">{t(action.label)}</p>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-nk-text-muted" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-3">
            <h3 className="text-sm font-semibold text-nk-text">{t("properties")}</h3>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex items-center gap-1.5 rounded-md bg-nk-surface px-3 py-1.5 text-sm text-nk-text ring-1 ring-foreground/10 transition-colors hover:bg-nk-accent-subtle focus:outline-none"
                  aria-label={t("properties")}
                >
                  {selected?.name ?? "-"}
                  <ChevronDown className="size-3.5 text-nk-text-muted" aria-hidden="true" />
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
              <Link href="/owner/properties" className={linkStyle}>{t("manage")}</Link>
            </div>
          </div>
          <div className="flex-1 rounded-lg bg-nk-surface ring-1 ring-foreground/10">
            {selected && (
              <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/owner/properties/${selected.slug}`} aria-label={t("viewProperty", { name: selected.name })} className={`${linkStyle} font-medium text-nk-text`}>{selected.name}</Link>
                  <p className="mt-1 text-xs text-nk-text-muted">{selected.city} · {t(selected.verificationStatus)}</p>
                </div>
                {selectedTotal > 0 && <span className="text-lg font-semibold tabular-nums text-nk-text">{Math.round((selectedFilled / selectedTotal) * 100)}%</span>}
              </div>
              {selectedTotal > 0 ? (
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                  <ChartContainer
                    config={roomConfig}
                    className="mx-auto aspect-square h-[210px] flex-shrink-0"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={66}
                        outerRadius={104}
                        strokeWidth={4}
                        stroke="#FFFFFF"
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy - 6} className="fill-nk-text text-lg font-semibold">
                                    {Math.round((selectedFilled / selectedTotal) * 100)}%
                                  </tspan>
                                  <tspan x={viewBox.cx} y={viewBox.cy + 12} className="fill-nk-text-muted text-[10px]">
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
                  <ul className="flex flex-col gap-2">
                    {selectedCounts.map(({ key, count }) => (
                      <li key={key} className="flex items-center gap-3 text-xs text-nk-text-muted">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: `var(${STATUS_CHART_TOKENS[key]})` }}
                          aria-hidden="true"
                        />
                        {t(key)} <span className="font-medium tabular-nums text-nk-text">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <p className="mt-3 text-xs text-nk-text-muted">{t("noRooms")}</p>}
              </div>
            )}
            {properties.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("emptyProperties")}</p>}
          </div>
        </section>

        <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <h3 className="text-sm font-semibold text-nk-text">{t("invoices")}</h3>
          </div>
          <div className="flex-1 rounded-lg bg-nk-surface ring-1 ring-foreground/10">
          <div className="border-b border-nk-border p-5">
            <p className="text-xs text-nk-text-muted">{t("outstanding")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-nk-text">{formatIDR(unpaid.reduce((sum, invoice) => sum + invoice.amount, 0))}</p>
            <p className="mt-1 text-xs text-nk-text-muted">{t("invoiceCount", { count: unpaid.length })}</p>
          </div>
          <ul className="divide-y divide-nk-border">
            {unpaid.slice(0, 4).map((invoice) => (
              <li key={invoice.id} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-nk-text">
                  <p className="font-medium">{invoice.tenantName}</p>
                  <p className="font-semibold tabular-nums">{formatIDR(invoice.amount)}</p>
                </div>
                <p className="mt-1 text-xs text-nk-text-muted">{invoice.id} · {invoice.period}</p>
                <p className="mt-2 text-xs text-nk-text-muted">{t("due", { date: new Date(`${invoice.dueDate}T00:00:00Z`).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) })}</p>
              </li>
            ))}
          </ul>
          {unpaid.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("emptyInvoices")}</p>}
          <div className="border-t border-nk-border p-5"><Link href="/owner/invoices" className={linkStyle}>{t("seeInvoices")}</Link></div>
          </div>
        </section>
      </div>
    </section>
  );
}

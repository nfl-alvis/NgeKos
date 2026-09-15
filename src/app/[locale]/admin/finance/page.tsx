"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, Percent, TrendingUp, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import AdminPageShell, { AdminSection, AdminStat } from "@/components/admin/AdminPageShell";
import { formatIDR } from "@/lib/utils";
import { monthlyRevenue, platformTransactions } from "@/lib/data/adminData";

const chartConfig = {
  gross: { label: "Gross", color: "var(--chart-1)" },
  fee: { label: "Fee", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Statistik pembayaran & pendapatan platform. */
export default function AdminFinancePage() {
  const t = useTranslations("admin.finance");
  const tu = useTranslations("admin.units");
  const locale = useLocale();
  const [months, setMonths] = useState<6 | 12>(12);

  const chartData = monthlyRevenue.slice(-months).map((m, i) => ({
    label: tu(`m${monthlyRevenue.length - months + 1 + i}`),
    gross: Math.round(m.gross / 1_000_000),
    fee: Math.round(m.fee / 100_000) / 10,
  }));

  const grossYtd = monthlyRevenue.reduce((a, m) => a + m.gross, 0);
  const feeYtd = monthlyRevenue.reduce((a, m) => a + m.fee, 0);
  const last = monthlyRevenue[monthlyRevenue.length - 1];
  const prev = monthlyRevenue[monthlyRevenue.length - 2];
  const growth = ((last.gross - prev.gross) / prev.gross) * 100;

  const byMethodMap = new Map<string, number>();
  for (const x of platformTransactions) {
    if (x.status !== "settlement") continue;
    byMethodMap.set(x.method, (byMethodMap.get(x.method) ?? 0) + x.amount);
  }
  const byMethodTotal = [...byMethodMap.values()].reduce((a, v) => a + v, 0);
  const labelKey: Record<string, string> = {
    "va-bca": "methodVaBca",
    "va-bni": "methodVaBni",
    qris: "methodQris",
    gopay: "methodGopay",
  };
  const byMethod = [...byMethodMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ key: k, label: t(labelKey[k] ?? k), pct: Math.round((v / byMethodTotal) * 100), amount: v }));

  const settled = platformTransactions.filter((x) => x.status === "settlement");
  const refundTotal = platformTransactions.filter((x) => x.status === "refund").reduce((a, x) => a + x.amount, 0);

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label={t("statGrossYtd")} value={formatIDR(grossYtd)} icon={TrendingUp} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} note={t("statGrossYtdNote", { pct: growth.toFixed(1) })} />
        <AdminStat label={t("statFeeYtd")} value={formatIDR(feeYtd)} icon={Percent} tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }} note={t("statFeeYtdNote")} />
        <AdminStat label={t("statTx")} value={String(settled.length)} icon={Wallet} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statTxNote")} />
        <AdminStat label={t("statRefund")} value={formatIDR(refundTotal)} icon={Banknote} tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }} note={t("statRefundNote")} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <AdminSection
          title={t("chartTitle")}
          right={
            <div className="flex overflow-hidden rounded-md bg-nk-surface ring-1 ring-foreground/10">
              {([6, 12] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={
                    months === m
                      ? "px-3 py-1.5 text-xs font-medium text-nk-text bg-nk-warm"
                      : "px-3 py-1.5 text-xs text-nk-text-muted hover:bg-nk-accent-subtle"
                  }
                >
                  {t("rangeMonths", { count: m })}
                </button>
              ))}
            </div>
          }
          bodyClass="p-4 sm:p-6"
        >
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart accessibilityLayer data={chartData} margin={{ top: 8, left: 0, right: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} interval={0} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-mono text-[10px] tabular-nums text-nk-text-muted">
                        {name === "fee"
                          ? `${(Number(value) || 0).toFixed(1)} jt`
                          : `${Number(value) || 0} jt`}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="gross" fill="var(--color-gross)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fee" fill="var(--color-fee)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-nk-text-muted">
            {(["gross", "fee"] as const).map((k, i) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: `var(--chart-${i === 0 ? 1 : 3})` }} />
                {k === "gross" ? t("legendGross") : t("legendFee")}
              </span>
            ))}
          </div>
        </AdminSection>

        <AdminSection title={t("methodTitle")} bodyClass="p-4 sm:p-6">
          <ul className="flex flex-col gap-4">
            {byMethod.map((m) => (
              <li key={m.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-nk-text">{m.label}</span>
                  <span className="text-xs tabular-nums text-nk-text-muted">
                    {formatIDR(m.amount)} · {m.pct}%
                  </span>
                </div>
                <Progress value={m.pct} className="h-1.5 bg-nk-border" />
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-nk-border pt-4 text-xs text-nk-text-muted">
            {t("methodNote", {
              cutoff: new Date("2026-09-03T00:00:00").toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                day: "numeric", month: "short",
              }),
            })}
          </p>
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}

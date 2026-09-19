"use client";

import { useLocale, useTranslations } from "next-intl";
import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { invoices, tenants } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import { useTenantOps } from "@/lib/tenantOpsStore";
import { formatIDR } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";

const DEMO_TENANT = tenants.find((tn) => tn.id === "t-1")!;
const PROPERTY = getPropertyBySlug(DEMO_TENANT.propertySlug)!;

/** Riwayat pembayaran sewa - metode, tanggal bayar, nominal, status lunas. */
export default function TenantPaymentsPage() {
  const t = useTranslations("tenantPages.payments");
  const locale = useLocale();
  const ops = useTenantOps();

  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const rows = invoices
    .filter((i) => i.tenantName === DEMO_TENANT.name)
    .map((i) => ({ ...i, status: ops.paidInvoiceIds.includes(i.id) ? "lunas" : i.status }))
    .sort((a, b) => (b.paidAt ?? b.dueDate).localeCompare(a.paidAt ?? a.dueDate));

  const totalPaid = rows.filter((r) => r.status === "lunas").reduce((s, r) => s + r.amount, 0);
  const methods = ["QRIS", "BCA Virtual Account", "GoPay", "Mandiri VA", "QRIS", "BCA Virtual Account", "transfer bank"];

  const exportCsv = () => {
    const header = [t("colPeriod"), t("colPaid"), t("colAmount"), t("colStatus")];
    const body = rows
      .filter((r) => r.status === "lunas")
      .map((r) => [r.period, r.paidAt ?? r.dueDate, String(r.amount), t("paid")]);
    const csv = [header, ...body].map((cols) => cols.join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "riwayat-pembayaran-sewa.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <UserDashboardShell
      role="tenant"
      title={t("title")}
      actions={
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 border border-nk-border bg-nk-surface px-3.5 py-2 text-sm text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
        >
          <Download className="size-4" aria-hidden="true" />
          {t("exportCsv")}
        </button>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { k: t("sumTotal"), v: formatIDR(totalPaid), tint: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" },
          { k: t("sumMonths"), v: String(rows.filter((r) => r.status === "lunas").length), tint: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" },
          { k: t("sumMethod"), v: t("methodQris"), tint: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" },
          { k: t("sumAverage"), v: formatIDR(Math.round(totalPaid / Math.max(1, rows.filter((r) => r.status === "lunas").length))), tint: "bg-[#F3EDE6]", icon: "bg-nk-accent-subtle text-nk-accent" },
        ].map((s) => (
          <div key={s.k} className={`flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 ${s.tint}`}>
            <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{s.k}</p>
            <div className="flex flex-1 flex-col justify-center rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              <p className="text-2xl font-semibold tracking-tight text-nk-text tabular-nums">{s.v}</p>
            </div>
          </div>
        ))}
      </div>

      <DashSection
        title={t("historyTitle")}
        right={<span className="text-xs text-nk-text-muted">{PROPERTY.name}</span>}
        bodyClass="p-0"
      >
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("colPeriod")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colAmount")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colPaid")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colMethod")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={r.id} className="border-b border-nk-border last:border-b-0">
                  <TableCell className="px-4 py-3">
                    <p className="font-medium text-nk-text">{r.period}</p>
                    <p className="font-mono text-xs text-nk-text-muted">{r.id}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">
                    {formatIDR(r.amount)}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text-muted">
                    {r.status === "lunas" ? fmt(r.paidAt ?? r.dueDate) : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted">
                    {r.status === "lunas" ? methods[idx % methods.length] : "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {r.status === "lunas" ? (
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
      </DashSection>
    </UserDashboardShell>
  );
}

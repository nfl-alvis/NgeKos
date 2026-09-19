"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { CheckCircle2, Receipt, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { invoices, tenants } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import { contractInfo } from "@/lib/data/userData";
import { markInvoicePaid, useTenantOps } from "@/lib/tenantOpsStore";
import { pushActivity } from "@/lib/userActivityStore";
import { formatIDR } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";

const DEMO_TENANT = tenants.find((tn) => tn.id === "t-1")!;
const PROPERTY = getPropertyBySlug(DEMO_TENANT.propertySlug)!;
const DEMO_TODAY = new Date("2026-09-03");
const NEXT_DUE = "2026-10-05";

/** Tagihan sewa — kartu tagihan berikutnya + daftar invoice; bayar in-place. */
export default function TenantBillsPage() {
  const t = useTranslations("tenantPages.bills");
  const locale = useLocale();
  const ops = useTenantOps();
  const [bills, setBills] = useState<(typeof invoices)>(
    invoices.filter((i) => i.tenantName === DEMO_TENANT.name)
  );

  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map((item: any) => ({
            id: item.code || item.id,
            tenantName: item.tenant?.fullName || item.tenantName || "Penyewa",
            period: item.period || "Periode Berjalan",
            amount: Number(item.amountSnapshot || item.amount || 0),
            status: (item.status === "PAID" ? "lunas" : "belum-lunas") as
              | "lunas"
              | "belum-lunas",
            dueDate:
              typeof item.dueDate === "string"
                ? item.dueDate.slice(0, 10)
                : "2026-09-20",
          }));
          setBills(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const my = bills.sort((a: any, b: any) => b.dueDate.localeCompare(a.dueDate));
  const isPaid = (id: string, status: string) => status === "lunas" || ops.paidInvoiceIds.includes(id);

  // tagihan periode berikutnya (belum terbit di seed) — disintesis utk demo
  const nextBill: (typeof invoices)[number] = {
    id: "INV-2610-01",
    tenantName: DEMO_TENANT.name,
    period: locale === "id" ? "Oktober 2026" : "October 2026",
    amount: DEMO_TENANT.monthlyRent,
    status: "belum-lunas" as const,
    dueDate: NEXT_DUE,
  };
  const rows = [nextBill, ...my].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const nextDue = rows.find((i) => !isPaid(i.id, i.status)) ?? null;
  const outstanding = rows.filter((i) => !isPaid(i.id, i.status)).reduce((s, i) => s + i.amount, 0);

  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <UserDashboardShell role="tenant" title={t("title")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* tagihan berikutnya */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E8EFF8]">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("nextTitle")}</h2>
              {nextDue ? (
                <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
              ) : (
                <StatusBadge color="green">{t("allPaid")}</StatusBadge>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              {nextDue ? (
                <>
                  <p className="text-xs text-nk-text-muted">{nextDue.period}</p>
                  <p className="text-3xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {formatIDR(nextDue.amount)}
                  </p>
                  <dl className="flex flex-col gap-1.5 border-t border-nk-border pt-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-nk-text-muted">{t("dueDate")}</dt>
                      <dd className="font-medium text-nk-text">{fmt(nextDue.dueDate)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-nk-text-muted">{t("outstanding")}</dt>
                      <dd className="font-medium tabular-nums text-nk-text">{formatIDR(outstanding)}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => {
                      markInvoicePaid(nextDue.id);
                      pushActivity({
                        type: "payment",
                        titleId: `Pembayaran sewa ${nextDue.period} berhasil`,
                        titleEn: `${nextDue.period} rent payment successful`,
                        subject: PROPERTY.name,
                        at: new Date(DEMO_TODAY).toISOString(),
                      });
                    }}
                    className="inline-flex items-center justify-center gap-1.5 bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                  >
                    <Wallet className="size-4" aria-hidden="true" />
                    {t("payCta")}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 className="size-9 text-[#2F6B3C]" aria-hidden="true" />
                  <p className="text-sm font-medium text-nk-text">{t("allPaid")}</p>
                  <p className="text-xs text-nk-text-muted">
                    {t("allPaidNote", { date: fmt(contractInfo.endDate) })}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* daftar riwayat tagihan */}
        <div className="lg:col-span-2">
          <DashSection
            title={t("historyTitle")}
            right={
              <span className="text-xs text-nk-text-muted tabular-nums">
                {t("paidCount", {
                  paid: rows.filter((i) => isPaid(i.id, i.status)).length,
                  total: rows.length,
                })}
              </span>
            }
            bodyClass="divide-y divide-nk-border"
          >
            {rows.map((inv) => {
              const paid = isPaid(inv.id, inv.status);
              return (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Image
                    src={`https://picsum.photos/seed/${PROPERTY.imageSeed}/96/96`}
                    alt=""
                    width={40}
                    height={40}
                    className="hidden size-10 shrink-0 rounded-md object-cover sm:block"
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-section text-nk-text-muted sm:hidden" aria-hidden="true">
                    <Receipt className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nk-text">{inv.period}</p>
                    <p className="truncate text-xs text-nk-text-muted">
                      {inv.id} · {t("dueDate")}: {fmt(inv.dueDate)}
                      {paid && inv.paidAt ? ` · ${t("paidOn")}: ${fmt(inv.paidAt)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-nk-text">
                    {formatIDR(inv.amount)}
                  </p>
                  <div className="w-24 shrink-0 text-right">
                    {paid ? (
                      <StatusBadge color="green">{t("paid")}</StatusBadge>
                    ) : (
                      <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
                    )}
                  </div>
                </div>
              );
            })}
          </DashSection>
        </div>
      </div>
    </UserDashboardShell>
  );
}

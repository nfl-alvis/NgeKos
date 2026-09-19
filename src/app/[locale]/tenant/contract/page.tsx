"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, Circle, Download } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { invoices, rentalAgreements, tenants } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import { contractInfo, houseRules } from "@/lib/data/userData";
import { formatIDR } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";

const DEMO_TENANT = tenants.find((tn) => tn.id === "t-1")!;
const PROPERTY = getPropertyBySlug(DEMO_TENANT.propertySlug)!;

/** Kontrak / Masa Sewa - periode tenancy, syarat, dan peraturan kos. */
export default function TenantContractPage() {
  const t = useTranslations("tenantPages.contract");
  const locale = useLocale();

  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const active = rentalAgreements[rentalAgreements.length - 1];
  const history = [...rentalAgreements].reverse();
  const paidRows = invoices.filter((i) => i.tenantName === DEMO_TENANT.name && i.status === "lunas");

  const rows = [
    { k: t("fProperty"), v: PROPERTY.name },
    { k: t("fRoom"), v: DEMO_TENANT.roomNumber },
    { k: t("fStart"), v: fmt(contractInfo.startDate) },
    { k: t("fEnd"), v: fmt(contractInfo.endDate) },
    { k: t("fDuration"), v: t("monthsValue", { count: contractInfo.durationMonths }) },
    { k: t("fRent"), v: `${formatIDR(DEMO_TENANT.monthlyRent)} ${t("perMonth")}` },
    { k: t("fDeposit"), v: PROPERTY.depositInfo },
    { k: t("fNotice"), v: locale === "id" ? contractInfo.noticePeriodId : contractInfo.noticePeriodEn },
  ];

  return (
    <UserDashboardShell role="tenant" title={t("title")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E8EFF8]">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("activeTitle")}</h2>
              <StatusBadge color="blue">{t("statusActive")}</StatusBadge>
            </div>
            <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              <dl className="flex flex-col divide-y divide-nk-border">
                {rows.map((r) => (
                  <div key={r.k} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-sm text-nk-text-muted">{r.k}</dt>
                    <dd className="text-right text-sm font-medium text-nk-text">{r.v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-nk-border pt-4">
                <button
                  type="button"
                  onClick={() => downloadContract(t("fileName"))}
                  className="inline-flex items-center gap-1.5 border border-nk-border bg-nk-surface px-4 py-2 text-sm font-medium text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  <Download className="size-4" aria-hidden="true" />
                  {t("download")}
                </button>
                <Link
                  href="/tenant/bills"
                  className="inline-flex items-center gap-1.5 bg-nk-accent px-4 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  {t("seeBills")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          <DashSection title={t("renewalTitle")} bodyClass="p-4">
            <p className="text-sm text-nk-text">
              {locale === "id" ? contractInfo.renewalId : contractInfo.renewalEn}
            </p>
            <p className="mt-2 text-xs text-nk-text-muted">
              {t("renewalNote", { period: active?.period ?? "" })}
            </p>
          </DashSection>

          <DashSection title={t("historyTitle")} bodyClass="divide-y divide-nk-border">
            <ol className="flex flex-col">
              {history.map((ra, i) => (
                <li key={ra.period} className="flex items-start gap-3 px-4 py-3.5">
                  {i === 0 ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-[#2F6B3C]" aria-hidden="true" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-nk-text-muted" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-nk-text">{ra.period}</p>
                    <p className="text-xs text-nk-text-muted">
                      {ra.property} · {t("roomLabel")} {ra.room}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-nk-text">{formatIDR(ra.rent)}</p>
                    <StatusBadge color={i === 0 ? "green" : "gray"}>
                      {i === 0 ? t("statusActive") : t("statusEnded")}
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ol>
          </DashSection>
        </div>

        <aside className="flex flex-col gap-6">
          <DashSection title={t("rulesTitle")} bodyClass="p-4">
            <ul className="flex flex-col gap-2.5">
              {houseRules.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-nk-text">
                  <Check className="mt-0.5 size-4 shrink-0 text-nk-accent" aria-hidden="true" />
                  <span>{locale === "id" ? r.id : r.en}</span>
                </li>
              ))}
            </ul>
          </DashSection>

          <DashSection title={t("paidTitle")} bodyClass="divide-y divide-nk-border">
            <ul className="flex flex-col">
              {paidRows.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-nk-text">{inv.period}</p>
                    <p className="font-mono text-xs text-nk-text-muted">{inv.id}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-nk-text">
                    {formatIDR(inv.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </DashSection>
        </aside>
      </div>
    </UserDashboardShell>
  );
}

/** ekspor teks ringkasan kontrak (pola Blob download sama dgn Ekspor CSV owner) */
function downloadContract(fileName: string) {
  const lines = [
    "NgeKost - Ringkasan Kontrak Sewa",
    `Kos: ${PROPERTY.name}`,
    `Kamar: ${DEMO_TENANT.roomNumber}`,
    `Penyewa: ${DEMO_TENANT.name}`,
    `Mulai: ${contractInfo.startDate}`,
    `Berakhir: ${contractInfo.endDate}`,
    `Sewa/bulan: ${formatIDR(DEMO_TENANT.monthlyRent)}`,
    `Durasi: ${contractInfo.durationMonths} bulan`,
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

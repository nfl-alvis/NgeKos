"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  getOwnerProperties,
  invoices,
  rentalAgreements,
  tenants,
} from "@/lib/data/entities";
import type { Tenant } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";

export default function OwnerTenantsPage() {
  const t = useTranslations("owner.tenants");
  const ti = useTranslations("owner.invoices");
  const router = useRouter();

  const props = getOwnerProperties();
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Tenant | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? tenants : tenants.filter((tn) => tn.propertySlug === filter)),
    [filter]
  );

  const payBadge = (status: Tenant["paymentStatus"]) => {
    switch (status) {
      case "lunas":
        return <StatusBadge color="green">{t("payLunas")}</StatusBadge>;
      case "belum-bayar":
        return <StatusBadge color="yellow">{t("payBelum")}</StatusBadge>;
      default:
        return <StatusBadge color="red">{t("payMenunggak")}</StatusBadge>;
    }
  };

  const tenantInvoices = (tn: Tenant) => invoices.filter((inv) => inv.tenantName.toLowerCase() === tn.name.toLowerCase());

  return (
    <DashboardShell role="owner">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label={t("filterAll")}
          className="rounded-lg border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
        >
          <option value="all">{t("filterAll")}</option>
          {props.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* desktop tabel */}
      <div className="hidden overflow-hidden rounded-lg border border-nk-border bg-nk-surface lg:block">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
              <TableHead className="px-4 py-3 font-medium">{t("colTenant")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colPayment")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tn) => (
              <TableRow key={tn.id} className="border-b border-nk-border last:border-b-0">
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-warm text-sm font-medium text-nk-text">
                      {tn.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-nk-text">{tn.name}</span>
                      <span className="block truncate text-xs text-nk-text-muted">{tn.phone}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-nk-text">
                  {tn.propertyName}
                  <span className="block text-xs text-nk-text-muted">Kamar {tn.roomNumber}</span>
                </TableCell>
                <TableCell className="px-4 py-3">{payBadge(tn.paymentStatus)}</TableCell>
                <TableCell className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDetail(tn)}
                    className="rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                  >
                    {t("viewDetail")}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* mobile cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filtered.map((tn) => (
          <article key={tn.id} className="rounded-lg border border-nk-border bg-nk-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-warm text-sm font-medium text-nk-text">
                  {tn.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-nk-text">{tn.name}</span>
                  <span className="block truncate text-xs text-nk-text-muted">
                    {tn.propertyName} · {tn.roomNumber}
                  </span>
                </span>
              </div>
              {payBadge(tn.paymentStatus)}
            </div>
            <button
              type="button"
              onClick={() => setDetail(tn)}
              className="mt-3 w-full rounded-md border border-nk-border px-3 py-2 text-xs text-nk-text transition-colors hover:bg-nk-warm"
            >
              {t("viewDetail")}
            </button>
          </article>
        ))}
      </div>

      {/* modal detail tenant */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
        {detail && (
          <>
            <h2 className="pr-8 text-lg font-medium text-nk-text">{t("detailTitle")}</h2>
            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">{t("contact")}</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-nk-text-muted">{t("colTenant")}</dt>
              <dd className="text-right font-medium text-nk-text">{detail.name}</dd>
              <dt className="text-nk-text-muted">Telepon</dt>
              <dd className="text-right text-nk-text">{detail.phone}</dd>
              <dt className="text-nk-text-muted">Email</dt>
              <dd className="truncate text-right text-nk-text">{detail.email}</dd>
              <dt className="text-nk-text-muted">{t("joined")}</dt>
              <dd className="text-right text-nk-text">{detail.joinedAt}</dd>
            </dl>

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">{t("agreements")}</h3>
            <ul className="flex flex-col gap-2">
              {rentalAgreements
                .filter((ra) => ra.tenantId === detail.id)
                .map((ra, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border border-nk-border px-3 py-2 text-sm">
                    <span className="text-nk-text">{ra.property} · {ra.room}</span>
                    <span className="text-xs text-nk-text-muted">{ra.period}</span>
                    <span className="text-nk-text">{formatIDR(ra.rent)}</span>
                  </li>
                ))}
              {rentalAgreements.filter((ra) => ra.tenantId === detail.id).length === 0 && (
                <li className="text-sm text-nk-text-muted">-</li>
              )}
            </ul>

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">{t("invoices")}</h3>
            <ul className="flex flex-col gap-2">
              {tenantInvoices(detail).map((inv) => (
                <li key={inv.id} className="flex items-center justify-between rounded-md border border-nk-border px-3 py-2 text-sm">
                  <span className="text-nk-text">{inv.period}</span>
                  <span className="text-nk-text">{formatIDR(inv.amount)}</span>
                  {inv.status === "lunas" ? (
                    <StatusBadge color="green">{ti("statusLunas")}</StatusBadge>
                  ) : (
                    <StatusBadge color="yellow">{ti("statusBelum")}</StatusBadge>
                  )}
                </li>
              ))}
              {tenantInvoices(detail).length === 0 && (
                <li className="text-sm text-nk-text-muted">-</li>
              )}
            </ul>

            <button
              type="button"
              onClick={() => router.push("/owner/messages")}
              className="mt-6 w-full rounded-lg bg-nk-accent px-5 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              {t("sendMessage")}
            </button>
          </>
        )}
      </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

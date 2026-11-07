"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { Tenant } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";

export default function OwnerTenantsPage() {
  const t = useTranslations("owner.tenants");
  const ti = useTranslations("owner.invoices");
  const router = useRouter();

  const [propsList, setPropsList] = useState<Array<{ slug: string; name: string }>>([]);
  const [tenantsList, setTenantsList] = useState<Tenant[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Tenant | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      fetch("/api/properties?mine=true").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/bookings").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/invoices").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([propRes, bookRes, invRes]) => {
        if (propRes.status === "fulfilled" && propRes.value?.data && Array.isArray(propRes.value.data)) {
          const dbProps = propRes.value.data.map((p: any) => ({ slug: p.slug, name: p.name }));
          setPropsList(dbProps);
        } else {
          setPropsList([]);
        }

        const rawInvoices = invRes.status === "fulfilled" && invRes.value?.data && Array.isArray(invRes.value.data)
          ? invRes.value.data
          : [];
        setAllInvoices(rawInvoices);

        if (bookRes.status === "fulfilled" && bookRes.value?.data && Array.isArray(bookRes.value.data)) {
          setAllBookings(bookRes.value.data);
          const active = bookRes.value.data.filter((b: any) => b.status === "ACTIVE");
          const mapped: Tenant[] = active.map((b: any) => {
            const applicantEmail = b.applicant?.email || "";
            const tenantInvs = rawInvoices.filter(
              (i: any) =>
                (b.applicantId && i.tenantId === b.applicantId) ||
                (applicantEmail && i.tenant?.email === applicantEmail)
            );
            const hasOverdue = tenantInvs.some(
              (i: any) => i.status !== "PAID" && i.dueDate && new Date(i.dueDate) < new Date()
            );
            const hasPending = tenantInvs.some((i: any) => i.status !== "PAID");

            return {
              id: b.applicantId || b.id,
              name: b.applicant?.fullName || b.applicantName || "Penyewa",
              phone: b.applicant?.phone || "-",
              email: b.applicant?.email || "-",
              propertySlug: b.property?.slug || "",
              propertyName: b.property?.name || "Kost",
              roomNumber: b.roomUnit?.number || "-",
              monthlyRent: Number(b.monthlyPriceSnapshot || 0),
              startDate: typeof b.startDate === "string" ? b.startDate.slice(0, 10) : "-",
              joinedAt: typeof b.startDate === "string" ? b.startDate.slice(0, 10) : "-",
              paymentStatus: hasOverdue ? "menunggak" : hasPending ? "belum-bayar" : "lunas",
            };
          });
          setTenantsList(mapped);
        } else {
          setAllBookings([]);
          setTenantsList([]);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? tenantsList : tenantsList.filter((tn) => tn.propertySlug === filter)),
    [filter, tenantsList]
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

  const getTenantInvoices = (tn: Tenant) =>
    allInvoices
      .filter(
        (inv: any) =>
          inv.tenantId === tn.id ||
          (tn.email && inv.tenant?.email === tn.email) ||
          (inv.tenant?.fullName && inv.tenant.fullName.toLowerCase() === tn.name.toLowerCase())
      )
      .map((inv: any) => ({
        id: inv.id,
        period: inv.notes || inv.period || "Periode Berjalan",
        amount: Number(inv.amountSnapshot || inv.amount || 0),
        status: inv.status === "PAID" ? ("lunas" as const) : ("belum" as const),
      }));

  const getTenantAgreements = (tn: Tenant) =>
    allBookings
      .filter(
        (b: any) =>
          b.applicantId === tn.id ||
          b.id === tn.id ||
          (tn.email && b.applicant?.email === tn.email)
      )
      .map((b: any) => ({
        property: b.property?.name || tn.propertyName,
        room: b.roomUnit?.number ? `Kamar ${b.roomUnit.number}` : b.roomType?.name || tn.roomNumber,
        period: `${typeof b.startDate === "string" ? b.startDate.slice(0, 10) : "-"} s/d ${typeof b.endDate === "string" ? b.endDate.slice(0, 10) : "-"}`,
        rent: Number(b.monthlyPriceSnapshot || tn.monthlyRent || 0),
      }));

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
          {propsList.map((p) => (
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-xs text-nk-text-muted">
                  <Loader2 className="mx-auto size-5 animate-spin text-nk-accent" />
                  <span className="mt-2 block">Memuat data penyewa...</span>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-xs text-nk-text-muted">
                  Belum ada tenant aktif.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tn) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* mobile cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {isLoading ? (
          <div className="rounded-lg border border-nk-border bg-nk-surface p-8 text-center text-xs text-nk-text-muted">
            <Loader2 className="mx-auto size-5 animate-spin text-nk-accent" />
            <span className="mt-2 block">Memuat data penyewa...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-nk-border bg-nk-surface p-8 text-center text-xs text-nk-text-muted">
            Belum ada tenant aktif.
          </div>
        ) : (
          filtered.map((tn) => (
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
          ))
        )}
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
              {getTenantAgreements(detail).map((ra, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border border-nk-border px-3 py-2 text-sm">
                  <span className="text-nk-text">{ra.property} · {ra.room}</span>
                  <span className="text-xs text-nk-text-muted">{ra.period}</span>
                  <span className="text-nk-text">{formatIDR(ra.rent)}</span>
                </li>
              ))}
              {getTenantAgreements(detail).length === 0 && (
                <li className="text-sm text-nk-text-muted">-</li>
              )}
            </ul>

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">{t("invoices")}</h3>
            <ul className="flex flex-col gap-2">
              {getTenantInvoices(detail).map((inv) => (
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
              {getTenantInvoices(detail).length === 0 && (
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

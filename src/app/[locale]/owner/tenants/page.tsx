"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loader2, CalendarClock, AlertTriangle, Clock } from "lucide-react";
import type { Tenant } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";
import { getLeaseExpirationInfo } from "@/server/lease-extension-policy";

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
  const [leaseFilter, setLeaseFilter] = useState<"all" | "h30" | "h7">("all");
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

            const durationMonths = Number(b.durationMonths || 1);
            const expiration = getLeaseExpirationInfo({
              startDate: b.startDate,
              durationMonths,
              status: b.status,
              checkedOutAt: b.checkedOutAt,
            });

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
              endDate: expiration.endDate.toISOString().slice(0, 10),
              durationMonths,
              leaseExpiringStatus: expiration.expiringStatus,
              leaseDaysRemaining: expiration.daysRemaining,
              paymentStatus: hasOverdue ? "menunggak" : hasPending ? "belum-bayar" : "lunas",
              bookingId: b.id,
              checkedInAt: b.checkedInAt || null,
              checkOutRequestedAt: b.checkOutRequestedAt || null,
              checkedOutAt: b.checkedOutAt || null,
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

  const expiringH30Count = useMemo(
    () => tenantsList.filter((tn) => tn.leaseExpiringStatus === "EXPIRING_H30").length,
    [tenantsList]
  );
  const expiringH7Count = useMemo(
    () =>
      tenantsList.filter(
        (tn) => tn.leaseExpiringStatus === "EXPIRING_H7" || tn.leaseExpiringStatus === "EXPIRED"
      ).length,
    [tenantsList]
  );

  const filtered = useMemo(() => {
    return tenantsList.filter((tn) => {
      const matchProp = filter === "all" || tn.propertySlug === filter;
      if (!matchProp) return false;
      if (leaseFilter === "h7") {
        return tn.leaseExpiringStatus === "EXPIRING_H7" || tn.leaseExpiringStatus === "EXPIRED";
      }
      if (leaseFilter === "h30") {
        return tn.leaseExpiringStatus === "EXPIRING_H30";
      }
      return true;
    });
  }, [filter, leaseFilter, tenantsList]);

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
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
          <p className="text-xs text-nk-text-muted mt-0.5">
            Monitoring masa sewa, status hunian, dan penagihan penyewa kost aktif.
          </p>
        </div>
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

      {/* Summary Cards: Active, H-30, H-7 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setLeaseFilter("all")}
          className={`flex items-center justify-between p-4 rounded-lg border text-left transition cursor-pointer ${
            leaseFilter === "all"
              ? "border-nk-accent bg-nk-surface ring-2 ring-nk-accent/20"
              : "border-nk-border bg-nk-surface hover:bg-nk-warm"
          }`}
        >
          <div>
            <div className="text-xs font-medium text-nk-text-muted">Total Penyewa Aktif</div>
            <div className="text-2xl font-bold text-nk-text mt-1">{tenantsList.length}</div>
            <div className="text-[11px] text-nk-text-muted mt-0.5">Semua sewa berjalan</div>
          </div>
          <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setLeaseFilter((prev) => (prev === "h30" ? "all" : "h30"))}
          className={`flex items-center justify-between p-4 rounded-lg border text-left transition cursor-pointer ${
            leaseFilter === "h30"
              ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
              : "border-nk-border bg-nk-surface hover:bg-amber-50/30"
          }`}
        >
          <div>
            <div className="text-xs font-medium text-amber-800">Jatuh Tempo H-30</div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{expiringH30Count}</div>
            <div className="text-[11px] text-amber-700 mt-0.5">Masa sewa habis ≤ 30 hari</div>
          </div>
          <div className="p-2.5 rounded-full bg-amber-100 text-amber-700">
            <CalendarClock className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setLeaseFilter((prev) => (prev === "h7" ? "all" : "h7"))}
          className={`flex items-center justify-between p-4 rounded-lg border text-left transition cursor-pointer ${
            leaseFilter === "h7"
              ? "border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20"
              : "border-nk-border bg-nk-surface hover:bg-rose-50/30"
          }`}
        >
          <div>
            <div className="text-xs font-medium text-rose-800">Kritis H-7 / Jatuh Tempo</div>
            <div className="text-2xl font-bold text-rose-900 mt-1">{expiringH7Count}</div>
            <div className="text-[11px] text-rose-700 mt-0.5">Perlu perpanjangan / checkout</div>
          </div>
          <div className="p-2.5 rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* desktop tabel */}
      <div className="hidden overflow-hidden rounded-lg border border-nk-border bg-nk-surface lg:block">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
              <TableHead className="px-4 py-3 font-medium">{t("colTenant")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">Masa Sewa</TableHead>
              <TableHead className="px-4 py-3 font-medium">Status Hunian</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colPayment")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-xs text-nk-text-muted">
                  <Loader2 className="mx-auto size-5 animate-spin text-nk-accent" />
                  <span className="mt-2 block">Memuat data penyewa...</span>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-xs text-nk-text-muted">
                  {leaseFilter !== "all"
                    ? "Tidak ada penyewa pada kategori status masa sewa ini."
                    : "Belum ada tenant aktif."}
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
                  <TableCell className="px-4 py-3">
                    {tn.leaseExpiringStatus === "EXPIRING_H7" || tn.leaseExpiringStatus === "EXPIRED" ? (
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge color="red">
                          {tn.leaseDaysRemaining !== undefined && tn.leaseDaysRemaining <= 0
                            ? "Jatuh Tempo"
                            : `Kritis H-${tn.leaseDaysRemaining}`}
                        </StatusBadge>
                        <span className="text-[11px] text-nk-text-muted">{tn.endDate}</span>
                      </div>
                    ) : tn.leaseExpiringStatus === "EXPIRING_H30" ? (
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge color="yellow">H-{tn.leaseDaysRemaining}</StatusBadge>
                        <span className="text-[11px] text-nk-text-muted">{tn.endDate}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-nk-text">{tn.endDate || "-"}</span>
                        <span className="text-[11px] text-nk-text-muted">
                          {tn.leaseDaysRemaining !== undefined ? `${tn.leaseDaysRemaining} hari lagi` : ""}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {tn.checkedOutAt ? (
                      <StatusBadge color="gray">Selesai Out</StatusBadge>
                    ) : tn.checkOutRequestedAt ? (
                      <StatusBadge color="yellow">Pengajuan Out</StatusBadge>
                    ) : tn.checkedInAt ? (
                      <StatusBadge color="green">Check-in</StatusBadge>
                    ) : (
                      <StatusBadge color="blue">Belum In</StatusBadge>
                    )}
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
            {leaseFilter !== "all"
              ? "Tidak ada penyewa pada kategori status masa sewa ini."
              : "Belum ada tenant aktif."}
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
                <div className="flex flex-col items-end gap-1">
                  {payBadge(tn.paymentStatus)}
                  {tn.leaseExpiringStatus === "EXPIRING_H7" || tn.leaseExpiringStatus === "EXPIRED" ? (
                    <StatusBadge color="red">
                      {tn.leaseDaysRemaining !== undefined && tn.leaseDaysRemaining <= 0
                        ? "Jatuh Tempo"
                        : `H-${tn.leaseDaysRemaining}`}
                    </StatusBadge>
                  ) : tn.leaseExpiringStatus === "EXPIRING_H30" ? (
                    <StatusBadge color="yellow">H-{tn.leaseDaysRemaining}</StatusBadge>
                  ) : null}
                </div>
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

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">Masa Sewa & Rollover Deposit</h3>
            <div className="rounded-md border border-nk-border bg-nk-section/40 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-nk-text-muted">Jatuh Tempo Masa Sewa:</span>
                <span className="font-semibold text-nk-text">{detail.endDate || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-nk-text-muted">Sisa Durasi:</span>
                <span className="font-semibold text-nk-text">
                  {detail.leaseDaysRemaining !== undefined ? `${detail.leaseDaysRemaining} hari` : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-nk-text-muted">Status Kontrak:</span>
                {detail.leaseExpiringStatus === "EXPIRING_H7" || detail.leaseExpiringStatus === "EXPIRED" ? (
                  <span className="font-bold text-rose-600">Kritis (H-7 / Jatuh Tempo)</span>
                ) : detail.leaseExpiringStatus === "EXPIRING_H30" ? (
                  <span className="font-semibold text-amber-600">Mendekati Berakhir (H-30)</span>
                ) : (
                  <span className="font-medium text-emerald-600">Aktif Normal</span>
                )}
              </div>
              <div className="pt-1.5 border-t border-nk-border text-[11px] text-neutral-500">
                Uang jaminan (deposit) otomatis bergulir tanpa biaya baru saat penyewa memperpanjang sewa.
              </div>
            </div>

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

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">Status Hunian & Check-In</h3>
            <div className="rounded-md border border-nk-border bg-nk-section/40 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-nk-text-muted">Kedatangan:</span>
                {detail.checkedOutAt ? (
                  <span className="font-medium text-nk-text-muted">Sudah Check-out</span>
                ) : detail.checkOutRequestedAt ? (
                  <span className="font-medium text-amber-700">Pengajuan Check-out Diproses</span>
                ) : detail.checkedInAt ? (
                  <span className="font-medium text-emerald-700">Sudah Check-in</span>
                ) : (
                  <span className="font-medium text-blue-700">Belum Check-in</span>
                )}
              </div>
            </div>

            {detail.bookingId && !detail.checkedInAt && (
              <button
                type="button"
                onClick={() => router.push("/owner/bookings")}
                className="mt-3 w-full rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                Kelola Check-In di Menu Booking
              </button>
            )}

            {detail.bookingId && detail.checkedInAt && !detail.checkedOutAt && (
              <button
                type="button"
                onClick={() => router.push("/owner/bookings")}
                className="mt-3 w-full rounded-md border border-nk-border bg-nk-surface px-4 py-2 text-xs font-semibold text-nk-text hover:bg-nk-warm transition"
              >
                Kelola Check-Out di Menu Booking
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/owner/messages")}
              className="mt-4 w-full rounded-lg bg-nk-accent px-5 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
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

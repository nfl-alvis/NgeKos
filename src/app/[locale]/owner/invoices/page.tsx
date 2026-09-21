"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AlertCircle, Receipt } from "lucide-react";
import { invoices as seedInvoices, tenants } from "@/lib/data/entities";
import type { Invoice } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";

export default function OwnerInvoicesPage() {
  const t = useTranslations("owner.invoices");
  const [filter, setFilter] = useState<"all" | "lunas" | "belum">("all");
  const [rows, setRows] = useState<Invoice[]>(seedInvoices);
  const [createOpen, setCreateOpen] = useState(false);
  const [newInv, setNewInv] = useState({ tenant: "", period: "", amount: "" });
  const [tenantList, setTenantList] = useState<Array<{ id: string; name: string; agreementId?: string; monthlyPrice?: number }>>(
    tenants.map((tn) => ({ id: tn.id, name: tn.name, monthlyPrice: tn.monthlyRent }))
  );

  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: Invoice[] = json.data.map((item: any) => ({
            id: item.code || item.id,
            tenantName: item.tenant?.fullName || item.tenantName || "Penyewa",
            period: item.period || "Periode Berjalan",
            amount: Number(item.amountSnapshot || item.amount || 0),
            status: item.status === "PAID" ? "lunas" : "belum-lunas",
            dueDate:
              typeof item.dueDate === "string"
                ? item.dueDate.slice(0, 10)
                : "2026-09-20",
          }));
          const existingIds = new Set(mapped.map((m: any) => m.id));
          const merged = [...mapped, ...seedInvoices.filter((s) => !existingIds.has(s.id))];
          setRows(merged);
        }
      })
      .catch(() => {});

    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          const activeBookings = json.data.filter((b: any) => b.status === "ACTIVE");
          if (activeBookings.length > 0) {
            const mapped = activeBookings.map((b: any) => ({
              id: b.id,
              name: b.applicant?.fullName || b.applicantName || "Penyewa",
              agreementId: b.agreement?.id || b.id,
              monthlyPrice: Number(b.monthlyPriceSnapshot || 0),
            }));
            const existingTenantIds = new Set(mapped.map((m: any) => m.id));
            const initialTenants = tenants.map((tn) => ({ id: tn.id, name: tn.name, monthlyPrice: tn.monthlyRent }));
            const merged = [...mapped, ...initialTenants.filter((t) => !existingTenantIds.has(t.id))];
            setTenantList(merged);
          }
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (filter === "lunas") return rows.filter((r) => r.status === "lunas");
    if (filter === "belum") return rows.filter((r) => r.status !== "lunas");
    return rows;
  }, [filter, rows]);

  const unpaidThisMonth = rows.filter((r) => r.status !== "lunas").length;
  const arrears = tenants.filter((tn) => tn.paymentStatus === "menunggak").length;

  const markPaid = async (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "lunas" as const } : r)));
    try {
      await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
    } catch {
      // fallback
    }
  };

  const tabs = [
    { id: "all" as const, label: t("filterAll") },
    { id: "lunas" as const, label: t("statusLunas") },
    { id: "belum" as const, label: t("statusBelum") },
  ];

  const badge = (inv: Invoice) =>
    inv.status === "lunas" ? (
      <StatusBadge color="green">{t("statusLunas")}</StatusBadge>
    ) : (
      <StatusBadge color="yellow">{t("statusBelum")}</StatusBadge>
    );

  return (
    <DashboardShell role="owner">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="w-fit rounded-lg bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {t("create")}
        </button>
      </div>

      {/* ringkasan - band judul tinted di atas, card putih menyatu di bawah */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E8EFF8]">
          <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("summaryUnpaid")}</p>
          <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#D3E0F0] text-[#33517C]">
                <Receipt className="size-4" aria-hidden="true" />
              </div>
              <p className="truncate text-2xl font-semibold tracking-tight text-nk-text">
                {unpaidThisMonth}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#FAEAE8]">
          <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("summaryArrears")}</p>
          <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3D7D3] text-[#9C3B32]">
                <AlertCircle className="size-4" aria-hidden="true" />
              </div>
              <p className="truncate text-2xl font-semibold tracking-tight text-nk-text">
                {arrears}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* tab filter */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="mb-5 flex h-auto w-fit gap-1 rounded-lg border border-nk-border bg-nk-surface p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-md px-3.5 py-2 text-sm font-normal transition-colors data-[state=active]:bg-nk-accent data-[state=active]:font-medium data-[state=active]:text-nk-text-inverse data-[state=inactive]:text-nk-text-muted hover:data-[state=inactive]:text-nk-text"
          >
            {tab.label}
          </TabsTrigger>
        ))}
        </TabsList>

      </Tabs>

      {/* desktop tabel */}
      <div className="hidden overflow-hidden rounded-lg border border-nk-border bg-nk-surface lg:block">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
              <TableHead className="px-4 py-3 font-medium">{t("colTenant")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colPeriod")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colAmount")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colDue")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((inv) => (
              <TableRow key={inv.id} className="border-b border-nk-border last:border-b-0">
                <TableCell className="px-4 py-3 font-medium text-nk-text">{inv.tenantName}</TableCell>
                <TableCell className="px-4 py-3 text-nk-text">{inv.period}</TableCell>
                <TableCell className="px-4 py-3 text-nk-text">{formatIDR(inv.amount)}</TableCell>
                <TableCell className="px-4 py-3">{badge(inv)}</TableCell>
                <TableCell className="px-4 py-3 text-nk-text-muted">{inv.dueDate}</TableCell>
                <TableCell className="px-4 py-3">
                  {inv.status === "lunas" ? (
                    <span className="text-xs text-nk-text-muted">
                      {t("paidOn", { date: inv.paidAt ?? "" })}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markPaid(inv.id)}
                      className="rounded-md border border-nk-border px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.98]"
                    >
                      {t("markPaid")}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* mobile cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filtered.map((inv) => (
          <article key={inv.id} className="rounded-lg border border-nk-border bg-nk-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-nk-text">{inv.tenantName}</p>
                <p className="text-xs text-nk-text-muted">
                  {inv.period} · {formatIDR(inv.amount)}
                </p>
                <p className="mt-0.5 text-xs text-nk-text-muted">{inv.dueDate}</p>
              </div>
              {badge(inv)}
            </div>
            {inv.status !== "lunas" && (
              <button
                type="button"
                onClick={() => markPaid(inv.id)}
                className="mt-3 w-full rounded-md border border-nk-border px-3 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm"
              >
                {t("markPaid")}
              </button>
            )}
          </article>
        ))}
      </div>

      {/* modal buat tagihan manual */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent className="max-w-sm">
        <h2 className="pr-8 text-lg font-medium text-nk-text">{t("create")}</h2>
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inv-tenant" className="text-sm font-medium text-nk-text">
              {t("tenant")}
            </label>
            <select
              id="inv-tenant"
              value={newInv.tenant}
              onChange={(e) => {
                const selected = tenantList.find((tn) => tn.name === e.target.value);
                setNewInv((v) => ({
                  ...v,
                  tenant: e.target.value,
                  amount: selected?.monthlyPrice ? String(selected.monthlyPrice) : v.amount,
                }));
              }}
              className="rounded-lg border border-nk-border bg-nk-surface px-3 py-2.5 text-sm text-nk-text outline-none focus:border-nk-accent"
            >
              <option value="">-</option>
              {tenantList.map((tn) => (
                <option key={tn.id} value={tn.name}>
                  {tn.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inv-period" className="text-sm font-medium text-nk-text">
              {t("colPeriod")}
            </label>
            <input
              id="inv-period"
              type="month"
              value={newInv.period}
              onChange={(e) => setNewInv((v) => ({ ...v, period: e.target.value }))}
              className="rounded-lg border border-nk-border bg-nk-surface px-3 py-2.5 text-sm text-nk-text outline-none focus:border-nk-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inv-amount" className="text-sm font-medium text-nk-text">
              {t("colAmount")}
            </label>
            <input
              id="inv-amount"
              type="number"
              min="0"
              value={newInv.amount}
              onChange={(e) => setNewInv((v) => ({ ...v, amount: e.target.value }))}
              className="rounded-lg border border-nk-border bg-nk-surface px-3 py-2.5 text-sm text-nk-text outline-none focus:border-nk-accent"
            />
          </div>
          <button
            type="button"
            disabled={!newInv.tenant || !newInv.period || !newInv.amount}
            onClick={async () => {
              const selected = tenantList.find((tn) => tn.name === newInv.tenant);
              const newInvoiceId = `INV-${String(rows.length + 1).padStart(4, "0")}`;
              const periodParts = newInv.period.split("-");
              const year = Number(periodParts[0]);
              const month = Number(periodParts[1]);
              const pStart = `${year}-${String(month).padStart(2, "0")}-01`;
              const lastDay = new Date(year, month, 0).getDate();
              const pEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
              const dDate = `${year}-${String(month).padStart(2, "0")}-20`;

              setRows((prev) => [
                {
                  id: newInvoiceId,
                  tenantName: newInv.tenant,
                  period: newInv.period,
                  amount: Number(newInv.amount),
                  status: "belum-lunas",
                  dueDate: dDate,
                },
                ...prev,
              ]);
              setNewInv({ tenant: "", period: "", amount: "" });
              setCreateOpen(false);

              if (selected?.agreementId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selected.agreementId)) {
                try {
                  await fetch("/api/invoices", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      agreementId: selected.agreementId,
                      periodStart: pStart,
                      periodEnd: pEnd,
                      dueDate: dDate,
                      amount: Number(newInv.amount),
                      notes: `Tagihan periode ${newInv.period}`,
                    }),
                  });
                } catch {
                  // fallback
                }
              }
            }}
            className="rounded-lg bg-nk-accent px-5 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("create")}
          </button>
        </div>
      </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

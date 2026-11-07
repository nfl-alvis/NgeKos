"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Download,
  LogIn,
  Receipt,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { formatIDR, cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useSession } from "@/components/SessionProvider";
import { Link } from "@/i18n/navigation";

type ApiPayment = {
  id: string;
  amount: number;
  status: string;
  method?: string;
  paidAt?: string;
  createdAt?: string;
};

type ApiInvoice = {
  id: string;
  code?: string;
  amount: number;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  status: string;
  notes?: string | null;
  paidAt?: string | null;
  property?: {
    id: string;
    name: string;
    slug: string;
  };
  payments?: ApiPayment[];
};

type ApiBooking = {
  id: string;
  status: string;
  property?: {
    id: string;
    name: string;
    slug: string;
  };
};

/** Riwayat pembayaran sewa - metode, tanggal bayar, nominal, status lunas. */
export default function TenantPaymentsPage() {
  const t = useTranslations("tenantPages.payments");
  const locale = useLocale();
  const { user, ready } = useSession();

  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);

  const handleRefresh = useCallback(() => {
    setIsFetching(true);
    setErrorMessage(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;

    Promise.allSettled([
      fetch("/api/invoices").then((res) => (res.ok ? res.json() : null)),
      fetch("/api/bookings").then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([invoicesRes, bookingsRes]) => {
        if (ignore) return;
        if (invoicesRes.status === "fulfilled" && invoicesRes.value?.data) {
          const rawInvoices: ApiInvoice[] = Array.isArray(invoicesRes.value.data)
            ? invoicesRes.value.data
            : [];
          setInvoices(rawInvoices);
        } else {
          setInvoices([]);
        }

        if (bookingsRes.status === "fulfilled" && bookingsRes.value?.data) {
          const rawBookings: ApiBooking[] = Array.isArray(bookingsRes.value.data)
            ? bookingsRes.value.data
            : [];
          const active = rawBookings.find(
            (b) => b.status === "ACTIVE" || b.status === "APPROVED_AWAITING_PAYMENT"
          );
          setActiveBooking(active || null);
        }
        setIsFetching(false);
      })
      .catch(() => {
        if (!ignore) {
          setErrorMessage(
            locale === "id"
              ? "Gagal memuat riwayat pembayaran. Silakan muat ulang halaman."
              : "Failed to load payment history. Please reload the page."
          );
          setIsFetching(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [ready, user, locale, refreshKey]);

  const isLoading = !ready || (Boolean(user) && isFetching);

  const fmt = (iso?: string | Date | null) => {
    if (!iso) return "-";
    try {
      const d = typeof iso === "string" ? new Date(iso) : iso;
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return "-";
    }
  };

  const getPeriodLabel = (inv: ApiInvoice) => {
    if (inv.notes && inv.notes.trim().length > 0) return inv.notes;
    if (inv.periodStart) {
      try {
        const d = new Date(inv.periodStart);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          });
        }
      } catch {}
    }
    if (inv.dueDate) {
      try {
        const d = new Date(inv.dueDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          });
        }
      } catch {}
    }
    return locale === "id" ? "Periode Sewa" : "Rental Period";
  };

  const isPaid = (inv: ApiInvoice) => {
    const s = String(inv.status || "").toUpperCase();
    return s === "PAID" || Boolean(inv.paidAt);
  };

  // Sort by paidAt or dueDate desc
  const sortedInvoices = [...invoices].sort((a, b) => {
    const timeA = a.paidAt || a.dueDate || "";
    const timeB = b.paidAt || b.dueDate || "";
    return timeB.localeCompare(timeA);
  });

  const paidInvoices = sortedInvoices.filter(isPaid);
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const paidCount = paidInvoices.length;
  const averagePaid = Math.round(totalPaid / Math.max(1, paidCount));

  // Determine latest payment method
  const latestPayment = paidInvoices
    .flatMap((inv) => inv.payments || [])
    .find((p) => p.status === "SUCCESS" || p.status === "SETTLEMENT" || p.status === "VERIFIED");
  const primaryMethod = latestPayment?.method
    ? latestPayment.method.toUpperCase()
    : paidCount > 0
    ? "Transfer Bank"
    : "-";

  const exportCsv = () => {
    const header = [t("colPeriod"), t("colPaid"), t("colAmount"), t("colStatus"), t("colMethod")];
    const body = sortedInvoices.map((inv) => {
      const paid = isPaid(inv);
      const paidDate = inv.paidAt ? fmt(inv.paidAt) : inv.dueDate ? fmt(inv.dueDate) : "-";
      const method = inv.payments?.[0]?.method || (paid ? "Transfer Bank" : "-");
      const statusText = paid ? t("paid") : t("unpaid");
      return [getPeriodLabel(inv), paidDate, String(inv.amount), statusText, method];
    });

    const csv = [header, ...body].map((cols) => cols.map((c) => `"${c}"`).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "riwayat-pembayaran-sewa.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const propertyName =
    activeBooking?.property?.name || sortedInvoices[0]?.property?.name || (locale === "id" ? "Kost Saya" : "My Kost");

  return (
    <UserDashboardShell
      role="tenant"
      title={t("title")}
      greeting={
        user?.name
          ? `${locale === "id" ? "Halo" : "Hello"}, ${user.name.split(" ")[0]}`
          : undefined
      }
      actions={
        user ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={sortedInvoices.length === 0}
              className="inline-flex items-center gap-1.5 border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm disabled:opacity-50"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span>{t("exportCsv")}</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition hover:bg-nk-warm disabled:opacity-50"
              title={locale === "id" ? "Segarkan data pembayaran" : "Refresh payment data"}
            >
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
              <span>{locale === "id" ? "Perbarui" : "Refresh"}</span>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Error state */}
      {errorMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-md bg-red-100 px-3 py-1 font-medium text-red-900 hover:bg-red-200"
          >
            {locale === "id" ? "Coba Lagi" : "Retry"}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="flex flex-col gap-6 animate-pulse" aria-label="Loading payments">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <div className="h-28 rounded-xl bg-nk-section" />
            <div className="h-28 rounded-xl bg-nk-section" />
            <div className="h-28 rounded-xl bg-nk-section" />
            <div className="h-28 rounded-xl bg-nk-section" />
          </div>
          <div className="h-80 rounded-xl bg-nk-section" />
        </div>
      ) : !user ? (
        /* Unauthenticated State */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-12 text-center shadow-sm">
          <LogIn className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h2 className="text-lg font-semibold text-nk-text">
            {locale === "id" ? "Masuk ke Akun Anda" : "Sign In to Your Account"}
          </h2>
          <p className="mt-1 text-sm text-nk-text-muted max-w-md mx-auto">
            {locale === "id"
              ? "Silakan masuk dengan akun penyewa Anda untuk melihat riwayat pembayaran sewa dan bukti transaksi."
              : "Please sign in with your tenant account to view your payment history and transaction records."}
          </p>
          <Link
            href="/login?from=/tenant/payments"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : (
        /* Authenticated View */
        <>
          {/* Summary Stat Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              {
                k: t("sumTotal"),
                v: formatIDR(totalPaid),
                tint: "bg-[#E9F4EC]",
              },
              {
                k: t("sumMonths"),
                v: String(paidCount),
                tint: "bg-[#E8EFF8]",
              },
              {
                k: t("sumMethod"),
                v: primaryMethod,
                tint: "bg-[#FBF3DC]",
              },
              {
                k: t("sumAverage"),
                v: formatIDR(averagePaid),
                tint: "bg-[#F3EDE6]",
              },
            ].map((s) => (
              <div
                key={s.k}
                className={`flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 ${s.tint}`}
              >
                <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{s.k}</p>
                <div className="flex flex-1 flex-col justify-center rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
                  <p className="text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {s.v}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Payments Table */}
          <DashSection
            title={t("historyTitle")}
            right={<span className="text-xs text-nk-text-muted">{propertyName}</span>}
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
                  {sortedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-12 text-center text-sm text-nk-text-muted"
                      >
                        <Receipt className="mx-auto size-8 text-nk-text-muted opacity-40 mb-2" />
                        <p>{t("noPayments") || "Belum ada riwayat pembayaran"}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedInvoices.map((inv) => {
                      const paid = isPaid(inv);
                      const paymentMethod =
                        inv.payments?.[0]?.method || (paid ? "Transfer Bank" : "-");

                      return (
                        <TableRow
                          key={inv.id}
                          className="border-b border-nk-border last:border-b-0"
                        >
                          <TableCell className="px-4 py-3">
                            <p className="font-medium text-nk-text">{getPeriodLabel(inv)}</p>
                            <p className="font-mono text-xs text-nk-text-muted">
                              {inv.code || inv.id}
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums font-medium text-nk-text">
                            {formatIDR(inv.amount)}
                          </TableCell>
                          <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted">
                            {inv.paidAt ? fmt(inv.paidAt) : inv.dueDate ? fmt(inv.dueDate) : "-"}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-nk-text-muted">
                            {paymentMethod}
                          </TableCell>
                          <TableCell className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge color={paid ? "green" : inv.status === "OVERDUE" ? "red" : "yellow"}>
                              {paid ? t("paid") : t("unpaid")}
                            </StatusBadge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </DashSection>
        </>
      )}
    </UserDashboardShell>
  );
}

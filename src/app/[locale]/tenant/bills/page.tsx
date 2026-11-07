"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle2,
  LogIn,
  Receipt,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatIDR, cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { getKosImage } from "@/lib/kosImages";
import { useSession } from "@/components/SessionProvider";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type ApiInvoice = {
  id: string;
  code?: string;
  agreementId?: string;
  tenantId?: string;
  propertyId?: string;
  periodStart?: string;
  periodEnd?: string;
  dueDate: string;
  amount: number;
  status: "DRAFT" | "ISSUED" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | string;
  notes?: string | null;
  issuedAt?: string | null;
  paidAt?: string | null;
  property?: {
    id: string;
    name: string;
    slug: string;
  };
  tenant?: {
    id: string;
    fullName: string;
    email: string;
  };
  payments?: Array<{
    id: string;
    amount: number;
    status: string;
    method?: string;
    paidAt?: string;
  }>;
};

type ApiBooking = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyPriceSnapshot: number;
  property?: {
    id: string;
    slug: string;
    name: string;
    city?: string;
    address?: string;
  };
  roomUnit?: {
    id: string;
    number: string;
  };
};

export default function TenantBillsPage() {
  const t = useTranslations("tenantPages.bills");
  const locale = useLocale();
  const { user, ready } = useSession();

  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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
          const rawInvoices = Array.isArray(invoicesRes.value.data) ? invoicesRes.value.data : [];
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
              ? "Gagal memuat data tagihan. Silakan muat ulang halaman."
              : "Failed to load billing data. Please reload the page."
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
        month: "long",
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

  // Sort rows by dueDate desc for history list
  const rows = [...invoices].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const unpaidInvoices = rows.filter((inv) => !isPaid(inv) && inv.status !== "CANCELLED");

  // nextDue is the unpaid invoice with earliest due date
  const nextDue =
    unpaidInvoices.length > 0
      ? [...unpaidInvoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
      : null;

  const outstanding = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const propertySlug = activeBooking?.property?.slug || nextDue?.property?.slug || "";
  const propertyName = activeBooking?.property?.name || nextDue?.property?.name || "Kost";

  return (
    <UserDashboardShell
      role="tenant"
      title={t("title")}
      greeting={user?.name ? `${locale === "id" ? "Halo" : "Hello"}, ${user.name.split(" ")[0]}` : undefined}
      actions={
        user ? (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition hover:bg-nk-warm disabled:opacity-50"
            title={locale === "id" ? "Segarkan data tagihan" : "Refresh billing data"}
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>{locale === "id" ? "Perbarui" : "Refresh"}</span>
          </button>
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-pulse" aria-label="Loading bills">
          <div className="flex flex-col gap-6">
            <div className="h-64 rounded-xl bg-nk-section" />
          </div>
          <div className="lg:col-span-2">
            <div className="h-80 rounded-xl bg-nk-section" />
          </div>
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
              ? "Silakan masuk dengan akun penyewa Anda untuk melihat riwayat tagihan dan melakukan pembayaran sewa."
              : "Please sign in with your tenant account to view your billing history and manage rent payments."}
          </p>
          <Link
            href="/login?from=/tenant/bills"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : (
        /* Authenticated View */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Tagihan Berikutnya */}
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E8EFF8]">
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <h2 className="text-sm font-semibold text-nk-text">{t("nextTitle")}</h2>
                {nextDue ? (
                  nextDue.status === "OVERDUE" ? (
                    <StatusBadge color="red">{locale === "id" ? "Jatuh Tempo" : "Overdue"}</StatusBadge>
                  ) : (
                    <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
                  )
                ) : (
                  <StatusBadge color="green">{t("allPaid")}</StatusBadge>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
                {nextDue ? (
                  <>
                    <p className="text-xs text-nk-text-muted">{getPeriodLabel(nextDue)}</p>
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
                        <dd className="font-medium tabular-nums text-nk-text">
                          {formatIDR(outstanding)}
                        </dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInvoice(nextDue);
                        setPaymentDialogOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                    >
                      <Wallet className="size-4" aria-hidden="true" />
                      {t("payCta")}
                    </button>
                  </>
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Receipt className="size-9 text-nk-text-muted opacity-50" aria-hidden="true" />
                    <p className="text-sm font-medium text-nk-text">
                      {locale === "id" ? "Belum Ada Tagihan" : "No Bills Available"}
                    </p>
                    <p className="text-xs text-nk-text-muted">
                      {locale === "id"
                        ? "Anda belum memiliki tagihan aktif saat ini."
                        : "You do not have any active bills at the moment."}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CheckCircle2 className="size-9 text-[#2F6B3C]" aria-hidden="true" />
                    <p className="text-sm font-medium text-nk-text">{t("allPaid")}</p>
                    <p className="text-xs text-nk-text-muted">
                      {activeBooking?.endDate
                        ? t("allPaidNote", { date: fmt(activeBooking.endDate) })
                        : locale === "id"
                          ? "Semua tagihan sewa Anda sudah lunas."
                          : "All of your rent bills are paid."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Daftar Riwayat Tagihan */}
          <div className="lg:col-span-2">
            <DashSection
              title={t("historyTitle")}
              right={
                <span className="text-xs text-nk-text-muted tabular-nums">
                  {t("paidCount", {
                    paid: rows.filter(isPaid).length,
                    total: rows.length,
                  })}
                </span>
              }
              bodyClass="divide-y divide-nk-border"
            >
              {rows.length === 0 ? (
                <p className="p-8 text-center text-xs text-nk-text-muted">
                  {locale === "id" ? "Belum ada riwayat tagihan." : "No billing history yet."}
                </p>
              ) : (
                rows.map((inv) => {
                  const paid = isPaid(inv);
                  const itemPropertySlug = inv.property?.slug || propertySlug;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 px-4 py-3.5">
                      <Image
                        src={getKosImage(itemPropertySlug || "default", "main")}
                        alt=""
                        width={40}
                        height={40}
                        className="hidden size-10 shrink-0 rounded-md object-cover sm:block"
                      />
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-section text-nk-text-muted sm:hidden"
                        aria-hidden="true"
                      >
                        <Receipt className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-nk-text">
                          {getPeriodLabel(inv)}
                        </p>
                        <p className="truncate text-xs text-nk-text-muted">
                          {inv.code || inv.id} · {t("dueDate")}: {fmt(inv.dueDate)}
                          {paid && inv.paidAt ? ` · ${t("paidOn")}: ${fmt(inv.paidAt)}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-nk-text">
                        {formatIDR(inv.amount)}
                      </p>
                      <div className="w-28 shrink-0 text-right flex items-center justify-end gap-1.5">
                        {paid ? (
                          <StatusBadge color="green">{t("paid")}</StatusBadge>
                        ) : inv.status === "OVERDUE" ? (
                          <StatusBadge color="red">
                            {locale === "id" ? "Jatuh Tempo" : "Overdue"}
                          </StatusBadge>
                        ) : (
                          <StatusBadge color="yellow">{t("unpaid")}</StatusBadge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </DashSection>
          </div>
        </div>
      )}

      {/* Payment Details Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {locale === "id" ? "Rincian & Instruksi Pembayaran" : "Payment Details & Instructions"}
            </DialogTitle>
            <DialogDescription>
              {locale === "id"
                ? "Silakan lakukan pembayaran sesuai jumlah dan batas waktu yang tercantum di bawah ini."
                : "Please make the payment according to the amount and due date below."}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-2 text-sm">
              <div className="rounded-lg bg-nk-section p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-nk-text-muted">{locale === "id" ? "No. Tagihan" : "Invoice No"}</span>
                  <span className="font-mono font-medium text-nk-text">{selectedInvoice.code || selectedInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nk-text-muted">{locale === "id" ? "Periode" : "Period"}</span>
                  <span className="font-medium text-nk-text">{getPeriodLabel(selectedInvoice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nk-text-muted">{locale === "id" ? "Properti" : "Property"}</span>
                  <span className="font-medium text-nk-text">
                    {selectedInvoice.property?.name || propertyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nk-text-muted">{t("dueDate")}</span>
                  <span className="font-medium text-nk-text">{fmt(selectedInvoice.dueDate)}</span>
                </div>
                <div className="border-t border-nk-border pt-2 flex justify-between items-baseline">
                  <span className="font-semibold text-nk-text">{locale === "id" ? "Jumlah Tagihan" : "Amount Due"}</span>
                  <span className="text-xl font-bold text-nk-text tabular-nums">
                    {formatIDR(selectedInvoice.amount)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
                <p className="font-semibold">
                  {locale === "id" ? "Petunjuk Pembayaran" : "Payment Instructions"}
                </p>
                <p>
                  {locale === "id"
                    ? "Lakukan pembayaran melalui transfer bank ke rekening pemilik kost. Setelah pembayaran dilakukan, pemilik kos akan memverifikasi dan status tagihan akan terbarui secara otomatis."
                    : "Make the payment via bank transfer to the property owner's account. Once completed, the owner will verify it and your invoice status will update automatically."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Link
              href="/tenant/dashboard#pesan"
              onClick={() => setPaymentDialogOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-nk-border bg-nk-surface px-4 py-2 text-xs font-medium text-nk-text transition hover:bg-nk-warm"
            >
              {locale === "id" ? "Hubungi Pemilik Kos" : "Contact Owner"}
            </Link>
            <button
              type="button"
              onClick={() => setPaymentDialogOpen(false)}
              className="inline-flex items-center justify-center rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition hover:opacity-90"
            >
              {locale === "id" ? "Tutup" : "Close"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardShell>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useSession } from "@/components/SessionProvider";
import { Link } from "@/i18n/navigation";

type ComplaintCategory = "FACILITY" | "CLEANLINESS" | "SECURITY" | "PAYMENT" | "OTHER";
type ComplaintStatus = "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type ApiComplaint = {
  id: string;
  code?: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  status: ComplaintStatus;
  ownerNote?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  property?: {
    id: string;
    name: string;
    slug: string;
  };
  agreement?: {
    id: string;
    roomUnit?: {
      number: string;
    };
  };
  history?: Array<{
    status: ComplaintStatus;
    note?: string | null;
    createdAt: string;
  }>;
};

type ApiBooking = {
  id: string;
  status: string;
  property?: {
    id: string;
    name: string;
    slug: string;
  };
  roomUnit?: {
    number: string;
  };
};

const CATEGORIES: { key: ComplaintCategory; transKey: string }[] = [
  { key: "FACILITY", transKey: "fasilitas" },
  { key: "CLEANLINESS", transKey: "kebersihan" },
  { key: "SECURITY", transKey: "keamanan" },
  { key: "PAYMENT", transKey: "pembayaran" },
  { key: "OTHER", transKey: "lainnya" },
];

const FLOW: ComplaintStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

export default function TenantComplaintsPage() {
  const t = useTranslations("tenantPages.complaints");
  const locale = useLocale();
  const { user, ready } = useSession();

  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [complaints, setComplaints] = useState<ApiComplaint[]>([]);
  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);

  // Dialog & Form states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailComplaint, setDetailComplaint] = useState<ApiComplaint | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("FACILITY");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  const handleRefresh = useCallback(() => {
    setIsFetching(true);
    setErrorMessage(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;

    Promise.allSettled([
      fetch("/api/complaints").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([complaintsRes, bookingsRes]) => {
        if (ignore) return;
        if (complaintsRes.status === "fulfilled" && complaintsRes.value?.data) {
          const raw: ApiComplaint[] = Array.isArray(complaintsRes.value.data)
            ? complaintsRes.value.data
            : [];
          setComplaints(raw);
        } else {
          setComplaints([]);
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
              ? "Gagal memuat daftar pengaduan. Silakan muat ulang halaman."
              : "Failed to load complaints. Please reload the page."
          );
          setIsFetching(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [ready, user, locale, refreshKey]);

  const isLoading = !ready || (Boolean(user) && isFetching);

  const fmtDate = (iso?: string | Date | null) => {
    if (!iso) return "-";
    try {
      const d = typeof iso === "string" ? new Date(iso) : iso;
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case "OPEN":
        return <StatusBadge color="yellow">{t("status.open")}</StatusBadge>;
      case "ACKNOWLEDGED":
        return <StatusBadge color="blue">{t("status.acknowledged")}</StatusBadge>;
      case "IN_PROGRESS":
        return <StatusBadge color="blue">{t("status.in_progress")}</StatusBadge>;
      case "RESOLVED":
        return <StatusBadge color="green">{t("status.resolved")}</StatusBadge>;
      case "CLOSED":
        return <StatusBadge color="gray">{t("status.closed")}</StatusBadge>;
      default:
        return <StatusBadge color="gray">{status}</StatusBadge>;
    }
  };

  const getCategoryLabel = (cat: ComplaintCategory) => {
    const item = CATEGORIES.find((c) => c.key === cat);
    return item ? t(`cat.${item.transKey}`) : cat;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      setFormError(
        locale === "id"
          ? "Judul pengaduan minimal 3 karakter."
          : "Complaint title must be at least 3 characters."
      );
      return;
    }
    if (description.trim().length < 10) {
      setFormError(
        locale === "id"
          ? "Deskripsi pengaduan minimal 10 karakter."
          : "Description must be at least 10 characters."
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, string> = {
        category,
        title: title.trim(),
        description: description.trim(),
      };

      if (activeBooking?.property?.id) {
        payload.propertyId = activeBooking.property.id;
      }
      if (activeBooking?.property?.slug) {
        payload.propertySlug = activeBooking.property.slug;
      }

      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Gagal membuat pengaduan");
      }

      // Prepend newly created complaint
      if (data?.data) {
        setComplaints((prev) => [data.data, ...prev]);
      } else {
        handleRefresh();
      }

      setIsDialogOpen(false);
      setTitle("");
      setDescription("");
      setCategory("FACILITY");
      setToastSuccess(t("created"));
      setTimeout(() => setToastSuccess(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (locale === "id" ? "Gagal mengirim pengaduan" : "Failed to submit complaint");
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const openComplaintsCount = complaints.filter(
    (c) => c.status === "OPEN" || c.status === "ACKNOWLEDGED" || c.status === "IN_PROGRESS"
  ).length;

  const propertyName =
    activeBooking?.property?.name || complaints[0]?.property?.name || (locale === "id" ? "Kost Saya" : "My Kost");

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
              onClick={() => setIsDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3 py-1.5 text-xs font-semibold text-nk-text-inverse transition hover:opacity-95"
            >
              <Plus className="size-3.5" />
              <span>{t("create")}</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition hover:bg-nk-warm disabled:opacity-50"
              title={locale === "id" ? "Segarkan pengaduan" : "Refresh complaints"}
            >
              <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
              <span>{locale === "id" ? "Perbarui" : "Refresh"}</span>
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Toast Notification */}
      {toastSuccess && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0 text-green-600" />
            <p>{toastSuccess}</p>
          </div>
          <button
            onClick={() => setToastSuccess(null)}
            className="text-green-700 hover:text-green-950"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

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
        <div className="flex flex-col gap-4 animate-pulse" aria-label="Loading complaints">
          <div className="h-20 rounded-xl bg-nk-section" />
          <div className="h-64 rounded-xl bg-nk-section" />
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
              ? "Silakan masuk dengan akun penyewa Anda untuk mengirim dan memantau status pengaduan fasilitas kamar kos."
              : "Please sign in with your tenant account to submit and track maintenance complaints for your room."}
          </p>
          <Link
            href="/login?from=/tenant/complaints"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : (
        /* Authenticated View */
        <DashSection
          title={t("listTitle")}
          right={
            <span className="text-xs text-nk-text-muted">
              {t("count", { count: openComplaintsCount })}
            </span>
          }
          bodyClass="divide-y divide-nk-border"
        >
          {complaints.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto size-10 text-nk-text-muted opacity-40 mb-2" />
              <h3 className="text-sm font-semibold text-nk-text">
                {locale === "id" ? "Belum Ada Pengaduan" : "No Complaints Yet"}
              </h3>
              <p className="mt-1 text-xs text-nk-text-muted max-w-sm mx-auto">
                {locale === "id"
                  ? "Jika ada fasilitas kamar yang rusak atau kendala selama tinggal, ajukan laporan melalui tombol Buat Pengaduan."
                  : "If you encounter any room facility issues or maintenance problems, submit a report using the button above."}
              </p>
            </div>
          ) : (
            complaints.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setDetailComplaint(c)}
                className="flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-nk-section px-2 py-0.5 text-xs font-medium text-nk-text-muted">
                      {getCategoryLabel(c.category)}
                    </span>
                    <span className="text-xs text-nk-text-muted">
                      {c.property?.name || propertyName}
                    </span>
                    <span className="text-xs text-nk-text-muted">·</span>
                    <span className="text-xs text-nk-text-muted">{fmtDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 font-medium text-nk-text">{c.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-nk-text-muted">
                    {c.description}
                  </p>
                </div>
                <div className="shrink-0 pt-1">{getStatusBadge(c.status)}</div>
              </button>
            ))
          )}
        </DashSection>
      )}

      {/* Dialog Buat Pengaduan Baru */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("dialogSub", { property: propertyName })}
          </DialogDescription>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-title">{t("fTitle")}</Label>
              <Input
                id="c-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("fTitlePlaceholder")}
                required
                minLength={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-cat">{t("fCategory")}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ComplaintCategory)}
              >
                <SelectTrigger id="c-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {t(`cat.${cat.transKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-desc">{t("fDesc")}</Label>
              <Textarea
                id="c-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("fDescPlaceholder")}
                rows={4}
                required
                minLength={10}
              />
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-lg border border-nk-border px-4 py-2 text-sm font-medium text-nk-text hover:bg-nk-warm"
              >
                {locale === "id" ? "Batal" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-nk-accent px-4 py-2 text-sm font-semibold text-nk-text-inverse hover:opacity-90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                <span>{t("submit")}</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Pengaduan */}
      <Dialog
        open={Boolean(detailComplaint)}
        onOpenChange={(open) => !open && setDetailComplaint(null)}
      >
        <DialogContent className="max-w-lg">
          {detailComplaint && (
            <>
              <DialogTitle className="flex items-center justify-between gap-3 text-lg font-semibold text-nk-text">
                <span className="truncate">{detailComplaint.title}</span>
                {getStatusBadge(detailComplaint.status)}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-nk-text-muted">
                {detailComplaint.code || detailComplaint.id}
              </DialogDescription>

              <div className="mt-3 flex flex-col gap-4 text-sm">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-nk-border pb-3">
                  <dt className="text-nk-text-muted">{t("dProperty")}</dt>
                  <dd className="font-medium text-nk-text text-right">
                    {detailComplaint.property?.name || propertyName}
                  </dd>
                  <dt className="text-nk-text-muted">{t("dCategory")}</dt>
                  <dd className="font-medium text-nk-text text-right">
                    {getCategoryLabel(detailComplaint.category)}
                  </dd>
                  <dt className="text-nk-text-muted">{t("dCreated")}</dt>
                  <dd className="font-medium text-nk-text text-right">
                    {fmtDate(detailComplaint.createdAt)}
                  </dd>
                  <dt className="text-nk-text-muted">{t("dUpdated")}</dt>
                  <dd className="font-medium text-nk-text text-right">
                    {fmtDate(detailComplaint.updatedAt)}
                  </dd>
                </dl>

                {/* Deskripsi */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-nk-text-muted mb-1">
                    {t("fDesc")}
                  </h4>
                  <p className="rounded-lg bg-nk-section p-3 text-sm text-nk-text whitespace-pre-wrap">
                    {detailComplaint.description}
                  </p>
                </div>

                {/* Status Stepper Flow */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-nk-text-muted mb-2">
                    {t("dFlow")}
                  </h4>
                  <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                    {FLOW.map((st, i) => {
                      const curIdx = FLOW.indexOf(detailComplaint.status);
                      const isDone = i <= curIdx;
                      const isCurrent = i === curIdx;
                      return (
                        <div key={st} className="flex flex-1 flex-col items-center text-center">
                          <div
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                              isCurrent
                                ? "bg-nk-accent text-nk-text-inverse ring-2 ring-nk-accent ring-offset-2"
                                : isDone
                                ? "bg-green-600 text-white"
                                : "bg-nk-border text-nk-text-muted"
                            )}
                          >
                            {i + 1}
                          </div>
                          <span
                            className={cn(
                              "mt-1 text-[10px] leading-tight",
                              isCurrent
                                ? "font-semibold text-nk-accent"
                                : isDone
                                ? "text-nk-text"
                                : "text-nk-text-muted"
                            )}
                          >
                            {t(`status.${st.toLowerCase()}`)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Catatan / Tanggapan Pemilik */}
                {detailComplaint.ownerNote && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <h4 className="text-xs font-semibold text-blue-900 mb-0.5">
                      {t("dOwnerNote")}
                    </h4>
                    <p className="text-sm text-blue-950">{detailComplaint.ownerNote}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </UserDashboardShell>
  );
}

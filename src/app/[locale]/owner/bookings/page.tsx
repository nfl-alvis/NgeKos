"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { ownerBookings } from "@/lib/data/entities";
import type { Booking, BookingStatus } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";

type Tab = "all" | "pending" | "processing" | "done" | "rejected";

function mapDbBooking(b: any): Booking {
  const statusMap: Record<string, BookingStatus> = {
    PENDING: "pending",
    APPROVED_AWAITING_PAYMENT: "approved-awaiting-payment",
    ACTIVE: "active",
    REJECTED: "rejected",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
    COMPLETED: "active",
  };

  const timeline: { at: string; stage: "diajukan" | "disetujui" | "menunggu-bayar" | "lunas" }[] = [];
  if (b.createdAt) timeline.push({ at: b.createdAt, stage: "diajukan" });
  if (b.approvedAt) {
    timeline.push({ at: b.approvedAt, stage: "disetujui" });
    timeline.push({ at: b.approvedAt, stage: "menunggu-bayar" });
  }
  if (b.status === "ACTIVE" || b.status === "COMPLETED") {
    timeline.push({ at: b.updatedAt || b.createdAt, stage: "lunas" });
  }

  return {
    id: b.id,
    propertySlug: b.property?.slug || b.propertyId || "",
    propertyName: b.property?.name || "Kost",
    city: b.property?.city || "",
    roomType: b.roomType?.name || "Kamar Reguler",
    roomId: b.roomUnitId || b.roomTypeId || "",
    roomNumber: b.roomUnit?.number || "-",
    startDate: typeof b.startDate === "string" ? b.startDate.slice(0, 10) : new Date(b.startDate).toISOString().slice(0, 10),
    note: b.note || undefined,
    status: statusMap[b.status] || "pending",
    statusNote: b.statusNote || undefined,
    applicantName: b.applicant?.fullName || "Pemohon",
    applicantPhone: b.applicant?.phone || "-",
    applicantEmail: b.applicant?.email || "-",
    createdAt: b.createdAt,
    payDeadlineMin: 1440,
    usesDp: Boolean(b.depositSnapshot),
    monthlyPrice: b.monthlyPriceSnapshot || 0,
    timeline: timeline.length > 0 ? timeline : [{ at: b.createdAt, stage: "diajukan" }],
    payments: [],
  };
}

function statusBadge(b: Booking, tr: Record<string, string>) {
  switch (b.status) {
    case "pending":
      return <StatusBadge color="yellow">{tr.pending}</StatusBadge>;
    case "approved-awaiting-payment":
      return <StatusBadge color="blue">{tr.awaitPay}</StatusBadge>;
    case "active":
      return <StatusBadge color="green">{tr.active}</StatusBadge>;
    case "expired":
      return <StatusBadge color="red">{tr.expired}</StatusBadge>;
    case "rejected":
      return <StatusBadge color="red">{tr.rejected}</StatusBadge>;
    default:
      return <StatusBadge color="gray">{tr.cancelled}</StatusBadge>;
  }
}

export default function OwnerBookingsPage() {
  const t = useTranslations("owner.bookingsIn");
  const to = useTranslations("owner");
  const tb = useTranslations("myBookings");
  const [tab, setTab] = useState<Tab>("all");
  const [detail, setDetail] = useState<Booking | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bookingsList, setBookingsList] = useState<Booking[]>(ownerBookings);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchBookings = () => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          setBookingsList(json.data.map(mapDbBooking));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filtered = useMemo(() => {
    switch (tab) {
      case "pending":
        return bookingsList.filter((b) => b.status === "pending");
      case "processing":
        return bookingsList.filter((b) => b.status === "approved-awaiting-payment");
      case "done":
        return bookingsList.filter((b) => b.status === "active");
      case "rejected":
        return bookingsList.filter((b) => ["rejected", "expired", "cancelled"].includes(b.status));
      default:
        return bookingsList;
    }
  }, [tab, bookingsList]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: t("tabAll") },
    { id: "pending", label: t("tabPending") },
    { id: "processing", label: t("tabProcessing") },
    { id: "done", label: t("tabDone") },
    { id: "rejected", label: t("tabRejected") },
  ];

  const tr: Record<string, string> = {
    pending: tb("statusPending"),
    awaitPay: tb("statusAwaitPay"),
    active: tb("statusActive"),
    expired: tb("statusExpired"),
    rejected: tb("statusRejected"),
    cancelled: tb("statusCancelled"),
  };

  const stages = ["diajukan", "disetujui", "menunggu-bayar", "lunas"] as const;
  const stageLabels: Record<(typeof stages)[number], string> = {
    diajukan: t("stageDiajukan"),
    disetujui: t("stageDisetujui"),
    "menunggu-bayar": t("stageMenungguBayar"),
    lunas: t("stageLunas"),
  };

  const handleApprove = async (booking: Booking) => {
    setActionLoading(booking.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED_AWAITING_PAYMENT" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menyetujui booking");
      }
      setBookingsList((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: "approved-awaiting-payment" } : b))
      );
      setBanner({ type: "success", message: `Booking untuk ${booking.applicantName} berhasil disetujui!` });
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Terjadi kesalahan saat menyetujui booking." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 3) {
      setBanner({ type: "error", message: "Alasan penolakan minimal 3 karakter." });
      return;
    }
    setActionLoading(rejectTarget.id);
    setBanner(null);
    try {
      const res = await fetch(`/api/bookings/${rejectTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", note: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menolak booking");
      }
      setBookingsList((prev) =>
        prev.map((b) => (b.id === rejectTarget.id ? { ...b, status: "rejected", statusNote: rejectReason.trim() } : b))
      );
      setBanner({ type: "success", message: `Booking untuk ${rejectTarget.applicantName} telah ditolak.` });
      setRejectTarget(null);
      setRejectReason("");
    } catch (err: any) {
      setBanner({ type: "error", message: err.message || "Terjadi kesalahan saat menolak booking." });
    } finally {
      setActionLoading(null);
    }
  };

  const payStatusColor = { berhasil: "green", gagal: "red", pending: "yellow" } as const;

  return (
    <DashboardShell role="owner">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
        {isLoading && <Loader2 className="size-4 animate-spin text-nk-text-muted" />}
      </div>

      {banner && (
        <Alert
          className={`mb-6 border ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 text-red-600" />
            )}
            <AlertDescription className="text-sm font-medium">{banner.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* tab filter */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="no-scrollbar mb-5 flex h-auto w-fit gap-1 overflow-x-auto rounded-lg border border-nk-border bg-nk-surface p-1">
          {tabs.map((tab2) => (
            <TabsTrigger
              key={tab2.id}
              value={tab2.id}
              className="whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-normal transition-colors data-[state=active]:bg-nk-accent data-[state=active]:font-medium data-[state=active]:text-nk-text-inverse data-[state=inactive]:text-nk-text-muted hover:data-[state=inactive]:text-nk-text"
            >
              {tab2.label}
            </TabsTrigger>
          ))}
        </TabsList>

      {/* desktop: tabel / mobile: card list */}
      <div className="hidden overflow-hidden rounded-lg border border-nk-border bg-nk-surface lg:block">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
              <TableHead className="px-4 py-3 font-medium">{t("colName")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colDate")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
              <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id} className="border-b border-nk-border last:border-b-0">
                <TableCell className="px-4 py-3">
                  <p className="font-medium text-nk-text">{b.applicantName}</p>
                  <p className="font-mono text-xs text-nk-text-muted">{b.id}</p>
                </TableCell>
                <TableCell className="px-4 py-3 text-nk-text">
                  {b.propertyName}
                  <span className="block text-xs text-nk-text-muted">
                    {b.roomType} ({b.roomNumber})
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-nk-text-muted">
                  {new Date(b.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </TableCell>
                <TableCell className="px-4 py-3">{statusBadge(b, tr)}</TableCell>
                <TableCell className="px-4 py-3">
                  {b.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === b.id}
                        onClick={() => handleApprove(b)}
                        className="inline-flex items-center gap-1 rounded-md bg-[#2F6B3C] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                      >
                        {actionLoading === b.id && <Loader2 className="size-3 animate-spin" />}
                        {to("approve")}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === b.id}
                        onClick={() => setRejectTarget(b)}
                        className="rounded-md border border-[#EBC4C0] px-3 py-1.5 text-xs font-medium text-[#9C3B32] transition-colors hover:bg-[#FAEAE8] active:scale-[0.98] disabled:opacity-50"
                      >
                        {to("reject")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDetail(b)}
                      className="rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                    >
                      {t("viewDetail")}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* mobile card list */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filtered.map((b) => (
          <article key={b.id} className="rounded-lg border border-nk-border bg-nk-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-nk-text">{b.applicantName}</p>
                <p className="truncate text-xs text-nk-text-muted">
                  {b.propertyName} · {b.roomType} ({b.roomNumber})
                </p>
                <p className="mt-0.5 text-xs text-nk-text-muted">
                  {new Date(b.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              {statusBadge(b, tr)}
            </div>
            <div className="mt-3 flex gap-2">
              {b.status === "pending" ? (
                <>
                  <button
                    type="button"
                    disabled={actionLoading === b.id}
                    onClick={() => handleApprove(b)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#2F6B3C] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading === b.id && <Loader2 className="size-3 animate-spin" />}
                    {to("approve")}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === b.id}
                    onClick={() => setRejectTarget(b)}
                    className="flex-1 rounded-md border border-[#EBC4C0] px-3 py-2 text-xs font-medium text-[#9C3B32] transition-colors hover:bg-[#FAEAE8] disabled:opacity-50"
                  >
                    {to("reject")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDetail(b)}
                  className="w-full rounded-md border border-nk-border px-3 py-2 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                >
                  {t("viewDetail")}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      </Tabs>

      {/* modal detail */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
        {detail && (
          <>
            <h2 className="pr-8 text-lg font-medium text-nk-text">{t("detailTitle")}</h2>
            <p className="mt-0.5 font-mono text-xs text-nk-text-muted">{detail.id}</p>

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">{t("applicant")}</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-nk-text-muted">{t("colName")}</dt>
              <dd className="text-right font-medium text-nk-text">{detail.applicantName}</dd>
              <dt className="text-nk-text-muted">Telepon</dt>
              <dd className="text-right text-nk-text">{detail.applicantPhone}</dd>
              <dt className="text-nk-text-muted">Email</dt>
              <dd className="truncate text-right text-nk-text">{detail.applicantEmail}</dd>
            </dl>

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">{t("requested")}</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-nk-text-muted">{t("colProperty")}</dt>
              <dd className="text-right font-medium text-nk-text">
                {detail.propertyName} · {detail.roomType} ({detail.roomNumber})
              </dd>
              <dt className="text-nk-text-muted">{tb("startDate")}</dt>
              <dd className="text-right text-nk-text">{detail.startDate}</dd>
              <dt className="text-nk-text-muted">Harga</dt>
              <dd className="text-right text-nk-text">{formatIDR(detail.monthlyPrice)}/bln</dd>
            </dl>

            <h3 className="mb-3 mt-5 text-sm font-medium text-nk-text">{t("timeline")}</h3>
            <ol className="flex flex-col gap-0">
              {stages.map((stage) => {
                const hit = detail.timeline.find((tl) => tl.stage === stage);
                return (
                  <li key={stage} className="flex items-center gap-3">
                    <span className={`size-2 shrink-0 rounded-full ${hit ? "bg-nk-accent" : "bg-nk-border"}`} aria-hidden="true" />
                    <span className={hit ? "text-sm text-nk-text" : "text-sm text-nk-text-muted/50"}>
                      {stageLabels[stage]}
                      {hit && (
                        <span className="ml-2 text-xs text-nk-text-muted">
                          {new Date(hit.at).toLocaleString("id-ID")}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>

            <h3 className="mb-2 mt-5 text-sm font-medium text-nk-text">{t("payments")}</h3>
            {detail.payments?.length ? (
              <ul className="flex flex-col gap-2">
                {detail.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-md border border-nk-border px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-nk-text-muted">{p.id}</span>
                    <span className="text-nk-text">{formatIDR(p.amount)}</span>
                    <StatusBadge color={payStatusColor[p.status]}>
                      {p.status === "berhasil" ? t("payBerhasil") : p.status === "gagal" ? t("payGagal") : t("payPending")}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-nk-text-muted">{t("noPayments")}</p>
            )}
          </>
        )}
      </DialogContent>
      </Dialog>

      {/* modal reject */}
      <Dialog open={rejectTarget !== null} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-sm">
        {rejectTarget && (
          <>
            <h2 className="pr-8 text-lg font-medium text-nk-text">{t("rejectTitle")}</h2>
            <p className="mt-1 text-sm text-nk-text-muted">
              {rejectTarget.applicantName} · {rejectTarget.propertyName} ({rejectTarget.roomNumber})
            </p>
            <label htmlFor="reject-reason" className="mt-5 block text-sm font-medium text-nk-text">
              {t("rejectReason")}
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2 w-full resize-none rounded-lg border border-nk-border bg-nk-surface px-4 py-3 text-sm text-nk-text outline-none focus:border-nk-accent"
            />
            <button
              type="button"
              disabled={actionLoading === rejectTarget.id || rejectReason.trim().length < 3}
              onClick={handleReject}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#9C3B32] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === rejectTarget.id && <Loader2 className="size-4 animate-spin" />}
              {t("rejectConfirm")}
            </button>
          </>
        )}
      </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}


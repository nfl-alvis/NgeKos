"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Undo2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdminPageShell, {
  AdminSection,
  AdminStat,
  useAdminToast,
} from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";
import { formatIDR } from "@/lib/utils";
import { formatReviewDate } from "@/lib/adminReviewStore";

export interface RefundItem {
  id: string;
  bookingId: string;
  rawBookingId: string;
  bookingStatus: string;
  propertyName: string;
  propertySlug: string;
  user: string;
  userEmail: string;
  userId: string;
  userPhone: string | null;
  amount: number;
  reason: string;
  reasonId: string;
  reasonEn: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED" | "CANCELLED";
  uiStatus: "diajukan" | "disetujui" | "ditolak" | "diproses" | "dibatalkan";
  rejectionReason: string | null;
  adminNote: string | null;
  decidedAt: string | null;
  decidedBy: { id: string; name: string; email: string } | null;
  processedAt: string | null;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  payment: {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    midtransOrderId: string | null;
    status: string;
  } | null;
}

const STATUS_COLOR: Record<string, StatusColor> = {
  diajukan: "yellow",
  disetujui: "green",
  ditolak: "red",
  diproses: "gray",
  dibatalkan: "gray",
};

/**
 * Backend-persisted Admin Refunds Page.
 * Mengelola pengajuan refund dari database dengan transaksi atomik dan audit log.
 */
export default function AdminRefundsPage() {
  const t = useTranslations("admin.refunds");
  const locale = useLocale();
  const { show } = useAdminToast();

  const [tab, setTab] = useState<"diajukan" | "disetujui" | "ditolak" | "diproses">("diajukan");
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendingCount: 0,
    openAmount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    processedCount: 0,
  });

  // Modal dialog states
  const [rejectingItem, setRejectingItem] = useState<RefundItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [processingItem, setProcessingItem] = useState<RefundItem | null>(null);
  const [processNote, setProcessNote] = useState("");
  const [processError, setProcessError] = useState("");
  const [selectedItem, setSelectedItem] = useState<RefundItem | null>(null);

  const fetchRefunds = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/refunds?limit=100");
      if (!res.ok) throw new Error("Failed to load refunds");
      const json = await res.json();
      if (json?.data && Array.isArray(json.data)) {
        setRefunds(json.data);
      }
      if (json?.meta?.stats) {
        setStats(json.meta.stats);
      }
    } catch (err) {
      console.error("Error fetching refunds:", err);
      show("Gagal memuat daftar refund dari server");
    } finally {
      setIsLoading(false);
    }
  }, [show]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/refunds?limit=100");
        if (!res.ok) throw new Error("Failed to load refunds");
        const json = await res.json();
        if (!ignore) {
          if (json?.data && Array.isArray(json.data)) {
            setRefunds(json.data);
          }
          if (json?.meta?.stats) {
            setStats(json.meta.stats);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching refunds:", err);
          show("Gagal memuat daftar refund dari server");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [show]);

  const shown = refunds.filter((r) => r.uiStatus === tab);

  const count = (s: string) => {
    if (s === "diajukan") return stats.pendingCount;
    if (s === "disetujui") return stats.approvedCount;
    if (s === "ditolak") return stats.rejectedCount;
    if (s === "diproses") return stats.processedCount;
    return refunds.filter((x) => x.uiStatus === s).length;
  };

  const handleApprove = async (r: RefundItem) => {
    setActionLoadingId(r.id);
    try {
      const res = await fetch(`/api/admin/refunds/${r.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({ decision: "APPROVED" }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Gagal menyetujui refund");
      }

      show(t("toastApproved", { id: r.bookingId || r.id }));
      await fetchRefunds();
    } catch (err: unknown) {
      show(err instanceof Error ? err.message : "Gagal menyetujui refund");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    const reasonTrimmed = rejectionReason.trim();
    if (reasonTrimmed.length < 3) {
      setRejectError("Alasan penolakan minimal 3 karakter");
      return;
    }

    setActionLoadingId(rejectingItem.id);
    setRejectError("");
    try {
      const res = await fetch(`/api/admin/refunds/${rejectingItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          decision: "REJECTED",
          reason: reasonTrimmed,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Gagal menolak refund");
      }

      show(t("toastRejected", { id: rejectingItem.bookingId || rejectingItem.id }));
      setRejectingItem(null);
      setRejectionReason("");
      await fetchRefunds();
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : "Gagal menolak refund");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmProcess = async () => {
    if (!processingItem) return;
    setActionLoadingId(processingItem.id);
    setProcessError("");
    try {
      const res = await fetch(`/api/admin/refunds/${processingItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Origin: window.location.origin,
        },
        body: JSON.stringify({
          decision: "PROCESSED",
          adminNote: processNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Gagal menandai refund selesai");
      }

      show(t("toastProcessed", { id: processingItem.bookingId || processingItem.id }));
      setProcessingItem(null);
      setProcessNote("");
      await fetchRefunds();
    } catch (err: unknown) {
      setProcessError(err instanceof Error ? err.message : "Gagal menandai refund selesai");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <AdminStat
          label={t("statOpen")}
          value={String(stats.pendingCount)}
          icon={Clock}
          tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }}
          note={t("statOpenNote", { amount: formatIDR(stats.openAmount) })}
        />
        <AdminStat
          label={t("statApproved")}
          value={String(stats.approvedCount)}
          icon={CheckCircle2}
          tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }}
        />
        <AdminStat
          label={t("statRejected")}
          value={String(stats.rejectedCount)}
          icon={XCircle}
          tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }}
        />
        <AdminStat
          label={t("stDiproses")}
          value={String(stats.processedCount)}
          icon={Banknote}
          tint={{ card: "bg-[#F0F4F8]", icon: "bg-[#D9E2EC] text-[#334E68]" }}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full sm:w-auto">
          <TabsList className="bg-nk-section">
            {(["diajukan", "disetujui", "ditolak", "diproses"] as const).map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs">
                {t(`st${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
                <span className="ml-1.5 tabular-nums text-nk-text-muted">{count(s)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchRefunds}
          disabled={isLoading}
          className="h-8 gap-1.5 text-xs text-nk-text"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <AdminSection title={t("listTitle")} bodyClass="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("colId")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colUser")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colReason")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colAmount")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colDate")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r) => {
                const isItemLoading = actionLoadingId === r.id;
                return (
                  <TableRow key={r.id} className="border-b border-nk-border last:border-b-0 hover:bg-nk-warm/40">
                    <TableCell className="px-4 py-3 font-mono text-xs text-nk-text-muted">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(r)}
                        className="hover:underline hover:text-nk-accent"
                        title="Lihat detail"
                      >
                        {r.id.slice(0, 8)}...
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <p className="truncate font-medium text-nk-text">{r.user}</p>
                      <p className="truncate font-mono text-[10px] text-nk-text-muted">{r.bookingId}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-nk-text">{r.propertyName}</TableCell>
                    <TableCell className="max-w-60 px-4 py-3">
                      <p className="line-clamp-2 text-xs text-nk-text-muted">{r.reason}</p>
                      {r.rejectionReason && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-[#9C3B32]">
                          Alasan ditolak: {r.rejectionReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums font-medium text-nk-text">
                      {formatIDR(r.amount)}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted">
                      {formatReviewDate(r.requestedAt, locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={STATUS_COLOR[r.uiStatus]}>
                        {t(`st${r.uiStatus.charAt(0).toUpperCase()}${r.uiStatus.slice(1)}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {r.uiStatus === "diajukan" ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={isItemLoading}
                            className="h-8 bg-[#2F6B3C] px-3 text-xs text-white hover:bg-[#275a32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                            onClick={() => handleApprove(r)}
                          >
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            {t("approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isItemLoading}
                            className="h-8 border-[#EBC4C0] px-3 text-xs text-[#9C3B32] hover:bg-[#FAEAE8] hover:text-[#9C3B32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                            onClick={() => {
                              setRejectingItem(r);
                              setRejectionReason("");
                              setRejectError("");
                            }}
                          >
                            <XCircle className="size-3.5" aria-hidden="true" />
                            {t("reject")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 text-nk-text-muted hover:text-nk-text"
                            onClick={() => setSelectedItem(r)}
                            aria-label="Detail"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      ) : r.uiStatus === "disetujui" ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={isItemLoading}
                            className="h-8 bg-[#334E68] px-3 text-xs text-white hover:bg-[#243B53]"
                            onClick={() => {
                              setProcessingItem(r);
                              setProcessNote("");
                              setProcessError("");
                            }}
                            aria-label="Tandai pencairan manual selesai"
                          >
                            <Banknote className="size-3.5 mr-1" />
                            {t("markProcessed")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 text-nk-text-muted hover:text-nk-text"
                            onClick={() => setSelectedItem(r)}
                            aria-label="Detail"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-nk-text-muted">
                            <Undo2 className="size-3.5" aria-hidden="true" />
                            {t("done")}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 text-nk-text-muted hover:text-nk-text"
                            onClick={() => setSelectedItem(r)}
                            aria-label="Detail"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {isLoading ? (
            <p className="p-5 text-sm text-nk-text-muted">Memuat permohonan pengembalian dana dari server...</p>
          ) : shown.length === 0 ? (
            <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>
          ) : null}
        </div>
      </AdminSection>

      {/* Reject Reason Dialog */}
      <Dialog
        open={!!rejectingItem}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingItem(null);
            setRejectionReason("");
            setRejectError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogRejectTitle")}</DialogTitle>
            <DialogDescription>{t("dialogRejectDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs font-medium text-nk-text">Booking / ID</p>
              <p className="font-mono text-xs text-nk-text-muted">
                {rejectingItem?.bookingId} ({rejectingItem?.id})
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-nk-text">Nominal Refund</p>
              <p className="text-sm font-semibold text-nk-text">
                {formatIDR(rejectingItem?.amount ?? 0)}
              </p>
            </div>
            <div className="space-y-1">
              <label htmlFor="rejection-reason" className="text-xs font-medium text-nk-text">
                {t("dialogRejectReason")} <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("dialogRejectPlaceholder")}
                className="w-full rounded-md border border-nk-border bg-nk-surface p-2.5 text-xs text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none focus:ring-1 focus:ring-nk-accent"
              />
              {rejectError && <p className="text-xs text-red-600">{rejectError}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectingItem(null);
                setRejectionReason("");
                setRejectError("");
              }}
            >
              {t("dialogCancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoadingId === rejectingItem?.id}
              onClick={handleConfirmReject}
              className="bg-[#9C3B32] text-white hover:bg-[#852E26]"
            >
              {actionLoadingId === rejectingItem?.id ? "Memproses..." : t("dialogConfirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Disbursement Process Dialog */}
      <Dialog
        open={!!processingItem}
        onOpenChange={(open) => {
          if (!open) {
            setProcessingItem(null);
            setProcessNote("");
            setProcessError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pencairan Refund Manual</DialogTitle>
            <DialogDescription>
              Pastikan dana telah ditransfer secara manual ke rekening penyewa sebelum menandai transaksi ini selesai.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <p className="text-xs font-medium text-nk-text">Booking / ID</p>
              <p className="font-mono text-xs text-nk-text-muted">
                {processingItem?.bookingId} ({processingItem?.id})
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-nk-text">Penyewa</p>
              <p className="text-xs text-nk-text">
                {processingItem?.user} ({processingItem?.userEmail})
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-nk-text">Nominal yang Dicairkan</p>
              <p className="text-sm font-semibold text-nk-text">
                {formatIDR(processingItem?.amount ?? 0)}
              </p>
            </div>
            <div className="space-y-1">
              <label htmlFor="process-note" className="text-xs font-medium text-nk-text">
                Nomor Referensi Transfer / Bukti Mutasi Bank
              </label>
              <textarea
                id="process-note"
                rows={2}
                value={processNote}
                onChange={(e) => setProcessNote(e.target.value)}
                placeholder="Contoh: Transfer BCA Ref: 20261103-987654 atau TRX-BCA-123456"
                className="w-full rounded-md border border-nk-border bg-nk-surface p-2.5 text-xs text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none focus:ring-1 focus:ring-nk-accent"
              />
              {processError && <p className="text-xs text-red-600">{processError}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setProcessingItem(null);
                setProcessNote("");
                setProcessError("");
              }}
            >
              {t("dialogCancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actionLoadingId === processingItem?.id}
              onClick={handleConfirmProcess}
              className="bg-[#334E68] text-white hover:bg-[#243B53]"
            >
              {actionLoadingId === processingItem?.id ? "Memproses..." : "Konfirmasi Selesai Dicairkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Pengajuan Refund</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi dan riwayat keputusan audit.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-nk-border bg-nk-warm/30 p-3">
                <div>
                  <span className="text-nk-text-muted">ID Refund:</span>
                  <p className="font-mono text-nk-text break-all">{selectedItem.id}</p>
                </div>
                <div>
                  <span className="text-nk-text-muted">Kode Booking:</span>
                  <p className="font-mono font-semibold text-nk-text">{selectedItem.bookingId}</p>
                </div>
                <div>
                  <span className="text-nk-text-muted">Pengguna:</span>
                  <p className="font-medium text-nk-text">{selectedItem.user}</p>
                  <p className="text-[11px] text-nk-text-muted">{selectedItem.userEmail}</p>
                </div>
                <div>
                  <span className="text-nk-text-muted">Properti:</span>
                  <p className="font-medium text-nk-text">{selectedItem.propertyName}</p>
                </div>
                <div>
                  <span className="text-nk-text-muted">Nominal Refund:</span>
                  <p className="text-sm font-semibold text-nk-text">
                    {formatIDR(selectedItem.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-nk-text-muted">Status:</span>
                  <div className="mt-0.5">
                    <StatusBadge color={STATUS_COLOR[selectedItem.uiStatus]}>
                      {t(`st${selectedItem.uiStatus.charAt(0).toUpperCase()}${selectedItem.uiStatus.slice(1)}`)}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-medium text-nk-text">Alasan Pengajuan Pengguna:</span>
                <p className="mt-1 rounded border border-nk-border bg-nk-surface p-2.5 text-nk-text">
                  {selectedItem.reason}
                </p>
              </div>

              {selectedItem.payment && (
                <div>
                  <span className="font-medium text-nk-text">Informasi Pembayaran Terkait:</span>
                  <div className="mt-1 grid grid-cols-2 gap-2 rounded border border-nk-border p-2.5 text-[11px] text-nk-text-muted">
                    <div>
                      Metode: <span className="font-medium text-nk-text">{selectedItem.payment.method}</span>
                    </div>
                    <div>
                      Status: <span className="font-medium text-nk-text">{selectedItem.payment.status}</span>
                    </div>
                    {selectedItem.payment.midtransOrderId && (
                      <div className="col-span-2 font-mono">
                        Midtrans Order: {selectedItem.payment.midtransOrderId}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedItem.decidedAt && (
                <div className="rounded border border-nk-border/60 bg-nk-warm/20 p-2.5 text-[11px] text-nk-text-muted">
                  <p className="font-medium text-nk-text">Riwayat Keputusan:</p>
                  <p className="mt-0.5">
                    Waktu: {formatReviewDate(selectedItem.decidedAt, locale)}
                  </p>
                  {selectedItem.decidedBy && (
                    <p>Oleh Admin: {selectedItem.decidedBy.name} ({selectedItem.decidedBy.email})</p>
                  )}
                  {selectedItem.rejectionReason && (
                    <p className="mt-1 text-[#9C3B32]">
                      Alasan Penolakan: {selectedItem.rejectionReason}
                    </p>
                  )}
                  {selectedItem.processedAt && (
                    <p className="mt-1 text-[#2F6B3C]">
                      Pencairan Manual Selesai: {formatReviewDate(selectedItem.processedAt, locale)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedItem(null)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

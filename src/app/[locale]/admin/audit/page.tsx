"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  History,
  RefreshCw,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AdminPageShell, { AdminSection } from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";

export interface FormattedAuditLog {
  id: string;
  at: string;
  actor: string;
  actorId: string | null;
  actorEmail: string | null;
  type: string;
  action: string;
  entityType: string;
  entityId: string | null;
  target: string;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TYPE_GROUP: Record<string, "verification" | "platform" | "account" | "finance" | "moderation" | "notify"> = {
  "verify.approve": "verification",
  "verify.reject": "verification",
  "property.disable": "platform",
  "property.enable": "platform",
  "property.delete": "platform",
  "property.update": "platform",
  "owner.suspend": "account",
  "owner.reactivate": "account",
  "user.ban": "account",
  "user.unban": "account",
  "user.suspend": "account",
  "user.update": "account",
  "refund.approve": "finance",
  "refund.reject": "finance",
  "report.resolve": "moderation",
  "report.dismiss": "moderation",
  "review.hide": "moderation",
  "review.show": "moderation",
  "notify.send": "notify",
  "notify.delete": "notify",
  "admin.role": "account",
  "auth.login": "account",
  "auth.logout": "account",
  "room.update": "platform",
  "room.delete": "platform",
  "booking.transition": "platform",
};

/**
 * Sanitasi cell CSV untuk melindungi dari CSV Formula Injection (CWE-1236).
 * Perangkat lunak spreadsheet mengeksekusi cell yang diawali =, +, -, @, \t, atau \r.
 */
export function sanitizeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return '""';
  let str = String(v);
  if (/^[\t\r ]*[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replaceAll('"', '""')}"`;
}

const GROUP_COLOR: Record<string, StatusColor> = {
  verification: "blue",
  platform: "yellow",
  account: "gray",
  finance: "green",
  moderation: "red",
  notify: "gray",
};

/** Riwayat tindakan admin - audit trail persisten seluruh operasi backend. */
export default function AdminAuditPage() {
  const t = useTranslations("admin.audit");
  const locale = useLocale();

  const [logs, setLogs] = useState<FormattedAuditLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [group, setGroup] = useState<"all" | keyof typeof GROUP_COLOR>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<FormattedAuditLog | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when group or date filters change
  const handleGroupChange = (v: typeof group) => {
    setGroup(v);
    setPage(1);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setPage(1);
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (group !== "all") params.set("group", group);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load audit logs (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || "Failed to load audit logs");
      }
      setLogs(json.data || []);
      setMeta(json.meta || { total: json.data?.length || 0, page, limit: 20, totalPages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, group, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /** Ekspor CSV dari data server */
  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "500");
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (group !== "all") params.set("group", group);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const json = await res.json();
      const exportRows: FormattedAuditLog[] = json.success && Array.isArray(json.data) ? json.data : logs;

      const header = ["ID", "Timestamp", "Actor", "Actor_Email", "Action", "Entity_Type", "Entity_ID", "Target", "IP_Address", "User_Agent"];
      const lines = exportRows.map((e) =>
        [
          e.id,
          e.at,
          e.actor,
          e.actorEmail || "",
          e.action,
          e.entityType,
          e.entityId || "",
          e.target,
          e.ipAddress || "",
          e.userAgent || "",
        ]
          .map(sanitizeCsvCell)
          .join(",")
      );

      const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export CSV error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const formatActionName = (action: string) => {
    const pascal = action
      .split(".")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    const key = `action${pascal}`;
    try {
      const label = (t as unknown as (k: string) => string)(key);
      if (label && !label.startsWith("admin.audit.")) return label;
    } catch {}
    return action;
  };

  const groupOptions = [
    { label: t("filterAll"), value: "all" },
    ...(Object.keys(GROUP_COLOR) as (keyof typeof GROUP_COLOR)[]).map((g) => ({
      label: t(`group${g.charAt(0).toUpperCase()}${g.slice(1)}`),
      value: g,
    })),
  ];

  return (
    <AdminPageShell
      title={t("title")}
      badge={
        <span className="rounded-full bg-nk-warm px-2.5 py-0.5 text-xs font-medium text-nk-text-muted tabular-nums">
          {t("countBadge", { count: meta.total })}
        </span>
      }
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLogs()}
            disabled={loading}
            aria-label="Refresh data"
            className="flex h-11 items-center gap-1.5 rounded-md border border-nk-border bg-nk-surface px-3 text-sm text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent disabled:opacity-50 md:h-9"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={isExporting || logs.length === 0}
            className="flex h-11 items-center gap-1.5 rounded-md border border-nk-border bg-nk-surface px-3 text-sm text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent disabled:opacity-50 md:h-9"
          >
            <Download className="size-4" aria-hidden="true" />
            {isExporting ? "Mengunduh..." : t("export")}
          </button>
        </div>
      }
    >
      <AdminSection
        title={t("listTitle")}
        right={
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 border-nk-border bg-nk-surface pl-9 md:h-9 md:w-56"
              />
            </div>

            {/* Filter Group */}
            <Select
              value={group}
              onValueChange={(v) => handleGroupChange(v as typeof group)}
              items={groupOptions}
            >
              <SelectTrigger
                className="flex h-11 w-40 cursor-pointer items-center justify-between rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-sm font-medium text-nk-text shadow-xs transition-colors hover:border-nk-accent/40 hover:bg-nk-warm/60 focus-visible:border-nk-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nk-accent md:h-9"
                aria-label={t("filterLabel")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                side="bottom"
                sideOffset={6}
                className="w-(--anchor-width) min-w-40 border border-nk-border bg-nk-surface shadow-lg"
              >
                {groupOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="cursor-pointer py-2">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range: Dari & Sampai */}
            <div className="flex items-center gap-1.5 text-xs text-nk-text-muted">
              <Calendar className="size-4 text-nk-text-muted" aria-hidden="true" />
              <Input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                aria-label="Filter tanggal mulai"
                className="h-9 w-32 border-nk-border bg-nk-surface px-2 text-xs"
              />
              <span>-</span>
              <Input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                aria-label="Filter tanggal akhir"
                className="h-9 w-32 border-nk-border bg-nk-surface px-2 text-xs"
              />
            </div>
          </div>
        }
        bodyClass="overflow-hidden"
      >
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Terjadi Kesalahan</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => fetchLogs()}
                  className="ml-4 font-semibold underline hover:no-underline"
                >
                  Coba Lagi
                </button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("colTime")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colActor")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colTarget")}</TableHead>
                <TableHead className="px-4 py-3 text-right font-medium">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`} className="border-b border-nk-border">
                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="px-4 py-3"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-44" /></TableCell>
                    <TableCell className="px-4 py-3 text-right"><Skeleton className="ml-auto h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-nk-text-muted">
                    <History className="mx-auto mb-2 size-8 text-nk-text-muted/60" aria-hidden="true" />
                    <p>{t("empty")}</p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((e) => {
                  const grp = TYPE_GROUP[e.type] || TYPE_GROUP[e.action] || "account";
                  const color = GROUP_COLOR[grp] || "gray";
                  return (
                    <TableRow
                      key={e.id}
                      onClick={() => setSelectedLog(e)}
                      className="cursor-pointer border-b border-nk-border transition-colors hover:bg-nk-warm/40 last:border-b-0"
                    >
                      <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted tabular-nums">
                        {fmt(e.at)}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-medium text-nk-text">
                        <div>
                          <span>{e.actor}</span>
                          {e.actorEmail && (
                            <span className="block text-xs text-nk-text-muted">{e.actorEmail}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <StatusBadge color={color}>{formatActionName(e.action)}</StatusBadge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-nk-text max-w-xs truncate">
                        {e.target}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedLog(e);
                          }}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-nk-accent hover:bg-nk-accent/10 transition-colors"
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                          <span>Lihat</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Server-side Pagination footer */}
        {!loading && meta.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-nk-border px-4 py-3 text-sm text-nk-text-muted">
            <span className="text-xs">
              Halaman <span className="font-semibold text-nk-text">{meta.page}</span> dari{" "}
              <span className="font-semibold text-nk-text">{meta.totalPages}</span> ({meta.total} total entri)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="flex items-center gap-1 rounded-md border border-nk-border bg-nk-surface px-2.5 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                <span>Sebelumnya</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="flex items-center gap-1 rounded-md border border-nk-border bg-nk-surface px-2.5 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </AdminSection>

      {/* Detail Dialog Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detail Audit Log</DialogTitle>
            <DialogDescription>
              Catatan riwayat transaksi dan operasi server terverifikasi.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-nk-border bg-nk-warm/30 p-3">
                <div>
                  <span className="block text-xs font-medium text-nk-text-muted">ID Log</span>
                  <span className="font-mono text-xs">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-nk-text-muted">Waktu</span>
                  <span className="tabular-nums">{fmt(selectedLog.at)}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-nk-text-muted">Pelaku (Actor)</span>
                  <span className="font-medium text-nk-text">{selectedLog.actor}</span>
                  {selectedLog.actorEmail && (
                    <span className="block text-xs text-nk-text-muted">{selectedLog.actorEmail}</span>
                  )}
                </div>
                <div>
                  <span className="block text-xs font-medium text-nk-text-muted">Tindakan</span>
                  <span className="font-mono text-xs text-nk-accent font-semibold">{selectedLog.action}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="block text-xs font-medium text-nk-text-muted">Target Objek</span>
                  <span className="font-medium text-nk-text">{selectedLog.target}</span>
                </div>
                {selectedLog.description && (
                  <div>
                    <span className="block text-xs font-medium text-nk-text-muted">Deskripsi</span>
                    <p className="text-nk-text">{selectedLog.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-nk-text-muted">
                  <div>
                    <span className="font-medium">IP Address:</span>{" "}
                    <span className="font-mono">{selectedLog.ipAddress || "-"}</span>
                  </div>
                  <div className="truncate">
                    <span className="font-medium">User Agent:</span>{" "}
                    <span className="font-mono" title={selectedLog.userAgent || ""}>
                      {selectedLog.userAgent ? selectedLog.userAgent.slice(0, 45) + "..." : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <span className="block text-xs font-medium text-nk-text-muted mb-1">Metadata Tambahan</span>
                  <pre className="max-h-48 overflow-auto rounded-md border border-nk-border bg-nk-warm/50 p-3 font-mono text-xs text-nk-text">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, History, Search } from "lucide-react";
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
import AdminPageShell, { AdminSection } from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";
import { useAuditEntries } from "@/lib/adminOpsStore";
import type { AuditType } from "@/lib/data/adminData";

const TYPE_GROUP: Record<AuditType, "verification" | "platform" | "account" | "finance" | "moderation" | "notify"> = {
  "verify.approve": "verification",
  "verify.reject": "verification",
  "property.disable": "platform",
  "property.enable": "platform",
  "property.delete": "platform",
  "owner.suspend": "account",
  "owner.reactivate": "account",
  "user.ban": "account",
  "user.unban": "account",
  "refund.approve": "finance",
  "refund.reject": "finance",
  "report.resolve": "moderation",
  "report.dismiss": "moderation",
  "review.hide": "moderation",
  "review.show": "moderation",
  "notify.send": "notify",
  "admin.role": "account",
};

const GROUP_COLOR: Record<string, StatusColor> = {
  verification: "blue",
  platform: "yellow",
  account: "gray",
  finance: "green",
  moderation: "red",
  notify: "gray",
};

/** Riwayat tindakan admin — audit trail seluruh operasi panel. */
export default function AdminAuditPage() {
  const t = useTranslations("admin.audit");
  const locale = useLocale();
  const entries = useAuditEntries();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<"all" | keyof typeof GROUP_COLOR>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => (group === "all" ? true : TYPE_GROUP[e.type] === group))
      .filter((e) => (q ? `${e.actor} ${e.target} ${e.type}`.toLowerCase().includes(q) : true));
  }, [entries, search, group]);

  /** ekspor CSV sisi klien (pola sama dgn Ekspor CSV booking owner) */
  const exportCsv = () => {
    const header = ["timestamp", "actor", "action", "target"];
    const lines = rows.map((e) =>
      [
        e.at,
        e.actor,
        e.type,
        e.target,
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(",")
    );
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log-ngekost.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <AdminPageShell
      title={t("title")}
      badge={
        <span className="rounded-full bg-nk-warm px-2.5 py-0.5 text-xs font-medium text-nk-text-muted tabular-nums">
          {t("countBadge", { count: rows.length })}
        </span>
      }
      actions={
        <button
          type="button"
          onClick={exportCsv}
          className="flex h-11 items-center gap-1.5 rounded-md border border-nk-border bg-nk-surface px-3 text-sm text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent md:h-9"
        >
          <Download className="size-4" aria-hidden="true" />
          {t("export")}
        </button>
      }
    >
      <AdminSection
        title={t("listTitle")}
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-11 pl-9 md:h-9 md:w-60"
              />
            </div>
            <Select value={group} onValueChange={(v) => setGroup(v as typeof group)}>
              <SelectTrigger className="h-11 w-40 md:h-9" aria-label={t("filterLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {(Object.keys(GROUP_COLOR) as (keyof typeof GROUP_COLOR)[]).map((g) => (
                  <SelectItem key={g} value={g}>{t(`group${g.charAt(0).toUpperCase()}${g.slice(1)}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        bodyClass="overflow-hidden"
      >
        <div className="overflow-x-auto">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("colTime")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colActor")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colTarget")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const grp = TYPE_GROUP[e.type];
                const pascal = e.type
                  .split(".")
                  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                  .join("");
                return (
                  <TableRow key={e.id} className="border-b border-nk-border last:border-b-0">
                    <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted tabular-nums">{fmt(e.at)}</TableCell>
                    <TableCell className="px-4 py-3 font-medium text-nk-text">{e.actor}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={GROUP_COLOR[grp]}>{t(`action${pascal}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-nk-text">{e.target}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="flex items-center gap-2 p-5 text-sm text-nk-text-muted">
              <History className="size-4" aria-hidden="true" />
              {t("empty")}
            </p>
          )}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

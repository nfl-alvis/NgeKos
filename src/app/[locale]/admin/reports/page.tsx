"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCheck, Flag, Search, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import AdminPageShell, { AdminSection, AdminStat, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";
import { useSession } from "@/components/SessionProvider";
import { formatReviewDate } from "@/lib/adminReviewStore";
import { latestActionFor, recordOp, useAdminOps } from "@/lib/adminOpsStore";
import { userReports, type ReportType } from "@/lib/data/adminData";
import { Ellipsis } from "lucide-react";

const TYPE_COLOR: Record<ReportType, StatusColor> = {
  properti: "blue",
  pengguna: "yellow",
  review: "gray",
  konten: "gray",
};

const STATUS_COLOR: Record<string, StatusColor> = {
  baru: "yellow",
  selesai: "green",
  diabaikan: "gray",
};

/** Tangani laporan pengguna, owner, kos, atau konten. */
export default function AdminReportsPage() {
  const t = useTranslations("admin.reports");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const ops = useAdminOps();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | ReportType>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return userReports
      .map((r) => {
        const last = latestActionFor(ops, r.id);
        const st = last === "resolve" ? "selesai" : last === "dismiss" ? "diabaikan" : r.status;
        return { r, st };
      })
      .filter((x) => (type === "all" ? true : x.r.type === type))
      .filter((x) => (q ? `${x.r.id} ${x.r.target} ${x.r.reporter}`.toLowerCase().includes(q) : true));
  }, [ops, search, type]);

  const countNew = userReports.filter((r) => {
    const last = latestActionFor(ops, r.id);
    const st = last === "resolve" ? "selesai" : last === "dismiss" ? "diabaikan" : r.status;
    return st === "baru";
  }).length;

  const handle = (id: string, target: string, next: "resolve" | "dismiss") => {
    recordOp(id, next, user?.email, target);
    show(next === "resolve" ? t("toastResolved", { id }) : t("toastDismissed", { id }));
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statNew")} value={String(countNew)} icon={Flag} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statNewNote")} />
        <AdminStat label={t("statTotal")} value={String(userReports.length)} icon={CheckCheck} tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text-muted" }} />
        <AdminStat label={t("statUsers")} value={String(new Set(userReports.map((r) => r.reporter)).size)} icon={UserX} tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }} note={t("statUsersNote")} />
      </div>

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
                className="h-11 pl-9 md:h-9 md:w-64"
              />
            </div>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-11 w-44 md:h-9" aria-label={t("filterLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {(Object.keys(TYPE_COLOR) as ReportType[]).map((k) => (
                  <SelectItem key={k} value={k}>{t(`type${k.charAt(0).toUpperCase()}${k.slice(1)}`)}</SelectItem>
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
                <TableHead className="px-4 py-3 font-medium">{t("colId")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colType")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colTarget")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colReason")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colReporter")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colDate")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                <TableHead className="w-10 px-2 py-3"><span className="sr-only">{t("colAction")}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ r, st }) => {
                const reason = locale === "id" ? t(`reason${r.reasonId}`) : r.reasonEn;
                return (
                  <TableRow key={r.id} className="border-b border-nk-border last:border-b-0">
                    <TableCell className="px-4 py-3 font-mono text-xs text-nk-text-muted">{r.id}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={TYPE_COLOR[r.type]}>{t(`type${r.type.charAt(0).toUpperCase()}${r.type.slice(1)}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-nk-text">{r.target}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-nk-text-muted">{reason}</TableCell>
                    <TableCell className="px-4 py-3 text-nk-text">{r.reporter}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted">{formatReviewDate(r.at, locale)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={STATUS_COLOR[st]}>{t(`st${st.charAt(0).toUpperCase()}${st.slice(1)}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="px-2 py-3 text-right">
                      {st === "baru" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={t("colAction")}
                            className="flex size-8 items-center justify-center rounded-md text-nk-text-muted transition-colors hover:bg-nk-accent-subtle hover:text-nk-text focus-visible:outline-2 focus-visible:outline-nk-accent"
                          >
                            <Ellipsis className="size-4" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="flex items-center gap-2" onSelect={() => handle(r.id, r.target, "resolve")}>
                              <CheckCheck className="size-4" aria-hidden="true" />
                              {t("actResolve")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-2" onSelect={() => handle(r.id, r.target, "dismiss")}>
                              <Flag className="size-4" aria-hidden="true" />
                              {t("actDismiss")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-nk-text-muted">{t("handled")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

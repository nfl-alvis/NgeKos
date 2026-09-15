"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Clock, Undo2, XCircle } from "lucide-react";
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
import AdminPageShell, { AdminSection, AdminStat, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";
import { formatIDR } from "@/lib/utils";
import { useSession } from "@/components/SessionProvider";
import { formatReviewDate } from "@/lib/adminReviewStore";
import { latestActionFor, recordOp, useAdminOps } from "@/lib/adminOpsStore";
import { refundRequests } from "@/lib/data/adminData";

const STATUS_COLOR: Record<string, StatusColor> = {
  diajukan: "yellow",
  disetujui: "green",
  ditolak: "red",
};

/** Tangani pembatalan, refund, dan komplain. */
export default function AdminRefundsPage() {
  const t = useTranslations("admin.refunds");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const ops = useAdminOps();
  const [tab, setTab] = useState("diajukan");

  const rows = useMemo(() => {
    return refundRequests.map((r) => {
      const last = latestActionFor(ops, r.id);
      const st = last === "refund-approve" ? "disetujui" : last === "refund-reject" ? "ditolak" : r.status;
      return { r, st };
    });
  }, [ops]);

  const shown = rows.filter((x) => x.st === tab);
  const count = (s: string) => rows.filter((x) => x.st === s).length;
  const openAmount = rows.filter((x) => x.st === "diajukan").reduce((a, x) => a + x.r.amount, 0);

  const decide = (id: string, booking: string, next: "refund-approve" | "refund-reject") => {
    recordOp(id, next, user?.email, `${booking} · ${formatIDR(refundRequests.find((r) => r.id === id)?.amount ?? 0)}`);
    show(next === "refund-approve" ? t("toastApproved", { id }) : t("toastRejected", { id }));
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statOpen")} value={String(count("diajukan"))} icon={Clock} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statOpenNote", { amount: formatIDR(openAmount) })} />
        <AdminStat label={t("statApproved")} value={String(count("disetujui"))} icon={CheckCircle2} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} />
        <AdminStat label={t("statRejected")} value={String(count("ditolak"))} icon={XCircle} tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="bg-nk-section">
          {(["diajukan", "disetujui", "ditolak"] as const).map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs">
              {t(`st${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
              <span className="ml-1.5 tabular-nums text-nk-text-muted">{count(s)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
              {shown.map(({ r, st }) => {
                const reason = locale === "id" ? r.reasonId : r.reasonEn;
                return (
                  <TableRow key={r.id} className="border-b border-nk-border last:border-b-0">
                    <TableCell className="px-4 py-3 font-mono text-xs text-nk-text-muted">{r.id}</TableCell>
                    <TableCell className="px-4 py-3">
                      <p className="truncate font-medium text-nk-text">{r.user}</p>
                      <p className="truncate font-mono text-[10px] text-nk-text-muted">{r.bookingId}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-nk-text">{r.propertyName}</TableCell>
                    <TableCell className="max-w-60 px-4 py-3">
                      <p className="line-clamp-2 text-xs text-nk-text-muted">{reason}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">{formatIDR(r.amount)}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-nk-text-muted">{formatReviewDate(r.requestedAt, locale)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge color={STATUS_COLOR[st]}>{t(`st${st.charAt(0).toUpperCase()}${st.slice(1)}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {st === "diajukan" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-8 bg-[#2F6B3C] px-3 text-xs text-white hover:bg-[#275a32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                            onClick={() => decide(r.id, r.bookingId, "refund-approve")}
                          >
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            {t("approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-[#EBC4C0] px-3 text-xs text-[#9C3B32] hover:bg-[#FAEAE8] hover:text-[#9C3B32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                            onClick={() => decide(r.id, r.bookingId, "refund-reject")}
                          >
                            <XCircle className="size-3.5" aria-hidden="true" />
                            {t("reject")}
                          </Button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-nk-text-muted">
                          <Undo2 className="size-3.5" aria-hidden="true" />
                          {t("done")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {shown.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

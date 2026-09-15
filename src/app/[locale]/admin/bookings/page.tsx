"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarCheck, CheckCircle2, Clock, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminPageShell, { AdminSection, AdminStat } from "@/components/admin/AdminPageShell";
import { StatusBadge, type StatusColor } from "@/components/StatusBadge";
import { formatIDR } from "@/lib/utils";
import { formatReviewDate } from "@/lib/adminReviewStore";
import { bookings, ownerBookings } from "@/lib/data/entities";
import type { BookingStatus } from "@/lib/data/types";

const STATUS_COLOR: Record<BookingStatus, StatusColor> = {
  pending: "yellow",
  "approved-awaiting-payment": "blue",
  active: "green",
  rejected: "red",
  expired: "gray",
  cancelled: "gray",
};

/** Pantau seluruh pemesanan lintas properti. */
export default function AdminBookingsPage() {
  const t = useTranslations("admin.bookings");
  const locale = useLocale();
  const all = useMemo(
    () => [...bookings, ...ownerBookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    []
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | BookingStatus>("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((b) => (status === "all" ? true : b.status === status))
      .filter((b) =>
        q ? `${b.id} ${b.propertyName} ${b.applicantName} ${b.city}`.toLowerCase().includes(q) : true
      );
  }, [all, search, status]);

  const countOf = (s: BookingStatus) => all.filter((b) => b.status === s).length;
  const camel = (s: string) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statTotal")} value={String(all.length)} icon={CalendarCheck} tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text-muted" }} note={t("statTotalNote")} />
        <AdminStat label={t("statPending")} value={String(countOf("pending") + countOf("approved-awaiting-payment"))} icon={Clock} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statPendingNote")} />
        <AdminStat label={t("statActive")} value={String(countOf("active"))} icon={CheckCircle2} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} />
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
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-11 w-52 md:h-9" aria-label={t("filterLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filterAll")}</SelectItem>
                {(Object.keys(STATUS_COLOR) as BookingStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{t(`st${camel(s)}`)}</SelectItem>
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
                <TableHead className="px-4 py-3 font-medium">{t("colApplicant")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStart")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colPrice")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} className="border-b border-nk-border last:border-b-0">
                  <TableCell className="px-4 py-3 font-mono text-xs text-nk-text-muted">{b.id}</TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="truncate font-medium text-nk-text">{b.applicantName}</p>
                    <p className="truncate text-xs text-nk-text-muted">{b.applicantPhone}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <p className="truncate text-nk-text">{b.propertyName}</p>
                    <p className="truncate text-xs text-nk-text-muted">{b.roomType} · {b.roomNumber} · {b.city}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-nk-text-muted">{formatReviewDate(b.startDate, locale)}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums text-nk-text">{formatIDR(b.monthlyPrice)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge color={STATUS_COLOR[b.status]}>{t(`st${camel(b.status)}`)}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

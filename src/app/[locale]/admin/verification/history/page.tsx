"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Inbox, Search } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import VerificationDetailDialog from "@/components/VerificationDetailDialog";
import type { AdminReviewEntry } from "@/lib/data/types";
import { formatReviewDate, useAdminReviewData } from "@/lib/adminReviewStore";

export default function AdminHistoryPage() {
  const t = useTranslations("admin.history");
  const locale = useLocale();
  const { history } = useAdminReviewData();
  const [filter, setFilter] = useState<"all" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<AdminReviewEntry | null>(null);

  const filtered = useMemo(() => {
    let rows = history;
    if (filter !== "all") rows = rows.filter((h) => h.decision === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((h) =>
        [h.propertyName, h.ownerName, h.decidedBy ?? "", h.id]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return rows;
  }, [history, filter, search]);

  const tabs = [
    { id: "all" as const, label: t("filterAll"), count: history.length },
    {
      id: "approved" as const,
      label: t("filterApproved"),
      count: history.filter((h) => h.decision === "approved").length,
    },
    {
      id: "rejected" as const,
      label: t("filterRejected"),
      count: history.filter((h) => h.decision === "rejected").length,
    },
  ];

  const initialOf = (name: string) => name.trim().charAt(0).toUpperCase();

  return (
    <DashboardShell role="admin">
      <h1 className="mb-6 text-2xl font-medium tracking-tight text-nk-text">
        {t("title")}
      </h1>

      {/* tab filter + cari */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="flex h-auto w-fit gap-1 rounded-lg border border-nk-border bg-nk-surface p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-md px-3.5 py-2 text-sm font-normal transition-colors data-[state=active]:bg-nk-accent data-[state=active]:font-medium data-[state=active]:text-nk-text-inverse data-[state=inactive]:text-nk-text-muted hover:data-[state=inactive]:text-nk-text"
              >
                {tab.label}
                <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-70">
                  {tab.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto min-w-56 flex-1 sm:max-w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="border-nk-border bg-nk-surface pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed border-nk-border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t("empty")}</EmptyTitle>
            <EmptyDescription>{t("emptySubtitle")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* desktop tabel */}
          <div className="hidden overflow-hidden rounded-lg border border-nk-border bg-nk-surface lg:block">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                  <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("colOwner")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("colSubmitted")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("colDecided")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("colBy")}</TableHead>
                  <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={`${h.id}-${h.decidedAt ?? "x"}`} className="border-b border-nk-border last:border-b-0">
                    <TableCell className="px-4 py-3 font-medium text-nk-text">{h.propertyName}</TableCell>
                    <TableCell className="px-4 py-3 text-nk-text">{h.ownerName}</TableCell>
                    <TableCell className="px-4 py-3 text-nk-text-muted">
                      {formatReviewDate(h.submittedAt, locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-nk-text-muted">
                      {h.decidedAt ? formatReviewDate(h.decidedAt, locale) : "-"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {h.decision === "approved" ? (
                        <StatusBadge color="green">{t("statusApproved")}</StatusBadge>
                      ) : (
                        <StatusBadge color="red">{t("statusRejected")}</StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarImage
                            src={`https://picsum.photos/seed/admin-${(h.decidedBy ?? "x").toLowerCase().replace(/\s+/g, "-")}/64/64`}
                            alt=""
                          />
                          <AvatarFallback className="bg-nk-warm text-nk-text">
                            {h.decidedBy ? initialOf(h.decidedBy) : "-"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-nk-text">{h.decidedBy ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDetail(h)}
                        className="rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                      >
                        {t("viewDetail")}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* mobile cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {filtered.map((h) => (
              <article key={`${h.id}-${h.decidedAt ?? "x"}`} className="rounded-lg border border-nk-border bg-nk-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-nk-text">{h.propertyName}</p>
                    <p className="text-xs text-nk-text-muted">{h.ownerName}</p>
                    <p className="mt-0.5 text-xs text-nk-text-muted">
                      {formatReviewDate(h.submittedAt, locale)} →{" "}
                      {h.decidedAt ? formatReviewDate(h.decidedAt, locale) : "-"}
                    </p>
                  </div>
                  {h.decision === "approved" ? (
                    <StatusBadge color="green">{t("statusApproved")}</StatusBadge>
                  ) : (
                    <StatusBadge color="red">{t("statusRejected")}</StatusBadge>
                  )}
                </div>
                <p className="mt-2 text-xs text-nk-text-muted">
                  {t("colBy")}: {h.decidedBy ?? "-"}
                </p>
                <button
                  type="button"
                  onClick={() => setDetail(h)}
                  className="mt-3 w-full rounded-md border border-nk-border px-3 py-2 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                >
                  {t("viewDetail")}
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {/* modal detail - data properti penuh + hasil keputusan + alasan reject */}
      <VerificationDetailDialog
        key={detail?.id ?? "none"}
        entry={detail}
        mode="detail"
        onOpenChange={(o) => !o && setDetail(null)}
      />
    </DashboardShell>
  );
}

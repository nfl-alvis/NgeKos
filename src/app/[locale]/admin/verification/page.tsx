"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  Hourglass,
  Inbox,
  Search,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DashboardShell from "@/components/DashboardShell";
import VerificationDetailDialog from "@/components/VerificationDetailDialog";
import { useSession } from "@/components/SessionProvider";
import { ADMIN_PROFILE } from "@/lib/data/entities";
import type { AdminReviewEntry } from "@/lib/data/types";
import {
  ageInDays,
  formatReviewDate,
  recordDecision,
  useAdminReviewData,
} from "@/lib/adminReviewStore";
import { cn } from "@/lib/utils";

/** stat band-card mini (pola band-card dashboard owner, versi ringkas) */
function QueueStat({
  label,
  value,
  note,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: { card: string; icon: string };
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10",
        tint.card
      )}
    >
      <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{label}</p>
      <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              tint.icon
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
              {value}
            </p>
            {note && <p className="truncate text-xs text-nk-text-muted">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminVerificationPage() {
  const t = useTranslations("admin.queue");
  const locale = useLocale();
  const { user } = useSession();
  const adminName =
    user?.role === "admin" && user.name ? user.name : ADMIN_PROFILE.name;
  const { queue, history } = useAdminReviewData();
  const [review, setReview] = useState<AdminReviewEntry | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"oldest" | "newest">("oldest");
  const [toast, setToast] = useState<string | null>(null);

  const decidedToday = history.filter((h) => {
    const d = h.decidedAt ?? "";
    return d.slice(0, 10) === new Date().toISOString().slice(0, 10);
  }).length;
  const oldestWait = queue.length
    ? Math.max(...queue.map((p) => ageInDays(p.submittedAt)))
    : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? queue.filter((p) =>
          [p.propertyName, p.ownerName, p.city, p.id]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : [...queue];
    rows.sort((a, b) => {
      const cmp = a.submittedAt.localeCompare(b.submittedAt);
      return sort === "oldest" ? cmp : -cmp;
    });
    return rows;
  }, [queue, search, sort]);

  const initialOf = (name: string) => name.trim().charAt(0).toUpperCase();

  const decide = (decision: "approved" | "rejected", reason?: string) => {
    if (!review) return;
    recordDecision(review, decision, adminName, reason);
    setToast(t("decidedToast", { decision: t(`decided${decision === "approved" ? "Approved" : "Rejected"}`), name: review.propertyName }));
    setReview(null);
    window.setTimeout(() => setToast(null), 5000);
  };

  return (
    <DashboardShell role="admin">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-medium tracking-tight text-nk-text">
          {t("title")}
        </h1>
        {queue.length > 0 && (
          <span className="rounded-full bg-nk-accent px-2.5 py-0.5 text-xs font-medium text-nk-text-inverse">
            {t("pendingBadge", { count: queue.length })}
          </span>
        )}
      </div>

      {/* ringkasan - pola band-card seperti stat dashboard owner */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QueueStat
          label={t("statWaiting")}
          value={String(queue.length)}
          note={queue.length ? t("oldestNote", { count: oldestWait }) : t("empty")}
          icon={Inbox}
          tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }}
        />
        <QueueStat
          label={t("statOldest")}
          value={queue.length ? t("daysUnit", { count: oldestWait }) : "-"}
          note={t("statOldestNote")}
          icon={Hourglass}
          tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }}
        />
        <QueueStat
          label={t("statDecidedToday")}
          value={String(decidedToday)}
          note={t("statDecidedTodayNote")}
          icon={CheckCircle2}
          tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }}
        />
      </div>

      {queue.length === 0 ? (
        <Empty className="border border-dashed border-nk-border py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 className="text-[#2F6B3C]" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t("empty")}</EmptyTitle>
            <EmptyDescription>{t("emptySubtitle")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* toolbar cari + urutkan */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
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
            <Select value={sort} onValueChange={(v) => setSort(v as "oldest" | "newest")}>
              <SelectTrigger className="w-fit min-w-44 border-nk-border bg-nk-surface" aria-label={t("sortLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
                <SelectItem value="newest">{t("sortNewest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-lg border border-dashed border-nk-border px-4 py-10 text-center text-sm text-nk-text-muted">
              {t("noSearch", { query: search })}
            </p>
          ) : (
            <>
              {/* desktop tabel */}
              <div className="hidden overflow-hidden rounded-lg border border-nk-border bg-nk-surface lg:block">
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                      <TableHead className="px-4 py-3 font-medium">{t("colProperty")}</TableHead>
                      <TableHead className="px-4 py-3 font-medium">{t("colOwner")}</TableHead>
                      <TableHead className="px-4 py-3 font-medium">{t("colCity")}</TableHead>
                      <TableHead className="px-4 py-3 font-medium">{t("colDate")}</TableHead>
                      <TableHead className="px-4 py-3 font-medium">{t("colWaiting")}</TableHead>
                      <TableHead className="px-4 py-3 font-medium">{t("colAction")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const days = ageInDays(p.submittedAt);
                      return (
                        <TableRow key={p.id} className="border-b border-nk-border last:border-b-0">
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar size="sm">
                                <AvatarImage
                                  src={`https://picsum.photos/seed/${p.propertySlug}/64/64`}
                                  alt=""
                                />
                                <AvatarFallback className="bg-nk-warm text-nk-text">
                                  {initialOf(p.propertyName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-nk-text">{p.propertyName}</p>
                                <p className="font-mono text-[10px] text-nk-text-muted">{p.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-nk-text">{p.ownerName}</TableCell>
                          <TableCell className="px-4 py-3 text-nk-text">{p.city}</TableCell>
                          <TableCell className="px-4 py-3 text-nk-text-muted">
                            {formatReviewDate(p.submittedAt, locale)}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "inline-flex cursor-default items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                                      days >= 5
                                        ? "bg-[#FAEAE8] text-[#9C3B32]"
                                        : "bg-nk-warm text-nk-text-muted"
                                    )}
                                  >
                                    <Clock className="size-3" aria-hidden="true" />
                                    {t("daysUnit", { count: days })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{t("waitingTooltip", { days })}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setReview(p)}
                              className="rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                            >
                              {t("review")}
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* mobile cards */}
              <div className="flex flex-col gap-3 lg:hidden">
                {filtered.map((p) => {
                  const days = ageInDays(p.submittedAt);
                  return (
                    <article key={p.id} className="rounded-lg border border-nk-border bg-nk-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-nk-text">{p.propertyName}</p>
                          <p className="mt-0.5 text-xs text-nk-text-muted">
                            {p.ownerName} · {p.city}
                          </p>
                          <p className="mt-0.5 text-xs text-nk-text-muted">
                            {formatReviewDate(p.submittedAt, locale)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                            days >= 5
                              ? "bg-[#FAEAE8] text-[#9C3B32]"
                              : "bg-nk-warm text-nk-text-muted"
                          )}
                        >
                          {t("daysUnit", { count: days })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReview(p)}
                        className="mt-3 w-full rounded-md border border-nk-border px-3 py-2 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                      >
                        {t("review")}
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* modal review - data properti penuh + keputusan tersimpan ke riwayat */}
      <VerificationDetailDialog
        key={review?.id ?? "none"}
        entry={review}
        mode="review"
        onOpenChange={(o) => !o && setReview(null)}
        onDecide={decide}
      />

      {/* toast konfirmasi keputusan */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-lg border border-nk-border bg-nk-surface px-4 py-2.5 text-sm text-nk-text shadow-lg"
        >
          {toast}
        </div>
      )}
    </DashboardShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Eye, EyeOff, Flag, ShieldQuestion, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminPageShell, { AdminSection, AdminStat, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useSession } from "@/components/SessionProvider";
import { formatReviewDate } from "@/lib/adminReviewStore";
import { latestActionFor, recordOp, useAdminOps } from "@/lib/adminOpsStore";
import { adminReviewItems } from "@/lib/data/adminData";
import { cn } from "@/lib/utils";

/** Moderasi ulasan mencurigakan / tidak pantas. */
export default function AdminReviewsPage() {
  const t = useTranslations("admin.reviews");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const ops = useAdminOps();
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [dbReviews, setDbReviews] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/reviews")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map((r: any) => ({
            id: r.id,
            authorName: r.authorName,
            rating: r.rating,
            propertyName: r.propertyName,
            at: typeof r.createdAt === "string" ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            flagged: r.flagged,
            bodyId: r.body,
            bodyEn: r.body,
            status: r.status,
          }));
          setDbReviews(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const allReviews = dbReviews.length > 0 ? dbReviews : adminReviewItems;

  const rows = useMemo(() => {
    return allReviews
      .map((r) => {
        const last = latestActionFor(ops, r.id);
        const hidden = last === "hide" || r.status === "HIDDEN";
        return { r, hidden };
      })
      .filter((x) => (onlyFlagged ? x.r.flagged : true));
  }, [allReviews, ops, onlyFlagged]);

  const flaggedOpen = allReviews.filter(
    (r) => r.flagged && latestActionFor(ops, r.id) !== "hide" && r.status !== "HIDDEN"
  ).length;

  const act = async (id: string, property: string, next: "hide" | "show") => {
    recordOp(id, next, user?.email, property);
    show(next === "hide" ? t("toastHidden", { id }) : t("toastShown", { id }));

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      try {
        await fetch(`/api/admin/reviews/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: next === "hide" ? "HIDDEN" : "PUBLISHED",
          }),
        });
      } catch {
        // fallback
      }
    }
  };

  const avg =
    allReviews.length > 0
      ? allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length
      : 5;

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStat label={t("statFlagged")} value={String(flaggedOpen)} icon={Flag} tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }} note={t("statFlaggedNote")} />
        <AdminStat label={t("statTotal")} value={String(adminReviewItems.length)} icon={Star} tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text-muted" }} />
        <AdminStat label={t("statAvg")} value={avg.toFixed(1)} icon={ShieldQuestion} tint={{ card: "bg-[#FBF3DC]", icon: "bg-[#F3E3B8] text-[#8A6A1F]" }} note={t("statAvgNote")} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Button
          size="sm"
          variant={onlyFlagged ? "primary" : "outline"}
          className="h-9 text-xs"
          onClick={() => setOnlyFlagged((v) => !v)}
        >
          <Flag className="size-3.5" aria-hidden="true" />
          {t("filterFlagged")}
        </Button>
      </div>

      <AdminSection title={t("listTitle")} bodyClass="p-0">
        {rows.map(({ r, hidden }) => (
          <article
            key={r.id}
            className={cn(
              "flex flex-col gap-2 border-b border-nk-border px-4 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between",
              hidden && "opacity-60"
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-nk-text">{r.authorName}</p>
                <span className="flex items-center gap-0.5 text-xs tabular-nums text-nk-text-muted">
                  <Star className="size-3.5 fill-none text-nk-star" strokeWidth={1.6} aria-hidden="true" />
                  <span className="text-nk-star">{r.rating}.0</span>
                </span>
                <p className="truncate text-xs text-nk-text-muted">
                  {r.propertyName} · {formatReviewDate(r.at, locale)}
                </p>
                {r.flagged && <StatusBadge color="red">{t("flaggedBadge")}</StatusBadge>}
                {hidden && <StatusBadge color="gray">{t("hiddenBadge")}</StatusBadge>}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-nk-text">{locale === "id" ? r.bodyId : r.bodyEn}</p>
            </div>
            <div className="shrink-0">
              {hidden ? (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => act(r.id, r.propertyName, "show")}>
                  <Eye className="size-3.5" aria-hidden="true" />
                  {t("actShow")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-[#EBC4C0] text-xs text-[#9C3B32] hover:bg-[#FAEAE8] hover:text-[#9C3B32]"
                  onClick={() => act(r.id, r.propertyName, "hide")}
                >
                  <EyeOff className="size-3.5" aria-hidden="true" />
                  {t("actHide")}
                </Button>
              )}
            </div>
          </article>
        ))}
        {rows.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>}
      </AdminSection>
    </AdminPageShell>
  );
}

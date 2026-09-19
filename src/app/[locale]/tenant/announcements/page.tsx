"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { tenants } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import { announcements as staticAnnouncements } from "@/lib/data/userData";
import { cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";

const DEMO_TENANT = tenants.find((tn) => tn.id === "t-1")!;
const PROPERTY = getPropertyBySlug(DEMO_TENANT.propertySlug)!;
const NOW = new Date();

interface AnnouncementItem {
  id: string;
  titleId: string;
  titleEn: string;
  bodyId: string;
  bodyEn: string;
  at: string;
  read?: boolean;
}

/** Pengumuman dari owner - terhubung ke API database /api/announcements */
export default function TenantAnnouncementsPage() {
  const t = useTranslations("tenantPages.announcements");
  const locale = useLocale();
  const [list, setList] = useState<AnnouncementItem[]>(staticAnnouncements);
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: AnnouncementItem[] = json.data.map((item: any) => ({
            id: item.id,
            titleId: item.title,
            titleEn: item.title,
            bodyId: item.body,
            bodyEn: item.body,
            at: typeof item.publishedAt === "string" ? item.publishedAt : new Date().toISOString(),
            read: Array.isArray(item.reads) && item.reads.length > 0,
          }));
          setList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const handleMarkRead = (id: string) => {
    setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
    fetch(`/api/announcements/${id}/read`, { method: "PATCH" }).catch(() => {});
  };

  const relTime = (at: string) => {
    const mins = Math.max(0, Math.floor((NOW.getTime() - new Date(at).getTime()) / 60_000));
    if (mins < 60) return t("justNow");
    if (mins < 60 * 24) return t("hoursAgo", { count: Math.floor(mins / 60) });
    const days = Math.floor(mins / (60 * 24));
    return t("daysAgo", { count: days });
  };

  return (
    <UserDashboardShell role="tenant" title={t("title")}>
      <DashSection
        title={t("listTitle")}
        right={<span className="text-xs text-nk-text-muted">{PROPERTY?.name || "Kos"}</span>}
        bodyClass="divide-y divide-nk-border"
      >
        {list.map((a, i) => {
          const fresh = (i === 0 || !a.read) && !seen.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => handleMarkRead(a.id)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nk-accent",
                fresh && "bg-nk-section"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                  fresh ? "bg-nk-accent text-nk-text-inverse" : "bg-nk-section text-nk-text-muted"
                )}
                aria-hidden="true"
              >
                <Megaphone className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-nk-text">{locale === "id" ? a.titleId : a.titleEn}</p>
                  {fresh && <StatusBadge color="blue">{t("new")}</StatusBadge>}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-nk-text-muted">
                  {locale === "id" ? a.bodyId : a.bodyEn}
                </p>
                <p className="mt-2 text-xs text-nk-text-muted">{relTime(a.at)}</p>
              </div>
            </button>
          );
        })}
      </DashSection>
    </UserDashboardShell>
  );
}

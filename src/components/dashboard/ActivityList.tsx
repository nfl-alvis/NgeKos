"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bell, CalendarCheck, CreditCard, Heart, MessageSquare, RotateCcw, Star } from "lucide-react";
import { useUserActivity, timeAgoKey, type ActivityType } from "@/lib/userActivityStore";
import { cn } from "@/lib/utils";

const ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  booking: CalendarCheck,
  payment: CreditCard,
  favorite: Heart,
  review: Star,
  status: Bell,
  refund: RotateCcw,
  info: MessageSquare,
};

const ICON_TINT: Record<ActivityType, string> = {
  booking: "bg-[#E8EFF8] text-[#33517C]",
  payment: "bg-[#E9F4EC] text-[#2F6B3C]",
  favorite: "bg-[#FBF3DC] text-[#8A6A1F]",
  review: "bg-[#F3EDE6] text-nk-accent",
  status: "bg-[#E8EFF8] text-[#33517C]",
  refund: "bg-[#FAEAE8] text-[#9C3B32]",
  info: "bg-nk-section text-nk-text-muted",
};

/** riwayat aktivitas penting user — urutan terbaru di atas */
export default function ActivityList({ limit }: { limit?: number }) {
  const t = useTranslations("userDash.activity");
  const locale = useLocale();
  const items = useUserActivity();
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <ul className="flex flex-col">
      {shown.map((a) => {
        const Icon = ICONS[a.type];
        const rel = timeAgoKey(a.at, new Date("2026-09-03T12:00:00"));
        return (
          <li key={a.id} className="flex items-start gap-3 border-b border-nk-border py-3 last:border-b-0">
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                ICON_TINT[a.type]
              )}
              aria-hidden="true"
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-nk-text">
                {locale === "id" ? a.titleId : a.titleEn}
              </p>
              <p className="truncate text-xs text-nk-text-muted">{a.subject}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap pt-1 text-xs text-nk-text-muted">
              {rel.count === undefined
                ? t(rel.key)
                : t(rel.key, { count: rel.count })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

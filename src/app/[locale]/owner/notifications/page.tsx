"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/DashboardShell";
import { notifications as staticNotifications } from "@/lib/data/entities";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  at: string;
  type: "booking" | "payment" | "subscription";
  read?: boolean;
}

export default function OwnerNotificationsPage() {
  const t = useTranslations("owner.notif");
  const [list, setList] = useState<NotificationItem[]>(staticNotifications);
  const [read, setRead] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: NotificationItem[] = json.data.map((n: any) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            at: typeof n.createdAt === "string" ? n.createdAt : new Date().toISOString(),
            type: (n.type ? n.type.toLowerCase() : "booking") as "booking" | "payment" | "subscription",
            read: Boolean(n.readAt),
          }));
          setList(mapped);
          const alreadyReadIds = mapped.filter((m) => m.read).map((m) => m.id);
          setRead(alreadyReadIds);
        }
      })
      .catch(() => {});
  }, []);

  const unread = list.filter((n) => !read.includes(n.id) && !n.read);

  const typeLabel: Record<string, string> = {
    booking: t("typeBooking"),
    payment: t("typePayment"),
    subscription: t("typeSubscription"),
  };

  const handleMarkAllRead = () => {
    setRead(list.map((n) => n.id));
    fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
  };

  const handleMarkSingleRead = (id: string) => {
    setRead((prev) => (prev.includes(id) ? prev : [...prev, id]));
    fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
  };

  return (
    <DashboardShell role="owner">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm text-nk-text underline underline-offset-4 transition-colors hover:text-nk-text-muted"
          >
            {t("markAll")}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-nk-border px-6 py-16 text-center text-sm text-nk-text-muted">
          {t("empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-nk-border bg-nk-surface">
          {list.map((n, i) => {
            const isRead = read.includes(n.id) || Boolean(n.read);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleMarkSingleRead(n.id)}
                className={`flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-nk-warm/60 ${
                  i > 0 ? "border-t border-nk-border" : ""
                }`}
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    isRead ? "bg-nk-border" : "bg-nk-accent"
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm ${isRead ? "text-nk-text-muted" : "font-medium text-nk-text"}`}>
                      {n.title}
                    </span>
                    <span className="rounded-full border border-nk-border px-2 py-0.5 text-[10px] text-nk-text-muted">
                      {typeLabel[n.type] || n.type}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-nk-text-muted">{n.body}</span>
                  <span className="mt-1 block text-xs text-nk-text-muted/70">
                    {new Date(n.at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

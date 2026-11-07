"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  LogIn,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useSession } from "@/components/SessionProvider";
import { Link } from "@/i18n/navigation";

interface ApiAnnouncement {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  createdAt: string;
  expiresAt?: string | null;
  property?: {
    id: string;
    name: string;
    slug: string;
  };
  reads?: Array<{
    readAt: string;
  }>;
}

type ApiBooking = {
  id: string;
  status: string;
  property?: {
    id: string;
    name: string;
    slug: string;
  };
};

/** Pengumuman dari pemilik kos - live database API */
export default function TenantAnnouncementsPage() {
  const t = useTranslations("tenantPages.announcements");
  const locale = useLocale();
  const { user, ready } = useSession();

  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  const handleRefresh = useCallback(() => {
    setIsFetching(true);
    setErrorMessage(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;

    Promise.allSettled([
      fetch("/api/announcements").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/bookings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([announcementsRes, bookingsRes]) => {
        if (ignore) return;
        if (announcementsRes.status === "fulfilled" && announcementsRes.value?.data) {
          const raw: ApiAnnouncement[] = Array.isArray(announcementsRes.value.data)
            ? announcementsRes.value.data
            : [];
          setAnnouncements(raw);

          // Pre-fill readIds from DB records
          const alreadyRead = raw
            .filter((a) => a.reads && a.reads.length > 0)
            .map((a) => a.id);
          setReadIds((prev) => Array.from(new Set([...prev, ...alreadyRead])));
        } else {
          setAnnouncements([]);
        }

        if (bookingsRes.status === "fulfilled" && bookingsRes.value?.data) {
          const rawBookings: ApiBooking[] = Array.isArray(bookingsRes.value.data)
            ? bookingsRes.value.data
            : [];
          const active = rawBookings.find(
            (b) => b.status === "ACTIVE" || b.status === "APPROVED_AWAITING_PAYMENT"
          );
          setActiveBooking(active || null);
        }
        setIsFetching(false);
      })
      .catch(() => {
        if (!ignore) {
          setErrorMessage(
            locale === "id"
              ? "Gagal memuat pengumuman kos. Silakan muat ulang halaman."
              : "Failed to load announcements. Please reload the page."
          );
          setIsFetching(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [ready, user, locale, refreshKey]);

  const isLoading = !ready || (Boolean(user) && isFetching);

  const isItemRead = (a: ApiAnnouncement) => {
    if (readIds.includes(a.id)) return true;
    return Boolean(a.reads && a.reads.length > 0);
  };

  const markRead = async (id: string) => {
    if (readIds.includes(id)) return;
    setReadIds((prev) => [...prev, id]);
    try {
      await fetch(`/api/announcements/${id}/read`, { method: "POST" });
    } catch {
      // Non-fatal background sync
    }
  };

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const unreadCount = announcements.filter((a) => !isItemRead(a)).length;
  const propertyName =
    activeBooking?.property?.name ||
    announcements[0]?.property?.name ||
    (locale === "id" ? "Kost Saya" : "My Kost");

  return (
    <UserDashboardShell
      role="tenant"
      title={t("title")}
      greeting={
        user?.name
          ? `${locale === "id" ? "Halo" : "Hello"}, ${user.name.split(" ")[0]}`
          : undefined
      }
      actions={
        user ? (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition hover:bg-nk-warm disabled:opacity-50"
            title={locale === "id" ? "Segarkan pengumuman" : "Refresh announcements"}
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>{locale === "id" ? "Perbarui" : "Refresh"}</span>
          </button>
        ) : undefined
      }
    >
      {/* Error state */}
      {errorMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-md bg-red-100 px-3 py-1 font-medium text-red-900 hover:bg-red-200"
          >
            {locale === "id" ? "Coba Lagi" : "Retry"}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse" aria-label="Loading announcements">
          <div className="h-28 rounded-xl bg-nk-section" />
          <div className="h-28 rounded-xl bg-nk-section" />
          <div className="h-28 rounded-xl bg-nk-section" />
        </div>
      ) : !user ? (
        /* Unauthenticated State */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-12 text-center shadow-sm">
          <LogIn className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h2 className="text-lg font-semibold text-nk-text">
            {locale === "id" ? "Masuk ke Akun Anda" : "Sign In to Your Account"}
          </h2>
          <p className="mt-1 text-sm text-nk-text-muted max-w-md mx-auto">
            {locale === "id"
              ? "Silakan masuk dengan akun penyewa Anda untuk membaca pengumuman penting dari pemilik kos."
              : "Please sign in with your tenant account to read important announcements from your property owner."}
          </p>
          <Link
            href="/login?from=/tenant/announcements"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : (
        /* Authenticated View */
        <DashSection
          title={t("listTitle")}
          right={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="rounded-full bg-nk-accent px-2 py-0.5 text-[11px] font-semibold text-nk-text-inverse">
                  {unreadCount} {t("new")}
                </span>
              )}
              <span className="text-xs text-nk-text-muted">{propertyName}</span>
            </div>
          }
          bodyClass="divide-y divide-nk-border"
        >
          {announcements.length === 0 ? (
            <div className="py-12 text-center">
              <Megaphone className="mx-auto size-10 text-nk-text-muted opacity-40 mb-2" />
              <h3 className="text-sm font-semibold text-nk-text">
                {locale === "id" ? "Belum Ada Pengumuman" : "No Announcements"}
              </h3>
              <p className="mt-1 text-xs text-nk-text-muted max-w-sm mx-auto">
                {locale === "id"
                  ? "Belum ada pengumuman terbaru dari pemilik kos saat ini."
                  : "There are currently no new announcements from the property owner."}
              </p>
            </div>
          ) : (
            announcements.map((a) => {
              const isRead = isItemRead(a);
              const publishedIso = a.publishedAt || a.createdAt;

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => markRead(a.id)}
                  className={cn(
                    "flex w-full items-start gap-4 p-4 text-left transition hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent",
                    !isRead && "bg-nk-accent-subtle/25"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      !isRead
                        ? "bg-nk-accent text-nk-text-inverse"
                        : "bg-nk-section text-nk-text-muted"
                    )}
                    aria-hidden="true"
                  >
                    <Megaphone className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          !isRead ? "font-semibold text-nk-text" : "font-medium text-nk-text"
                        )}
                      >
                        {a.title}
                      </p>
                      <span className="text-xs text-nk-text-muted shrink-0">
                        {fmtDate(publishedIso)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-nk-text whitespace-pre-line leading-relaxed">
                      {a.body}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-nk-text-muted">
                        {a.property?.name || propertyName}
                      </span>
                      {!isRead && (
                        <StatusBadge color="blue">{t("new")}</StatusBadge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </DashSection>
      )}
    </UserDashboardShell>
  );
}

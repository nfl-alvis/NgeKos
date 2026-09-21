"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarCheck, CreditCard, Heart, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/components/SessionProvider";
import { bookings } from "@/lib/data/entities";
import { useUserOps } from "@/lib/userOpsStore";
import { useUserActivity } from "@/lib/userActivityStore";
import {
  ActiveBookingPanel,
  ActiveKostCard,
  FavoritesPanel,
  PaymentsPanel,
  RecommendationsPanel,
  ReviewsPanel,
} from "@/components/dashboard/UserPanels";
import ActivityList from "@/components/dashboard/ActivityList";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

/**
 * Dashboard user biasa - "aktivitas saya mencari dan mendapatkan kos".
 * Booking aktif & status pembayaran = bagian terpenting; saat user sudah
 * jadi penyewa, kartu Kos Aktif mengarah ke /tenant/dashboard (kedua
 * dashboard hidup berbarengan, tidak dipindahkan).
 */
export default function UserDashboardPage() {
  const t = useTranslations("userDash");
  const locale = useLocale();
  const { user } = useSession();
  const ops = useUserOps();
  const activity = useUserActivity();

  const firstName = (user?.name ?? "Budi Santoso").split(" ")[0];
  const [totalBookings, setTotalBookings] = useState(bookings.length);
  const [openBookings, setOpenBookings] = useState(
    bookings.filter((b) => b.status === "pending" || b.status === "approved-awaiting-payment").length
  );

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const raw = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.items)
          ? json.data.items
          : null;
        if (raw) {
          setTotalBookings(raw.length);
          const open = raw.filter((b: any) =>
            ["PENDING", "APPROVED_AWAITING_PAYMENT"].includes(b.status)
          ).length;
          setOpenBookings(open);
        }
      })
      .catch(() => {});
  }, []);

  const pendingPay = ops.payments.filter((p) => p.status === "pending").length;
  const hasAnyBooking = totalBookings > 0;

  const stats = [
    {
      key: "bookings",
      icon: CalendarCheck,
      value: String(totalBookings),
      sub: t("statBookingsSub", { count: openBookings }),
      tint: "bg-[#E8EFF8]",
      iconTint: "bg-[#D3E0F0] text-[#33517C]",
      href: "/dashboard/bookings",
    },
    {
      key: "favorites",
      icon: Heart,
      value: String(ops.favorites.length),
      sub: t("statFavoritesSub"),
      tint: "bg-[#FBF3DC]",
      iconTint: "bg-[#F3E3B8] text-[#8A6A1F]",
      href: "/dashboard/favorites",
    },
    {
      key: "pending",
      icon: CreditCard,
      value: String(pendingPay),
      sub: pendingPay > 0 ? t("statPendingSubOpen") : t("statPendingSubClear"),
      tint: pendingPay > 0 ? "bg-[#FAEAE8]" : "bg-[#E9F4EC]",
      iconTint:
        pendingPay > 0
          ? "bg-[#F3D7D3] text-[#9C3B32]"
          : "bg-[#CFE8D6] text-[#2F6B3C]",
      href: "/dashboard/payments",
    },
    {
      key: "reviews",
      icon: Star,
      value: String(ops.reviews.filter((r) => r.mine).length),
      sub: t("statReviewsSub"),
      tint: "bg-[#F3EDE6]",
      iconTint: "bg-nk-accent-subtle text-nk-accent",
      href: "/dashboard/reviews",
    },
  ] as const;

  return (
    <UserDashboardShell title={t("title")} greeting={t("welcome", { name: firstName })}>
      {/* ringkasan aktivitas - selalu tampil */}
      <div className="mb-10 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className={`flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 transition-colors hover:ring-nk-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent ${s.tint}`}
          >
            <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t(`stat.${s.key}`)}</p>
            <div className="flex flex-1 flex-col rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${s.iconTint}`}>
                  <s.icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {s.value}
                  </p>
                  <p className="truncate text-xs text-nk-text-muted">{s.sub}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* kos aktif (jika sudah jadi tenant) */}
      <div className="mb-6">
        <ActiveKostCard />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* kolom kiri: booking aktif + pembayaran + review */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ActiveBookingPanel compact />
          <PaymentsPanel limit={3} />
          <div className="grid gap-6 xl:grid-cols-2">
            <FavoritesPanel limit={3} />
            <ReviewsPanel limit={2} />
          </div>
          {!hasAnyBooking && (
            <RecommendationsPanel />
          )}
        </div>

        {/* kolom kanan: aktivitas + rekomendasi */}
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-nk-section">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("activity.title")}</h2>
              <span className="text-xs text-nk-text-muted tabular-nums">{activity.length}</span>
            </div>
            <div className="flex-1 rounded-lg bg-nk-surface px-4 ring-1 ring-foreground/10">
              <ActivityList limit={6} />
            </div>
          </section>

          {hasAnyBooking && <RecommendationsPanel />}

          {/* jelajahi kos - CTA tetap tersedia walau sedang menempati kos */}
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#F3EDE6]">
            <h2 className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{t("explore.title")}</h2>
            <div className="flex flex-1 flex-col gap-3 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              <p className="text-sm text-nk-text-muted">
                {t("explore.body", { count: ops.reviews.filter((r) => r.mine).length })}
              </p>
              <Link
                href="/kost"
                className="inline-flex items-center justify-center gap-1.5 bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("explore.cta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <p className="mt-8 text-xs text-nk-text-muted">
        {locale === "id"
          ? "Semua angka mengikuti status transaksi pada sesi ini."
          : "All figures follow the transaction status in this session."}
      </p>
    </UserDashboardShell>
  );
}

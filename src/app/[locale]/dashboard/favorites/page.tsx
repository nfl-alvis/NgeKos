"use client";

import { useTranslations } from "next-intl";
import FavoriteList from "@/components/dashboard/FavoriteList";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

/** Semua kos favorit user - hapus lewat tombol hati, tambah dari halaman kos. */
export default function DashboardFavoritesPage() {
  const t = useTranslations("userDash");
  return (
    <UserDashboardShell title={t("favoritesTitle")}>
      <div className="mx-auto max-w-5xl">
        <FavoriteList />
      </div>
    </UserDashboardShell>
  );
}


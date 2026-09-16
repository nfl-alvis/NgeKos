"use client";

import { useTranslations } from "next-intl";
import { FavoritesPanel } from "@/components/dashboard/UserPanels";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

/** Semua kos favorit user — hapus lewat tombol hati, tambah dari halaman kos. */
export default function DashboardFavoritesPage() {
  const t = useTranslations("userDash");
  return (
    <UserDashboardShell title={t("favoritesTitle")}>
      <FavoritesPanel full />
    </UserDashboardShell>
  );
}

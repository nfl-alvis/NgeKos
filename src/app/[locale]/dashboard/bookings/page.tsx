"use client";

import { useTranslations } from "next-intl";
import BookingList from "@/components/dashboard/BookingList";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

/** Riwayat & proses booking user (versi dalam shell sidebar /dashboard). */
export default function DashboardBookingsPage() {
  const t = useTranslations("userDash");
  return (
    <UserDashboardShell title={t("bookingsTitle")}>
      <div className="mx-auto w-full max-w-3xl">
        <BookingList />
      </div>
    </UserDashboardShell>
  );
}

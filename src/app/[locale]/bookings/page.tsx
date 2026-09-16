"use client";

import { useTranslations } from "next-intl";
import BookingList from "@/components/dashboard/BookingList";

/**
 * Halaman standalone "Booking Saya" (deep link lama masih hidup).
 * Versi dalam dashboard ada di /dashboard/bookings (shell sidebar) —
 * keduanya memakai komponen BookingList yang sama.
 */
export default function MyBookingsPage() {
  const t = useTranslations("myBookings");
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <h1 className="mb-6 text-3xl font-light tracking-tight text-nk-text">{t("title")}</h1>
      <BookingList />
    </div>
  );
}

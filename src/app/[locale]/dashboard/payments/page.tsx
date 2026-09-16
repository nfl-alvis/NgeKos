"use client";

import { useTranslations } from "next-intl";
import { PaymentsPanel } from "@/components/dashboard/UserPanels";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

/** Semua transaksi pembayaran booking (pending / berhasil / gagal / refund). */
export default function DashboardPaymentsPage() {
  const t = useTranslations("userDash");
  return (
    <UserDashboardShell title={t("paymentsTitle")}>
      <PaymentsPanel />
    </UserDashboardShell>
  );
}

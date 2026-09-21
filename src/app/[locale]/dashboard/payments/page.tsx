"use client";

import { useTranslations } from "next-intl";
import PaymentList from "@/components/dashboard/PaymentList";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

/** Semua transaksi pembayaran booking (pending / berhasil / gagal / refund). */
export default function DashboardPaymentsPage() {
  const t = useTranslations("userDash");
  return (
    <UserDashboardShell title={t("paymentsTitle")}>
      <div className="mx-auto max-w-5xl">
        <PaymentList />
      </div>
    </UserDashboardShell>
  );
}


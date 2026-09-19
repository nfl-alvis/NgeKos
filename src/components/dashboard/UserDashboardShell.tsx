"use client";

import { useLocale } from "next-intl";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { DEMO_TODAY } from "@/lib/data/userData";

/**
 * Kerangka seragam halaman /dashboard* (user) dan /tenant/* (penyewa) -
 * reuse AdminPageShell (sidebar per role + judul + toast in-place), lalu
 * menambah baris sapaan + tanggal demo.
 */
export default function UserDashboardShell({
  role = "user",
  title,
  greeting,
  actions,
  children,
}: {
  role?: "user" | "tenant";
  title: string;
  greeting?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const locale = useLocale();
  return (
    <AdminPageShell role={role} title={title} actions={actions}>
      <div className="-mt-3 mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {greeting && <p className="text-sm font-medium text-nk-text">{greeting}</p>}
        <p className="text-sm text-nk-text-muted">
          {DEMO_TODAY.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      {children}
    </AdminPageShell>
  );
}

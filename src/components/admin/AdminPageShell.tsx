"use client";

import { createContext, useCallback, useContext, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

/* ===== kerangka seragam halaman admin =====
   Semua menu admin memakai shell ini: sidebar admin + judul + badge + toast
   in-place (pola toast VerificationDetailDialog - tanpa library tambahan).
   Aksi halaman memanggil useAdminToast().show("pesan"). */

const ToastCtx = createContext<{ show: (msg: string) => void }>({ show: () => {} });

export function useAdminToast() {
  return useContext(ToastCtx);
}

export default function AdminPageShell({
  role = "admin",
  title,
  badge,
  actions,
  children,
}: {
  /** role shell sidebar - panel admin (default), juga dipakai halaman /dashboard & /tenant */
  role?: "owner" | "admin" | "tenant" | "user";
  title: string;
  /** chip kecil di samping judul (mis. jumlah pending) */
  badge?: React.ReactNode;
  /** tombol kanan atas (mis. Ekspor CSV) */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <DashboardShell role={role}>
      <ToastCtx.Provider value={{ show }}>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-nk-text">{title}</h1>
          {badge}
          {actions && <div className="ml-auto">{actions}</div>}
        </div>
        {children}

        {toast && (
          <div
            role="status"
            className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-lg border border-nk-border bg-nk-surface px-4 py-2.5 text-sm text-nk-text shadow-lg"
          >
            {toast}
          </div>
        )}
      </ToastCtx.Provider>
    </DashboardShell>
  );
}

/** Stat ringkasan - pola band-card (band judul berwarna + kartu dalam putih ber-ring). */
export function AdminStat({
  label,
  value,
  note,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: { card: string; icon: string };
}) {
  return (
    <div
      className={`flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 ${tint.card}`}
    >
      <p className="px-4 pb-1 pt-3 text-sm font-semibold text-nk-text">{label}</p>
      <div className="flex-1 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tint.icon}`}
          >
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
              {value}
            </p>
            {note && <p className="truncate text-xs text-nk-text-muted">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Section band-card generik utk tabel/konten halaman admin. */
export function AdminSection({
  title,
  right,
  tint = "bg-nk-section",
  bodyClass = "p-0",
  children,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  tint?: string;
  bodyClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 ${tint}`}>
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
        <h2 className="text-sm font-semibold text-nk-text">{title}</h2>
        {right}
      </div>
      <div className={`flex-1 rounded-lg bg-nk-surface ring-1 ring-foreground/10 ${bodyClass}`}>
        {children}
      </div>
    </section>
  );
}

/** Menu aksi per baris (Ellipsis) - trigger sama dgn tabel performa owner. */
import { Ellipsis } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RowActions({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ariaLabel}
        className="flex size-8 items-center justify-center rounded-md text-nk-text-muted transition-colors hover:bg-nk-accent-subtle hover:text-nk-text focus-visible:outline-2 focus-visible:outline-nk-accent"
      >
        <Ellipsis className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

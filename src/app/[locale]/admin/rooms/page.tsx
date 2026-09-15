"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, DoorOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminPageShell, { AdminSection, AdminStat } from "@/components/admin/AdminPageShell";
import { roomUnits } from "@/lib/data/entities";
import { properties } from "@/lib/data/properties";
import { cn } from "@/lib/utils";

const STATUS_TINT: Record<string, string> = {
  kosong: "border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]",
  terisi: "border-[#B9CCE4] bg-[#E8EFF8] text-[#33517C]",
  dipesan: "border-[#EAD9A8] bg-[#FBF3DC] text-[#8A6A1F]",
  maintenance: "border-[#EBC4C0] bg-[#FAEAE8] text-[#9C3B32]",
};

/** Pantau kamar dan status ketersediaannya — pilih satu properti (dropdown selector). */
export default function AdminRoomsPage() {
  const t = useTranslations("admin.rooms");
  const slugs = Object.keys(roomUnits);
  const [slug, setSlug] = useState(slugs[0]);

  const units = roomUnits[slug] ?? [];
  const property = properties.find((p) => p.slug === slug);
  const count = (s: string) => units.filter((u) => u.status === s).length;

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <AdminStat label={t("statTotal")} value={String(units.length)} icon={DoorOpen} tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text-muted" }} />
        <AdminStat label={t("stTerisi")} value={String(count("terisi"))} icon={DoorOpen} tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }} />
        <AdminStat label={t("stKosong")} value={String(count("kosong"))} icon={DoorOpen} tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }} />
        <AdminStat label={t("stMaintenance")} value={String(count("maintenance"))} icon={DoorOpen} tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }} />
      </div>

      <AdminSection
        title={t("gridTitle")}
        right={
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1.5 rounded-md bg-nk-surface px-3 py-1.5 text-sm text-nk-text ring-1 ring-foreground/10 transition-colors hover:bg-nk-accent-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-nk-accent"
              aria-label={t("gridTitle")}
            >
              {property?.name ?? slug}
              <ChevronDown className="size-3.5 text-nk-text-muted" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={slug} onValueChange={setSlug}>
                {slugs.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    {properties.find((p) => p.slug === s)?.name ?? s}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        bodyClass="p-4 sm:p-6"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {units.map((u) => (
            <div
              key={u.number}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm",
                STATUS_TINT[u.status]
              )}
            >
              <p className="font-mono text-xs font-semibold">{u.number}</p>
              <p className="mt-0.5 text-xs">{t(`st${u.status.charAt(0).toUpperCase()}${u.status.slice(1)}`)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-nk-text-muted">
          {(["kosong", "terisi", "dipesan", "maintenance"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full border", STATUS_TINT[s])} />
              {t(`st${s.charAt(0).toUpperCase()}${s.slice(1)}`)} · {count(s)}
            </span>
          ))}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

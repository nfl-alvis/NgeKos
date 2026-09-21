"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, DoorOpen, Edit2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminPageShell, { AdminSection, AdminStat, useAdminToast } from "@/components/admin/AdminPageShell";
import { roomUnits as staticRoomUnits } from "@/lib/data/entities";
import { properties as staticProperties } from "@/lib/data/properties";
import { cn } from "@/lib/utils";

const STATUS_TINT: Record<string, string> = {
  kosong: "border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]",
  terisi: "border-[#B9CCE4] bg-[#E8EFF8] text-[#33517C]",
  dipesan: "border-[#EAD9A8] bg-[#FBF3DC] text-[#8A6A1F]",
  maintenance: "border-[#EBC4C0] bg-[#FAEAE8] text-[#9C3B32]",
};

interface RoomUnitItem {
  id?: string;
  number: string;
  status: "kosong" | "terisi" | "dipesan" | "maintenance";
  typeName?: string;
}

interface PropertyItem {
  id: string;
  slug: string;
  name: string;
}

/** Pantau kamar dan status ketersediaannya - pilih satu properti (dropdown selector). */
export default function AdminRoomsPage() {
  const t = useTranslations("admin.rooms");
  const { show } = useAdminToast();

  const [propList, setPropList] = useState<PropertyItem[]>(
    staticProperties.map((p) => ({ id: p.id ?? p.slug, slug: p.slug, name: p.name }))
  );
  const [selectedSlug, setSelectedSlug] = useState(staticProperties[0]?.slug || "kost-arjuna-ugm");
  const [units, setUnits] = useState<RoomUnitItem[]>(staticRoomUnits[selectedSlug] ?? []);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch daftar properti dari database
  useEffect(() => {
    fetch("/api/properties")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const list: PropertyItem[] = json.data.map((p: any) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
          }));
          setPropList(list);
          if (!list.some((p) => p.slug === selectedSlug)) {
            setSelectedSlug(list[0].slug);
          }
        }
      })
      .catch(() => {});
  }, []);

  const currentProp = propList.find((p) => p.slug === selectedSlug);

  // Fetch unit kamar untuk properti terpilih
  useEffect(() => {
    if (!currentProp) return;
    setLoading(true);

    fetch(`/api/properties/${currentProp.id}/rooms`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: RoomUnitItem[] = json.data.map((u: any) => ({
            id: u.id,
            number: u.number,
            status:
              u.status === "AVAILABLE"
                ? "kosong"
                : u.status === "OCCUPIED"
                  ? "terisi"
                  : u.status === "RESERVED"
                    ? "dipesan"
                    : "maintenance",
            typeName: u.roomType?.name,
          }));
          setUnits(mapped);
        } else {
          setUnits(staticRoomUnits[selectedSlug] ?? []);
        }
      })
      .catch(() => {
        setUnits(staticRoomUnits[selectedSlug] ?? []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedSlug, currentProp?.id]);

  const count = (s: string) => units.filter((u) => u.status === s).length;

  const handleUpdateStatus = async (
    unit: RoomUnitItem,
    newStatus: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE"
  ) => {
    if (!currentProp) return;
    const uiStatus =
      newStatus === "AVAILABLE"
        ? "kosong"
        : newStatus === "OCCUPIED"
          ? "terisi"
          : "maintenance";

    // Optimistic update
    setUnits((prev) =>
      prev.map((u) => (u.number === unit.number ? { ...u, status: uiStatus } : u))
    );

    if (unit.id) {
      setUpdatingId(unit.id);
      try {
        const res = await fetch(
          `/api/properties/${currentProp.id}/rooms/${unit.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          show(err.message || "Gagal mengubah status kamar");
        } else {
          show(`Status kamar ${unit.number} berhasil diubah ke ${t(`st${uiStatus.charAt(0).toUpperCase()}${uiStatus.slice(1)}`)}`);
        }
      } catch {
        show(`Status kamar ${unit.number} diubah (offline)`);
      } finally {
        setUpdatingId(null);
      }
    } else {
      show(`Status kamar ${unit.number} berhasil diubah ke ${t(`st${uiStatus.charAt(0).toUpperCase()}${uiStatus.slice(1)}`)}`);
    }
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <AdminStat
          label={t("statTotal")}
          value={String(units.length)}
          icon={DoorOpen}
          tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text-muted" }}
        />
        <AdminStat
          label={t("stTerisi")}
          value={String(count("terisi"))}
          icon={DoorOpen}
          tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }}
        />
        <AdminStat
          label={t("stKosong")}
          value={String(count("kosong"))}
          icon={DoorOpen}
          tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }}
        />
        <AdminStat
          label={t("stMaintenance")}
          value={String(count("maintenance"))}
          icon={DoorOpen}
          tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }}
        />
      </div>

      <AdminSection
        title={t("gridTitle")}
        right={
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1.5 rounded-md bg-nk-surface px-3 py-1.5 text-sm text-nk-text ring-1 ring-foreground/10 transition-colors hover:bg-nk-accent-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-nk-accent"
              aria-label={t("gridTitle")}
            >
              {currentProp?.name ?? selectedSlug}
              <ChevronDown className="size-3.5 text-nk-text-muted" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={selectedSlug} onValueChange={setSelectedSlug}>
                {propList.map((p) => (
                  <DropdownMenuRadioItem key={p.slug} value={p.slug}>
                    {p.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        bodyClass="p-4 sm:p-6"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-nk-text-muted">
            <Loader2 className="mr-2 size-4 animate-spin" />
            <span>Memuat data kamar...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {units.map((u) => (
              <DropdownMenu key={u.number}>
                <DropdownMenuTrigger
                  disabled={u.status === "dipesan"}
                  className={cn(
                    "group relative flex flex-col rounded-lg border px-3 py-2.5 text-left text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-nk-accent",
                    STATUS_TINT[u.status],
                    u.status !== "dipesan" && "hover:shadow-xs cursor-pointer"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs font-semibold">{u.number}</p>
                    {u.status !== "dipesan" && (
                      <Edit2 className="size-3 opacity-0 transition-opacity group-hover:opacity-70" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs">
                    {t(`st${u.status.charAt(0).toUpperCase()}${u.status.slice(1)}`)}
                  </p>
                  {u.typeName && (
                    <p className="text-[10px] opacity-75 truncate mt-0.5">{u.typeName}</p>
                  )}
                </DropdownMenuTrigger>
                {u.status !== "dipesan" && (
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus(u, "AVAILABLE")}
                      className="cursor-pointer text-xs text-[#2F6B3C]"
                    >
                      {t("stKosong")} (AVAILABLE)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus(u, "OCCUPIED")}
                      className="cursor-pointer text-xs text-[#33517C]"
                    >
                      {t("stTerisi")} (OCCUPIED)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleUpdateStatus(u, "MAINTENANCE")}
                      className="cursor-pointer text-xs text-[#9C3B32]"
                    >
                      {t("stMaintenance")} (MAINTENANCE)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            ))}
          </div>
        )}

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

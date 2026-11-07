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
import { cn } from "@/lib/utils";

const STATUS_TINT: Record<string, string> = {
  kosong: "border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]",
  terisi: "border-[#B9CCE4] bg-[#E8EFF8] text-[#33517C]",
  dipesan: "border-[#EAD9A8] bg-[#FBF3DC] text-[#8A6A1F]",
  maintenance: "border-[#EBC4C0] bg-[#FAEAE8] text-[#9C3B32]",
};

interface RoomUnitItem {
  id: string;
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

  const [propList, setPropList] = useState<PropertyItem[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [units, setUnits] = useState<RoomUnitItem[]>([]);
  const [loadingProps, setLoadingProps] = useState(true);
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
          setSelectedSlug((prev) => (list.some((p) => p.slug === prev) ? prev : list[0].slug));
        } else {
          setPropList([]);
        }
      })
      .catch(() => {
        setPropList([]);
      })
      .finally(() => {
        setLoadingProps(false);
      });
  }, []);

  const currentProp = propList.find((p) => p.slug === selectedSlug);

  // Fetch unit kamar untuk properti terpilih
  useEffect(() => {
    if (!currentProp) {
      setUnits([]);
      return;
    }

    fetch(`/api/properties/${currentProp.id}/rooms`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
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
          setUnits([]);
        }
      })
      .catch(() => {
        setUnits([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedSlug, currentProp]);

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

    const prevUnits = [...units];

    // Optimistic update
    setUnits((prev) =>
      prev.map((u) => (u.id === unit.id ? { ...u, status: uiStatus } : u))
    );

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
        setUnits(prevUnits);
        show(err.message || "Gagal mengubah status kamar");
      } else {
        show(
          `Status kamar ${unit.number} berhasil diubah ke ${t(
            `st${uiStatus.charAt(0).toUpperCase()}${uiStatus.slice(1)}`
          )}`
        );
      }
    } catch {
      setUnits(prevUnits);
      show("Gagal menghubungi server");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <AdminStat
          label={t("statTotal")}
          value={String(units.length)}
          icon={DoorOpen}
          tint={{ card: "bg-nk-section", icon: "bg-nk-warm text-nk-text" }}
          note={currentProp?.name}
        />
        <AdminStat
          label={t("statVacant")}
          value={String(count("kosong"))}
          icon={DoorOpen}
          tint={{ card: "bg-[#E9F4EC]", icon: "bg-[#CFE8D6] text-[#2F6B3C]" }}
          note={units.length > 0 ? `${Math.round((count("kosong") / units.length) * 100)}% total` : undefined}
        />
        <AdminStat
          label={t("statOccupied")}
          value={String(count("terisi"))}
          icon={DoorOpen}
          tint={{ card: "bg-[#E8EFF8]", icon: "bg-[#D3E0F0] text-[#33517C]" }}
          note={units.length > 0 ? `${Math.round((count("terisi") / units.length) * 100)}% total` : undefined}
        />
        <AdminStat
          label={t("statMaintenance")}
          value={String(count("maintenance"))}
          icon={DoorOpen}
          tint={{ card: "bg-[#FAEAE8]", icon: "bg-[#F3D7D3] text-[#9C3B32]" }}
          note={count("maintenance") > 0 ? t("statMaintenanceNote") : undefined}
        />
      </div>

      <AdminSection
        title={t("gridTitle")}
        right={
          <div className="flex items-center gap-2">
            <span className="text-xs text-nk-text-muted">{t("selectProp")}</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-11 items-center gap-2 rounded-lg border border-nk-border bg-nk-surface px-3 text-sm text-nk-text hover:bg-nk-warm md:h-9">
                <span className="max-w-[200px] truncate">{loadingProps ? "Memuat..." : (currentProp?.name || "Pilih Kos")}</span>
                <ChevronDown className="size-4 text-nk-text-muted" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup value={selectedSlug} onValueChange={setSelectedSlug}>
                  {propList.map((p) => (
                    <DropdownMenuRadioItem key={p.slug} value={p.slug}>
                      {p.name}
                    </DropdownMenuRadioItem>
                  ))}
                  {propList.length === 0 && (
                    <div className="p-2 text-xs text-nk-text-muted">Tidak ada properti</div>
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        bodyClass="p-4 sm:p-6"
      >
        {loading || loadingProps ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-nk-accent" />
            <span className="ml-2 text-sm text-nk-text-muted">Memuat unit kamar...</span>
          </div>
        ) : units.length === 0 ? (
          <p className="py-8 text-center text-sm text-nk-text-muted">{t("empty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {units.map((u) => {
              const isUpdating = updatingId === u.id;
              return (
                <div
                  key={u.id}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all",
                    STATUS_TINT[u.status] || "border-nk-border bg-nk-section text-nk-text-muted"
                  )}
                >
                  {isUpdating ? (
                    <Loader2 className="size-5 animate-spin text-nk-text-muted" />
                  ) : (
                    <>
                      <span className="font-mono text-base font-semibold tracking-tight">{u.number}</span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wider">{t(`st${u.status.charAt(0).toUpperCase()}${u.status.slice(1)}`)}</span>
                      {u.typeName && <span className="mt-1 line-clamp-1 text-[9px] text-nk-text-muted">{u.typeName}</span>}

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="absolute right-1 top-1 rounded p-1 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100"
                          aria-label={`Ubah status kamar ${u.number}`}
                        >
                          <Edit2 className="size-3 text-nk-text-muted" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUpdateStatus(u, "AVAILABLE")}>
                            {t("stKosong")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(u, "OCCUPIED")}>
                            {t("stTerisi")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(u, "MAINTENANCE")}>
                            {t("stMaintenance")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}

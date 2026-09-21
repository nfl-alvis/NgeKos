"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { roomUnits, type RoomUnit } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import { FACILITY_META } from "@/lib/data/facilities";
import type { Property, Facility, Gender } from "@/lib/data/types";
import { formatIDR, cn } from "@/lib/utils";
import PropertyPhotoManager from "@/components/owner/PropertyPhotoManager";
import { getKosImage } from "@/lib/kosImages";
import {
  AlertCircle,
  Building2,
  Check,
  DoorOpen,
  Edit2,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";

interface ExtendedRoomUnit extends RoomUnit {
  id?: string;
  roomTypeId?: string;
  floor?: string | null;
}

const roomStatusColor: Record<RoomUnit["status"], { badge: "green" | "gray" | "red" | "yellow"; cls: string }> = {
  kosong: { badge: "green", cls: "border-[#BFDCC5] bg-[#E9F4EC]" },
  terisi: { badge: "gray", cls: "border-nk-border bg-nk-section" },
  maintenance: { badge: "red", cls: "border-[#EBC4C0] bg-[#FAEAE8] border-dashed" },
  dipesan: { badge: "yellow", cls: "border-[#EAD9A8] bg-[#FBF3DC]" },
};

export default function OwnerPropertyDetailPage() {
  const t = useTranslations("owner.detail");
  const propsT = useTranslations("owner.properties");
  const params = useParams<{ slug: string }>();

  const [property, setProperty] = useState<Property | null>(
    getPropertyBySlug(params.slug) ?? null
  );
  const [loading, setLoading] = useState(!property);
  const [tab, setTab] = useState<"rooms" | "photos" | "settings">("rooms");
  const [openType, setOpenType] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Record<string, ExtendedRoomUnit[]>>(
    property ? { [property.slug]: roomUnits[property.slug] ?? [] } : {}
  );
  const [menuRoom, setMenuRoom] = useState<string | null>(null);

  // Dialog State: Tambah Tipe Kamar
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypePrice, setNewTypePrice] = useState("");
  const [newTypeSize, setNewTypeSize] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [submittingType, setSubmittingType] = useState(false);

  // Dialog State: Edit Tipe Kamar
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<{
    id: string;
    name: string;
    pricePerMonth: number;
    sizeM2: number;
  } | null>(null);
  const [submittingEditType, setSubmittingEditType] = useState(false);

  // Dialog State: Tambah Unit Kamar
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [targetRoomTypeId, setTargetRoomTypeId] = useState<string>("");
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newUnitFloor, setNewUnitFloor] = useState("1");
  const [submittingUnit, setSubmittingUnit] = useState(false);

  // Settings Tab State
  const [settingsName, setSettingsName] = useState("");
  const [settingsTagline, setSettingsTagline] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [settingsDistrict, setSettingsDistrict] = useState("");
  const [settingsPostal, setSettingsPostal] = useState("");
  const [settingsGender, setSettingsGender] = useState<Gender>("mixed");
  const [settingsDeposit, setSettingsDeposit] = useState("");
  const [settingsCampusDistance, setSettingsCampusDistance] = useState("");
  const [settingsFacilities, setSettingsFacilities] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fungsi muat ulang data properti
  const refreshProperty = async () => {
    if (!params.slug) return;
    try {
      const res = await fetch("/api/properties?mine=true");
      if (!res.ok) return;
      const json = await res.json();
      if (json?.data && Array.isArray(json.data)) {
        const found = json.data.find(
          (p: any) => p.slug === params.slug || p.id === params.slug
        );
        if (found) {
          const mapped: Property = {
            id: found.id,
            slug: found.slug,
            name: found.name,
            tagline: found.tagline ?? "",
            description: found.description,
            city: found.city,
            district: found.district,
            address: found.address,
            gender: found.gender ? found.gender.toLowerCase() : "mixed",
            verified: found.status === "VERIFIED",
            active: found.status === "VERIFIED",
            rating: found.rating ?? 0,
            reviewCount: found.reviewCount ?? 0,
            imageSeed: found.slug,
            facilities: (found.facilities || []).map((f: any) => f.key || f),
            minPrice: found.minPrice ?? 0,
            distanceToCampusM: found.distanceToCampusM ?? 0,
            depositInfo: found.depositAmount
              ? `DP Rp ${found.depositAmount.toLocaleString("id-ID")}`
              : "Tanpa deposit",
            depositAmount: found.depositAmount,
            verificationStatus:
              found.status === "VERIFIED"
                ? "verified"
                : found.status === "REJECTED"
                  ? "rejected"
                  : "pending",
            verificationNote: found.rejectionNote ?? undefined,
            roomTypes: (found.roomTypes || []).map((rt: any) => ({
              id: rt.id,
              name: rt.name,
              pricePerMonth: rt.pricePerMonth,
              available: rt.available ?? 0,
              total: rt.total ?? 0,
              sizeM2: rt.sizeM2 ?? 12,
            })),
          };
          setProperty(mapped);

          // Inisialisasi Settings form
          setSettingsName(mapped.name);
          setSettingsTagline(mapped.tagline ?? "");
          setSettingsDesc(mapped.description ?? "");
          setSettingsAddress(mapped.address ?? "");
          setSettingsCity(mapped.city ?? "");
          setSettingsDistrict(mapped.district ?? "");
          setSettingsPostal(found.postalCode ?? "");
          setSettingsGender(mapped.gender);
          setSettingsDeposit(mapped.depositAmount ? String(mapped.depositAmount) : "");
          setSettingsCampusDistance(mapped.distanceToCampusM ? String(mapped.distanceToCampusM) : "");
          setSettingsFacilities(mapped.facilities);

          // Populate units dengan ID riil jika tersedia
          const dynamicUnits: ExtendedRoomUnit[] = [];
          (found.roomTypes || []).forEach((rt: any) => {
            if (rt.units && Array.isArray(rt.units) && rt.units.length > 0) {
              rt.units.forEach((u: any) => {
                dynamicUnits.push({
                  id: u.id,
                  roomTypeId: rt.id,
                  number: u.number,
                  floor: u.floor,
                  status:
                    u.status === "AVAILABLE"
                      ? "kosong"
                      : u.status === "MAINTENANCE"
                        ? "maintenance"
                        : u.status === "RESERVED"
                          ? "dipesan"
                          : "terisi",
                });
              });
            } else {
              const total = rt.total || 2;
              for (let i = 1; i <= total; i++) {
                dynamicUnits.push({
                  roomTypeId: rt.id,
                  number: `${rt.name.slice(0, 1).toUpperCase()}-${100 + i}`,
                  status: i <= (rt.available ?? 1) ? "kosong" : "terisi",
                });
              }
            }
          });
          setRooms({ [mapped.slug]: dynamicUnits });
        }
      }
    } catch {
      // Abaikan error saat refresh background
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProperty();
  }, [params.slug]);

  if (loading) {
    return (
      <DashboardShell role="owner">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-nk-accent" />
          <p className="ml-3 text-sm text-nk-text-muted">Memuat rincian properti...</p>
        </div>
      </DashboardShell>
    );
  }

  if (!property) {
    return (
      <DashboardShell role="owner">
        <div className="py-24 text-center">
          <AlertCircle className="mx-auto size-8 text-destructive mb-2" />
          <h2 className="text-base font-medium text-nk-text">Properti Tidak Ditemukan</h2>
          <p className="mt-1 text-xs text-nk-text-muted">Properti yang Anda cari tidak tersedia atau telah dihapus.</p>
          <Link
            href="/owner/properties"
            className="mt-4 inline-block rounded-md bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse"
          >
            Kembali ke Daftar Kos
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const units = rooms[property.slug] ?? [];

  /** Update Status Unit Kamar (Persisted ke DB) */
  const setRoomStatus = async (roomItem: ExtendedRoomUnit, status: RoomUnit["status"]) => {
    const prevUnits = [...units];
    // Optimistic UI update
    setRooms((prev) => ({
      ...prev,
      [property.slug]: (prev[property.slug] ?? []).map((r) =>
        r.number === roomItem.number ? { ...r, status } : r
      ),
    }));
    setMenuRoom(null);

    if (roomItem.id && property.id) {
      try {
        const dbStatus =
          status === "kosong"
            ? "AVAILABLE"
            : status === "maintenance"
              ? "MAINTENANCE"
              : "OCCUPIED";

        const res = await fetch(`/api/properties/${property.id}/rooms/${roomItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: dbStatus }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || "Gagal memperbarui status unit di server.");
        }
      } catch (err: unknown) {
        // Rollback
        setRooms((prev) => ({ ...prev, [property.slug]: prevUnits }));
        setActionError(err instanceof Error ? err.message : "Gagal memperbarui status unit.");
      }
    }
  };

  /** Simpan Tipe Kamar Baru */
  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypePrice) return;
    setSubmittingType(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/properties/${property.id}/room-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTypeName.trim(),
          pricePerMonth: Number(newTypePrice),
          sizeM2: newTypeSize ? Number(newTypeSize) : undefined,
          description: newTypeDesc.trim() || undefined,
          capacity: 1,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal membuat tipe kamar.");
      }

      setAddTypeOpen(false);
      setNewTypeName("");
      setNewTypePrice("");
      setNewTypeSize("");
      setNewTypeDesc("");
      await refreshProperty();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Terjadi kesalahan saat menambah tipe kamar.");
    } finally {
      setSubmittingType(false);
    }
  };

  /** Simpan Perubahan Tipe Kamar */
  const handleUpdateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !editingType.name.trim()) return;
    setSubmittingEditType(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/properties/${property.id}/room-types/${editingType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingType.name.trim(),
          pricePerMonth: Number(editingType.pricePerMonth),
          sizeM2: editingType.sizeM2 ? Number(editingType.sizeM2) : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal memperbarui tipe kamar.");
      }

      setEditTypeOpen(false);
      setEditingType(null);
      await refreshProperty();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengedit tipe kamar.");
    } finally {
      setSubmittingEditType(false);
    }
  };

  /** Simpan Unit Kamar Baru */
  const handleCreateRoomUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNumber.trim() || !targetRoomTypeId) return;
    setSubmittingUnit(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/properties/${property.id}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: targetRoomTypeId,
          number: newUnitNumber.trim(),
          floor: newUnitFloor.trim() || "1",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal menambah unit kamar.");
      }

      setAddUnitOpen(false);
      setNewUnitNumber("");
      setNewUnitFloor("1");
      await refreshProperty();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Terjadi kesalahan saat menambah unit kamar.");
    } finally {
      setSubmittingUnit(false);
    }
  };

  /** Simpan Pengaturan Properti */
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    setSettingsSuccess(false);

    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settingsName.trim(),
          tagline: settingsTagline.trim() || undefined,
          description: settingsDesc.trim(),
          address: settingsAddress.trim(),
          city: settingsCity.trim(),
          district: settingsDistrict.trim(),
          postalCode: settingsPostal.trim() || undefined,
          gender: settingsGender.toUpperCase(),
          depositAmount: settingsDeposit ? Number(settingsDeposit) : undefined,
          distanceToCampusM: settingsCampusDistance ? Number(settingsCampusDistance) : undefined,
          facilities: settingsFacilities,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal menyimpan pengaturan properti.");
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
      await refreshProperty();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan pengaturan.");
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs = [
    { id: "rooms" as const, label: t("tabRooms") },
    { id: "photos" as const, label: t("tabPhotos") },
    { id: "settings" as const, label: t("tabSettings") },
  ];

  const statusLabel: Record<RoomUnit["status"], string> = {
    kosong: t("roomKosong"),
    terisi: t("roomTerisi"),
    maintenance: t("roomMaintenance"),
    dipesan: t("roomDipesan"),
  };

  return (
    <DashboardShell role="owner">
      {/* Alert Error jika ada aksi yang gagal */}
      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-nk-text-muted">
        <Link href="/owner/properties" className="transition-colors hover:text-nk-text">
          {t("breadcrumb")}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-nk-text">{property.name}</span>
      </nav>

      {/* header info properti */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={getKosImage(property.slug || property.imageSeed, "main")}
          alt={property.name}
          className="h-16 w-24 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-medium tracking-tight text-nk-text">{property.name}</h1>
            {property.verificationStatus === "verified" && (
              <StatusBadge color="green">{propsT("verified")}</StatusBadge>
            )}
            {property.verificationStatus === "pending" && (
              <StatusBadge color="yellow">{propsT("pending")}</StatusBadge>
            )}
            {property.verificationStatus === "rejected" && (
              <StatusBadge color="red">{propsT("rejected")}</StatusBadge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-nk-text-muted">{property.address}</p>
        </div>
        <button
          type="button"
          onClick={() => setTab("settings")}
          className="w-fit rounded-lg border border-nk-border px-4 py-2.5 text-sm font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
        >
          {t("edit")}
        </button>
      </section>

      {/* tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="mb-6 flex h-auto w-fit gap-1 rounded-none border-b border-nk-border bg-transparent p-0">
          {tabs.map((tab2) => (
            <TabsTrigger
              key={tab2.id}
              value={tab2.id}
              className="-mb-px rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-normal text-nk-text-muted shadow-none transition-colors data-[state=active]:border-nk-accent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-nk-text data-[state=active]:shadow-none"
            >
              {tab2.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* TAB: Tipe Kamar & Unit */}
      {tab === "rooms" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setAddTypeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              <Plus className="size-4" />
              <span>{t("addRoomType")}</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {property.roomTypes.map((rt) => {
              const currentUnits = units.filter(
                (u) => !u.roomTypeId || u.roomTypeId === rt.id
              );

              return (
                <div key={rt.id} className="rounded-lg border border-nk-border bg-nk-surface">
                  {/* header tipe */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setOpenType(openType === rt.id ? null : rt.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-expanded={openType === rt.id}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn("shrink-0 text-nk-text-muted transition-transform", openType === rt.id && "rotate-90")}
                        aria-hidden="true"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-nk-text">{rt.name}</span>
                        <span className="block text-xs text-nk-text-muted">
                          {formatIDR(rt.pricePerMonth)}{t("perMonth")} · {rt.sizeM2 ?? 12} m² · {rt.available}/{rt.total} {t("roomKosong").toLowerCase()}
                        </span>
                      </span>
                    </button>
                    <div className="flex gap-2 sm:ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingType({
                            id: rt.id,
                            name: rt.name,
                            pricePerMonth: rt.pricePerMonth,
                            sizeM2: rt.sizeM2 ?? 12,
                          });
                          setEditTypeOpen(true);
                        }}
                        className="rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRoomTypeId(rt.id);
                          setAddUnitOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-nk-border px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm"
                      >
                        <Plus className="size-3" />
                        <span>{t("addRoom")}</span>
                      </button>
                    </div>
                  </div>

                  {/* isi expand: grid kartu kamar */}
                  {openType === rt.id && (
                    <div className="border-t border-nk-border p-4">
                      {currentUnits.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                          {currentUnits.map((room) => {
                            const c = roomStatusColor[room.status];
                            return (
                              <div key={room.number} className="relative">
                                <button
                                  type="button"
                                  onClick={() => setMenuRoom(menuRoom === room.number ? null : room.number)}
                                  className={cn(
                                    "flex w-full flex-col items-start gap-1 rounded-md border p-2.5 text-left transition-colors hover:brightness-[0.98] active:scale-[0.98]",
                                    c.cls
                                  )}
                                >
                                  <span className="font-mono text-sm font-medium tabular-nums text-nk-text">
                                    {room.number}
                                  </span>
                                  <StatusBadge color={c.badge} className="!px-1.5 !py-0 text-[10px]">
                                    {statusLabel[room.status]}
                                  </StatusBadge>
                                </button>
                                {/* dropdown aksi cepat status */}
                                {menuRoom === room.number && (
                                  <>
                                    <div className="fixed inset-0 z-30" onClick={() => setMenuRoom(null)} aria-hidden="true" />
                                    <div className="absolute left-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-md border border-nk-border bg-nk-surface py-1 shadow-xl">
                                      <button
                                        type="button"
                                        onClick={() => setRoomStatus(room, "kosong")}
                                        className="block w-full px-3 py-2 text-left text-xs text-nk-text transition-colors hover:bg-nk-warm"
                                      >
                                        {t("setKosong")}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRoomStatus(room, "maintenance")}
                                        className="block w-full px-3 py-2 text-left text-xs text-nk-text transition-colors hover:bg-nk-warm"
                                      >
                                        {t("setMaintenance")}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRoomStatus(room, "terisi")}
                                        className="block w-full px-3 py-2 text-left text-xs text-nk-text transition-colors hover:bg-nk-warm"
                                      >
                                        Tandai Terisi
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-nk-text-muted">
                          Belum ada unit kamar pada tipe ini. Klik &ldquo;{t("addRoom")}&rdquo; di atas untuk menambahkan nomor kamar.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: Foto */}
      {tab === "photos" && (
        <PropertyPhotoManager slug={property.slug} propertyId={property.id} />
      )}

      {/* TAB: Pengaturan Properti */}
      {tab === "settings" && (
        <div className="max-w-3xl rounded-xl border border-nk-border bg-nk-surface p-6 sm:p-8">
          <div className="border-b border-nk-border pb-4 mb-6">
            <h2 className="text-lg font-semibold text-nk-text">Pengaturan Properti</h2>
            <p className="text-xs text-nk-text-muted mt-0.5">
              Ubah informasi dasar, alamat, fasilitas, dan ketentuan sewa properti kos Anda.
            </p>
          </div>

          {settingsSuccess && (
            <Alert className="mb-6 border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]">
              <Check className="size-4 text-[#2F6B3C]" />
              <AlertTitle>Berhasil Disimpan</AlertTitle>
              <AlertDescription className="text-xs">
                Perubahan data properti Anda telah berhasil disimpan ke sistem.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Nama & Tagline */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="prop-name" className="text-xs font-medium text-nk-text">
                  Nama Kos *
                </Label>
                <Input
                  id="prop-name"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="prop-tagline" className="text-xs font-medium text-nk-text">
                  Tagline / Slogan Singkat
                </Label>
                <Input
                  id="prop-tagline"
                  value={settingsTagline}
                  onChange={(e) => setSettingsTagline(e.target.value)}
                  placeholder="Contoh: Nyaman, Dekat Kampus, Akses 24 Jam"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <Label htmlFor="prop-desc" className="text-xs font-medium text-nk-text">
                Deskripsi Kos *
              </Label>
              <textarea
                id="prop-desc"
                rows={4}
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                required
                className="mt-1.5 w-full rounded-md border border-nk-border bg-transparent px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
              />
            </div>

            {/* Alamat, Kota, Kecamatan */}
            <div className="space-y-4 pt-4 border-t border-nk-border">
              <h3 className="text-sm font-semibold text-nk-text">Lokasi & Alamat</h3>
              <div>
                <Label htmlFor="prop-addr" className="text-xs font-medium text-nk-text">
                  Alamat Lengkap *
                </Label>
                <Input
                  id="prop-addr"
                  value={settingsAddress}
                  onChange={(e) => setSettingsAddress(e.target.value)}
                  required
                  className="mt-1.5"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="prop-city" className="text-xs font-medium text-nk-text">
                    Kota *
                  </Label>
                  <Input
                    id="prop-city"
                    value={settingsCity}
                    onChange={(e) => setSettingsCity(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="prop-district" className="text-xs font-medium text-nk-text">
                    Kecamatan *
                  </Label>
                  <Input
                    id="prop-district"
                    value={settingsDistrict}
                    onChange={(e) => setSettingsDistrict(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="prop-postal" className="text-xs font-medium text-nk-text">
                    Kode Pos
                  </Label>
                  <Input
                    id="prop-postal"
                    value={settingsPostal}
                    onChange={(e) => setSettingsPostal(e.target.value)}
                    placeholder="5 digit"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Ketentuan & Biaya */}
            <div className="space-y-4 pt-4 border-t border-nk-border">
              <h3 className="text-sm font-semibold text-nk-text">Ketentuan & Kebijakan Sewa</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="prop-gender" className="text-xs font-medium text-nk-text">
                    Tipe Kos (Gender) *
                  </Label>
                  <select
                    id="prop-gender"
                    value={settingsGender}
                    onChange={(e) => setSettingsGender(e.target.value as Gender)}
                    className="mt-1.5 w-full rounded-md border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
                  >
                    <option value="mixed">Campuran</option>
                    <option value="male">Khusus Putra</option>
                    <option value="female">Khusus Putri</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="prop-deposit" className="text-xs font-medium text-nk-text">
                    Uang Muka / DP (Rp)
                  </Label>
                  <Input
                    id="prop-deposit"
                    type="number"
                    value={settingsDeposit}
                    onChange={(e) => setSettingsDeposit(e.target.value)}
                    placeholder="Kosongkan jika tanpa DP"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="prop-distance" className="text-xs font-medium text-nk-text">
                    Jarak ke Kampus (Meter)
                  </Label>
                  <Input
                    id="prop-distance"
                    type="number"
                    value={settingsCampusDistance}
                    onChange={(e) => setSettingsCampusDistance(e.target.value)}
                    placeholder="Contoh: 350"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Fasilitas */}
            <div className="space-y-3 pt-4 border-t border-nk-border">
              <h3 className="text-sm font-semibold text-nk-text">Fasilitas Kos</h3>
              <p className="text-xs text-nk-text-muted">Pilih semua fasilitas yang tersedia di kos ini:</p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {(Object.keys(FACILITY_META) as Facility[]).map((f) => {
                  const active = settingsFacilities.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setSettingsFacilities((prev) =>
                          active ? prev.filter((k) => k !== f) : [...prev, f]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-all",
                        active
                          ? "border-nk-accent bg-nk-accent text-nk-text-inverse font-medium"
                          : "border-nk-border bg-nk-section/60 text-nk-text hover:bg-nk-warm"
                      )}
                    >
                      <span className="truncate">{FACILITY_META[f].labelId}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-6 border-t border-nk-border flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-lg bg-nk-accent px-6 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.99]"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>Simpan Pengaturan Properti</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DIALOG: Tambah Tipe Kamar */}
      <Dialog open={addTypeOpen} onOpenChange={setAddTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Tipe Kamar</DialogTitle>
            <DialogDescription className="text-xs">
              Buat tipe kamar baru untuk properti {property.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRoomType} className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-type-name" className="text-xs">Nama Tipe Kamar *</Label>
              <Input
                id="new-type-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Contoh: Deluxe Kamar Mandi Dalam"
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-type-price" className="text-xs">Harga / Bulan (Rp) *</Label>
                <Input
                  id="new-type-price"
                  type="number"
                  value={newTypePrice}
                  onChange={(e) => setNewTypePrice(e.target.value)}
                  placeholder="1500000"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-type-size" className="text-xs">Ukuran (m²)</Label>
                <Input
                  id="new-type-size"
                  type="number"
                  value={newTypeSize}
                  onChange={(e) => setNewTypeSize(e.target.value)}
                  placeholder="16"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-type-desc" className="text-xs">Deskripsi Singkat</Label>
              <Input
                id="new-type-desc"
                value={newTypeDesc}
                onChange={(e) => setNewTypeDesc(e.target.value)}
                placeholder="Termasuk kasur queen, meja kerja, dll"
                className="mt-1"
              />
            </div>
            <DialogFooter className="mt-4">
              <button
                type="button"
                onClick={() => setAddTypeOpen(false)}
                className="rounded-md border border-nk-border px-4 py-2 text-xs text-nk-text hover:bg-nk-warm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingType}
                className="inline-flex items-center gap-1.5 rounded-md bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse hover:opacity-90 disabled:opacity-50"
              >
                {submittingType && <Loader2 className="size-3.5 animate-spin" />}
                <span>Tambah Tipe</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Edit Tipe Kamar */}
      <Dialog open={editTypeOpen} onOpenChange={setEditTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tipe Kamar</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah rincian tipe kamar ini.
            </DialogDescription>
          </DialogHeader>
          {editingType && (
            <form onSubmit={handleUpdateRoomType} className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-type-name" className="text-xs">Nama Tipe Kamar *</Label>
                <Input
                  id="edit-type-name"
                  value={editingType.name}
                  onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-type-price" className="text-xs">Harga / Bulan (Rp) *</Label>
                  <Input
                    id="edit-type-price"
                    type="number"
                    value={editingType.pricePerMonth}
                    onChange={(e) => setEditingType({ ...editingType, pricePerMonth: Number(e.target.value) })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-type-size" className="text-xs">Ukuran (m²)</Label>
                  <Input
                    id="edit-type-size"
                    type="number"
                    value={editingType.sizeM2}
                    onChange={(e) => setEditingType({ ...editingType, sizeM2: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <button
                  type="button"
                  onClick={() => setEditTypeOpen(false)}
                  className="rounded-md border border-nk-border px-4 py-2 text-xs text-nk-text hover:bg-nk-warm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEditType}
                  className="inline-flex items-center gap-1.5 rounded-md bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse hover:opacity-90 disabled:opacity-50"
                >
                  {submittingEditType && <Loader2 className="size-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: Tambah Unit Kamar */}
      <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Unit Kamar</DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan nomor kamar baru ke tipe kamar ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRoomUnit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-unit-number" className="text-xs">Nomor / Kode Kamar *</Label>
              <Input
                id="new-unit-number"
                value={newUnitNumber}
                onChange={(e) => setNewUnitNumber(e.target.value)}
                placeholder="Contoh: A-105 atau B-201"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-unit-floor" className="text-xs">Lantai</Label>
              <Input
                id="new-unit-floor"
                value={newUnitFloor}
                onChange={(e) => setNewUnitFloor(e.target.value)}
                placeholder="1"
                className="mt-1"
              />
            </div>
            <DialogFooter className="mt-4">
              <button
                type="button"
                onClick={() => setAddUnitOpen(false)}
                className="rounded-md border border-nk-border px-4 py-2 text-xs text-nk-text hover:bg-nk-warm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingUnit}
                className="inline-flex items-center gap-1.5 rounded-md bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse hover:opacity-90 disabled:opacity-50"
              >
                {submittingUnit && <Loader2 className="size-3.5 animate-spin" />}
                <span>Tambah Kamar</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

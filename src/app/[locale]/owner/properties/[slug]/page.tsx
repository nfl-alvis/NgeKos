"use client";

import { useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FACILITY_META } from "@/lib/data/facilities";
import FacilityIcon from "@/components/FacilityIcon";
import type { Property, Facility, Gender } from "@/lib/data/types";
import { formatIDR, cn } from "@/lib/utils";
import PropertyPhotoManager from "@/components/owner/PropertyPhotoManager";
import { getKosImage } from "@/lib/kosImages";
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DoorOpen,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";

export interface RoomUnit {
  number: string;
  status: "kosong" | "terisi" | "maintenance" | "dipesan";
}

interface ExtendedRoomUnit extends RoomUnit {
  id?: string;
  roomTypeId?: string;
  floor?: string | null;
}

const roomStatusMeta: Record<
  RoomUnit["status"],
  { badge: "green" | "gray" | "red" | "yellow"; cls: string; dot: string; label: string }
> = {
  kosong: {
    badge: "green",
    cls: "border-[#BFDCC5] bg-[#E9F4EC]/60 hover:bg-[#E9F4EC]",
    dot: "bg-emerald-500",
    label: "Kosong (Tersedia)",
  },
  terisi: {
    badge: "gray",
    cls: "border-nk-border bg-nk-surface hover:bg-nk-warm/70",
    dot: "bg-zinc-400",
    label: "Terisi",
  },
  maintenance: {
    badge: "red",
    cls: "border-[#EBC4C0] bg-[#FAEAE8]/70 hover:bg-[#FAEAE8] border-dashed",
    dot: "bg-rose-500",
    label: "Perbaikan",
  },
  dipesan: {
    badge: "yellow",
    cls: "border-[#EAD9A8] bg-[#FBF3DC]/70 hover:bg-[#FBF3DC]",
    dot: "bg-amber-500",
    label: "Sedang Dipesan",
  },
};

const genderMap: Record<Gender, { label: string; cls: string }> = {
  mixed: { label: "Campuran", cls: "border-nk-border bg-nk-section text-nk-text" },
  male: { label: "Khusus Putra", cls: "border-blue-200 bg-blue-50 text-blue-800" },
  female: { label: "Khusus Putri", cls: "border-pink-200 bg-pink-50 text-pink-800" },
};

export default function OwnerPropertyDetailPage() {
  const t = useTranslations("owner.detail");
  const propsT = useTranslations("owner.properties");
  const params = useParams<{ slug: string }>();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rooms" | "photos" | "settings">("rooms");
  const [openType, setOpenType] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Record<string, ExtendedRoomUnit[]>>({});
  const [menuRoom, setMenuRoom] = useState<string | null>(null);
  const [unitFilters, setUnitFilters] = useState<Record<string, string>>({});

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
  const [deletingType, setDeletingType] = useState(false);

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
  const [settingsPatokan, setSettingsPatokan] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [settingsCity, setSettingsCity] = useState("");
  const [settingsDistrict, setSettingsDistrict] = useState("");
  const [settingsPostal, setSettingsPostal] = useState("");
  const [settingsGender, setSettingsGender] = useState<Gender>("mixed");
  const [settingsDeposit, setSettingsDeposit] = useState("");
  const [settingsCampusDistance, setSettingsCampusDistance] = useState("");
  const [settingsFacilities, setSettingsFacilities] = useState<string[]>([]);

  // Policy & Rules fields from registration
  const [settingsKriteriaPenyewa, setSettingsKriteriaPenyewa] = useState("Bisa untuk Semua");
  const [settingsAksesJamMalam, setSettingsAksesJamMalam] = useState("Akses 24 jam");
  const [settingsJamMalamText, setSettingsJamMalamText] = useState("23:00");
  const [settingsBolehTerimaTamu, setSettingsBolehTerimaTamu] = useState(true);
  const [settingsBolehBawaHewan, setSettingsBolehBawaHewan] = useState(false);
  const [settingsBolehPasutri, setSettingsBolehPasutri] = useState(false);
  const [settingsWajibBukuNikah, setSettingsWajibBukuNikah] = useState(true);
  const [settingsWajibKtp, setSettingsWajibKtp] = useState(true);
  const [settingsDilarangMerokok, setSettingsDilarangMerokok] = useState(true);

  // Bank payout details
  const [settingsBank, setSettingsBank] = useState("BCA");
  const [settingsAccountNumber, setSettingsAccountNumber] = useState("");
  const [settingsAccountHolder, setSettingsAccountHolder] = useState("");

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

          // Buka tipe kamar pertama secara default bila belum terbuka
          setOpenType((prev) => prev ?? mapped.roomTypes[0]?.id ?? null);

          // Inisialisasi Settings form
          setSettingsName(mapped.name);
          setSettingsTagline(mapped.tagline ?? "");
          
          // Parse description, patokan, and rules
          const rawDesc = mapped.description ?? "";
          const patokanMatch = rawDesc.match(/Patokan:\s*([^\n]+)/i);
          const parsedPatokan = patokanMatch ? patokanMatch[1].trim() : "";

          const rulesMatch = rawDesc.match(
            /(?:Aturan & Ketentuan Kos|Peraturan Kos|Persyaratan Sewa|Aturan Kos):\s*([\s\S]+)/i
          );
          let parsedRulesText = "";
          let cleanDesc = rawDesc;
          if (rulesMatch) {
            parsedRulesText = rulesMatch[1];
            cleanDesc = rawDesc
              .replace(/(?:Aturan & Ketentuan Kos|Peraturan Kos|Persyaratan Sewa|Aturan Kos):\s*([\s\S]+)/i, "")
              .replace(/Patokan:\s*[^\n]+/i, "")
              .trim();
          } else {
            cleanDesc = rawDesc.replace(/Patokan:\s*[^\n]+/i, "").trim();
          }

          setSettingsDesc(cleanDesc);
          setSettingsPatokan(parsedPatokan);

          // Parse policies
          if (parsedRulesText) {
            if (parsedRulesText.includes("Mahasiswa")) setSettingsKriteriaPenyewa("Mahasiswa");
            else if (parsedRulesText.includes("Karyawan")) setSettingsKriteriaPenyewa("Karyawan");
            else if (parsedRulesText.includes("Pasutri")) setSettingsKriteriaPenyewa("Pasutri");

            if (parsedRulesText.includes("Ada jam malam")) {
              setSettingsAksesJamMalam("Ada jam malam");
              const jamMatch = parsedRulesText.match(/\((\d{1,2}:\d{2})\)/);
              if (jamMatch) setSettingsJamMalamText(jamMatch[1]);
            } else {
              setSettingsAksesJamMalam("Akses 24 jam");
            }

            setSettingsBolehTerimaTamu(!parsedRulesText.includes("Tidak diperkenankan menerima tamu"));
            setSettingsBolehBawaHewan(parsedRulesText.includes("Boleh bawa hewan"));
            setSettingsBolehPasutri(parsedRulesText.includes("Boleh untuk pasutri"));
            setSettingsWajibBukuNikah(parsedRulesText.includes("buku nikah"));
            setSettingsWajibKtp(parsedRulesText.includes("KTP"));
            setSettingsDilarangMerokok(parsedRulesText.includes("Dilarang merokok"));
          }

          // Preload saved bank details
          try {
            const savedBankRaw = localStorage.getItem("ngekos_saved_bank_account_v1");
            if (savedBankRaw) {
              const parsedBank = JSON.parse(savedBankRaw);
              if (parsedBank.bank) setSettingsBank(parsedBank.bank);
              if (parsedBank.accountNumber) setSettingsAccountNumber(parsedBank.accountNumber);
              if (parsedBank.accountHolder) setSettingsAccountHolder(parsedBank.accountHolder);
            }
          } catch {}

          setSettingsAddress(mapped.address ?? "");
          setSettingsCity(mapped.city ?? "");
          setSettingsDistrict(mapped.district ?? "");
          setSettingsPostal(found.postalCode ?? "");
          setSettingsGender(mapped.gender);
          setSettingsDeposit(mapped.depositAmount ? String(mapped.depositAmount) : "");
          setSettingsCampusDistance(
            mapped.distanceToCampusM ? String(mapped.distanceToCampusM) : ""
          );
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
          <p className="mt-1 text-xs text-nk-text-muted">
            Properti yang Anda cari tidak tersedia atau telah dihapus.
          </p>
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
  const totalUnitsCount = units.length;
  const vacantUnitsCount = units.filter((u) => u.status === "kosong").length;
  const occupiedUnitsCount = units.filter((u) => u.status === "terisi").length;
  const maintenanceUnitsCount = units.filter((u) => u.status === "maintenance").length;
  const reservedUnitsCount = units.filter((u) => u.status === "dipesan").length;
  const occupancyPercentage =
    totalUnitsCount > 0 ? Math.round((occupiedUnitsCount / totalUnitsCount) * 100) : 0;

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
          throw new Error(
            err?.error?.message || "Gagal memperbarui status unit di server."
          );
        }
      } catch (err: unknown) {
        // Rollback
        setRooms((prev) => ({ ...prev, [property.slug]: prevUnits }));
        setActionError(
          err instanceof Error ? err.message : "Gagal memperbarui status unit."
        );
      }
    }
  };

  /** Hapus Unit Kamar (Persisted ke DB, soft delete) */
  const handleDeleteRoomUnit = async (roomItem: ExtendedRoomUnit) => {
    const prevUnits = [...units];
    // Optimistic UI update
    setRooms((prev) => ({
      ...prev,
      [property.slug]: (prev[property.slug] ?? []).filter(
        (r) => r.number !== roomItem.number
      ),
    }));
    setMenuRoom(null);

    if (roomItem.id && property.id) {
      try {
        const res = await fetch(
          `/api/properties/${property.id}/rooms/${roomItem.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || "Gagal menghapus unit kamar di server.");
        }
      } catch (err: unknown) {
        // Rollback
        setRooms((prev) => ({ ...prev, [property.slug]: prevUnits }));
        setActionError(
          err instanceof Error ? err.message : "Gagal menghapus unit kamar."
        );
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
      setActionError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menambah tipe kamar."
      );
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
      const res = await fetch(
        `/api/properties/${property.id}/room-types/${editingType.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingType.name.trim(),
            pricePerMonth: Number(editingType.pricePerMonth),
            sizeM2: editingType.sizeM2 ? Number(editingType.sizeM2) : undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal memperbarui tipe kamar.");
      }

      setEditTypeOpen(false);
      setEditingType(null);
      await refreshProperty();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengedit tipe kamar."
      );
    } finally {
      setSubmittingEditType(false);
    }
  };

  /** Hapus Tipe Kamar (Persisted ke DB, soft delete) */
  const handleDeleteRoomType = async () => {
    if (!editingType?.id || !property.id) return;
    setDeletingType(true);
    setActionError(null);

    try {
      const res = await fetch(
        `/api/properties/${property.id}/room-types/${editingType.id}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Gagal menghapus tipe kamar.");
      }

      setEditTypeOpen(false);
      setEditingType(null);
      await refreshProperty();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus tipe kamar."
      );
    } finally {
      setDeletingType(false);
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
      setActionError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menambah unit kamar."
      );
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
      // Compile policy rules into structured description
      const compiledRules: string[] = [];
      if (settingsKriteriaPenyewa && settingsKriteriaPenyewa !== "Bisa untuk Semua") {
        compiledRules.push(settingsKriteriaPenyewa);
      }
      if (settingsWajibKtp) {
        compiledRules.push("Wajib sertakan KTP saat pengajuan sewa");
      }
      if (settingsBolehPasutri) {
        compiledRules.push("Boleh untuk pasutri");
        if (settingsWajibBukuNikah) compiledRules.push("Wajib sertakan buku nikah saat pengajuan sewa");
      }
      if (settingsBolehBawaHewan) {
        compiledRules.push("Boleh bawa hewan");
      }
      if (settingsAksesJamMalam === "Akses 24 jam") {
        compiledRules.push("Akses 24 Jam");
      } else if (settingsJamMalamText) {
        compiledRules.push(`Ada jam malam (${settingsJamMalamText})`);
      }
      if (settingsDilarangMerokok) {
        compiledRules.push("Dilarang merokok di dalam kamar");
      }
      if (settingsBolehTerimaTamu) {
        compiledRules.push("Dilarang membawa tamu lawan jenis ke dalam kamar");
      } else {
        compiledRules.push("Tidak diperkenankan menerima tamu");
      }

      const compiledDescription = [
        settingsDesc.trim(),
        settingsPatokan ? `Patokan: ${settingsPatokan.trim()}` : null,
        compiledRules.length > 0
          ? `Aturan & Ketentuan Kos:\n${compiledRules.map((r) => `• ${r}`).join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      // Save bank account locally if provided
      if (settingsAccountNumber.trim()) {
        try {
          localStorage.setItem(
            "ngekos_saved_bank_account_v1",
            JSON.stringify({
              bank: settingsBank,
              accountNumber: settingsAccountNumber.trim(),
              accountHolder: settingsAccountHolder.trim(),
            })
          );
        } catch {}
      }

      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settingsName.trim(),
          tagline: settingsTagline.trim() || undefined,
          description: compiledDescription,
          address: settingsAddress.trim(),
          city: settingsCity.trim(),
          district: settingsDistrict.trim(),
          postalCode: settingsPostal.trim() || undefined,
          gender: settingsGender.toUpperCase(),
          depositAmount: settingsDeposit ? Number(settingsDeposit) : undefined,
          distanceToCampusM: settingsCampusDistance
            ? Number(settingsCampusDistance)
            : undefined,
          facilities: settingsFacilities,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json?.error?.message || "Gagal menyimpan pengaturan properti."
        );
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
      await refreshProperty();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan pengaturan."
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs = [
    { id: "rooms" as const, label: t("tabRooms"), icon: DoorOpen, count: property.roomTypes.length },
    { id: "photos" as const, label: t("tabPhotos"), icon: ImageIcon },
    { id: "settings" as const, label: t("tabSettings"), icon: Settings },
  ];

  return (
    <DashboardShell role="owner">
      {/* Alert Error jika ada aksi yang gagal */}
      {actionError && (
        <Alert variant="destructive" className="mb-6 shadow-sm">
          <AlertCircle className="size-4" />
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Breadcrumb Modern */}
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex items-center gap-2 text-xs text-nk-text-muted"
      >
        <Link
          href="/owner"
          className="transition-colors hover:text-nk-text"
        >
          Dashboard
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/owner/properties"
          className="transition-colors hover:text-nk-text"
        >
          {t("breadcrumb")}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-nk-text truncate max-w-[200px] sm:max-w-none">
          {property.name}
        </span>
      </nav>

      {/* Header Info Properti Card */}
      <section className="mb-6 rounded-2xl border border-nk-border bg-nk-surface p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center min-w-0">
            <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-nk-border shadow-inner">
              <img
                src={getKosImage(property.slug || property.imageSeed, "main")}
                alt={property.name}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-nk-text sm:text-2xl">
                  {property.name}
                </h1>
                {property.verificationStatus === "verified" && (
                  <StatusBadge color="green" className="gap-1">
                    <ShieldCheck className="size-3" />
                    <span>{propsT("verified")}</span>
                  </StatusBadge>
                )}
                {property.verificationStatus === "pending" && (
                  <StatusBadge color="yellow" className="gap-1">
                    <Clock className="size-3" />
                    <span>{propsT("pending")}</span>
                  </StatusBadge>
                )}
                {property.verificationStatus === "rejected" && (
                  <StatusBadge color="red" className="gap-1">
                    <AlertCircle className="size-3" />
                    <span>{propsT("rejected")}</span>
                  </StatusBadge>
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    genderMap[property.gender]?.cls ?? genderMap.mixed.cls
                  )}
                >
                  {genderMap[property.gender]?.label ?? "Campuran"}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-nk-text-muted">
                <MapPin className="size-3.5 shrink-0 text-nk-accent" />
                <span className="truncate">
                  {property.address}, {property.district}, {property.city}
                </span>
              </p>
              {property.tagline && (
                <p className="mt-1 text-xs italic text-nk-text-muted/90">
                  &ldquo;{property.tagline}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex flex-wrap items-center gap-2 sm:self-start lg:self-center">
            <Link
              href={`/kost/${property.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3.5 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
            >
              <ExternalLink className="size-3.5 text-nk-text-muted" />
              <span>Lihat Listing Publik</span>
            </Link>
            <button
              type="button"
              onClick={() => setTab("settings")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3.5 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
            >
              <Settings className="size-3.5 text-nk-text-muted" />
              <span>{t("edit")}</span>
            </button>
            <button
              type="button"
              onClick={() => setAddTypeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              <Plus className="size-3.5" />
              <span>{t("addRoomType")}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-nk-border pt-5 sm:grid-cols-4">
          <div className="rounded-xl border border-nk-border bg-nk-section/50 p-3.5 transition-colors hover:bg-nk-section">
            <div className="flex items-center justify-between text-xs text-nk-text-muted">
              <span>Total Kamar</span>
              <DoorOpen className="size-4 text-nk-text-muted" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-nk-text">
                {totalUnitsCount}
              </span>
              <span className="text-xs text-nk-text-muted">unit</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#BFDCC5] bg-[#E9F4EC]/40 p-3.5 transition-colors hover:bg-[#E9F4EC]/60">
            <div className="flex items-center justify-between text-xs text-[#2F6B3C]">
              <span>Kamar Kosong</span>
              <span className="flex size-2 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-[#1E4B28]">
                {vacantUnitsCount}
              </span>
              <span className="text-xs text-[#2F6B3C]">tersedia</span>
            </div>
          </div>

          <div className="rounded-xl border border-nk-border bg-nk-section/50 p-3.5 transition-colors hover:bg-nk-section">
            <div className="flex items-center justify-between text-xs text-nk-text-muted">
              <span>Kamar Terisi</span>
              <Users className="size-4 text-nk-text-muted" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-nk-text">
                {occupiedUnitsCount}
              </span>
              <span className="text-xs text-nk-text-muted">terisi</span>
            </div>
          </div>

          <div className="rounded-xl border border-nk-border bg-nk-section/50 p-3.5 transition-colors hover:bg-nk-section">
            <div className="flex items-center justify-between text-xs text-nk-text-muted">
              <span>Tingkat Okupansi</span>
              <span className="text-xs font-semibold text-nk-text">
                {occupancyPercentage}%
              </span>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-nk-warm">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  occupancyPercentage >= 75
                    ? "bg-emerald-600"
                    : occupancyPercentage >= 40
                      ? "bg-nk-accent"
                      : "bg-amber-500"
                )}
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Modern Navigation */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="mb-6 flex h-auto w-full max-w-lg gap-2 rounded-xl border border-nk-border bg-nk-surface p-1.5 shadow-sm">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            return (
              <TabsTrigger
                key={tabItem.id}
                value={tabItem.id}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-nk-text-muted transition-all data-[state=active]:bg-nk-accent data-[state=active]:text-nk-text-inverse data-[state=active]:shadow"
              >
                <Icon className="size-3.5" />
                <span>{tabItem.label}</span>
                {tabItem.count !== undefined && (
                  <span className="rounded-full bg-nk-section px-1.5 py-0.2 text-[10px] data-[state=active]:bg-white/20">
                    {tabItem.count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* TAB: Tipe Kamar & Unit */}
      {tab === "rooms" && (
        <div className="space-y-6">
          {/* Action Bar & Status Legend */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-nk-border bg-nk-surface p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 text-xs text-nk-text-muted">
              <span className="font-medium text-nk-text">Status Kamar:</span>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>Kosong ({vacantUnitsCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-zinc-400" />
                <span>Terisi ({occupiedUnitsCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>Dipesan ({reservedUnitsCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" />
                <span>Maintenance ({maintenanceUnitsCount})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenType(
                    openType === null
                      ? property.roomTypes[0]?.id ?? null
                      : null
                  )
                }
                className="rounded-lg border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm"
              >
                {openType === null ? "Buka Tipe Kamar" : "Tutup Semua"}
              </button>
              <button
                type="button"
                onClick={() => setAddTypeOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3.5 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
              >
                <Plus className="size-3.5" />
                <span>{t("addRoomType")}</span>
              </button>
            </div>
          </div>

          {/* List of Room Types */}
          <div className="flex flex-col gap-4">
            {property.roomTypes.map((rt) => {
              const currentUnits = units.filter(
                (u) => !u.roomTypeId || u.roomTypeId === rt.id
              );
              const isOpen = openType === rt.id;
              const rtVacant = currentUnits.filter((u) => u.status === "kosong").length;
              const rtOccupied = currentUnits.filter((u) => u.status === "terisi").length;
              const rtMaint = currentUnits.filter((u) => u.status === "maintenance").length;
              const activeFilter = unitFilters[rt.id] || "all";

              const filteredUnits =
                activeFilter === "all"
                  ? currentUnits
                  : currentUnits.filter((u) => u.status === activeFilter);

              return (
                <div
                  key={rt.id}
                  className="rounded-xl border border-nk-border bg-nk-surface shadow-sm transition-all"
                >
                  {/* Header Tipe Kamar */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-nk-surface border-b border-nk-border/60">
                    <button
                      type="button"
                      onClick={() => setOpenType(isOpen ? null : rt.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left group"
                      aria-expanded={isOpen}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-nk-warm text-nk-text transition-colors group-hover:bg-nk-accent group-hover:text-nk-text-inverse">
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform duration-200",
                            isOpen && "rotate-180"
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-nk-text sm:text-base">
                            {rt.name}
                          </span>
                          <span className="rounded-full bg-nk-section px-2 py-0.5 text-[11px] font-medium text-nk-text-muted">
                            {rt.sizeM2 ?? 12} m²
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-nk-text-muted">
                          <span className="font-semibold text-nk-accent">
                            {formatIDR(rt.pricePerMonth)}
                            <span className="font-normal text-nk-text-muted">
                              {t("perMonth")}
                            </span>
                          </span>
                          <span>·</span>
                          <span>
                            {rtVacant} kosong · {rtOccupied} terisi · {currentUnits.length} total unit
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 sm:ml-auto">
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
                        className="inline-flex items-center gap-1 rounded-lg border border-nk-border px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm"
                      >
                        <Edit2 className="size-3" />
                        <span>Edit Tipe</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRoomTypeId(rt.id);
                          setAddUnitOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-nk-warm px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-accent hover:text-nk-text-inverse"
                      >
                        <Plus className="size-3" />
                        <span>{t("addRoom")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Isi Expand: Filter dan Grid Unit Kamar */}
                  {isOpen && (
                    <div className="p-4 sm:p-5 bg-nk-section/20">
                      {/* Filter Pills per Room Type */}
                      {currentUnits.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setUnitFilters((prev) => ({ ...prev, [rt.id]: "all" }))
                            }
                            className={cn(
                              "rounded-lg px-2.5 py-1 transition-colors",
                              activeFilter === "all"
                                ? "bg-nk-accent text-nk-text-inverse font-medium"
                                : "border border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
                            )}
                          >
                            Semua ({currentUnits.length})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setUnitFilters((prev) => ({ ...prev, [rt.id]: "kosong" }))
                            }
                            className={cn(
                              "rounded-lg px-2.5 py-1 transition-colors",
                              activeFilter === "kosong"
                                ? "bg-emerald-600 text-white font-medium"
                                : "border border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
                            )}
                          >
                            Kosong ({rtVacant})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setUnitFilters((prev) => ({ ...prev, [rt.id]: "terisi" }))
                            }
                            className={cn(
                              "rounded-lg px-2.5 py-1 transition-colors",
                              activeFilter === "terisi"
                                ? "bg-zinc-700 text-white font-medium"
                                : "border border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
                            )}
                          >
                            Terisi ({rtOccupied})
                          </button>
                          {rtMaint > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setUnitFilters((prev) => ({
                                  ...prev,
                                  [rt.id]: "maintenance",
                                }))
                              }
                              className={cn(
                                "rounded-lg px-2.5 py-1 transition-colors",
                                activeFilter === "maintenance"
                                  ? "bg-rose-600 text-white font-medium"
                                  : "border border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
                              )}
                            >
                              Perbaikan ({rtMaint})
                            </button>
                          )}
                        </div>
                      )}

                      {filteredUnits.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                          {filteredUnits.map((room) => {
                            const meta = roomStatusMeta[room.status];
                            return (
                              <DropdownMenu key={room.number}>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "flex w-full flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all hover:shadow-sm active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-nk-accent/40",
                                      meta.cls
                                    )}
                                  >
                                    <div className="flex w-full items-center justify-between">
                                      <span className="font-mono text-sm font-bold tabular-nums text-nk-text">
                                        {room.number}
                                      </span>
                                      <span
                                        className={cn(
                                          "size-2 rounded-full",
                                          meta.dot
                                        )}
                                      />
                                    </div>
                                    <div className="flex w-full items-center justify-between text-[11px]">
                                      <span className="text-nk-text-muted">
                                        {room.floor ? `Lt. ${room.floor}` : "Lt. 1"}
                                      </span>
                                      <StatusBadge
                                        color={meta.badge}
                                        className="!px-1.5 !py-0 text-[10px]"
                                      >
                                        {meta.label}
                                      </StatusBadge>
                                    </div>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="start"
                                  className="w-56 p-1.5 bg-nk-surface border-nk-border shadow-xl z-50 rounded-xl"
                                >
                                  <div className="px-2.5 py-1 text-[11px] font-semibold text-nk-text-muted border-b border-nk-border/60 mb-1">
                                    Ubah Status: Kamar {room.number}
                                  </div>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "kosong")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm"
                                  >
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    <span>Tandai Kosong (Tersedia)</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "terisi")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm"
                                  >
                                    <span className="size-2 rounded-full bg-zinc-400" />
                                    <span>Tandai Terisi</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "dipesan")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm"
                                  >
                                    <span className="size-2 rounded-full bg-amber-500" />
                                    <span>Tandai Sedang Dipesan</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "maintenance")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm text-rose-600 focus:text-rose-600"
                                  >
                                    <span className="size-2 rounded-full bg-rose-500" />
                                    <span>Tandai Perbaikan (Maintenance)</span>
                                  </DropdownMenuItem>
                                  <div className="my-1 border-t border-nk-border/60" />
                                  <DropdownMenuItem
                                    onClick={() => void handleDeleteRoomUnit(room)}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-rose-50 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                  >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                    <span>Hapus Kamar</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-nk-border/80 p-8 text-center bg-nk-surface/50">
                          <DoorOpen className="size-8 text-nk-text-muted/60 mb-2" />
                          <h4 className="text-xs font-semibold text-nk-text">
                            Belum ada unit kamar pada tipe ini
                          </h4>
                          <p className="mt-1 text-xs text-nk-text-muted max-w-sm">
                            Tambahkan nomor kamar untuk mulai mengelola ketersediaan dan sewa.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetRoomTypeId(rt.id);
                              setAddUnitOpen(true);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3 py-1.5 text-xs font-medium text-nk-text-inverse hover:opacity-90"
                          >
                            <Plus className="size-3" />
                            <span>{t("addRoom")}</span>
                          </button>
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
        <div className="max-w-4xl space-y-6">
          <div className="flex flex-col gap-1 border-b border-nk-border pb-4">
            <h2 className="text-xl font-semibold tracking-tight text-nk-text">
              Pengaturan & Rincian Lengkap Properti
            </h2>
            <p className="text-xs text-nk-text-muted">
              Perbarui identitas kos, titik lokasi, aturan & kebijakan sewa, fasilitas, serta informasi rekening pencairan hasil sewa.
            </p>
          </div>

          {settingsSuccess && (
            <Alert className="border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]">
              <Check className="size-4 text-[#2F6B3C]" />
              <AlertTitle>Berhasil Disimpan</AlertTitle>
              <AlertDescription className="text-xs">
                Perubahan data dan kebijakan properti Anda telah berhasil diperbarui dan tersinkronisasi.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* 1. INFORMASI & IDENTITAS KOS */}
            <div className="rounded-xl border border-nk-border bg-white p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-nk-border/70 pb-3">
                <Building2 className="size-4 text-nk-accent" />
                <h3 className="text-sm font-semibold text-nk-text">1. Informasi & Identitas Kos</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="prop-name" className="text-xs font-medium text-nk-text">
                    Nama Kos <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="prop-name"
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-[11px] text-nk-text-muted">
                    Contoh: Kos Griya Melati Asri
                  </p>
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

              <div>
                <Label htmlFor="prop-desc" className="text-xs font-medium text-nk-text">
                  Deskripsi Kos <span className="text-rose-500">*</span>
                </Label>
                <textarea
                  id="prop-desc"
                  rows={4}
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  required
                  placeholder="Ceritakan keunggulan kos, suasana, sirkulasi udara, atau fasilitas utama..."
                  className="mt-1.5 w-full rounded-md border border-nk-border bg-transparent px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
                />
              </div>

              <div>
                <Label htmlFor="prop-patokan" className="text-xs font-medium text-nk-text">
                  Patokan Alamat / Landmark Sekitar
                </Label>
                <Input
                  id="prop-patokan"
                  value={settingsPatokan}
                  onChange={(e) => setSettingsPatokan(e.target.value)}
                  placeholder="Contoh: 100 meter di belakang gerbang utama kampus UB, pagar abu-abu"
                  className="mt-1.5"
                />
              </div>
            </div>

            {/* 2. LOKASI & TITIK AKSES */}
            <div className="rounded-xl border border-nk-border bg-white p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-nk-border/70 pb-3">
                <MapPin className="size-4 text-nk-accent" />
                <h3 className="text-sm font-semibold text-nk-text">2. Lokasi & Akses Kampus</h3>
              </div>

              <div>
                <Label htmlFor="prop-addr" className="text-xs font-medium text-nk-text">
                  Alamat Lengkap Kos <span className="text-rose-500">*</span>
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
                    Kota / Kabupaten <span className="text-rose-500">*</span>
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
                    Kecamatan <span className="text-rose-500">*</span>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="prop-distance" className="text-xs font-medium text-nk-text">
                    Jarak ke Kampus / Pusat Kegiatan Terdekat (Meter)
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
                <div>
                  <Label htmlFor="prop-deposit" className="text-xs font-medium text-nk-text">
                    Nominal Uang Jaminan / DP Booking (Rp)
                  </Label>
                  <Input
                    id="prop-deposit"
                    type="number"
                    value={settingsDeposit}
                    onChange={(e) => setSettingsDeposit(e.target.value)}
                    placeholder="Contoh: 300000 (Kosongkan jika tanpa DP)"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* 3. KETENTUAN & KEBIJAKAN SEWA */}
            <div className="rounded-xl border border-nk-border bg-white p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-nk-border/70 pb-3">
                <ShieldCheck className="size-4 text-nk-accent" />
                <h3 className="text-sm font-semibold text-nk-text">3. Kebijakan & Persyaratan Sewa</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="prop-gender" className="text-xs font-medium text-nk-text">
                    Tipe Penghuni (Gender) <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="prop-gender"
                    value={settingsGender}
                    onChange={(e) => setSettingsGender(e.target.value as Gender)}
                    className="mt-1.5 w-full rounded-md border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
                  >
                    <option value="mixed">Campuran (Putra & Putri)</option>
                    <option value="male">Khusus Putra</option>
                    <option value="female">Khusus Putri</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="prop-kriteria" className="text-xs font-medium text-nk-text">
                    Kriteria Profesi Penyewa
                  </Label>
                  <select
                    id="prop-kriteria"
                    value={settingsKriteriaPenyewa}
                    onChange={(e) => setSettingsKriteriaPenyewa(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
                  >
                    <option value="Bisa untuk Semua">Bisa untuk Semua</option>
                    <option value="Khusus Mahasiswa">Khusus Mahasiswa</option>
                    <option value="Khusus Karyawan">Khusus Karyawan</option>
                    <option value="Mahasiswa & Karyawan">Mahasiswa & Karyawan</option>
                  </select>
                </div>
              </div>

              {/* Akses Jam Malam */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="prop-jam-malam" className="text-xs font-medium text-nk-text">
                    Akses Gerbang & Jam Malam
                  </Label>
                  <select
                    id="prop-jam-malam"
                    value={settingsAksesJamMalam}
                    onChange={(e) => setSettingsAksesJamMalam(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
                  >
                    <option value="Akses 24 jam">Akses 24 Jam Bebas</option>
                    <option value="Ada jam malam">Ada Batas Jam Malam</option>
                  </select>
                </div>

                {settingsAksesJamMalam === "Ada jam malam" && (
                  <div>
                    <Label htmlFor="prop-jam-text" className="text-xs font-medium text-nk-text">
                      Batas Jam Malam
                    </Label>
                    <Input
                      id="prop-jam-text"
                      value={settingsJamMalamText}
                      onChange={(e) => setSettingsJamMalamText(e.target.value)}
                      placeholder="Contoh: 23:00"
                      className="mt-1.5"
                    />
                  </div>
                )}
              </div>

              {/* Checkboxes / Toggles Kebijakan */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-nk-border/60">
                <label className="flex items-center gap-3 rounded-lg border border-nk-border/70 p-3 text-xs text-nk-text cursor-pointer hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={settingsWajibKtp}
                    onChange={(e) => setSettingsWajibKtp(e.target.checked)}
                    className="size-4 rounded text-nk-accent accent-nk-accent"
                  />
                  <span>Wajib Sertakan KTP saat Pengajuan Sewa</span>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-nk-border/70 p-3 text-xs text-nk-text cursor-pointer hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={settingsBolehTerimaTamu}
                    onChange={(e) => setSettingsBolehTerimaTamu(e.target.checked)}
                    className="size-4 rounded text-nk-accent accent-nk-accent"
                  />
                  <span>Boleh Terima Tamu di Area Bersama</span>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-nk-border/70 p-3 text-xs text-nk-text cursor-pointer hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={settingsBolehPasutri}
                    onChange={(e) => setSettingsBolehPasutri(e.target.checked)}
                    className="size-4 rounded text-nk-accent accent-nk-accent"
                  />
                  <span>Boleh untuk Pasutri (Pasangan Suami Istri)</span>
                </label>

                {settingsBolehPasutri && (
                  <label className="flex items-center gap-3 rounded-lg border border-nk-border/70 p-3 text-xs text-nk-text cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={settingsWajibBukuNikah}
                      onChange={(e) => setSettingsWajibBukuNikah(e.target.checked)}
                      className="size-4 rounded text-nk-accent accent-nk-accent"
                    />
                    <span>Wajib Sertakan Buku Nikah untuk Pasutri</span>
                  </label>
                )}

                <label className="flex items-center gap-3 rounded-lg border border-nk-border/70 p-3 text-xs text-nk-text cursor-pointer hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={settingsBolehBawaHewan}
                    onChange={(e) => setSettingsBolehBawaHewan(e.target.checked)}
                    className="size-4 rounded text-nk-accent accent-nk-accent"
                  />
                  <span>Boleh Membawa Hewan Peliharaan</span>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-nk-border/70 p-3 text-xs text-nk-text cursor-pointer hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={settingsDilarangMerokok}
                    onChange={(e) => setSettingsDilarangMerokok(e.target.checked)}
                    className="size-4 rounded text-nk-accent accent-nk-accent"
                  />
                  <span>Dilarang Merokok di Dalam Kamar</span>
                </label>
              </div>
            </div>

            {/* 4. FASILITAS PROPERTI */}
            <div className="rounded-xl border border-nk-border bg-white p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-nk-border/70 pb-3">
                <DoorOpen className="size-4 text-nk-accent" />
                <div>
                  <h3 className="text-sm font-semibold text-nk-text">4. Fasilitas Kos</h3>
                  <p className="text-xs text-nk-text-muted">Klik untuk mengaktifkan atau menonaktifkan fasilitas:</p>
                </div>
              </div>

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
                        "flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs transition-all cursor-pointer",
                        active
                          ? "border-nk-accent bg-white text-nk-text font-medium ring-1 ring-nk-accent/40"
                          : "border-nk-border bg-white text-nk-text hover:border-nk-accent/40 hover:bg-stone-50"
                      )}
                    >
                      <FacilityIcon facility={f as any} />
                      <span className="truncate">{FACILITY_META[f]?.labelId || f}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. REKENING BANK PENCAIRAN (PAYOUT) */}
            <div className="rounded-xl border border-nk-border bg-white p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-nk-border/70 pb-3">
                <CreditCard className="size-4 text-nk-accent" />
                <div>
                  <h3 className="text-sm font-semibold text-nk-text">5. Rekening Bank Pencairan Hasil Sewa</h3>
                  <p className="text-xs text-nk-text-muted">Rekening tujuan transfer hasil sewa penyewa dari NgeKos:</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="prop-bank" className="text-xs font-medium text-nk-text">
                    Nama Bank
                  </Label>
                  <select
                    id="prop-bank"
                    value={settingsBank}
                    onChange={(e) => setSettingsBank(e.target.value)}
                    className="mt-1.5 w-full rounded-md border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
                  >
                    <option value="BCA">BCA (Bank Central Asia)</option>
                    <option value="Mandiri">Bank Mandiri</option>
                    <option value="BNI">BNI (Bank Negara Indonesia)</option>
                    <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                    <option value="Bank Jago">Bank Jago</option>
                    <option value="Jenius (BTPN)">Jenius (BTPN)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="prop-rek" className="text-xs font-medium text-nk-text">
                    Nomor Rekening
                  </Label>
                  <Input
                    id="prop-rek"
                    value={settingsAccountNumber}
                    onChange={(e) => setSettingsAccountNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="Contoh: 8830192831"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="prop-holder" className="text-xs font-medium text-nk-text">
                    Nama Pemilik Rekening
                  </Label>
                  <Input
                    id="prop-holder"
                    value={settingsAccountHolder}
                    onChange={(e) => setSettingsAccountHolder(e.target.value)}
                    placeholder="Sesuai buku tabungan"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Tombol Simpan Pengaturan */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-lg bg-nk-accent px-8 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Menyimpan Pengaturan...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>Simpan Seluruh Pengaturan Properti</span>
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
                    onChange={(e) =>
                      setEditingType({
                        ...editingType,
                        pricePerMonth: Number(e.target.value),
                      })
                    }
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
                    onChange={(e) =>
                      setEditingType({ ...editingType, sizeM2: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleDeleteRoomType()}
                  disabled={deletingType || submittingEditType}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  {deletingType && <Loader2 className="size-3.5 animate-spin" />}
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  <span>Hapus Tipe Kamar</span>
                </button>
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

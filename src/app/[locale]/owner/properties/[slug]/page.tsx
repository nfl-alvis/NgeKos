"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { FACILITY_META, ROOM_FACILITY_KEYS } from "@/lib/data/facilities";
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
  ChevronRight,
  Clock,
  CreditCard,
  DoorOpen,
  Edit2,
  ExternalLink,
  IdCard,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
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

export default function OwnerPropertyDetailPage() {
  const t = useTranslations("owner.detail");
  const propsT = useTranslations("owner.properties");
  const locale = useLocale();
  const isEn = locale === "en";
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  // Default tab based on query param if available
  const initialTab =
    searchParams.get("tab") === "settings" || searchParams.get("edit") === "true"
      ? "settings"
      : searchParams.get("tab") === "photos"
        ? "photos"
        : "rooms";
  const [tab, setTab] = useState<"rooms" | "photos" | "settings">(initialTab);

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
  const [newTypeFacilities, setNewTypeFacilities] = useState<string[]>([
    "bed",
    "wardrobe",
    "desk",
    "bathroom-in",
    "ac",
  ]);
  const [submittingType, setSubmittingType] = useState(false);

  const toggleNewTypeFacility = (key: string) => {
    setNewTypeFacilities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Dialog State: Edit Tipe Kamar
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<{
    id: string;
    name: string;
    pricePerMonth: number;
    sizeM2?: number;
    facilities: string[];
  } | null>(null);
  const [submittingEditType, setSubmittingEditType] = useState(false);
  const [deletingType, setDeletingType] = useState(false);

  const toggleEditingTypeFacility = (key: string) => {
    if (!editingType) return;
    const exists = editingType.facilities.includes(key);
    setEditingType({
      ...editingType,
      facilities: exists
        ? editingType.facilities.filter((k) => k !== key)
        : [...editingType.facilities, key],
    });
  };

  // Dialog State: Tambah Unit Kamar
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [targetRoomTypeId, setTargetRoomTypeId] = useState<string | null>(null);
  const [newUnitNumber, setNewUnitNumber] = useState("");
  const [newUnitFloor, setNewUnitFloor] = useState("1");
  const [submittingUnit, setSubmittingUnit] = useState(false);

  // Settings / Edit Kos Form State
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
  const [settingsPatokan, setSettingsPatokan] = useState("");
  const [settingsFacilities, setSettingsFacilities] = useState<Facility[]>([]);

  // Policy & House Rules State
  const [settingsKriteriaPenyewa, setSettingsKriteriaPenyewa] = useState("Bisa untuk Semua");
  const [settingsWajibKtp, setSettingsWajibKtp] = useState(true);
  const [settingsBolehPasutri, setSettingsBolehPasutri] = useState(false);
  const [settingsWajibBukuNikah, setSettingsWajibBukuNikah] = useState(true);
  const [settingsBolehBawaHewan, setSettingsBolehBawaHewan] = useState(false);
  const [settingsAksesJamMalam, setSettingsAksesJamMalam] = useState("Akses 24 jam");
  const [settingsJamMalamText, setSettingsJamMalamText] = useState("23:00");
  const [settingsDilarangMerokok, setSettingsDilarangMerokok] = useState(true);
  const [settingsBolehTerimaTamu, setSettingsBolehTerimaTamu] = useState(true);

  // Bank Account State (Payout)
  const [settingsBank, setSettingsBank] = useState("BCA");
  const [settingsAccountNumber, setSettingsAccountNumber] = useState("");
  const [settingsAccountHolder, setSettingsAccountHolder] = useState("");

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }, []);

  const roomStatusMeta: Record<
    RoomUnit["status"],
    { badge: "green" | "gray" | "red" | "yellow"; cls: string; dot: string; label: string }
  > = {
    kosong: {
      badge: "green",
      cls: "border-[#BFDCC5] bg-[#E9F4EC]/60 hover:bg-[#E9F4EC]",
      dot: "bg-emerald-500",
      label: isEn ? "Vacant" : "Kosong",
    },
    terisi: {
      badge: "gray",
      cls: "border-nk-border bg-nk-surface hover:bg-nk-warm/70",
      dot: "bg-zinc-400",
      label: isEn ? "Occupied" : "Terisi",
    },
    maintenance: {
      badge: "red",
      cls: "border-[#EBC4C0] bg-[#FAEAE8]/70 hover:bg-[#FAEAE8] border-dashed",
      dot: "bg-rose-500",
      label: isEn ? "Maintenance" : "Perbaikan",
    },
    dipesan: {
      badge: "yellow",
      cls: "border-[#EAD9A8] bg-[#FBF3DC]/70 hover:bg-[#FBF3DC]",
      dot: "bg-amber-500",
      label: isEn ? "Reserved" : "Sedang Dipesan",
    },
  };

  const genderMap: Record<Gender, { label: string; cls: string }> = {
    mixed: { label: isEn ? "Mixed" : "Campuran", cls: "border-nk-border bg-nk-section text-nk-text" },
    male: { label: isEn ? "Male only" : "Khusus Putra", cls: "border-nk-dark-border bg-nk-warm text-nk-text" },
    female: { label: isEn ? "Female only" : "Khusus Putri", cls: "border-nk-dark-border bg-nk-warm text-nk-text" },
  };

  const refreshProperty = async () => {
    try {
      const res = await fetch(`/api/properties/${params.slug}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil data properti");
      }
      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error("Properti tidak ditemukan");
      }

      const p = data.data;
      const mappedProp: Property = {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? "",
        description: p.description,
        city: p.city,
        district: p.district,
        address: p.address,
        gender: (p.gender?.toLowerCase() as Gender) || "mixed",
        verified: p.status === "VERIFIED",
        active: p.status === "VERIFIED",
        rating: 4.8,
        reviewCount: 0,
        imageSeed: p.slug,
        facilities: (p.facilities || []).map((f: any) => f.key || f),
        minPrice: p.minPrice ?? 0,
        distanceToCampusM: p.distanceToCampusM ?? 0,
        depositInfo: p.depositAmount
          ? `DP Rp ${p.depositAmount.toLocaleString("id-ID")}`
          : "Tanpa deposit",
        depositAmount: p.depositAmount,
        verificationStatus:
          p.status === "VERIFIED"
            ? "verified"
            : p.status === "REJECTED"
              ? "rejected"
              : "pending",
        roomTypes: (p.roomTypes || []).map((rt: any) => ({
          id: rt.id,
          name: rt.name,
          pricePerMonth: rt.pricePerMonth,
          available: rt.available ?? 0,
          total: rt.total ?? 0,
          sizeM2: rt.sizeM2 ?? 12,
          facilities: (rt.facilities || []).map((f: any) => f.key || f),
        })),
      };

      setProperty(mappedProp);

      // Populate Settings Edit Form State
      setSettingsName(mappedProp.name || "");
      setSettingsTagline(mappedProp.tagline || "");
      setSettingsAddress(mappedProp.address || "");
      setSettingsCity(mappedProp.city || "");
      setSettingsDistrict(mappedProp.district || "");
      setSettingsPostal(p.postalCode || "");
      setSettingsGender(mappedProp.gender || "mixed");
      setSettingsDeposit(p.depositAmount ? String(p.depositAmount) : "");
      setSettingsCampusDistance(p.distanceToCampusM ? String(p.distanceToCampusM) : "");
      setSettingsFacilities(mappedProp.facilities || []);

      // Parse rules from description
      const fullDesc = mappedProp.description || "";
      let cleanDesc = fullDesc;
      if (fullDesc.includes("Aturan & Ketentuan Kos:")) {
        const parts = fullDesc.split("Aturan & Ketentuan Kos:");
        cleanDesc = parts[0].trim();
        const rulesBlock = parts[1] || "";
        setSettingsWajibKtp(rulesBlock.includes("Wajib sertakan KTP"));
        setSettingsBolehPasutri(rulesBlock.includes("Boleh untuk pasutri"));
        setSettingsWajibBukuNikah(rulesBlock.includes("buku nikah"));
        setSettingsBolehBawaHewan(rulesBlock.includes("Boleh bawa hewan"));
        setSettingsDilarangMerokok(rulesBlock.includes("Dilarang merokok"));
        setSettingsBolehTerimaTamu(!rulesBlock.includes("Tidak diperkenankan menerima tamu"));
        if (rulesBlock.includes("Akses 24 Jam")) {
          setSettingsAksesJamMalam("Akses 24 jam");
        } else if (rulesBlock.includes("jam malam")) {
          setSettingsAksesJamMalam("Ada jam malam");
        }
      }

      // Check patokan landmark
      if (cleanDesc.includes("Patokan:")) {
        const landmarkParts = cleanDesc.split("Patokan:");
        cleanDesc = landmarkParts[0].trim();
        setSettingsPatokan((landmarkParts[1] || "").trim());
      }
      setSettingsDesc(cleanDesc);

      // Attempt to load saved bank account info
      try {
        const savedBankRaw = localStorage.getItem("ngekos_saved_bank_account_v1");
        if (savedBankRaw) {
          const parsed = JSON.parse(savedBankRaw);
          if (parsed?.bank) setSettingsBank(parsed.bank);
          if (parsed?.accountNumber) setSettingsAccountNumber(parsed.accountNumber);
          if (parsed?.accountHolder) setSettingsAccountHolder(parsed.accountHolder);
        }
      } catch {}

      // Map Room Units
      const mappedUnits: ExtendedRoomUnit[] = [];
      (p.roomTypes || []).forEach((rt: any) => {
        const typeUnits = rt.units || rt.rooms || [];
        typeUnits.forEach((r: any) => {
          mappedUnits.push({
            id: r.id,
            roomTypeId: rt.id,
            number: r.number || r.unitNumber || "00",
            floor: r.floor ? String(r.floor) : "1",
            status:
              r.status === "AVAILABLE" || r.status === "kosong"
                ? "kosong"
                : r.status === "MAINTENANCE" || r.status === "maintenance"
                  ? "maintenance"
                  : r.status === "RESERVED" || r.status === "dipesan"
                    ? "dipesan"
                    : "terisi",
          });
        });
      });

      setRooms((prev) => ({
        ...prev,
        [p.slug]: mappedUnits,
        [params.slug]: mappedUnits,
        ...(property?.slug ? { [property.slug]: mappedUnits } : {}),
      }));

      if (mappedProp.roomTypes.length > 0 && !openType) {
        setOpenType(mappedProp.roomTypes[0].id);
      }
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : isEn ? "Failed to load property." : "Gagal memuat properti."
      );
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
        <div className="py-24 text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-nk-accent mb-3" />
          <p className="text-xs text-nk-text-muted">
            {isEn ? "Loading property details..." : "Memuat data kos..."}
          </p>
        </div>
      </DashboardShell>
    );
  }

  if (!property) {
    return (
      <DashboardShell role="owner">
        <div className="py-24 text-center">
          <AlertCircle className="mx-auto size-8 text-destructive mb-2" />
          <h2 className="text-base font-medium text-nk-text">
            {isEn ? "Property Not Found" : "Properti Tidak Ditemukan"}
          </h2>
          <p className="mt-1 text-xs text-nk-text-muted">
            {isEn
              ? "The property you are looking for does not exist or has been removed."
              : "Properti yang Anda cari tidak tersedia atau telah dihapus."}
          </p>
          <Link
            href="/owner/properties"
            className="mt-4 inline-block rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse"
          >
            {isEn ? "Back to Properties" : "Kembali ke Daftar Kos"}
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const units = rooms[property.slug] ?? rooms[params.slug as string] ?? [];
  const totalUnitsCount = units.length;
  const vacantUnitsCount = units.filter((u) => u.status === "kosong").length;
  const occupiedUnitsCount = units.filter((u) => u.status === "terisi").length;
  const maintenanceUnitsCount = units.filter((u) => u.status === "maintenance").length;
  const reservedUnitsCount = units.filter((u) => u.status === "dipesan").length;

  /** Update Status Unit Kamar */
  const setRoomStatus = async (roomItem: ExtendedRoomUnit, status: RoomUnit["status"]) => {
    const prevUnits = [...units];
    setRooms((prev) => ({
      ...prev,
      [property.slug]: (prev[property.slug] ?? []).map((r) =>
        r.number === roomItem.number ? { ...r, status } : r
      ),
      [params.slug]: (prev[params.slug] ?? []).map((r) =>
        r.number === roomItem.number ? { ...r, status } : r
      ),
    }));
    setMenuRoom(null);

    const statusLabel = roomStatusMeta[status]?.label || status;

    if (roomItem.id && property) {
      try {
        const dbStatus =
          status === "kosong"
            ? "AVAILABLE"
            : status === "maintenance"
              ? "MAINTENANCE"
              : status === "dipesan"
                ? "RESERVED"
                : "OCCUPIED";

        const targetId = property.id || property.slug || params.slug;
        const res = await fetch(`/api/properties/${targetId}/rooms/${roomItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: dbStatus }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || (isEn ? "Failed to update room status." : "Gagal memperbarui status unit."));
        }

        showToast(
          isEn
            ? `Room #${roomItem.number} status updated to ${statusLabel}`
            : `Status kamar #${roomItem.number} berhasil diubah menjadi ${statusLabel}`,
          "success"
        );
      } catch (err: unknown) {
        setRooms((prev) => ({ ...prev, [property.slug]: prevUnits, [params.slug]: prevUnits }));
        const errMsg =
          err instanceof Error ? err.message : isEn ? "Failed to update unit." : "Gagal memperbarui status unit.";
        setActionError(errMsg);
        showToast(errMsg, "error");
      }
    }
  };

  /** Hapus Unit Kamar */
  const handleDeleteRoomUnit = async (roomItem: ExtendedRoomUnit) => {
    const prevUnits = [...units];
    setRooms((prev) => ({
      ...prev,
      [property.slug]: (prev[property.slug] ?? []).filter(
        (r) => r.number !== roomItem.number
      ),
      [params.slug]: (prev[params.slug] ?? []).filter(
        (r) => r.number !== roomItem.number
      ),
    }));
    setMenuRoom(null);

    if (roomItem.id && property) {
      try {
        const targetId = property.id || property.slug || params.slug;
        const res = await fetch(
          `/api/properties/${targetId}/rooms/${roomItem.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error?.message || (isEn ? "Failed to delete room unit." : "Gagal menghapus unit kamar."));
        }
        showToast(
          isEn
            ? `Room #${roomItem.number} deleted successfully`
            : `Kamar #${roomItem.number} berhasil dihapus`,
          "success"
        );
      } catch (err: unknown) {
        setRooms((prev) => ({ ...prev, [property.slug]: prevUnits, [params.slug]: prevUnits }));
        const errMsg =
          err instanceof Error ? err.message : isEn ? "Failed to delete room unit." : "Gagal menghapus unit kamar.";
        setActionError(errMsg);
        showToast(errMsg, "error");
      }
    }
  };

  /** Simpan Tipe Kamar Baru */
  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || !newTypePrice || !property) return;
    setSubmittingType(true);
    setActionError(null);

    const typeName = newTypeName.trim();

    try {
      const targetId = property.id || property.slug || params.slug;
      const res = await fetch(`/api/properties/${targetId}/room-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: typeName,
          pricePerMonth: Number(newTypePrice),
          sizeM2: newTypeSize ? Number(newTypeSize) : undefined,
          description: newTypeDesc.trim() || undefined,
          capacity: 1,
          facilities: newTypeFacilities,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || (isEn ? "Failed to create room type." : "Gagal membuat tipe kamar."));
      }

      setAddTypeOpen(false);
      setNewTypeName("");
      setNewTypePrice("");
      setNewTypeSize("");
      setNewTypeDesc("");
      setNewTypeFacilities(["bed", "wardrobe", "desk", "bathroom-in", "ac"]);
      showToast(
        isEn
          ? `Room type "${typeName}" created successfully`
          : `Tipe kamar "${typeName}" berhasil dibuat`,
        "success"
      );
      await refreshProperty();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : isEn ? "Error adding room type." : "Terjadi kesalahan saat menambah tipe kamar.";
      setActionError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setSubmittingType(false);
    }
  };

  /** Simpan Perubahan Tipe Kamar */
  const handleUpdateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType || !property) return;
    setSubmittingEditType(true);
    setActionError(null);

    const typeName = editingType.name.trim();

    try {
      const targetId = property.id || property.slug || params.slug;
      const res = await fetch(
        `/api/properties/${targetId}/room-types/${editingType.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: typeName,
            pricePerMonth: editingType.pricePerMonth,
            sizeM2: editingType.sizeM2,
            facilities: editingType.facilities,
          }),
        }
      );

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || (isEn ? "Failed to update room type." : "Gagal memperbarui tipe kamar."));
      }

      setEditTypeOpen(false);
      setEditingType(null);
      showToast(
        isEn
          ? `Room type "${typeName}" updated successfully`
          : `Tipe kamar "${typeName}" berhasil diperbarui`,
        "success"
      );
      await refreshProperty();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : isEn ? "Error updating room type." : "Terjadi kesalahan saat mengubah tipe kamar.";
      setActionError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setSubmittingEditType(false);
    }
  };

  /** Hapus Tipe Kamar */
  const handleDeleteRoomType = async () => {
    if (!editingType || !property) return;
    const typeName = editingType.name;

    setDeletingType(true);
    setActionError(null);

    try {
      const targetId = property.id || property.slug || params.slug;
      const res = await fetch(
        `/api/properties/${targetId}/room-types/${editingType.id}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || (isEn ? "Failed to delete room type." : "Gagal menghapus tipe kamar."));
      }

      setEditTypeOpen(false);
      setEditingType(null);
      showToast(
        isEn
          ? `Room type "${typeName}" deleted successfully`
          : `Tipe kamar "${typeName}" berhasil dihapus`,
        "success"
      );
      await refreshProperty();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : isEn ? "Error deleting room type." : "Terjadi kesalahan saat menghapus tipe kamar.";
      setActionError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setDeletingType(false);
    }
  };

  /** Tambah Unit Kamar Baru */
  const handleCreateRoomUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveRoomTypeId = targetRoomTypeId || property?.roomTypes[0]?.id;
    if (!effectiveRoomTypeId || !newUnitNumber.trim() || !property) return;
    setSubmittingUnit(true);
    setActionError(null);

    const unitNum = newUnitNumber.trim();
    const unitFlr = newUnitFloor ? String(newUnitFloor).trim() : "1";

    try {
      const targetId = property.id || property.slug || params.slug;
      const res = await fetch(
        `/api/properties/${targetId}/rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomTypeId: effectiveRoomTypeId,
            number: unitNum,
            floor: unitFlr,
          }),
        }
      );

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error?.message ||
            (isEn
              ? `Failed to add room unit (${res.status}).`
              : `Gagal menambah unit kamar (${res.status}).`)
        );
      }

      const createdUnit = json.data;
      const newRoom: ExtendedRoomUnit = {
        id: createdUnit?.id || `room-${Date.now()}`,
        roomTypeId: effectiveRoomTypeId,
        number: unitNum,
        floor: unitFlr,
        status: "kosong",
      };

      // Optimistically add room
      setRooms((prev) => ({
        ...prev,
        [property.slug]: [...(prev[property.slug] || []), newRoom],
        [params.slug]: [...(prev[params.slug] || []), newRoom],
      }));

      // Ensure the accordion for this room type is open so the user immediately sees it
      setOpenType(effectiveRoomTypeId);

      setAddUnitOpen(false);
      setNewUnitNumber("");
      setNewUnitFloor("1");
      setTargetRoomTypeId(null);
      showToast(
        isEn
          ? `Room #${unitNum} added successfully`
          : `Kamar #${unitNum} berhasil ditambahkan`,
        "success"
      );
      await refreshProperty();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : isEn ? "Error adding room unit." : "Terjadi kesalahan saat menambah kamar.";
      setActionError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setSubmittingUnit(false);
    }
  };

  /** Simpan Pengaturan Properti */
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    setSettingsSuccess(false);

    try {
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

      const targetId = property?.id || property?.slug || params.slug;
      const res = await fetch(`/api/properties/${targetId}`, {
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

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error?.message || (isEn ? "Failed to save property settings." : "Gagal menyimpan pengaturan properti.")
        );
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
      showToast(
        isEn
          ? "Property settings saved successfully"
          : "Pengaturan properti berhasil disimpan",
        "success"
      );
      await refreshProperty();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : isEn ? "Error saving settings." : "Terjadi kesalahan saat menyimpan pengaturan.";
      setActionError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs = [
    { id: "rooms" as const, label: isEn ? "Room Types" : t("tabRooms"), icon: DoorOpen, count: property.roomTypes.length },
    { id: "photos" as const, label: isEn ? "Photos" : t("tabPhotos"), icon: ImageIcon },
    { id: "settings" as const, label: isEn ? "Settings" : t("tabSettings"), icon: Settings },
  ];

  return (
    <DashboardShell role="owner">
      {/* Alert Error */}
      {actionError && (
        <Alert variant="destructive" className="mb-6 shadow-xs">
          <AlertCircle className="size-4" />
          <AlertTitle>{isEn ? "An Error Occurred" : "Terjadi Kesalahan"}</AlertTitle>
          <AlertDescription className="text-xs">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Top Navigation & Action Strip */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-nk-text-muted">
          <Link href="/owner" className="transition-colors hover:text-nk-text">
            Dashboard
          </Link>
          <ChevronRight className="size-3 text-nk-text-muted/60" aria-hidden="true" />
          <Link href="/owner/properties" className="transition-colors hover:text-nk-text">
            {isEn ? "Properties" : propsT("title")}
          </Link>
          <ChevronRight className="size-3 text-nk-text-muted/60" aria-hidden="true" />
          <span className="font-medium text-nk-text truncate max-w-[200px] sm:max-w-none">
            {property.name}
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`/kost/${property.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm"
          >
            <ExternalLink className="size-3 text-nk-text-muted" />
            <span>{isEn ? "View live listing" : "Lihat listing"}</span>
          </Link>

          {tab === "settings" && (
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={savingSettings}
              className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3.5 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Save className="size-3" />
              )}
              <span>
                {savingSettings
                  ? isEn
                    ? "Saving..."
                    : "Menyimpan..."
                  : isEn
                    ? "Save changes"
                    : "Simpan"}
              </span>
            </button>
          )}

          {tab === "rooms" && (
            <button
              type="button"
              onClick={() => setAddTypeOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3.5 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>{isEn ? "Add room type" : t("addRoomType")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Property Identity Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-nk-border">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-nk-border bg-nk-warm">
            <img
              src={getKosImage(property.slug || property.imageSeed, "main")}
              alt={property.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-nk-text truncate">
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
              <span className="inline-flex items-center rounded-md border border-nk-border bg-nk-section px-2 py-0.5 text-xs font-medium text-nk-text">
                {genderMap[property.gender]?.label ?? (isEn ? "Mixed" : "Campuran")}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-nk-text-muted">
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-nk-accent" />
                <span className="truncate max-w-md">
                  {property.address}, {property.district}, {property.city}
                </span>
              </span>
              <span>·</span>
              <span>
                {totalUnitsCount} {isEn ? "rooms" : "kamar"} ({vacantUnitsCount} {isEn ? "vacant" : "kosong"} · {occupiedUnitsCount} {isEn ? "occupied" : "terisi"})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Underlined Tabs Navigation */}
      <div className="mb-8 border-b border-nk-border">
        <div className="flex gap-8">
          {tabs.map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors cursor-pointer -mb-px",
                  active
                    ? "border-nk-accent text-nk-text"
                    : "border-transparent text-nk-text-muted hover:border-nk-border hover:text-nk-text"
                )}
              >
                <Icon className={cn("size-4", active ? "text-nk-accent" : "text-nk-text-muted")} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      active
                        ? "bg-nk-accent/10 text-nk-accent font-semibold"
                        : "bg-nk-section text-nk-text-muted"
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB: Tipe Kamar & Unit */}
      {tab === "rooms" && (
        <div className="space-y-6">
          {/* Action Bar & Status Legend */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-nk-border bg-nk-surface p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 text-xs text-nk-text-muted">
              <span className="font-medium text-nk-text">
                {isEn ? "Status:" : "Status Kamar:"}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>{isEn ? "Vacant" : "Kosong"} ({vacantUnitsCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-zinc-400" />
                <span>{isEn ? "Occupied" : "Terisi"} ({occupiedUnitsCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <span>{isEn ? "Reserved" : "Dipesan"} ({reservedUnitsCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" />
                <span>{isEn ? "Maintenance" : "Perbaikan"} ({maintenanceUnitsCount})</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenType(
                    openType === null ? property.roomTypes[0]?.id ?? null : null
                  )
                }
                className="rounded-lg border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm cursor-pointer"
              >
                {openType === null
                  ? isEn
                    ? "Expand room types"
                    : "Buka Tipe Kamar"
                  : isEn
                    ? "Collapse all"
                    : "Tutup Semua"}
              </button>
              <button
                type="button"
                onClick={() => setAddTypeOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3.5 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>{isEn ? "Add room type" : t("addRoomType")}</span>
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
              const activeFilter = unitFilters[rt.id] || "all";

              const filteredUnits =
                activeFilter === "all"
                  ? currentUnits
                  : currentUnits.filter((u) => u.status === activeFilter);

              return (
                <div
                  key={rt.id}
                  className="rounded-xl border border-nk-border bg-nk-surface shadow-xs transition-all overflow-hidden"
                >
                  {/* Header Tipe Kamar */}
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-nk-surface border-b border-nk-border/60">
                    <button
                      type="button"
                      onClick={() => setOpenType(isOpen ? null : rt.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left group cursor-pointer"
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
                          <span className="rounded-full bg-nk-section px-2 py-0.5 text-xs font-medium text-nk-text-muted">
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
                            {rtVacant} {isEn ? "vacant" : "kosong"} · {rtOccupied} {isEn ? "occupied" : "terisi"} · {currentUnits.length} {isEn ? "total units" : "total unit"}
                          </span>
                        </div>
                        {rt.facilities && rt.facilities.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {rt.facilities.map((fKey: string) => {
                              const meta = FACILITY_META[fKey as Facility];
                              return (
                                <span
                                  key={fKey}
                                  className="inline-flex items-center gap-1 rounded border border-nk-border bg-nk-warm/40 px-2 py-0.5 text-xs font-medium text-nk-text"
                                >
                                  <FacilityIcon facility={fKey as Facility} className="size-3 text-nk-accent" />
                                  <span>{isEn ? meta?.labelEn || fKey : meta?.labelId || fKey}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
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
                            facilities: (rt.facilities as string[]) || [],
                          });
                          setEditTypeOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-nk-border px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm cursor-pointer"
                      >
                        <Edit2 className="size-3" />
                        <span>{isEn ? "Edit type" : "Edit Tipe"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRoomTypeId(rt.id);
                          setAddUnitOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-nk-warm px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-accent hover:text-nk-text-inverse cursor-pointer"
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
                              "rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                              activeFilter === "all"
                                ? "bg-nk-accent text-nk-text-inverse font-medium"
                                : "border border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
                            )}
                          >
                            {isEn ? "All" : "Semua"} ({currentUnits.length})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setUnitFilters((prev) => ({ ...prev, [rt.id]: "kosong" }))
                            }
                            className={cn(
                              "rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                              activeFilter === "kosong"
                                ? "bg-emerald-700 text-white font-medium"
                                : "border border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
                            )}
                          >
                            {isEn ? "Vacant" : "Kosong"} ({rtVacant})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setUnitFilters((prev) => ({ ...prev, [rt.id]: "terisi" }))
                            }
                            className={cn(
                              "rounded-lg px-2.5 py-1 transition-colors cursor-pointer",
                              activeFilter === "terisi"
                                ? "bg-zinc-700 text-white font-medium"
                                : "border border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
                            )}
                          >
                            {isEn ? "Occupied" : "Terisi"} ({rtOccupied})
                          </button>
                        </div>
                      )}

                      {/* Grid Kamar */}
                      {filteredUnits.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                          {filteredUnits.map((room) => {
                            const meta = roomStatusMeta[room.status];
                            return (
                              <DropdownMenu
                                key={room.number}
                                open={menuRoom === `${rt.id}-${room.number}`}
                                onOpenChange={(open) =>
                                  setMenuRoom(open ? `${rt.id}-${room.number}` : null)
                                }
                              >
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "group relative flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer shadow-xs",
                                      meta.cls
                                    )}
                                  >
                                    <div className="flex w-full items-center justify-between">
                                      <span className="font-bold text-nk-text text-sm">
                                        #{room.number}
                                      </span>
                                      <span
                                        className={cn(
                                          "size-2 rounded-full",
                                          meta.dot
                                        )}
                                      />
                                    </div>
                                    <div className="flex w-full items-center justify-between text-xs mt-1">
                                      <span className="text-nk-text-muted">
                                        {room.floor ? `${isEn ? "Fl." : "Lt."} ${room.floor}` : isEn ? "Fl. 1" : "Lt. 1"}
                                      </span>
                                      <StatusBadge
                                        color={meta.badge}
                                        className="!px-1.5 !py-0 text-xs"
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
                                  <div className="px-2.5 py-1 text-xs font-semibold text-nk-text-muted border-b border-nk-border/60 mb-1">
                                    {isEn ? `Change Status: Room #${room.number}` : `Ubah Status: Kamar ${room.number}`}
                                  </div>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "kosong")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm"
                                  >
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                    <span>{isEn ? "Mark as Vacant" : "Tandai Kosong (Tersedia)"}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "terisi")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm"
                                  >
                                    <span className="size-2 rounded-full bg-zinc-400" />
                                    <span>{isEn ? "Mark as Occupied" : "Tandai Terisi"}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "dipesan")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm"
                                  >
                                    <span className="size-2 rounded-full bg-amber-500" />
                                    <span>{isEn ? "Mark as Reserved" : "Tandai Dipesan"}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setRoomStatus(room, "maintenance")}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg hover:bg-nk-warm"
                                  >
                                    <span className="size-2 rounded-full bg-rose-500" />
                                    <span>{isEn ? "Mark as Maintenance" : "Tandai Perbaikan"}</span>
                                  </DropdownMenuItem>
                                  <div className="my-1 border-t border-nk-border/60" />
                                  <DropdownMenuItem
                                    onClick={() => void handleDeleteRoomUnit(room)}
                                    className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="size-3.5" />
                                    <span>{isEn ? "Delete Room" : "Hapus Kamar"}</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-nk-border bg-nk-surface/50 p-6 text-center">
                          <p className="text-xs text-nk-text-muted">
                            {isEn
                              ? "No rooms match the selected filter."
                              : "Belum ada kamar dengan filter yang dipilih."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetRoomTypeId(rt.id);
                              setAddUnitOpen(true);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-3 py-1.5 text-xs font-medium text-nk-text-inverse hover:opacity-90 cursor-pointer"
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

      {/* TAB: Settings & Edit Form (Impeccable 2-Column Settings Layout) */}
      {tab === "settings" && (
        <div className="max-w-5xl space-y-8">
          {settingsSuccess && (
            <Alert className="border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]">
              <CheckCircle2 className="size-4 text-[#2F6B3C]" />
              <AlertTitle className="text-sm font-semibold">
                {isEn ? "Changes Saved Successfully" : "Berhasil Disimpan"}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {isEn
                  ? "Property information, policies, and payout account details have been updated."
                  : "Perubahan data dan kebijakan properti Anda telah berhasil diperbarui dan tersinkronisasi."}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-12 divide-y divide-nk-border">
            {/* Section 1: General Information */}
            <section className="pt-2 first:pt-0 lg:grid lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-4 xl:col-span-3">
                <h3 className="text-base font-medium text-nk-text">
                  {isEn ? "General Information" : "Informasi Properti"}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-nk-text-muted">
                  {isEn
                    ? "Basic identity and summary for listing discovery."
                    : "Identitas utama properti kos Anda pada listing pencarian."}
                </p>
              </div>

              <div className="mt-6 lg:mt-0 lg:col-span-8 xl:col-span-9 max-w-2xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="prop-name" className="text-xs font-medium text-nk-text">
                      {isEn ? "Property Name" : "Nama Kos"} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="prop-name"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      required
                      className="mt-1.5"
                      placeholder={isEn ? "e.g. Melati Residence" : "Contoh: Kos Griya Melati Asri"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prop-tagline" className="text-xs font-medium text-nk-text">
                      {isEn ? "Tagline / Short Slogan" : "Tagline / Slogan Singkat"}
                    </Label>
                    <Input
                      id="prop-tagline"
                      value={settingsTagline}
                      onChange={(e) => setSettingsTagline(e.target.value)}
                      placeholder={isEn ? "e.g. Quiet, Near Campus, 24h Access" : "Contoh: Nyaman, Dekat Kampus, Akses 24 Jam"}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="prop-desc" className="text-xs font-medium text-nk-text">
                    {isEn ? "Description" : "Deskripsi Kos"} <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="prop-desc"
                    rows={4}
                    value={settingsDesc}
                    onChange={(e) => setSettingsDesc(e.target.value)}
                    required
                    placeholder={
                      isEn
                        ? "Describe key property features, atmosphere, ventilation, or neighborhood..."
                        : "Ceritakan keunggulan kos, suasana lingkungan, sirkulasi udara, atau fasilitas utama..."
                    }
                    className="mt-1.5 bg-nk-surface"
                  />
                </div>

                <div>
                  <Label htmlFor="prop-patokan" className="text-xs font-medium text-nk-text">
                    {isEn ? "Surrounding Landmark" : "Patokan Alamat / Landmark Sekitar"}
                  </Label>
                  <Input
                    id="prop-patokan"
                    value={settingsPatokan}
                    onChange={(e) => setSettingsPatokan(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. 100 meters behind main university gate, gray fence"
                        : "Contoh: 100 meter di belakang gerbang utama kampus UB, pagar abu-abu"
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Location & Access */}
            <section className="pt-8 lg:grid lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-4 xl:col-span-3">
                <h3 className="text-base font-medium text-nk-text">
                  {isEn ? "Location & Access" : "Lokasi & Akses"}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-nk-text-muted">
                  {isEn
                    ? "Physical address and proximity to campuses or transit."
                    : "Alamat fisik serta estimasi jarak kos ke kampus atau fasilitas umum."}
                </p>
              </div>

              <div className="mt-6 lg:mt-0 lg:col-span-8 xl:col-span-9 max-w-2xl space-y-4">
                <div>
                  <Label htmlFor="prop-addr" className="text-xs font-medium text-nk-text">
                    {isEn ? "Street Address" : "Alamat Lengkap Kos"} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="prop-addr"
                    value={settingsAddress}
                    onChange={(e) => setSettingsAddress(e.target.value)}
                    required
                    className="mt-1.5"
                    placeholder={isEn ? "Street name, building number" : "Nama jalan, nomor rumah, RT/RW"}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="prop-city" className="text-xs font-medium text-nk-text">
                      {isEn ? "City" : "Kota / Kabupaten"} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="prop-city"
                      value={settingsCity}
                      onChange={(e) => setSettingsCity(e.target.value)}
                      required
                      className="mt-1.5"
                      placeholder="Malang"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prop-district" className="text-xs font-medium text-nk-text">
                      {isEn ? "District" : "Kecamatan"} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="prop-district"
                      value={settingsDistrict}
                      onChange={(e) => setSettingsDistrict(e.target.value)}
                      required
                      className="mt-1.5"
                      placeholder="Lowokwaru"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prop-postal" className="text-xs font-medium text-nk-text">
                      {isEn ? "Postal Code" : "Kode Pos"}
                    </Label>
                    <Input
                      id="prop-postal"
                      value={settingsPostal}
                      onChange={(e) => setSettingsPostal(e.target.value)}
                      placeholder="65141"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="prop-distance" className="text-xs font-medium text-nk-text">
                      {isEn ? "Distance to Campus (Meters)" : "Jarak ke Kampus (Meter)"}
                    </Label>
                    <Input
                      id="prop-distance"
                      type="number"
                      value={settingsCampusDistance}
                      onChange={(e) => setSettingsCampusDistance(e.target.value)}
                      placeholder="350"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prop-deposit" className="text-xs font-medium text-nk-text">
                      {isEn ? "Security Deposit / Down Payment (IDR)" : "Nominal DP / Uang Jaminan (Rp)"}
                    </Label>
                    <Input
                      id="prop-deposit"
                      type="number"
                      value={settingsDeposit}
                      onChange={(e) => setSettingsDeposit(e.target.value)}
                      placeholder={isEn ? "e.g. 300000 (leave blank if none)" : "Contoh: 300000 (Kosongkan jika tanpa DP)"}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: House Rules & Policies */}
            <section className="pt-8 lg:grid lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-4 xl:col-span-3">
                <h3 className="text-base font-medium text-nk-text">
                  {isEn ? "House Rules & Policies" : "Kebijakan & Aturan Sewa"}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-nk-text-muted">
                  {isEn
                    ? "Resident gender specification, curfew, guest rules, and document requirements."
                    : "Spesifikasi tipe penghuni, jam malam, izin tamu, dan persyaratan dokumen."}
                </p>
              </div>

              <div className="mt-6 lg:mt-0 lg:col-span-8 xl:col-span-9 max-w-2xl space-y-6">
                {/* Tipe Penghuni (Gender) */}
                <div>
                  <Label className="text-xs font-medium text-nk-text mb-2 block">
                    {isEn ? "Resident Gender" : "Tipe Penghuni (Gender)"} <span className="text-rose-500">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "mixed" as Gender, label: isEn ? "Mixed" : "Campuran", sub: isEn ? "All residents" : "Putra & Putri", icon: Users },
                      { val: "male" as Gender, label: isEn ? "Men only" : "Khusus Putra", sub: isEn ? "Male tenants" : "Pria Saja", icon: User },
                      { val: "female" as Gender, label: isEn ? "Women only" : "Khusus Putri", sub: isEn ? "Female tenants" : "Wanita Saja", icon: User },
                    ].map((g) => {
                      const GIcon = g.icon;
                      const active = settingsGender === g.val;
                      return (
                        <button
                          key={g.val}
                          type="button"
                          onClick={() => setSettingsGender(g.val)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center transition-all cursor-pointer active:scale-[0.98]",
                            active
                              ? "border-nk-accent bg-nk-accent text-nk-text-inverse font-medium shadow-xs"
                              : "border-nk-border bg-nk-surface text-nk-text hover:bg-nk-warm"
                          )}
                        >
                          <GIcon className={cn("size-4", active ? "text-nk-text-inverse" : "text-nk-text-muted")} />
                          <span className="text-xs font-medium">{g.label}</span>
                          <span className={cn("text-xs", active ? "text-nk-text-inverse/80" : "text-nk-text-muted")}>
                            {g.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kriteria Profesi & Jam Malam */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="prop-kriteria" className="text-xs font-medium text-nk-text">
                      {isEn ? "Tenant Criteria" : "Kriteria Profesi Penyewa"}
                    </Label>
                    <div className="relative mt-1.5">
                      <select
                        id="prop-kriteria"
                        value={settingsKriteriaPenyewa}
                        onChange={(e) => setSettingsKriteriaPenyewa(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-nk-border bg-nk-surface px-3 py-2 text-xs sm:text-sm text-nk-text outline-none focus:border-nk-accent focus:ring-1 focus:ring-nk-accent cursor-pointer pr-8"
                      >
                        <option value="Bisa untuk Semua">{isEn ? "Open to all (General)" : "Bisa untuk Semua (Umum)"}</option>
                        <option value="Khusus Mahasiswa">{isEn ? "Students only" : "Khusus Mahasiswa"}</option>
                        <option value="Khusus Karyawan">{isEn ? "Professionals only" : "Khusus Karyawan"}</option>
                        <option value="Mahasiswa & Karyawan">{isEn ? "Students & Professionals" : "Mahasiswa & Karyawan"}</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-nk-text block mb-1.5">
                      {isEn ? "Gate Access & Curfew" : "Akses Gerbang & Jam Malam"}
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSettingsAksesJamMalam("Akses 24 jam")}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
                          settingsAksesJamMalam === "Akses 24 jam"
                            ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                            : "border-nk-border bg-nk-surface text-nk-text hover:bg-nk-warm"
                        )}
                      >
                        {isEn ? "24-Hour Access" : "Akses 24 Jam"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsAksesJamMalam("Ada jam malam")}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer",
                          settingsAksesJamMalam === "Ada jam malam"
                            ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                            : "border-nk-border bg-nk-surface text-nk-text hover:bg-nk-warm"
                        )}
                      >
                        {isEn ? "Curfew Enforced" : "Ada Jam Malam"}
                      </button>
                    </div>
                    {settingsAksesJamMalam === "Ada jam malam" && (
                      <div className="mt-2 flex items-center gap-2">
                        <Clock className="size-4 text-nk-text-muted shrink-0" />
                        <Input
                          id="prop-jam-text"
                          value={settingsJamMalamText}
                          onChange={(e) => setSettingsJamMalamText(e.target.value)}
                          placeholder="23:00"
                          className="h-8 text-xs max-w-[140px]"
                        />
                        <span className="text-xs text-nk-text-muted">
                          {isEn ? "Curfew time" : "Batas pulang"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Flat list of policy switches */}
                <div>
                  <Label className="text-xs font-medium text-nk-text mb-2 block">
                    {isEn ? "Rules & Policies" : "Aturan & Ketentuan Kos"}
                  </Label>
                  <div className="divide-y divide-nk-border rounded-xl border border-nk-border bg-nk-surface">
                    <div className="flex items-center justify-between p-3.5">
                      <div className="pr-4">
                        <p className="text-xs font-medium text-nk-text">
                          {isEn ? "National ID (KTP) Required" : "Wajib KTP saat Pengajuan"}
                        </p>
                        <p className="text-xs text-nk-text-muted mt-0.5">
                          {isEn
                            ? "Tenants must upload valid ID when submitting booking request"
                            : "Calon penyewa wajib melampirkan foto KTP"}
                        </p>
                      </div>
                      <Switch checked={settingsWajibKtp} onCheckedChange={setSettingsWajibKtp} />
                    </div>

                    <div className="flex items-center justify-between p-3.5">
                      <div className="pr-4">
                        <p className="text-xs font-medium text-nk-text">
                          {isEn ? "Guests Allowed in Common Areas" : "Boleh Terima Tamu di Area Bersama"}
                        </p>
                        <p className="text-xs text-nk-text-muted mt-0.5">
                          {isEn
                            ? "Visitors permitted in common lobby or guest rooms"
                            : "Tamu diizinkan berkunjung di ruang tamu / area bersama"}
                        </p>
                      </div>
                      <Switch checked={settingsBolehTerimaTamu} onCheckedChange={setSettingsBolehTerimaTamu} />
                    </div>

                    <div className="flex items-center justify-between p-3.5">
                      <div className="pr-4">
                        <p className="text-xs font-medium text-nk-text">
                          {isEn ? "Married Couples Allowed" : "Boleh untuk Pasutri"}
                        </p>
                        <p className="text-xs text-nk-text-muted mt-0.5">
                          {isEn
                            ? "Accept legally married couples"
                            : "Menerima pasangan suami istri yang sah"}
                        </p>
                      </div>
                      <Switch checked={settingsBolehPasutri} onCheckedChange={setSettingsBolehPasutri} />
                    </div>

                    {settingsBolehPasutri && (
                      <div className="flex items-center justify-between p-3.5 bg-nk-warm/40">
                        <div className="pr-4">
                          <p className="text-xs font-medium text-nk-text">
                            {isEn ? "Marriage Certificate Required" : "Wajib Buku Nikah"}
                          </p>
                          <p className="text-xs text-nk-text-muted mt-0.5">
                            {isEn
                              ? "Require marriage certificate document upon booking"
                              : "Melampirkan bukti nikah resmi saat pengajuan"}
                          </p>
                        </div>
                        <Switch checked={settingsWajibBukuNikah} onCheckedChange={setSettingsWajibBukuNikah} />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3.5">
                      <div className="pr-4">
                        <p className="text-xs font-medium text-nk-text">
                          {isEn ? "Pets Allowed" : "Boleh Bawa Hewan Peliharaan"}
                        </p>
                        <p className="text-xs text-nk-text-muted mt-0.5">
                          {isEn
                            ? "Allow select domestic pets on premises"
                            : "Mengizinkan hewan peliharaan tertentu"}
                        </p>
                      </div>
                      <Switch checked={settingsBolehBawaHewan} onCheckedChange={setSettingsBolehBawaHewan} />
                    </div>

                    <div className="flex items-center justify-between p-3.5">
                      <div className="pr-4">
                        <p className="text-xs font-medium text-nk-text">
                          {isEn ? "Strictly Non-Smoking Rooms" : "Dilarang Merokok di Dalam Kamar"}
                        </p>
                        <p className="text-xs text-nk-text-muted mt-0.5">
                          {isEn
                            ? "Smoke-free rooms and indoor spaces"
                            : "Kamar bebas dari asap rokok dan bau"}
                        </p>
                      </div>
                      <Switch checked={settingsDilarangMerokok} onCheckedChange={setSettingsDilarangMerokok} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Amenities */}
            <section className="pt-8 lg:grid lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-4 xl:col-span-3">
                <div className="flex items-center justify-between lg:block">
                  <h3 className="text-base font-medium text-nk-text">
                    {isEn ? "Amenities" : "Fasilitas Kos"}
                  </h3>
                  <span className="mt-1 inline-block text-xs font-medium text-nk-accent">
                    {settingsFacilities.length} {isEn ? "selected" : "terpilih"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-nk-text-muted">
                  {isEn
                    ? "Select amenities available for all residents."
                    : "Pilih fasilitas bersama yang tersedia di kos Anda."}
                </p>
              </div>

              <div className="mt-6 lg:mt-0 lg:col-span-8 xl:col-span-9 max-w-2xl">
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
                          "flex items-center justify-between gap-2 rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer active:scale-[0.98]",
                          active
                            ? "border-nk-accent bg-nk-accent/10 text-nk-text font-medium ring-1 ring-nk-accent/30"
                            : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/30 hover:bg-nk-warm/50"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FacilityIcon facility={f as any} className="size-4 shrink-0 text-nk-accent" />
                          <span className="truncate">
                            {isEn ? FACILITY_META[f]?.labelEn || f : FACILITY_META[f]?.labelId || f}
                          </span>
                        </div>
                        {active && <Check className="size-3.5 shrink-0 text-nk-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Section 5: Payout Account */}
            <section className="pt-8 lg:grid lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-4 xl:col-span-3">
                <h3 className="text-base font-medium text-nk-text">
                  {isEn ? "Payout Account" : "Rekening Pencairan"}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-nk-text-muted">
                  {isEn
                    ? "Bank account for rent payouts via NgeKos Escrow Wallet. Payouts arrive T+1 after tenant check-in."
                    : "Rekening tujuan transfer saldo sewa dari NgeKos Escrow Wallet (cair H+1 setelah penyewa check-in)."}
                </p>
              </div>

              <div className="mt-6 lg:mt-0 lg:col-span-8 xl:col-span-9 max-w-2xl space-y-4">
                <div className="rounded-xl border border-nk-border bg-nk-section/40 p-3.5 text-xs text-nk-text-muted leading-relaxed">
                  {isEn
                    ? "Rental payouts are held securely in the NgeKos Escrow Wallet and automatically disbursed to this verified bank account on T+1 after tenant check-in."
                    : "Hasil sewa tersimpan aman di NgeKos Escrow Wallet dan otomatis dicairkan ke rekening ini pada H+1 setelah penyewa melakukan check-in."}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="prop-bank" className="text-xs font-medium text-nk-text">
                      {isEn ? "Bank Name" : "Nama Bank"}
                    </Label>
                    <div className="relative mt-1.5">
                      <select
                        id="prop-bank"
                        value={settingsBank}
                        onChange={(e) => setSettingsBank(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-nk-border bg-nk-surface px-3 py-2 text-xs sm:text-sm text-nk-text outline-none focus:border-nk-accent focus:ring-1 focus:ring-nk-accent cursor-pointer pr-8"
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
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="prop-rek" className="text-xs font-medium text-nk-text">
                      {isEn ? "Account Number" : "Nomor Rekening"}
                    </Label>
                    <Input
                      id="prop-rek"
                      value={settingsAccountNumber}
                      onChange={(e) => setSettingsAccountNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="8830192831"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="prop-holder" className="text-xs font-medium text-nk-text">
                      {isEn ? "Account Holder Name" : "Nama Pemilik Rekening"}
                    </Label>
                    <Input
                      id="prop-holder"
                      value={settingsAccountHolder}
                      onChange={(e) => setSettingsAccountHolder(e.target.value)}
                      placeholder={isEn ? "As registered in bank" : "Sesuai buku tabungan"}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Action Footer */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-nk-text-muted text-center sm:text-left">
                {isEn
                  ? "Ensure all property details and payout account info are accurate before saving."
                  : "Pastikan seluruh data properti dan nomor rekening sudah benar sebelum menyimpan."}
              </span>
              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-nk-accent px-6 py-2.5 text-xs sm:text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50 active:scale-[0.99] cursor-pointer w-full sm:w-auto"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{isEn ? "Saving Changes..." : "Menyimpan Pengaturan..."}</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>{isEn ? "Save Changes" : "Simpan Perubahan"}</span>
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
            <DialogTitle>{isEn ? "Add Room Type" : "Tambah Tipe Kamar"}</DialogTitle>
            <DialogDescription className="text-xs">
              {isEn
                ? `Create a new room type for ${property.name}.`
                : `Buat tipe kamar baru untuk properti ${property.name}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRoomType} className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-type-name" className="text-xs">
                {isEn ? "Room Type Name *" : "Nama Tipe Kamar *"}
              </Label>
              <Input
                id="new-type-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder={isEn ? "e.g. Deluxe Room with Private Bath" : "Contoh: Deluxe Kamar Mandi Dalam"}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-type-price" className="text-xs">
                  {isEn ? "Price / Month (IDR) *" : "Harga / Bulan (Rp) *"}
                </Label>
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
                <Label htmlFor="new-type-size" className="text-xs">
                  {isEn ? "Size (m²)" : "Ukuran (m²)"}
                </Label>
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
              <Label htmlFor="new-type-desc" className="text-xs">
                {isEn ? "Short Description" : "Deskripsi Singkat"}
              </Label>
              <Input
                id="new-type-desc"
                value={newTypeDesc}
                onChange={(e) => setNewTypeDesc(e.target.value)}
                placeholder={isEn ? "Includes queen bed, work desk, etc." : "Termasuk kasur queen, meja kerja, dll"}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{isEn ? "Room Amenities" : "Fasilitas Kamar"}</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ROOM_FACILITY_KEYS.map((key) => {
                  const checked = newTypeFacilities.includes(key);
                  const meta = FACILITY_META[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleNewTypeFacility(key)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 text-left text-xs font-medium transition-all cursor-pointer",
                        checked
                          ? "border-nk-accent bg-nk-surface text-nk-text shadow-xs ring-1 ring-nk-accent/40"
                          : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/40 hover:bg-nk-warm/50"
                      )}
                    >
                      <FacilityIcon
                        facility={key}
                        className={cn(
                          "size-3.5 shrink-0 transition-colors",
                          checked ? "text-nk-accent" : "text-nk-text-muted"
                        )}
                      />
                      <span className="truncate">
                        {isEn ? meta?.labelEn || key : meta?.labelId || key}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <button
                type="button"
                onClick={() => setAddTypeOpen(false)}
                className="rounded-lg border border-nk-border px-4 py-2 text-xs font-medium text-nk-text hover:bg-nk-warm cursor-pointer"
              >
                {isEn ? "Cancel" : "Batal"}
              </button>
              <button
                type="submit"
                disabled={submittingType}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {submittingType && <Loader2 className="size-3.5 animate-spin" />}
                <span>{isEn ? "Add Type" : "Tambah Tipe"}</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Edit Tipe Kamar */}
      <Dialog open={editTypeOpen} onOpenChange={setEditTypeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEn ? "Edit Room Type" : "Edit Tipe Kamar"}</DialogTitle>
            <DialogDescription className="text-xs">
              {isEn ? "Update details for this room type." : "Ubah rincian tipe kamar ini."}
            </DialogDescription>
          </DialogHeader>
          {editingType && (
            <form onSubmit={handleUpdateRoomType} className="space-y-4 py-2">
              <div>
                <Label htmlFor="edit-type-name" className="text-xs">
                  {isEn ? "Room Type Name *" : "Nama Tipe Kamar *"}
                </Label>
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
                  <Label htmlFor="edit-type-price" className="text-xs">
                    {isEn ? "Price / Month (IDR) *" : "Harga / Bulan (Rp) *"}
                  </Label>
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
                  <Label htmlFor="edit-type-size" className="text-xs">
                    {isEn ? "Size (m²)" : "Ukuran (m²)"}
                  </Label>
                  <Input
                    id="edit-type-size"
                    type="number"
                    value={editingType.sizeM2}
                    onChange={(e) =>
                      setEditingType({ ...editingType, sizeM2: Number(e.target.value) })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">{isEn ? "Room Amenities" : "Fasilitas Kamar"}</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ROOM_FACILITY_KEYS.map((key) => {
                    const checked = editingType.facilities.includes(key);
                    const meta = FACILITY_META[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleEditingTypeFacility(key)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2 text-left text-xs font-medium transition-all cursor-pointer",
                          checked
                            ? "border-nk-accent bg-nk-surface text-nk-text shadow-xs ring-1 ring-nk-accent/40"
                            : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/40 hover:bg-nk-warm/50"
                        )}
                      >
                        <FacilityIcon
                          facility={key}
                          className={cn(
                            "size-3.5 shrink-0 transition-colors",
                            checked ? "text-nk-accent" : "text-nk-text-muted"
                          )}
                        />
                        <span className="truncate">
                          {isEn ? meta?.labelEn || key : meta?.labelId || key}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <DialogFooter className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleDeleteRoomType()}
                  disabled={deletingType || submittingEditType}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                >
                  {deletingType && <Loader2 className="size-3.5 animate-spin" />}
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  <span>{isEn ? "Delete Room Type" : "Hapus Tipe Kamar"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditTypeOpen(false)}
                  className="rounded-lg border border-nk-border px-4 py-2 text-xs font-medium text-nk-text hover:bg-nk-warm cursor-pointer"
                >
                  {isEn ? "Cancel" : "Batal"}
                </button>
                <button
                  type="submit"
                  disabled={submittingEditType}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {submittingEditType && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isEn ? "Save Changes" : "Simpan Perubahan"}</span>
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
            <DialogTitle>{isEn ? "Add Room Unit" : "Tambah Unit Kamar"}</DialogTitle>
            <DialogDescription className="text-xs">
              {isEn
                ? "Add a new room number to this room type."
                : "Tambahkan nomor kamar baru ke tipe kamar ini."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRoomUnit} className="space-y-4 py-2">
            {property.roomTypes.length > 1 ? (
              <div>
                <Label htmlFor="new-unit-roomtype" className="text-xs">
                  {isEn ? "Room Type *" : "Tipe Kamar *"}
                </Label>
                <select
                  id="new-unit-roomtype"
                  value={targetRoomTypeId || property.roomTypes[0]?.id || ""}
                  onChange={(e) => setTargetRoomTypeId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-nk-border bg-nk-surface px-3 py-2 text-xs text-nk-text focus:border-nk-accent focus:outline-none focus:ring-1 focus:ring-nk-accent"
                >
                  {property.roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : property.roomTypes.length === 1 ? (
              <div className="rounded-lg bg-nk-warm/70 px-3 py-2 text-xs">
                <span className="text-nk-text-muted">{isEn ? "Room Type: " : "Tipe Kamar: "}</span>
                <span className="font-medium text-nk-text">{property.roomTypes[0].name}</span>
              </div>
            ) : null}
            <div>
              <Label htmlFor="new-unit-number" className="text-xs">
                {isEn ? "Room Number / Code *" : "Nomor / Kode Kamar *"}
              </Label>
              <Input
                id="new-unit-number"
                value={newUnitNumber}
                onChange={(e) => setNewUnitNumber(e.target.value)}
                placeholder={isEn ? "e.g. A-105 or B-201" : "Contoh: A-105 atau B-201"}
                required
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="new-unit-floor" className="text-xs">
                {isEn ? "Floor" : "Lantai"}
              </Label>
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
                className="rounded-lg border border-nk-border px-4 py-2 text-xs font-medium text-nk-text hover:bg-nk-warm cursor-pointer"
              >
                {isEn ? "Cancel" : "Batal"}
              </button>
              <button
                type="submit"
                disabled={submittingUnit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {submittingUnit && <Loader2 className="size-3.5 animate-spin" />}
                <span>{isEn ? "Add Room" : "Tambah Kamar"}</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

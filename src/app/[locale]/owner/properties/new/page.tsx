"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { useSession } from "@/components/SessionProvider";
import {
  Building2,
  MapPin,
  Search,
  LocateFixed,
  XCircle,
  BedDouble,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  UploadCloud,
  ShieldCheck,
  Sparkles,
  Coins,
  FileText,
  CreditCard,
  AlertCircle,
  Loader2,
  Navigation,
  Bed,
  DoorOpen,
  Bath,
  ImagePlus,
  Wifi,
  Zap,
  ZapOff,
  Utensils,
  Droplets,
  Droplet,
  Refrigerator,
  Video,
  KeyRound,
  UserCheck,
  Bike,
  Car,
  Fan,
  Wind,
  AirVent,
  AppWindow,
  Armchair,
  Shirt,
  Flame,
  Tv,
  Sofa,
  Sun,
  SunMedium,
  Trees,
  Flower2,
  Cigarette,
  Clock,
  Moon,
  GraduationCap,
  Heart,
  PawPrint,
  Ban,
  IdCard,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatIDR } from "@/lib/utils";
import Stepper03 from "@/components/shadcn-space/stepper/stepper-03";
import { motion, AnimatePresence } from "motion/react";

const InteractiveMapPicker = dynamic(
  () => import("@/components/InteractiveMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-nk-warm">
        <Loader2 className="size-6 animate-spin text-nk-accent" />
      </div>
    ),
  }
);

const STEPS = [
  { id: 1, label: "Data Kos", icon: Building2 },
  { id: 2, label: "Kamar Kos", icon: BedDouble },
  { id: 3, label: "Foto & Fasilitas", icon: Camera },
  { id: 4, label: "Data Rekening", icon: CreditCard },
];

import { DRAFT_STORAGE_KEY, type PropertyFormDraft } from "@/lib/propertyDraft";

const PHOTO_SLOTS = [
  { key: "kamarTidur", label: "Foto Kamar Tidur", icon: Bed, required: true },
  { key: "depanKamar", label: "Foto Depan Kamar", icon: DoorOpen, required: true },
  { key: "kamarMandi", label: "Foto Kamar Mandi", icon: Bath, required: true },
  { key: "bangunanKos", label: "Foto Bangunan Kos", icon: Building2, required: true },
  { key: "fasilitasBersama", label: "Foto Fasilitas Bersama", icon: Users, required: true },
  { key: "bangunanJalan", label: "Bangunan dari Jalan", icon: Car, required: true },
  { key: "lainnya", label: "Foto Lainnya", icon: ImagePlus, required: false },
];

const FASILITAS_DASAR_ITEMS = [
  { label: "Kamar Mandi Dalam", icon: Bath },
  { label: "Kamar Mandi Luar", icon: Bath },
  { label: "Kasur", icon: Bed },
  { label: "Bantal", icon: Sparkles },
  { label: "Guling", icon: Sparkles },
  { label: "Tanpa Kasur", icon: Ban },
  { label: "AC", icon: AirVent },
  { label: "Ventilasi", icon: Wind },
  { label: "Jendela", icon: AppWindow },
  { label: "Kipas Angin", icon: Fan },
  { label: "WiFi", icon: Wifi },
  { label: "Termasuk Listrik", icon: Zap },
  { label: "Tidak termasuk listrik", icon: ZapOff },
  { label: "Dapur Bersama", icon: Utensils },
  { label: "Dispenser Bersama", icon: Droplets },
  { label: "Kulkas Bersama", icon: Refrigerator },
  { label: "Kunci Gerbang 24 Jam", icon: KeyRound },
  { label: "Penjaga Kos", icon: UserCheck },
  { label: "Pengurus Kos", icon: UserCheck },
  { label: "CCTV", icon: Video },
  { label: "Kartu Akses", icon: IdCard },
  { label: "Parkir Motor", icon: Bike },
  { label: "Parkir Mobil", icon: Car },
];

const FASILITAS_LANJUTAN_ITEMS = [
  { label: "Meja Belajar", icon: Armchair },
  { label: "Kursi", icon: Armchair },
  { label: "Lemari Baju", icon: Shirt },
  { label: "Cermin", icon: Sparkles },
  { label: "Gantungan Baju", icon: Shirt },
  { label: "Water Heater", icon: Flame },
  { label: "Kloset Duduk", icon: Bath },
  { label: "Kloset Jongkok", icon: Bath },
  { label: "Ember Mandi", icon: Droplet },
  { label: "Shower", icon: Droplet },
  { label: "TV", icon: Tv },
  { label: "Ruang Santai", icon: Sofa },
  { label: "Balkon", icon: Sun },
];

const FASILITAS_BERSAMA_ITEMS = [
  { label: "Mesin Cuci", icon: Sparkles },
  { label: "Tempat Jemuran", icon: SunMedium },
  { label: "Wastafel", icon: Droplet },
  { label: "Air PDAM", icon: Droplets },
  { label: "Sumur Bor", icon: Droplet },
  { label: "Ruang Tamu Bersama", icon: Users },
  { label: "Gazebo", icon: Trees },
  { label: "Taman", icon: Flower2 },
  { label: "Area Merokok", icon: Cigarette },
  { label: "Petugas Kebersihan", icon: Sparkles },
  { label: "Tempat Sampah Tiap Lantai", icon: Trash2 },
];

const PERATURAN_KOS_ITEMS = [
  { label: "Akses 24 Jam", icon: Clock },
  { label: "Jam Malam (Maksimal 22:00)", icon: Moon },
  { label: "Khusus Mahasiswa/Karyawan", icon: GraduationCap },
  { label: "Pasutri Boleh (Buku Nikah)", icon: Heart },
  { label: "Tidak Boleh Bawa Anak", icon: Ban },
  { label: "Hewan Peliharaan Boleh", icon: PawPrint },
  { label: "Dilarang Hewan Peliharaan", icon: Ban },
  { label: "Tamu Lawan Jenis Dilarang Masuk Kamar", icon: Ban },
  { label: "Wajib KTP saat Check-in", icon: IdCard },
  { label: "Denda Kerusakan / Piket", icon: AlertTriangle },
];

export default function NewPropertyPage() {
  const router = useRouter();
  const locale = useLocale();
  const { user, ready } = useSession();

  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // -------------------------------------------------------------
  // STEP 1: DATA KOS
  // -------------------------------------------------------------
  const [namaKos, setNamaKos] = useState("");
  const [alamatSearch, setAlamatSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const isUserTypingRef = useRef(false);

  // Map coordinates (default: Bandung / ITB area)
  const [lat, setLat] = useState<number>(-6.8905);
  const [lon, setLon] = useState<number>(107.6104);

  // Section 1: Editable detail lokasi
  const [detailLokasi, setDetailLokasi] = useState("");

  // Section 2: Read-only wilayah administrasi
  const [kelurahan, setKelurahan] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [kabupatenKota, setKabupatenKota] = useState("Bandung");
  const [provinsi, setProvinsi] = useState("Jawa Barat");
  const [kodePos, setKodePos] = useState("40132");

  // Wilayah Administrasi gabungan (Contoh: "Rejowinangun, Kotagede, Kota Yogyakarta, DI Yogyakarta 55171")
  const displayWilayah = useMemo(() => {
    const parts: string[] = [];
    if (kelurahan) parts.push(kelurahan);
    if (kecamatan && !parts.includes(kecamatan)) parts.push(kecamatan);
    if (kabupatenKota && !parts.includes(kabupatenKota)) parts.push(kabupatenKota);
    const stateAndZip = [provinsi, kodePos].filter(Boolean).join(" ");
    if (stateAndZip) parts.push(stateAndZip);
    return parts.join(", ");
  }, [kelurahan, kecamatan, kabupatenKota, provinsi, kodePos]);

  // Patokan alamat (opsional)
  const [patokanAlamat, setPatokanAlamat] = useState("");

  // -------------------------------------------------------------
  // STEP 2: KAMAR KOS
  // -------------------------------------------------------------
  const [tipeKamar, setTipeKamar] = useState("Kamar Standar");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "MIXED">("MIXED");
  const [ukuranKamar, setUkuranKamar] = useState("3 x 3 meter");
  const [totalKamar, setTotalKamar] = useState(5);
  const [kamarKosong, setKamarKosong] = useState(5);
  const [hargaPerbulan, setHargaPerbulan] = useState("1500000");

  // 3 Checkboxes under "Apakah Anda ingin:"
  const [enableHargaSpesial, setEnableHargaSpesial] = useState(false);
  const [hargaSpesial, setHargaSpesial] = useState("1350000");
  const [durasiSpesial, setDurasiSpesial] = useState("6 bulan");

  const [enableUangJaminan, setEnableUangJaminan] = useState(false);
  const [persenDp, setPersenDp] = useState(20);
  const [nominalJaminan, setNominalJaminan] = useState("300000");

  const [enableBiayaTambahan, setEnableBiayaTambahan] = useState(false);
  const [biayaTambahanList, setBiayaTambahanList] = useState<
    { id: string; nominal: string; nama: string }[]
  >([{ id: "fee-1", nominal: "50000", nama: "Biaya Kebersihan & Sampah" }]);

  // -------------------------------------------------------------
  // STEP 3: FOTO & FASILITAS
  // -------------------------------------------------------------
  // 7 photo slots
  const [photos, setPhotos] = useState<{ [key: string]: string }>({
    kamarTidur: "",
    depanKamar: "",
    kamarMandi: "",
    bangunanKos: "",
    fasilitasBersama: "",
    bangunanJalan: "",
    lainnya: "",
  });

  // Fasilitas Dasar (Wajib dicentang)
  const [fasilitasDasar, setFasilitasDasar] = useState<string[]>([
    "Kamar Mandi Dalam",
    "Kasur",
    "Bantal",
    "Ventilasi",
    "WiFi",
    "Kunci Gerbang 24 Jam",
    "Parkir Motor",
  ]);

  // Fasilitas Lanjutan (Opsional)
  const [fasilitasLanjutan, setFasilitasLanjutan] = useState<string[]>([
    "Lemari Baju",
    "Meja Belajar",
    "Kloset Duduk",
  ]);

  // Fasilitas Bersama (Opsional)
  const [fasilitasBersama, setFasilitasBersama] = useState<string[]>([
    "Dapur Bersama",
    "Dispenser Bersama",
    "Tempat Jemuran",
  ]);

  // Peraturan Kos (Opsional)
  const [peraturanKos, setPeraturanKos] = useState<string[]>([
    "Akses 24 Jam",
    "Wajib KTP saat Check-in",
    "Tamu Lawan Jenis Dilarang Masuk Kamar",
  ]);

  const [deskripsiKos, setDeskripsiKos] = useState(
    "Kos nyaman, aman, dan tenang di lingkungan strategis dekat kampus dan pusat perbelanjaan. Bangunan bersih terawat dengan sirkulasi udara baik."
  );

  // Accordion state for Step 3
  const [accordionOpen, setAccordionOpen] = useState<{
    dasar: boolean;
    lanjutan: boolean;
    bersama: boolean;
    peraturan: boolean;
  }>({
    dasar: true,
    lanjutan: false,
    bersama: false,
    peraturan: false,
  });

  const toggleAccordion = (key: keyof typeof accordionOpen) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // -------------------------------------------------------------
  // STEP 4: DATA REKENING
  // -------------------------------------------------------------
  const [namaPemilik, setNamaPemilik] = useState("");
  const [namaBank, setNamaBank] = useState("BCA");
  const [nomorRekening, setNomorRekening] = useState("");
  const [namaPemilikRekening, setNamaPemilikRekening] = useState("");

  // Sync initial user name if available
  useEffect(() => {
    if (user?.name) {
      if (!namaPemilik) setNamaPemilik(user.name);
      if (!namaPemilikRekening) setNamaPemilikRekening(user.name);
    }
  }, [user]);

  // -------------------------------------------------------------
  // DRAFT STATE & AUTO-SAVE / RESTORE LOGIC
  // -------------------------------------------------------------
  const [hasDraftLoaded, setHasDraftLoaded] = useState(false);
  const [showDraftNotice, setShowDraftNotice] = useState(false);

  const draftRef = useRef<PropertyFormDraft | null>(null);
  draftRef.current = {
    step,
    namaKos,
    alamatSearch,
    lat,
    lon,
    detailLokasi,
    kelurahan,
    kecamatan,
    kabupatenKota,
    provinsi,
    kodePos,
    patokanAlamat,
    tipeKamar,
    gender,
    ukuranKamar,
    totalKamar,
    kamarKosong,
    hargaPerbulan,
    enableHargaSpesial,
    hargaSpesial,
    durasiSpesial,
    enableUangJaminan,
    persenDp,
    nominalJaminan,
    enableBiayaTambahan,
    biayaTambahanList,
    photos,
    fasilitasDasar,
    fasilitasLanjutan,
    fasilitasBersama,
    peraturanKos,
    deskripsiKos,
    namaPemilik,
    namaBank,
    nomorRekening,
    namaPemilikRekening,
    savedAt: Date.now(),
  };

  // 1. Muat draf yang tersimpan saat pertama kali halaman dibuka
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const draft: PropertyFormDraft = JSON.parse(raw);
        const hasMeaningfulData = Boolean(
          (draft.namaKos && draft.namaKos.trim().length > 0) ||
          (draft.detailLokasi && draft.detailLokasi.trim().length > 0) ||
          (draft.step && draft.step > 1) ||
          (draft.nomorRekening && draft.nomorRekening.trim().length > 0)
        );

        if (hasMeaningfulData) {
          if (draft.step) setStep(draft.step);
          if (draft.namaKos !== undefined) setNamaKos(draft.namaKos);
          if (draft.alamatSearch !== undefined) setAlamatSearch(draft.alamatSearch);
          if (draft.lat !== undefined) setLat(draft.lat);
          if (draft.lon !== undefined) setLon(draft.lon);
          if (draft.detailLokasi !== undefined) setDetailLokasi(draft.detailLokasi);
          if (draft.kelurahan !== undefined) setKelurahan(draft.kelurahan);
          if (draft.kecamatan !== undefined) setKecamatan(draft.kecamatan);
          if (draft.kabupatenKota !== undefined) setKabupatenKota(draft.kabupatenKota);
          if (draft.provinsi !== undefined) setProvinsi(draft.provinsi);
          if (draft.kodePos !== undefined) setKodePos(draft.kodePos);
          if (draft.patokanAlamat !== undefined) setPatokanAlamat(draft.patokanAlamat);

          if (draft.tipeKamar !== undefined) setTipeKamar(draft.tipeKamar);
          if (draft.gender !== undefined) setGender(draft.gender);
          if (draft.ukuranKamar !== undefined) setUkuranKamar(draft.ukuranKamar);
          if (draft.totalKamar !== undefined) setTotalKamar(draft.totalKamar);
          if (draft.kamarKosong !== undefined) setKamarKosong(draft.kamarKosong);
          if (draft.hargaPerbulan !== undefined) setHargaPerbulan(draft.hargaPerbulan);

          if (draft.enableHargaSpesial !== undefined) setEnableHargaSpesial(draft.enableHargaSpesial);
          if (draft.hargaSpesial !== undefined) setHargaSpesial(draft.hargaSpesial);
          if (draft.durasiSpesial !== undefined) setDurasiSpesial(draft.durasiSpesial);

          if (draft.enableUangJaminan !== undefined) setEnableUangJaminan(draft.enableUangJaminan);
          if (draft.persenDp !== undefined) setPersenDp(draft.persenDp);
          if (draft.nominalJaminan !== undefined) setNominalJaminan(draft.nominalJaminan);

          if (draft.enableBiayaTambahan !== undefined) setEnableBiayaTambahan(draft.enableBiayaTambahan);
          if (draft.biayaTambahanList !== undefined) setBiayaTambahanList(draft.biayaTambahanList);

          if (draft.photos !== undefined) setPhotos(draft.photos);
          if (draft.fasilitasDasar !== undefined) setFasilitasDasar(draft.fasilitasDasar);
          if (draft.fasilitasLanjutan !== undefined) setFasilitasLanjutan(draft.fasilitasLanjutan);
          if (draft.fasilitasBersama !== undefined) setFasilitasBersama(draft.fasilitasBersama);
          if (draft.peraturanKos !== undefined) setPeraturanKos(draft.peraturanKos);
          if (draft.deskripsiKos !== undefined) setDeskripsiKos(draft.deskripsiKos);

          if (draft.namaPemilik !== undefined) setNamaPemilik(draft.namaPemilik);
          if (draft.namaBank !== undefined) setNamaBank(draft.namaBank);
          if (draft.nomorRekening !== undefined) setNomorRekening(draft.nomorRekening);
          if (draft.namaPemilikRekening !== undefined) setNamaPemilikRekening(draft.namaPemilikRekening);

          setShowDraftNotice(true);
        }
      }
    } catch (e) {
      console.error("Gagal memuat draf properti:", e);
    } finally {
      setHasDraftLoaded(true);
    }
  }, []);

  // 2. Fungsi simpan draf ke localStorage
  const saveDraftToStorage = () => {
    if (!draftRef.current) return;
    const d = draftRef.current;
    const hasProgress = Boolean(
      (d.namaKos && d.namaKos.trim().length > 0) ||
      (d.detailLokasi && d.detailLokasi.trim().length > 0) ||
      d.step > 1 ||
      (d.nomorRekening && d.nomorRekening.trim().length > 0)
    );
    if (hasProgress) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(d));
      } catch (err) {
        console.error("Gagal menyimpan draf:", err);
      }
    }
  };

  // 3. Simpan draf otomatis tiap ada perubahan
  useEffect(() => {
    if (!hasDraftLoaded) return;
    const timer = setTimeout(() => {
      saveDraftToStorage();
    }, 400);
    return () => clearTimeout(timer);
  }, [
    hasDraftLoaded,
    step,
    namaKos,
    alamatSearch,
    lat,
    lon,
    detailLokasi,
    kelurahan,
    kecamatan,
    kabupatenKota,
    provinsi,
    kodePos,
    patokanAlamat,
    tipeKamar,
    gender,
    ukuranKamar,
    totalKamar,
    kamarKosong,
    hargaPerbulan,
    enableHargaSpesial,
    hargaSpesial,
    durasiSpesial,
    enableUangJaminan,
    persenDp,
    nominalJaminan,
    enableBiayaTambahan,
    biayaTambahanList,
    photos,
    fasilitasDasar,
    fasilitasLanjutan,
    fasilitasBersama,
    peraturanKos,
    deskripsiKos,
    namaPemilik,
    namaBank,
    nomorRekening,
    namaPemilikRekening,
  ]);

  // 4. Simpan draf saat meninggalkan halaman (unmount / navigasi / pagehide / reload)
  useEffect(() => {
    const handleExit = () => {
      saveDraftToStorage();
    };

    window.addEventListener("pagehide", handleExit);
    window.addEventListener("beforeunload", handleExit);

    return () => {
      handleExit();
      window.removeEventListener("pagehide", handleExit);
      window.removeEventListener("beforeunload", handleExit);
    };
  }, []);

  // 5. Hapus draf jika pengguna memilih mulai dari awal
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setShowDraftNotice(false);
    setStep(1);
    setNamaKos("");
    setAlamatSearch("");
    setDetailLokasi("");
    setKelurahan("");
    setKecamatan("");
    setKabupatenKota("Bandung");
    setProvinsi("Jawa Barat");
    setKodePos("40132");
    setPatokanAlamat("");
    setTipeKamar("Kamar Standar");
    setGender("MIXED");
    setUkuranKamar("3 x 3 meter");
    setTotalKamar(5);
    setKamarKosong(5);
    setHargaPerbulan("1500000");
    setEnableHargaSpesial(false);
    setHargaSpesial("1350000");
    setDurasiSpesial("6 bulan");
    setEnableUangJaminan(false);
    setPersenDp(20);
    setNominalJaminan("300000");
    setEnableBiayaTambahan(false);
    setBiayaTambahanList([{ id: "fee-1", nominal: "50000", nama: "Biaya Kebersihan & Sampah" }]);
    setPhotos({
      kamarTidur: "",
      depanKamar: "",
      kamarMandi: "",
      bangunanKos: "",
      fasilitasBersama: "",
      bangunanJalan: "",
      lainnya: "",
    });
    setNomorRekening("");
  };

  // Autocomplete debounce - hanya aktif saat pengguna mengetik sendiri di input
  useEffect(() => {
    if (!isUserTypingRef.current) {
      return;
    }

    if (!alamatSearch || alamatSearch.trim().length < 3) {
      setSearchResults([]);
      setIsSearchingGeo(false);
      setShowResults(false);
      return;
    }

    setIsSearchingGeo(true);
    setShowResults(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?text=${encodeURIComponent(alamatSearch.trim())}`
        );
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.features || []);
        }
      } catch (e) {
        console.error("Geocode error", e);
      } finally {
        setIsSearchingGeo(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [alamatSearch]);

  // Handle location selection
  const handleSelectLocation = (item: any) => {
    isUserTypingRef.current = false;
    setShowResults(false);
    setIsSearchingGeo(false);
    setAlamatSearch(item.formatted || item.name);

    if (item.lat && item.lon) {
      setLat(item.lat);
      setLon(item.lon);
    }

    // Populate Section 1 Detail Lokasi
    const streetDetail = [item.street, item.housenumber ? `No. ${item.housenumber}` : ""]
      .filter(Boolean)
      .join(" ");
    setDetailLokasi(streetDetail || item.line1 || item.formatted || "");

    // Populate Section 2 Administrasi (read-only)
    if (item.village) setKelurahan(item.village);
    if (item.district) setKecamatan(item.district);
    if (item.city) setKabupatenKota(item.city);
    if (item.state) setProvinsi(item.state);
    if (item.postcode) setKodePos(item.postcode);
  };

  // Handle click on map to pick location
  const handleMapPickLocation = async (newLat: number, newLon: number) => {
    isUserTypingRef.current = false;
    setLat(newLat);
    setLon(newLon);
    setIsReverseGeocoding(true);

    try {
      const res = await fetch(`/api/geocode?lat=${newLat}&lon=${newLon}`);
      if (res.ok) {
        const json = await res.json();
        const first = json.features?.[0];
        if (first) {
          handleSelectLocation(first);
        }
      }
    } catch (err) {
      console.error("Reverse geocode on map click failed", err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // GPS current location
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung pada peramban ini.");
      return;
    }
    isUserTypingRef.current = false;
    setIsReverseGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLon = pos.coords.longitude;
        setLat(newLat);
        setLon(newLon);

        try {
          const res = await fetch(`/api/geocode?lat=${newLat}&lon=${newLon}`);
          if (res.ok) {
            const json = await res.json();
            const first = json.features?.[0];
            if (first) {
              handleSelectLocation(first);
            }
          }
        } catch (err) {
          console.error("Reverse geocode failed", err);
        } finally {
          setIsReverseGeocoding(false);
        }
      },
      (err) => {
        setIsReverseGeocoding(false);
        alert("Gagal mendapatkan lokasi GPS: " + err.message);
      },
      { timeout: 10000 }
    );
  };

  // Stepper helpers
  const incTotal = () => setTotalKamar((v) => v + 1);
  const decTotal = () =>
    setTotalKamar((v) => {
      const next = Math.max(1, v - 1);
      if (kamarKosong > next) setKamarKosong(next);
      return next;
    });

  const incKosong = () =>
    setKamarKosong((v) => Math.min(totalKamar, v + 1));
  const decKosong = () => setKamarKosong((v) => Math.max(0, v - 1));

  const kamarTerisi = Math.max(0, totalKamar - kamarKosong);

  // Toggle facility chips
  const toggleArrayItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Mock Photo Upload handler (converts to object URL for instant preview)
  const handlePhotoUpload = (slotKey: string, file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotos((prev) => ({ ...prev, [slotKey]: url }));
  };

  // Form validations for each step
  const isStep1Valid =
    namaKos.trim().length >= 2 &&
    detailLokasi.trim().length >= 5 &&
    kabupatenKota.trim().length >= 2;

  const isStep2Valid =
    totalKamar >= 1 &&
    kamarKosong >= 0 &&
    parseInt(hargaPerbulan.replace(/\D/g, "") || "0", 10) >= 100000;

  const isStep3Valid =
    deskripsiKos.trim().length >= 20 && fasilitasDasar.length >= 2;

  const isStep4Valid =
    namaPemilik.trim().length >= 2 &&
    nomorRekening.trim().length >= 5 &&
    namaPemilikRekening.trim().length >= 2;

  // Final submit to API
  const handleSubmitKos = async () => {
    if (!isStep4Valid || isPending) return;

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const parsedMonthly = parseInt(hargaPerbulan.replace(/\D/g, "") || "0", 10);
        const parsedDeposit = enableUangJaminan
          ? parseInt(nominalJaminan.replace(/\D/g, "") || "0", 10)
          : undefined;

        // Map facilities to database facilities keys
        const mappedFacilities: string[] = [];
        if (fasilitasDasar.some((f) => f.includes("WiFi"))) mappedFacilities.push("wifi");
        if (fasilitasDasar.some((f) => f.includes("AC"))) mappedFacilities.push("ac");
        if (fasilitasDasar.some((f) => f.includes("Kamar Mandi Dalam"))) mappedFacilities.push("bathroom-in");
        if (fasilitasDasar.some((f) => f.includes("Parkir"))) mappedFacilities.push("parking");
        if (fasilitasBersama.some((f) => f.includes("Dapur"))) mappedFacilities.push("kitchen");
        if (fasilitasBersama.some((f) => f.includes("Cuci") || f.includes("Jemuran"))) mappedFacilities.push("laundry");
        if (fasilitasDasar.some((f) => f.includes("Kasur"))) mappedFacilities.push("bed");
        if (fasilitasLanjutan.some((f) => f.includes("Lemari"))) mappedFacilities.push("wardrobe");
        if (fasilitasLanjutan.some((f) => f.includes("Meja"))) mappedFacilities.push("desk");
        if (fasilitasBersama.some((f) => f.includes("Dispenser") || f.includes("Kulkas"))) mappedFacilities.push("fridge");
        if (fasilitasLanjutan.some((f) => f.includes("Water Heater"))) mappedFacilities.push("hot-water");
        if (fasilitasDasar.some((f) => f.includes("CCTV") || f.includes("Keamanan"))) mappedFacilities.push("cctv");
        if (peraturanKos.some((f) => f.includes("24 Jam"))) mappedFacilities.push("access-24h");

        // Clean unique list
        const facilities = Array.from(new Set(mappedFacilities));

        const fullNameKos = `Kos ${namaKos.trim().replace(/^kos\s+/i, "")}`;

        const payload = {
          name: fullNameKos,
          tagline: `Hunian nyaman di ${kabupatenKota}`,
          description: `${deskripsiKos.trim()}\n\nPatokan: ${patokanAlamat || "Sesuai alamat"}`,
          city: kabupatenKota,
          district: kecamatan || kelurahan || "Pusat",
          address: `${detailLokasi}, ${kelurahan ? `Kel. ${kelurahan}, ` : ""}${kecamatan ? `Kec. ${kecamatan}, ` : ""}${kabupatenKota}, ${provinsi} ${kodePos}`,
          postalCode: kodePos.trim().slice(0, 5) || "40132",
          latitude: lat,
          longitude: lon,
          gender,
          depositAmount: parsedDeposit,
          maxRooms: totalKamar,
          facilities: facilities.length > 0 ? facilities : ["wifi", "bed"],
          roomTypes: [
            {
              name: tipeKamar.trim() || "Kamar Standar",
              pricePerMonth: parsedMonthly,
              sizeM2: parseInt(ukuranKamar.replace(/\D/g, "") || "12", 10) || 12,
              total: totalKamar,
              available: kamarKosong,
            },
          ],
          images: Object.entries(photos)
            .filter(([_, url]) => Boolean(url))
            .map(([key, url], idx) => ({
              url,
              storagePath: `defaults/${key}.jpg`,
              isCover: idx === 0 || key === "bangunanKos",
              altText: key,
            })),
          autoSubmitVerification: true,
        };

        const res = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message || "Gagal mendaftarkan kos.");
        }

        // Successfully created! Show success popup modal
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        setShowSuccessModal(true);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan kos.");
      }
    });
  };

  return (
    <DashboardShell role="owner">
      <div className="mx-auto max-w-4xl pb-20">
        {/* Header Title */}
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/owner/properties"
              className="inline-flex items-center gap-1 text-xs font-medium text-nk-text-muted hover:text-nk-text"
            >
              <ChevronLeft className="size-3.5" />
              Kembali ke Properti
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-nk-text sm:text-3xl">
            Tambah Properti Kos Baru
          </h1>
          <p className="text-sm text-nk-text-muted">
            Lengkapi data kos Anda melalui 4 langkah mudah untuk mulai menerima calon penyewa.
          </p>
        </div>

        {/* Wizard Step Navigation with @shadcn-space/stepper-03 */}
        <div className="mb-8">
          <Stepper03
            steps={STEPS.map((s) => ({
              title: s.label,
              icon: s.icon,
            }))}
            activeStep={step - 1}
            onStepChange={(idx) => {
              // Owner can return to review or edit previously visited steps
              if (idx + 1 <= step) {
                setStep(idx + 1);
              }
            }}
            canNavigateStep={(idx) => idx + 1 <= step}
            showContent={false}
            showNavigation={false}
          />
        </div>

        {/* Banner Pemulihan Draf */}
        {showDraftNotice && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-nk-accent/20 bg-nk-warm p-4 text-xs text-nk-text shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-nk-accent/10 text-nk-accent shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-nk-accent">Draf Progres Dipulihkan</p>
                <p className="text-nk-text-muted">
                  Progres formulir pendaftaran kos Anda sebelumnya telah otomatis dimuat kembali.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleClearDraft}
                className="rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Mulai dari Awal
              </button>
              <button
                type="button"
                onClick={() => setShowDraftNotice(false)}
                className="rounded-lg bg-nk-accent px-3 py-1.5 font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Lanjutkan Draf
              </button>
            </div>
          </div>
        )}

        {/* Error Alert if any */}
        {errorMsg && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="size-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* ========================================================= */}
        {/* STEP 1: DATA KOS */}
        {/* ========================================================= */}
        {step === 1 && (
          <div className="space-y-8 rounded-xl border border-nk-border bg-nk-surface p-6 sm:p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                1. Data Kos
              </h2>
              <p className="mt-1 text-sm text-nk-text-muted">
                Tentukan nama dan lokasi persis kos agar calon penghuni dapat menemukan kos Anda dengan mudah.
              </p>
            </div>

            {/* Nama Kos */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Nama Kos <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-nk-border bg-nk-bg focus-within:border-nk-accent focus-within:ring-1 focus-within:ring-nk-accent overflow-hidden transition-all">
                <span className="flex select-none items-center bg-nk-warm px-4 py-3 text-sm font-semibold text-nk-text border-r border-nk-border">
                  Kos
                </span>
                <input
                  type="text"
                  required
                  value={namaKos}
                  onChange={(e) => setNamaKos(e.target.value)}
                  placeholder="Contoh: Griya Melati Asri"
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:outline-none"
                />
              </div>
              <p className="text-xs text-nk-text-muted">
                Tulis nama kos tanpa menyertakan kata &quot;Kos&quot; dan lokasi/daerah. Awalan &quot;Kos&quot; otomatis ditambahkan oleh sistem.
              </p>
            </div>

            {/* Peta Interaktif & Pencarian Alamat Kos */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-nk-text">
                  Titik Pin Lokasi Kos <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-nk-text-muted">
                  Koordinat: {lat.toFixed(5)}, {lon.toFixed(5)}
                </span>
              </div>

              {/* Map Container with Floating Search on Top & Target GPS at Bottom-Right */}
              <div className="relative isolate z-0 h-80 sm:h-96 w-full overflow-hidden rounded-xl border border-nk-border bg-nk-warm shadow-sm">
                {/* 1. Leaflet Interactive Clickable Map */}
                <InteractiveMapPicker
                  lat={lat}
                  lon={lon}
                  onChangeLocation={handleMapPickLocation}
                />

                {/* 2. Floating Search Bar riding on top of the map */}
                <div className="absolute top-3.5 inset-x-3.5 sm:top-4 sm:inset-x-4 z-[1000]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-nk-text-muted" />
                    <input
                      type="text"
                      value={alamatSearch}
                      onChange={(e) => {
                        isUserTypingRef.current = true;
                        setAlamatSearch(e.target.value);
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowResults(true);
                      }}
                      placeholder="Cari jalan, perumahan, kampus, atau nama kos..."
                      className="h-11 w-full rounded-lg border border-nk-border bg-nk-surface/95 pl-10 pr-10 text-sm text-nk-text placeholder:text-nk-text-muted shadow-md backdrop-blur-sm transition-all focus:border-nk-accent focus:bg-nk-surface focus:outline-none"
                    />

                    {/* Reset Button (X inside circle, only appears when text exists) */}
                    {alamatSearch.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          isUserTypingRef.current = false;
                          setAlamatSearch("");
                          setSearchResults([]);
                          setShowResults(false);
                          setIsSearchingGeo(false);
                        }}
                        title="Hapus pencarian"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 grid size-6 place-items-center rounded-full text-nk-text-muted hover:bg-nk-warm hover:text-nk-text transition-colors cursor-pointer"
                        aria-label="Hapus teks pencarian"
                      >
                        <XCircle className="size-4" />
                      </button>
                    )}

                    {/* Autocomplete Dropdown with Skeleton Screen */}
                    {showResults && (isSearchingGeo || searchResults.length > 0) && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-nk-border bg-nk-surface py-1 shadow-xl z-[1010]">
                        {isSearchingGeo ? (
                          <div className="space-y-1 p-1">
                            {[1, 2, 3].map((idx) => (
                              <div
                                key={idx}
                                className="relative overflow-hidden flex items-start gap-2.5 px-3 py-2.5 rounded-md"
                              >
                                <div className="mt-0.5 size-3.5 shrink-0 rounded-full bg-stone-200 animate-pulse" />
                                <div className="flex-1 space-y-1.5 py-0.5">
                                  <div className="h-3 w-2/5 rounded bg-stone-200 animate-pulse" />
                                  <div className="h-2.5 w-4/5 rounded bg-stone-200/70 animate-pulse" />
                                </div>
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
                              </div>
                            ))}
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectLocation(item)}
                              className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left text-xs transition-colors hover:bg-nk-warm cursor-pointer"
                            >
                              <MapPin className="mt-0.5 size-3.5 shrink-0 text-nk-accent" />
                              <div>
                                <p className="font-medium text-nk-text">{item.name}</p>
                                <p className="text-nk-text-muted line-clamp-1">{item.formatted}</p>
                              </div>
                            </button>
                          ))
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Floating Target GPS Button at Bottom-Right */}
                <button
                  type="button"
                  onClick={handleUseGPS}
                  title="Gunakan Lokasi Saya Saat Ini (GPS)"
                  className="absolute bottom-4 right-4 z-[1000] grid size-10 place-items-center rounded-lg border border-nk-border bg-nk-surface text-nk-text shadow-md hover:bg-nk-warm hover:text-nk-accent active:scale-95 transition-all cursor-pointer"
                  aria-label="Gunakan lokasi saya saat ini"
                >
                  <LocateFixed className="size-5 text-nk-accent" />
                </button>
              </div>
            </div>

            {/* Detail Lokasi Jalan & Wilayah Administrasi (Satu Wadah Terpadu) */}
            {/* 1. Detail Lokasi Jalan / RT / RW */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Detail Lokasi Jalan / RT / RW <span className="text-rose-500">*</span>
              </label>

              {isReverseGeocoding ? (
                <div className="relative h-[72px] w-full overflow-hidden rounded-lg border border-nk-border bg-nk-surface p-3.5 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-stone-200 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-stone-200/70 animate-pulse" />
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
                </div>
              ) : (
                <textarea
                  rows={2}
                  required
                  value={detailLokasi}
                  onChange={(e) => setDetailLokasi(e.target.value)}
                  placeholder="Contoh: Jl. Dago Asri No. 12B, RT 03 / RW 07"
                  className="rounded-lg border border-nk-border bg-nk-bg p-3 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none"
                />
              )}
              <p className="text-xs text-nk-text-muted">
                Periksa dan lengkapi alamat dengan nama jalan & nomor rumah (jika ada) serta RT/RW.
              </p>
            </div>

            {/* 2. Wilayah Administrasi (Otomatis dari Peta) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Wilayah Administrasi (Otomatis dari Peta)
              </label>

              {isReverseGeocoding ? (
                <div className="relative h-11 w-full overflow-hidden rounded-lg border border-nk-border bg-nk-surface px-3.5 flex items-center gap-3">
                  <div className="size-4 shrink-0 rounded-full bg-stone-200 animate-pulse" />
                  <div className="h-3.5 w-4/5 rounded bg-stone-200 animate-pulse" />
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="relative flex items-center">
                  <MapPin className="pointer-events-none absolute left-3.5 size-4 text-nk-accent" />
                  <input
                    type="text"
                    readOnly
                    value={
                      displayWilayah ||
                      "Pilih titik lokasi pada peta di atas untuk memuat wilayah administrasi"
                    }
                    className="h-11 w-full rounded-lg border border-nk-border bg-nk-bg pl-10 pr-4 text-sm text-nk-text cursor-default select-all focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Patokan Alamat (Opsional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Patokan Alamat (Opsional)
              </label>
              <input
                type="text"
                value={patokanAlamat}
                onChange={(e) => setPatokanAlamat(e.target.value)}
                placeholder="Contoh: Masuk gang samping Indomaret, rumah pagar hitam"
                className="h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
              />
              <p className="text-xs text-nk-text-muted italic">
                (jika rumah tidak punya nomor/nama jalan wajib tulis &quot;tidak ada no. rumah / nama jalan&quot;)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                disabled={!isStep1Valid}
                onClick={() => setStep(2)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lanjutkan ke Kamar Kos
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: KAMAR KOS */}
        {/* ========================================================= */}
        {step === 2 && (
          <div className="space-y-8 rounded-xl border border-nk-border bg-nk-surface p-6 sm:p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                2. Kamar Kos & Tarif Sewa
              </h2>
              <p className="mt-1 text-sm text-nk-text-muted">
                Atur jenis penyewa, kapasitas jumlah kamar, serta skema harga sewa bulanan.
              </p>
            </div>

            {/* Nama Tipe Kamar */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Nama Tipe Kamar (Opsional)
              </label>
              <input
                type="text"
                value={tipeKamar}
                onChange={(e) => setTipeKamar(e.target.value)}
                placeholder="Contoh: Kamar Standar, Kamar Deluxe AC"
                className="h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
              />
            </div>

            {/* Penyewa Diperbolehkan */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Penyewa Diperbolehkan <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "MALE", label: "Laki-laki (Putra)" },
                  { value: "FEMALE", label: "Perempuan (Putri)" },
                  { value: "MIXED", label: "Campur" },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value as any)}
                    className={`h-11 rounded-lg border text-sm font-medium transition-all ${
                      gender === g.value
                        ? "border-nk-accent bg-nk-accent text-nk-text-inverse shadow-sm"
                        : "border-nk-border bg-nk-surface text-nk-text hover:bg-nk-warm"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ukuran Kamar */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Ukuran Kamar <span className="text-rose-500">*</span>
              </label>
              <select
                value={ukuranKamar}
                onChange={(e) => setUkuranKamar(e.target.value)}
                className="h-11 rounded-lg border border-nk-border bg-nk-surface px-4 text-sm text-nk-text focus:border-nk-accent focus:outline-none"
              >
                <option value="3 x 3 meter">3 x 3 meter</option>
                <option value="3 x 4 meter">3 x 4 meter</option>
                <option value="4 x 4 meter">4 x 4 meter</option>
                <option value="3 x 5 meter">3 x 5 meter</option>
                <option value="4 x 5 meter">4 x 5 meter</option>
                <option value="Ukuran Lainnya">Ukuran Lainnya</option>
              </select>
            </div>

            {/* Total Kamar, Kamar Kosong & Auto Terisi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Kamar Stepper */}
              <div className="flex flex-col gap-2 rounded-lg border border-nk-border bg-nk-surface p-4">
                <span className="text-xs font-medium text-nk-text">Total Kamar</span>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={decTotal}
                    className="flex size-9 items-center justify-center rounded-lg border border-nk-border bg-nk-warm text-nk-text hover:bg-nk-border/60 transition-colors"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="text-lg font-bold text-nk-text">{totalKamar}</span>
                  <button
                    type="button"
                    onClick={incTotal}
                    className="flex size-9 items-center justify-center rounded-lg border border-nk-border bg-nk-warm text-nk-text hover:bg-nk-border/60 transition-colors"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {/* Kamar Kosong Stepper */}
              <div className="flex flex-col gap-2 rounded-lg border border-nk-border bg-nk-surface p-4">
                <span className="text-xs font-medium text-nk-text">Kamar Kosong</span>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={decKosong}
                    className="flex size-9 items-center justify-center rounded-lg border border-nk-border bg-nk-warm text-nk-text hover:bg-nk-border/60 transition-colors"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="text-lg font-bold text-nk-text">{kamarKosong}</span>
                  <button
                    type="button"
                    onClick={incKosong}
                    className="flex size-9 items-center justify-center rounded-lg border border-nk-border bg-nk-warm text-nk-text hover:bg-nk-border/60 transition-colors"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {/* Sudah Terisi Auto-calculated */}
              <div className="flex flex-col justify-center gap-1 rounded-lg border border-nk-border bg-nk-warm/60 p-4 text-center">
                <span className="text-xs text-nk-text-muted">Sudah Terisi</span>
                <span className="text-lg font-bold text-nk-accent">
                  {kamarTerisi} Kamar
                </span>
              </div>
            </div>

            {/* Harga Sewa Perbulan */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Harga Sewa Perbulan <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center rounded-lg border border-nk-border bg-nk-bg focus-within:border-nk-accent focus-within:ring-1 focus-within:ring-nk-accent overflow-hidden transition-all">
                <span className="flex select-none items-center bg-nk-warm px-4 py-3 text-sm font-semibold text-nk-text border-r border-nk-border">
                  Rp
                </span>
                <input
                  type="text"
                  required
                  value={
                    hargaPerbulan
                      ? parseInt(hargaPerbulan.replace(/\D/g, "") || "0", 10).toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setHargaPerbulan(raw);
                  }}
                  placeholder="1.500.000"
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:outline-none"
                />
                <span className="select-none px-4 text-xs text-nk-text-muted">/ bulan</span>
              </div>
            </div>

            {/* 3 Checkboxes under "Apakah Anda ingin:" */}
            <div className="space-y-4 rounded-xl border border-nk-border bg-nk-warm/40 p-5">
              <h3 className="text-sm font-semibold text-nk-text">
                Apakah Anda ingin:
              </h3>

              {/* 1. Harga Spesial Durasi Lama */}
              <div className="rounded-lg border border-nk-border bg-nk-surface p-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-nk-text">
                  <input
                    type="checkbox"
                    checked={enableHargaSpesial}
                    onChange={(e) => setEnableHargaSpesial(e.target.checked)}
                    className="size-4 accent-[#3A2618]"
                  />
                  <span>Harga spesial durasi lama</span>
                </label>
                <AnimatePresence initial={false}>
                  {enableHargaSpesial && (
                    <motion.div
                      key="anim-harga-spesial"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-nk-text-muted">Nominal Harga Spesial</span>
                          <div className="flex items-center rounded-md border border-nk-border bg-nk-bg overflow-hidden">
                            <span className="bg-nk-warm px-3 py-2 text-xs font-medium text-nk-text border-r border-nk-border">
                              Rp
                            </span>
                            <input
                              type="text"
                              value={parseInt(hargaSpesial.replace(/\D/g, "") || "0", 10).toLocaleString("id-ID")}
                              onChange={(e) => setHargaSpesial(e.target.value.replace(/\D/g, ""))}
                              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-nk-text focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-nk-text-muted">Minimal Durasi</span>
                          <select
                            value={durasiSpesial}
                            onChange={(e) => setDurasiSpesial(e.target.value)}
                            className="h-9 rounded-md border border-nk-border bg-nk-surface px-3 text-xs text-nk-text focus:outline-none"
                          >
                            <option value="3 bulan">3 bulan</option>
                            <option value="6 bulan">6 bulan</option>
                            <option value="1 tahun">1 tahun</option>
                            <option value="2 tahun">2 tahun</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. Uang Jaminan (Deposit) */}
              <div className="rounded-lg border border-nk-border bg-nk-surface p-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-nk-text">
                  <input
                    type="checkbox"
                    checked={enableUangJaminan}
                    onChange={(e) => setEnableUangJaminan(e.target.checked)}
                    className="size-4 accent-[#3A2618]"
                  />
                  <span>Uang jaminan (Deposit / DP)</span>
                </label>
                <AnimatePresence initial={false}>
                  {enableUangJaminan && (
                    <motion.div
                      key="anim-uang-jaminan"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-nk-text-muted">Persentase DP:</span>
                          {[10, 20, 30, 40, 50].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => {
                                setPersenDp(pct);
                                const monthly = parseInt(hargaPerbulan.replace(/\D/g, "") || "0", 10);
                                const calculated = Math.round((monthly * pct) / 100);
                                setNominalJaminan(String(calculated));
                              }}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                persenDp === pct
                                  ? "bg-nk-accent text-white"
                                  : "bg-nk-warm text-nk-text hover:bg-nk-border/60"
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-nk-text-muted">Nominal Uang Jaminan</span>
                          <div className="flex items-center rounded-md border border-nk-border bg-nk-bg overflow-hidden max-w-xs">
                            <span className="bg-nk-warm px-3 py-2 text-xs font-medium text-nk-text border-r border-nk-border">
                              Rp
                            </span>
                            <input
                              type="text"
                              value={parseInt(nominalJaminan.replace(/\D/g, "") || "0", 10).toLocaleString("id-ID")}
                              onChange={(e) => setNominalJaminan(e.target.value.replace(/\D/g, ""))}
                              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-nk-text focus:outline-none"
                            />
                          </div>
                          <p className="text-[11px] text-nk-text-muted">
                            Uang jaminan deposit ini akan disimpan dan dikembalikan kepada penyewa setelah masa sewa berakhir jika tidak ada kerusakan.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. Biaya Tambahan */}
              <div className="rounded-lg border border-nk-border bg-nk-surface p-4">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-nk-text">
                  <input
                    type="checkbox"
                    checked={enableBiayaTambahan}
                    onChange={(e) => setEnableBiayaTambahan(e.target.checked)}
                    className="size-4 accent-[#3A2618]"
                  />
                  <span>Biaya tambahan</span>
                </label>
                <AnimatePresence initial={false}>
                  {enableBiayaTambahan && (
                    <motion.div
                      key="anim-biaya-tambahan"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pt-3">
                        {biayaTambahanList.map((row, idx) => (
                          <div key={row.id} className="flex items-center gap-2">
                            <div className="flex w-36 items-center rounded-md border border-nk-border bg-nk-bg overflow-hidden">
                              <span className="bg-nk-warm px-2 py-1.5 text-xs font-medium text-nk-text border-r border-nk-border">
                                Rp
                              </span>
                              <input
                                type="text"
                                value={parseInt(row.nominal.replace(/\D/g, "") || "0", 10).toLocaleString("id-ID")}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  setBiayaTambahanList((prev) =>
                                    prev.map((item, i) => (i === idx ? { ...item, nominal: val } : item))
                                  );
                                }}
                                className="w-full bg-transparent px-2 py-1.5 text-xs text-nk-text focus:outline-none"
                              />
                            </div>
                            <input
                              type="text"
                              value={row.nama}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBiayaTambahanList((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, nama: val } : item))
                                );
                              }}
                              placeholder="Nama biaya (cth: Listrik / Parkir Mobil)"
                              className="flex-1 h-9 rounded-md border border-nk-border bg-nk-surface px-3 text-xs text-nk-text focus:outline-none"
                            />
                            {biayaTambahanList.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setBiayaTambahanList((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1 text-rose-500 hover:opacity-80"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setBiayaTambahanList((prev) => [
                              ...prev,
                              { id: `fee-${Date.now()}`, nominal: "50000", nama: "" },
                            ])
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-nk-accent hover:underline pt-1 cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                          Tambah Biaya Lainnya
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-nk-border bg-nk-surface px-5 text-sm font-medium text-nk-text hover:bg-nk-warm transition-colors"
              >
                <ChevronLeft className="size-4" />
                Kembali
              </button>
              <button
                type="button"
                disabled={!isStep2Valid}
                onClick={() => setStep(3)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lanjutkan ke Foto & Fasilitas
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: FOTO & FASILITAS */}
        {/* ========================================================= */}
        {step === 3 && (
          <div className="space-y-8 rounded-xl border border-nk-border bg-nk-surface p-6 sm:p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                3. Foto & Fasilitas Kos
              </h2>
              <p className="mt-1 text-sm text-nk-text-muted">
                Unggah foto properti dan centang fasilitas yang tersedia untuk menarik minat calon penyewa.
              </p>
            </div>

            {/* 7 Foto Upload Slots dengan Ikon Khusus */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-nk-text">
                Foto Properti Kos (Minimal 3 foto) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {PHOTO_SLOTS.map((slot) => {
                  const preview = photos[slot.key];
                  const SlotIcon = slot.icon;
                  return (
                    <div
                      key={slot.key}
                      className="group relative flex flex-col items-center justify-center rounded-xl border border-dashed border-nk-border bg-nk-warm/50 p-3 text-center transition-all hover:border-nk-accent aspect-square overflow-hidden"
                    >
                      {preview ? (
                        <>
                          <Image
                            src={preview}
                            alt={slot.label}
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPhotos((prev) => ({ ...prev, [slot.key]: "" }))
                            }
                            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 px-2 text-[10px] text-white truncate">
                            {slot.label}
                          </div>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center size-full cursor-pointer p-2">
                          <div className="flex size-11 items-center justify-center rounded-full bg-nk-surface text-nk-accent shadow-sm group-hover:scale-110 group-hover:bg-nk-accent group-hover:text-white transition-all">
                            <SlotIcon className="size-5" />
                          </div>
                          <span className="mt-2 text-xs font-medium text-nk-text text-center line-clamp-2">
                            {slot.label}
                          </span>
                          <span className="mt-0.5 text-[10px] text-nk-text-muted">
                            {slot.required ? "(Wajib)" : "(Opsional)"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handlePhotoUpload(slot.key, e.target.files?.[0] || null)
                            }
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Menu Akordion Fasilitas & Peraturan Kos */}
            <div className="space-y-4">
              {/* Akordion 1: Fasilitas Dasar (Wajib) */}
              <div className="rounded-xl border border-nk-border bg-nk-surface overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleAccordion("dasar")}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-nk-warm/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-nk-text">
                        Fasilitas Dasar (Wajib)
                      </h3>
                      <p className="text-xs text-nk-text-muted">
                        Kamar mandi, kasur, AC, WiFi, listrik, keamanan, dan parkir
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {fasilitasDasar.length > 0 && (
                      <span className="rounded-full bg-nk-accent/10 px-2.5 py-0.5 text-xs font-semibold text-nk-accent">
                        {fasilitasDasar.length} dipilih
                      </span>
                    )}
                    <ChevronDown
                      className={`size-4 text-nk-text-muted transition-transform duration-200 ${
                        accordionOpen.dasar ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {accordionOpen.dasar && (
                  <div className="border-t border-nk-border bg-nk-warm/20 p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {FASILITAS_DASAR_ITEMS.map((item) => {
                        const checked = fasilitasDasar.includes(item.label);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() =>
                              toggleArrayItem(fasilitasDasar, setFasilitasDasar, item.label)
                            }
                            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-xs font-medium transition-all ${
                              checked
                                ? "border-nk-accent bg-nk-accent text-white shadow-sm ring-1 ring-nk-accent"
                                : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/40 hover:bg-nk-warm"
                            }`}
                          >
                            <Icon
                              className={`size-4 shrink-0 transition-colors ${
                                checked ? "text-white" : "text-nk-text-muted"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Akordion 2: Fasilitas Lanjutan (Opsional) */}
              <div className="rounded-xl border border-nk-border bg-nk-surface overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleAccordion("lanjutan")}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-nk-warm/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-nk-text">
                        Fasilitas Lanjutan (Opsional)
                      </h3>
                      <p className="text-xs text-nk-text-muted">
                        Perabot kamar, water heater, kloset, TV, dan balkon
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {fasilitasLanjutan.length > 0 && (
                      <span className="rounded-full bg-nk-accent/10 px-2.5 py-0.5 text-xs font-semibold text-nk-accent">
                        {fasilitasLanjutan.length} dipilih
                      </span>
                    )}
                    <ChevronDown
                      className={`size-4 text-nk-text-muted transition-transform duration-200 ${
                        accordionOpen.lanjutan ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {accordionOpen.lanjutan && (
                  <div className="border-t border-nk-border bg-nk-warm/20 p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {FASILITAS_LANJUTAN_ITEMS.map((item) => {
                        const checked = fasilitasLanjutan.includes(item.label);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() =>
                              toggleArrayItem(fasilitasLanjutan, setFasilitasLanjutan, item.label)
                            }
                            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-xs font-medium transition-all ${
                              checked
                                ? "border-nk-accent bg-nk-accent text-white shadow-sm ring-1 ring-nk-accent"
                                : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/40 hover:bg-nk-warm"
                            }`}
                          >
                            <Icon
                              className={`size-4 shrink-0 transition-colors ${
                                checked ? "text-white" : "text-nk-text-muted"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Akordion 3: Fasilitas Bersama (Opsional) */}
              <div className="rounded-xl border border-nk-border bg-nk-surface overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleAccordion("bersama")}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-nk-warm/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <Users className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-nk-text">
                        Fasilitas Bersama (Opsional)
                      </h3>
                      <p className="text-xs text-nk-text-muted">
                        Mesin cuci, jemuran, ruang tamu, gazebo, taman, dan kebersihan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {fasilitasBersama.length > 0 && (
                      <span className="rounded-full bg-nk-accent/10 px-2.5 py-0.5 text-xs font-semibold text-nk-accent">
                        {fasilitasBersama.length} dipilih
                      </span>
                    )}
                    <ChevronDown
                      className={`size-4 text-nk-text-muted transition-transform duration-200 ${
                        accordionOpen.bersama ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {accordionOpen.bersama && (
                  <div className="border-t border-nk-border bg-nk-warm/20 p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {FASILITAS_BERSAMA_ITEMS.map((item) => {
                        const checked = fasilitasBersama.includes(item.label);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() =>
                              toggleArrayItem(fasilitasBersama, setFasilitasBersama, item.label)
                            }
                            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-xs font-medium transition-all ${
                              checked
                                ? "border-nk-accent bg-nk-accent text-white shadow-sm ring-1 ring-nk-accent"
                                : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/40 hover:bg-nk-warm"
                            }`}
                          >
                            <Icon
                              className={`size-4 shrink-0 transition-colors ${
                                checked ? "text-white" : "text-nk-text-muted"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Akordion 4: Peraturan Kos (Opsional) */}
              <div className="rounded-xl border border-nk-border bg-nk-surface overflow-hidden transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleAccordion("peraturan")}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left hover:bg-nk-warm/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-nk-text">
                        Peraturan Kos (Opsional)
                      </h3>
                      <p className="text-xs text-nk-text-muted">
                        Akses 24 jam, jam malam, kriteria penghuni, dan tata tertib
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {peraturanKos.length > 0 && (
                      <span className="rounded-full bg-nk-accent/10 px-2.5 py-0.5 text-xs font-semibold text-nk-accent">
                        {peraturanKos.length} dipilih
                      </span>
                    )}
                    <ChevronDown
                      className={`size-4 text-nk-text-muted transition-transform duration-200 ${
                        accordionOpen.peraturan ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {accordionOpen.peraturan && (
                  <div className="border-t border-nk-border bg-nk-warm/20 p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PERATURAN_KOS_ITEMS.map((item) => {
                        const checked = peraturanKos.includes(item.label);
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() =>
                              toggleArrayItem(peraturanKos, setPeraturanKos, item.label)
                            }
                            className={`flex items-center gap-2.5 rounded-lg border p-3 text-left text-xs font-medium transition-all ${
                              checked
                                ? "border-nk-accent bg-nk-accent text-white shadow-sm ring-1 ring-nk-accent"
                                : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/40 hover:bg-nk-warm"
                            }`}
                          >
                            <Icon
                              className={`size-4 shrink-0 transition-colors ${
                                checked ? "text-white" : "text-nk-text-muted"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deskripsi Kos */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-nk-text">
                Deskripsi Kos <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={deskripsiKos}
                onChange={(e) => setDeskripsiKos(e.target.value)}
                placeholder="Ceritakan keunggulan kos, suasana sekitar, akses kampus terdekat, atau catatan penting lainnya..."
                className="rounded-lg border border-nk-border bg-nk-surface p-3.5 text-sm text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
              />
              <p className="text-xs text-nk-text-muted">
                Minimal 20 karakter ({deskripsiKos.length}/20).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-nk-border bg-nk-surface px-5 text-sm font-medium text-nk-text hover:bg-nk-warm transition-colors"
              >
                <ChevronLeft className="size-4" />
                Kembali
              </button>
              <button
                type="button"
                disabled={!isStep3Valid}
                onClick={() => setStep(4)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lengkapi Data Diri
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: DATA REKENING & FINISH */}
        {/* ========================================================= */}
        {step === 4 && (
          <div className="space-y-8 rounded-xl border border-nk-border bg-nk-surface p-6 sm:p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                4. Lengkapi Data Diri & Rekening Anda
              </h2>
              <p className="mt-1 text-sm text-nk-text-muted">
                Rekening bank ini digunakan untuk penyaluran dana pembayaran sewa dari penyewa kos.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-nk-text">
                  Nama Lengkap Pemilik Kos <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  required
                  value={namaPemilik}
                  onChange={(e) => setNamaPemilik(e.target.value)}
                  placeholder="Nama lengkap sesuai KTP"
                  className="h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-nk-text">
                  Pilihan Bank <span className="text-rose-500">*</span>
                </span>
                <select
                  value={namaBank}
                  onChange={(e) => setNamaBank(e.target.value)}
                  className="h-11 rounded-lg border border-nk-border bg-nk-surface px-4 text-sm text-nk-text focus:border-nk-accent focus:outline-none"
                >
                  <option value="BCA">Bank Central Asia (BCA)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank Rakyat Indonesia (BRI)</option>
                  <option value="BNI">Bank Negara Indonesia (BNI)</option>
                  <option value="BSI">Bank Syariah Indonesia (BSI)</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                  <option value="Permata">Bank Permata</option>
                  <option value="Bank Jago">Bank Jago</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-nk-text">
                  Nomor Rekening <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  required
                  value={nomorRekening}
                  onChange={(e) => setNomorRekening(e.target.value.replace(/\D/g, ""))}
                  placeholder="Contoh: 1234567890"
                  className="h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-nk-text">
                  Nama Pemilik Rekening <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  required
                  value={namaPemilikRekening}
                  onChange={(e) => setNamaPemilikRekening(e.target.value)}
                  placeholder="Nama sesuai buku tabungan"
                  className="h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none"
                />
              </label>
            </div>

            {/* Review Summary Card */}
            <div className="rounded-xl border border-nk-border bg-nk-warm/40 p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-nk-text-muted">
                Ringkasan Properti yang Didaftarkan
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-nk-text-muted block">Nama Properti:</span>
                  <span className="font-semibold text-nk-text">Kos {namaKos}</span>
                </div>
                <div>
                  <span className="text-nk-text-muted block">Tipe Penghuni:</span>
                  <span className="font-semibold text-nk-text">
                    {gender === "MALE" ? "Putra" : gender === "FEMALE" ? "Putri" : "Campur"}
                  </span>
                </div>
                <div>
                  <span className="text-nk-text-muted block">Total Kamar:</span>
                  <span className="font-semibold text-nk-text">{totalKamar} Kamar</span>
                </div>
                <div>
                  <span className="text-nk-text-muted block">Tarif Sewa:</span>
                  <span className="font-semibold text-emerald-700">
                    {formatIDR(parseInt(hargaPerbulan.replace(/\D/g, "") || "0", 10))} / bln
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-nk-border bg-nk-surface px-5 text-sm font-medium text-nk-text hover:bg-nk-warm transition-colors"
              >
                <ChevronLeft className="size-4" />
                Kembali
              </button>
              <button
                type="button"
                disabled={!isStep4Valid || isPending}
                onClick={handleSubmitKos}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-nk-accent px-8 text-sm font-medium text-nk-text-inverse shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Menyimpan Data Kos...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Daftarkan Kos Sekarang
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* POPUP MODAL: KOS TELAH DITAMBAHKAN */}
        {/* ========================================================= */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md p-6 text-center">
            <DialogHeader className="flex flex-col items-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-10 stroke-[2]" />
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-nk-text">
                Kos Telah Ditambahkan!
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-nk-text-muted">
                Iklan kos Anda berhasil dibuat dan kini dalam antrean verifikasi oleh tim Admin NgeKos (estimasi 1x24 jam). Anda dapat memantau status properti melalui dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/owner/properties"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99]"
              >
                Lihat Daftar Properti Saya
              </Link>
              <Link
                href="/owner"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-nk-border bg-nk-surface px-6 text-sm font-medium text-nk-text hover:bg-nk-warm transition-colors"
              >
                Buka Dashboard Pemilik
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}

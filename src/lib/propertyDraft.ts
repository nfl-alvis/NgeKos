export const DRAFT_STORAGE_KEY = "ngekos_owner_property_draft";

export interface PropertyFormDraft {
  step: number;
  namaKos: string;
  alamatSearch: string;
  lat: number;
  lon: number;
  detailLokasi: string;
  kelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodePos: string;
  patokanAlamat: string;
  tipeKamar: string;
  gender: "MALE" | "FEMALE" | "MIXED";
  ukuranKamar: string;
  totalKamar: number;
  kamarKosong: number;
  hargaPerbulan: string;
  enableHargaSpesial: boolean;
  hargaSpesial: string;
  durasiSpesial: string;
  enableUangJaminan: boolean;
  persenDp: number;
  nominalJaminan: string;
  enableBiayaTambahan: boolean;
  biayaTambahanList: { id: string; nominal: string; nama: string }[];
  photos: { [key: string]: string };
  fasilitasDasar: string[];
  fasilitasLanjutan: string[];
  fasilitasBersama: string[];
  peraturanKos: string[];
  deskripsiKos: string;
  namaPemilik: string;
  namaBank: string;
  nomorRekening: string;
  namaPemilikRekening: string;
  savedAt: number;
}

export function hasMeaningfulDraft(draft: PropertyFormDraft | null | undefined): boolean {
  if (!draft) return false;
  return Boolean(
    (draft.namaKos && draft.namaKos.trim().length > 0) ||
    (draft.alamatSearch && draft.alamatSearch.trim().length > 0) ||
    (draft.kabupatenKota && draft.kabupatenKota.trim().length > 0) ||
    (draft.detailLokasi && draft.detailLokasi.trim().length > 0) ||
    (draft.step && draft.step > 1) ||
    (draft.photos && Object.keys(draft.photos).length > 0) ||
    (draft.hargaPerbulan && draft.hargaPerbulan.trim().length > 0)
  );
}

export function getSavedPropertyDraft(): PropertyFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (hasMeaningfulDraft(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse saved property draft:", e);
  }
  return null;
}

export function deleteSavedPropertyDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to delete saved property draft:", e);
  }
}

export function getDraftThumbnail(draft: PropertyFormDraft | null | undefined): string | null {
  if (!draft || !draft.photos || typeof draft.photos !== "object") return null;
  const preferredKeys = [
    "bangunanKos",
    "kamarTidur",
    "depanKamar",
    "kamarMandi",
    "fasilitasBersama",
    "bangunanJalan",
    "lainnya",
  ];
  for (const k of preferredKeys) {
    if (draft.photos[k] && typeof draft.photos[k] === "string" && draft.photos[k].length > 0) {
      return draft.photos[k];
    }
  }
  const firstVal = Object.values(draft.photos).find(
    (v) => typeof v === "string" && v.length > 0
  );
  return firstVal || null;
}

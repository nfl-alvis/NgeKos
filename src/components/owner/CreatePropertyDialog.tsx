"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FACILITY_META } from "@/lib/data/facilities";
import type { Facility } from "@/lib/data/types";

interface CreatePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (property: any) => void;
}

const AVAILABLE_FACILITIES: Facility[] = [
  "wifi",
  "ac",
  "bathroom-in",
  "parking",
  "kitchen",
  "laundry",
  "bed",
  "wardrobe",
  "cctv",
  "access-24h",
];

const CITIES = [
  "Bandung",
  "Jakarta",
  "Yogyakarta",
  "Surabaya",
  "Malang",
  "Semarang",
  "Depok",
  "Tangerang",
  "Bogor",
  "Solo",
];

export default function CreatePropertyDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePropertyDialogProps) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [city, setCity] = useState("Bandung");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState<"MIXED" | "MALE" | "FEMALE">("MIXED");
  const [depositAmount, setDepositAmount] = useState("");
  const [description, setDescription] = useState("");
  const [facilities, setFacilities] = useState<string[]>([
    "wifi",
    "bathroom-in",
    "bed",
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFacility = (key: string) => {
    setFacilities((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const formValid =
    name.trim().length >= 3 &&
    city.trim().length >= 2 &&
    district.trim().length >= 2 &&
    address.trim().length >= 5 &&
    description.trim().length >= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim(),
        city: city.trim(),
        district: district.trim(),
        address: address.trim(),
        gender,
        depositAmount: depositAmount ? parseInt(depositAmount, 10) : undefined,
        facilities,
        autoSubmitVerification: true,
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          json?.error?.message ||
          json?.message ||
          "Gagal menambahkan properti. Pastikan data terisi dengan benar.";
        setError(message);
        setLoading(false);
        return;
      }

      // Reset form
      setName("");
      setTagline("");
      setDistrict("");
      setAddress("");
      setDescription("");
      setDepositAmount("");

      onOpenChange(false);
      onSuccess?.(json.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Terjadi gangguan server. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Kost Baru</DialogTitle>
          <DialogDescription>
            Masukkan informasi lengkap properti kost Anda untuk diajukan dan
            diverifikasi.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="my-2">
            <AlertTitle>Gagal Menyimpan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="prop-name">Nama Kost *</Label>
              <Input
                id="prop-name"
                placeholder="Contoh: Kost Griya Cemara"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="prop-tagline">Tagline Singkat</Label>
              <Input
                id="prop-tagline"
                placeholder="Contoh: Tenang, sejuk, 5 menit ke ITB"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prop-city">Kota *</Label>
              <select
                id="prop-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prop-district">Kecamatan / Area *</Label>
              <Input
                id="prop-district"
                placeholder="Contoh: Dago, Coblong"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="prop-address">Alamat Lengkap *</Label>
              <Input
                id="prop-address"
                placeholder="Contoh: Jl. Cemara No. 14, Dago"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                minLength={5}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prop-gender">Tipe Penghuni *</Label>
              <select
                id="prop-gender"
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as "MIXED" | "MALE" | "FEMALE")
                }
                className="w-full rounded-md border border-nk-border bg-nk-surface px-3 py-2 text-sm text-nk-text outline-none focus:border-nk-accent"
              >
                <option value="MIXED">Campur (Pria & Wanita)</option>
                <option value="MALE">Khusus Putra</option>
                <option value="FEMALE">Khusus Putri</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prop-deposit">Uang Muka / DP (Rp)</Label>
              <Input
                id="prop-deposit"
                type="number"
                placeholder="Contoh: 500000 (opsional)"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="prop-desc">
                Deskripsi Kost * (min. 20 karakter)
              </Label>
              <Textarea
                id="prop-desc"
                rows={3}
                placeholder="Jelaskan suasana kost, fasilitas sekitar, aturan penting..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={20}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Fasilitas Kost</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AVAILABLE_FACILITIES.map((key) => {
                  const meta = FACILITY_META[key];
                  const checked = facilities.includes(key);
                  return (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-nk-border p-2 text-xs transition-colors hover:bg-nk-warm has-[:checked]:border-nk-accent has-[:checked]:bg-nk-warm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFacility(key)}
                        className="size-3.5 rounded accent-[#3A2618]"
                      />
                      <span className="truncate">{meta?.labelId || key}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2 border-t border-nk-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!formValid || loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="size-4 animate-spin text-nk-text-inverse"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                "Simpan Properti"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

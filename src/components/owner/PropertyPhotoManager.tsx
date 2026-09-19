"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PropertyImage {
  id: string;
  url: string;
  isCover: boolean;
  altText?: string | null;
  sortOrder: number;
}

interface PropertyPhotoManagerProps {
  slug: string;
  propertyId?: string;
  initialImages?: PropertyImage[];
}

export default function PropertyPhotoManager({
  slug,
  propertyId: initialPropertyId,
  initialImages = [],
}: PropertyPhotoManagerProps) {
  const [propertyId, setPropertyId] = useState<string | null>(initialPropertyId ?? null);
  const [images, setImages] = useState<PropertyImage[]>(initialImages);
  const [loading, setLoading] = useState(!initialPropertyId);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch property details to get ID & latest photos if needed
  useEffect(() => {
    let cancelled = false;

    async function loadProperty() {
      try {
        const res = await fetch(`/api/properties/${slug}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.data && !cancelled) {
          setPropertyId(json.data.id);
          if (Array.isArray(json.data.images)) {
            setImages(json.data.images);
          }
        }
      } catch {
        // silent fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers onChange
    e.target.value = "";

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("Ukuran gambar terlalu besar (maksimal 5 MB).");
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Format file tidak didukung. Harap gunakan JPEG, PNG, atau WebP.");
      return;
    }

    if (!propertyId) {
      setError("ID properti belum tersedia. Silakan muat ulang halaman.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", propertyId);
      formData.append("isCover", images.length === 0 ? "true" : "false");
      formData.append("altText", file.name.slice(0, 50));

      const res = await fetch("/api/storage/property-images", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json?.error?.message ||
          json?.message ||
          "Gagal mengunggah foto. Pastikan format JPEG, PNG, atau WebP (maks. 5MB).";
        setError(msg);
        setUploading(false);
        return;
      }

      if (json?.data) {
        setImages((prev) => [...prev, json.data]);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Terjadi kegagalan saat mengunggah foto."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus foto ini?")) return;

    setDeletingId(imageId);
    setError(null);

    try {
      const res = await fetch(`/api/storage/property-images/${imageId}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => null);
        const msg = json?.error?.message || json?.message || "Gagal menghapus foto.";
        setError(msg);
        setDeletingId(null);
        return;
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus foto."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Peringatan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header action / upload banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-nk-border bg-nk-surface p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-medium text-nk-text">Galeri Foto Properti</h2>
          <p className="mt-0.5 text-xs text-nk-text-muted">
            Format yang didukung: JPEG, PNG, WebP (maksimal 5 MB per foto).
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || loading}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <svg className="size-4 animate-spin text-nk-text-inverse" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Mengunggah...</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>+ Upload Foto Baru</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Grid of uploaded photos */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-nk-border bg-nk-surface"
            >
              <img
                src={img.url}
                alt={img.altText || "Foto kost"}
                className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />

              {/* Cover badge */}
              {img.isCover && (
                <div className="absolute left-2 top-2">
                  <Badge variant="secondary" className="bg-nk-accent text-nk-text-inverse text-[10px] font-semibold">
                    Foto Utama
                  </Badge>
                </div>
              )}

              {/* Action delete overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(img.id)}
                  disabled={deletingId === img.id}
                  className="gap-1.5"
                >
                  {deletingId === img.id ? (
                    <span>Menghapus...</span>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Hapus</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-nk-border px-6 py-16 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-nk-warm text-nk-accent">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-nk-text">Belum ada foto yang diunggah</h3>
          <p className="mt-1 max-w-sm text-xs text-nk-text-muted">
            Kost dengan foto lengkap memiliki kemungkinan disewa 3x lebih tinggi.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading}
            className="mt-4 gap-2"
          >
            Pilih Foto dari Komputer
          </Button>
        </div>
      )}
    </div>
  );
}

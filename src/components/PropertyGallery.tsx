"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Images,
  ChevronLeft,
  ChevronRight,
  X,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KosGalleryItem } from "@/lib/kosImages";

interface PropertyGalleryProps {
  propertyName: string;
  propertySlug: string;
  images: KosGalleryItem[];
  tViewAll?: string;
  tClose?: string;
}

export default function PropertyGallery({
  propertyName,
  images,
  tViewAll = "Lihat semua foto",
  tClose = "Tutup galeri",
}: PropertyGalleryProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mobileIdx, setMobileIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filtered images in modal if category selected
  const filteredImages =
    activeCategory === "all"
      ? images
      : images.filter((img) => img.category === activeCategory);

  const currentModalIndex = Math.min(
    Math.max(0, activeIdx),
    filteredImages.length - 1
  );
  const currentPhoto = filteredImages[currentModalIndex] || images[0];

  // Touch & Drag state for modal lightbox
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  // Touch state for mobile inline carousel
  const mobileTouchStartX = useRef<number | null>(null);
  const mobileTouchEndX = useRef<number | null>(null);

  const openLightbox = (index = 0) => {
    setActiveCategory("all");
    setActiveIdx(index);
    setIsOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  const nextPhoto = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % filteredImages.length);
  }, [filteredImages.length]);

  const prevPhoto = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
  }, [filteredImages.length]);

  const nextMobile = useCallback(() => {
    setMobileIdx((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevMobile = useCallback(() => {
    setMobileIdx((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeLightbox, nextPhoto, prevPhoto]);

  // Touch gestures for modal lightbox ("bisa digeser-geser")
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      nextPhoto();
    } else if (diff < -45) {
      prevPhoto();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Mouse drag gestures for desktop modal
  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45) {
      nextPhoto();
    } else if (diff < -45) {
      prevPhoto();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Mobile inline carousel touch gestures
  const handleMobileTouchStart = (e: React.TouchEvent) => {
    mobileTouchStartX.current = e.targetTouches[0].clientX;
  };

  const handleMobileTouchMove = (e: React.TouchEvent) => {
    mobileTouchEndX.current = e.targetTouches[0].clientX;
  };

  const handleMobileTouchEnd = () => {
    if (!mobileTouchStartX.current || !mobileTouchEndX.current) return;
    const diff = mobileTouchStartX.current - mobileTouchEndX.current;
    if (diff > 45) {
      nextMobile();
    } else if (diff < -45) {
      prevMobile();
    }
    mobileTouchStartX.current = null;
    mobileTouchEndX.current = null;
  };

  // Categories available for filtering
  const categories = [
    { key: "all", label: `Semua (${images.length})` },
    ...Array.from(new Set(images.map((img) => img.category))).map((cat) => {
      const count = images.filter((img) => img.category === cat).length;
      const label =
        cat === "facade"
          ? "Depan"
          : cat === "room"
          ? "Kamar"
          : cat === "bathroom"
          ? "Kamar Mandi"
          : "Fasilitas";
      return { key: cat, label: `${label} (${count})` };
    }),
  ];

  return (
    <>
      {/* ===== 1. DESKTOP GALLERY GRID (lg screens) ===== */}
      <div className="hidden lg:grid grid-cols-[2fr_1fr] gap-[1px] bg-nk-border w-full h-[400px] lg:h-[450px] xl:h-[480px]">
        {/* Main large photo (Left) - full height to the bottom, zero space */}
        <div
          onClick={() => openLightbox(0)}
          className="group relative h-full w-full min-h-0 overflow-hidden bg-nk-section cursor-pointer select-none"
          role="button"
          tabIndex={0}
          aria-label={`Buka foto utama ${propertyName}`}
        >
          <img
            src={images[0]?.url || "/images/kost/kost-dparagon-ijen-nirwana/main.jpg"}
            alt={images[0]?.title || propertyName}
            draggable={false}
            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90 pointer-events-none select-none"
          />
        </div>

        {/* 2 stacked photos (Right) */}
        <div className="grid grid-rows-2 gap-[1px] bg-nk-border h-full min-h-0">
          {/* Top photo (index 1) */}
          <div
            onClick={() => openLightbox(1)}
            className="group relative h-full w-full min-h-0 overflow-hidden bg-nk-section cursor-pointer select-none"
            role="button"
            tabIndex={0}
            aria-label={`Buka foto kedua ${propertyName}`}
          >
            <img
              src={images[1]?.url || images[0]?.url}
              alt={images[1]?.title || `${propertyName} - kamar`}
              draggable={false}
              className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90 pointer-events-none select-none"
            />
          </div>

          {/* Bottom photo (index 2) WITH "Lihat Semua Foto" button */}
          <div
            onClick={() => openLightbox(2)}
            className="group relative h-full w-full min-h-0 overflow-hidden bg-nk-section cursor-pointer select-none"
            role="button"
            tabIndex={0}
            aria-label={`Buka foto ketiga ${propertyName}`}
          >
            <img
              src={images[2]?.url || images[0]?.url}
              alt={images[2]?.title || `${propertyName} - fasilitas`}
              draggable={false}
              className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90 pointer-events-none select-none"
            />

            {/* Tombol Lihat Semua Foto di Kanan Bawah */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(0);
              }}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 pointer-events-auto inline-flex items-center gap-2 border border-nk-border bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-nk-text shadow-sm transition-all hover:border-nk-accent hover:text-nk-accent active:scale-95 cursor-pointer"
            >
              <Images className="size-4 text-nk-accent" />
              <span>{tViewAll} ({images.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== 2. MOBILE INLINE SLIDER / CAROUSEL (< lg screens) ===== */}
      <div
        className="relative lg:hidden overflow-hidden bg-nk-section select-none"
        onTouchStart={handleMobileTouchStart}
        onTouchMove={handleMobileTouchMove}
        onTouchEnd={handleMobileTouchEnd}
      >
        <div
          onClick={() => openLightbox(mobileIdx)}
          className="relative aspect-[16/10] w-full cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label={`Buka galeri ${propertyName}`}
        >
          <img
            src={images[mobileIdx]?.url || images[0]?.url}
            alt={images[mobileIdx]?.title || propertyName}
            draggable={false}
            className="h-full w-full object-cover transition-opacity duration-300 pointer-events-none select-none"
          />

          {/* Slide overlay hint */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Photo caption & index counter at bottom-left */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1 border border-white/20 bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <Grid className="size-3" />
              {mobileIdx + 1} / {images.length}
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-white drop-shadow">
              {images[mobileIdx]?.title}
            </span>
          </div>

          {/* Tombol Lihat Semua Foto di Kanan Bawah */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(mobileIdx);
            }}
            className="absolute bottom-3 right-3 z-20 pointer-events-auto inline-flex items-center gap-1.5 border border-white/20 bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-all hover:bg-black/80 active:scale-95 cursor-pointer"
          >
            <Images className="size-3.5 text-nk-warm" />
            <span>{tViewAll} ({images.length})</span>
          </button>
        </div>

        {/* Mobile Prev / Next Buttons */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevMobile();
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 pointer-events-auto grid size-8 sm:size-9 place-items-center border border-white/20 bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/80 active:scale-90 cursor-pointer"
              aria-label="Foto sebelumnya"
            >
              <ChevronLeft className="size-4 sm:size-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextMobile();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 pointer-events-auto grid size-8 sm:size-9 place-items-center border border-white/20 bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/80 active:scale-90 cursor-pointer"
              aria-label="Foto berikutnya"
            >
              <ChevronRight className="size-4 sm:size-5" />
            </button>
          </>
        )}
      </div>

      {/* ===== 3. FULL-SCREEN LIGHTBOX MODAL ("Bisa di geser-geser") ===== */}
      {mounted && isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-nk-dark/95 backdrop-blur-md text-white select-none animate-in fade-in-0 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeri foto ${propertyName}`}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="flex flex-col min-w-0 pr-4">
              <h2 className="text-sm sm:text-base font-medium text-white truncate max-w-[240px] sm:max-w-md">
                {propertyName}
              </h2>
              <span className="text-xs text-white/60 truncate">
                {currentPhoto?.title}
              </span>
            </div>

            {/* Category Filter Pills (Desktop & Tablet) */}
            <div className="hidden md:flex items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setActiveIdx(0);
                  }}
                  className={cn(
                    "border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                    activeCategory === cat.key
                      ? "border-nk-accent bg-nk-accent text-white"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Counter + Close Button */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">
                {currentModalIndex + 1} / {filteredImages.length}
              </span>
              <button
                type="button"
                onClick={closeLightbox}
                className="grid size-9 place-items-center border border-white/10 bg-white/10 text-white/80 transition-colors hover:bg-white/25 hover:text-white active:scale-95 cursor-pointer z-30 pointer-events-auto"
                aria-label={tClose}
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Main Photo Slide Viewport (Touch & Drag enabled) */}
          <div
            className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Prev Button */}
            {filteredImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className="absolute left-3 sm:left-6 z-30 pointer-events-auto grid size-10 sm:size-12 place-items-center border border-white/20 bg-black/60 text-white/90 backdrop-blur-sm transition-all hover:bg-black/90 active:scale-95 cursor-pointer"
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* Active Displayed Image */}
            <div className="relative max-h-[70vh] sm:max-h-[76vh] w-full flex items-center justify-center pointer-events-none select-none">
              <img
                src={currentPhoto?.url}
                alt={currentPhoto?.title || propertyName}
                draggable={false}
                className="max-h-[70vh] sm:max-h-[76vh] w-auto max-w-full object-contain shadow-2xl transition-all duration-300 pointer-events-none select-none"
              />
            </div>

            {/* Next Button */}
            {filteredImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className="absolute right-3 sm:right-6 z-30 pointer-events-auto grid size-10 sm:size-12 place-items-center border border-white/20 bg-black/60 text-white/90 backdrop-blur-sm transition-all hover:bg-black/90 active:scale-95 cursor-pointer"
                aria-label="Foto berikutnya"
              >
                <ChevronRight className="size-6" />
              </button>
            )}
          </div>

          {/* Caption Tag */}
          <div className="text-center py-1">
            <span className="inline-block text-xs sm:text-sm font-medium text-white/70">
              {currentPhoto?.title}
            </span>
          </div>

          {/* Bottom Thumbnail Strip */}
          <div className="border-t border-white/10 bg-black/40 px-4 py-2.5">
            <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 overflow-x-auto py-1">
              {filteredImages.map((img, idx) => (
                <button
                  key={`${img.url}-${idx}`}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    "relative size-14 sm:size-16 shrink-0 overflow-hidden border transition-all cursor-pointer",
                    idx === currentModalIndex
                      ? "border-2 border-nk-accent opacity-100 ring-1 ring-nk-accent"
                      : "border-white/20 opacity-50 hover:opacity-85 hover:border-white/50"
                  )}
                  aria-label={`Lihat foto ${idx + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    draggable={false}
                    className="h-full w-full object-cover pointer-events-none select-none"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

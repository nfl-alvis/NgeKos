"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Images,
  ChevronLeft,
  ChevronRight,
  X,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  LayoutGrid,
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

  // LightGallery features: Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // LightGallery features: Fullscreen & Thumbnails drawer toggle
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // LightGallery features: Real-time slide drag displacement
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentModalIndex = Math.min(
    Math.max(0, activeIdx),
    Math.max(0, images.length - 1)
  );
  const currentPhoto = images[currentModalIndex] || images[0];

  // Drag coordinates ref
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const initialPan = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mobile inline carousel touch coordinates
  const mobileTouchStartX = useRef<number | null>(null);
  const mobileTouchEndX = useRef<number | null>(null);

  const resetZoomAndPan = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setDragOffset(0);
  }, []);

  const openLightbox = (index = 0) => {
    setActiveIdx(index);
    resetZoomAndPan();
    setIsOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
    resetZoomAndPan();
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, [resetZoomAndPan]);

  const nextPhoto = useCallback(() => {
    resetZoomAndPan();
    setActiveIdx((prev) => (prev + 1) % images.length);
  }, [images.length, resetZoomAndPan]);

  const prevPhoto = useCallback(() => {
    resetZoomAndPan();
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length, resetZoomAndPan]);

  const nextMobile = useCallback(() => {
    setMobileIdx((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevMobile = useCallback(() => {
    setMobileIdx((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Fullscreen toggle (LightGallery Fullscreen plugin)
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  // Zoom controls (LightGallery Zoom plugin)
  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(3, Math.round((z + 0.5) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoomLevel((z) => {
      const nextZ = Math.max(1, Math.round((z - 0.5) * 10) / 10);
      if (nextZ === 1) setPanOffset({ x: 0, y: 0 });
      return nextZ;
    });
  };

  const handleDoubleClick = () => {
    if (zoomLevel === 1) {
      setZoomLevel(2);
    } else {
      resetZoomAndPan();
    }
  };

  // Keyboard navigation (LightGallery standards)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomLevel > 1) {
          resetZoomAndPan();
        } else {
          closeLightbox();
        }
      } else if (e.key === "ArrowRight") {
        nextPhoto();
      } else if (e.key === "ArrowLeft") {
        prevPhoto();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "t") {
        setShowThumbnails((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, zoomLevel, closeLightbox, nextPhoto, prevPhoto, resetZoomAndPan, toggleFullscreen]);

  // Touch gesture handlers for modal (real-time slide drag or pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      initialPan.current = { ...panOffset };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || startX.current === null || startY.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    if (zoomLevel > 1) {
      // Pan when zoomed in
      setPanOffset({
        x: initialPan.current.x + diffX,
        y: initialPan.current.y + diffY,
      });
    } else {
      // Real-time slide displacement
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (zoomLevel === 1) {
      if (dragOffset < -50) {
        nextPhoto();
      } else if (dragOffset > 50) {
        prevPhoto();
      }
      setDragOffset(0);
    }

    startX.current = null;
    startY.current = null;
  };

  // Mouse gesture handlers for modal
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Primary left button only
    startX.current = e.clientX;
    startY.current = e.clientY;
    initialPan.current = { ...panOffset };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || startX.current === null || startY.current === null) return;
    const diffX = e.clientX - startX.current;
    const diffY = e.clientY - startY.current;

    if (zoomLevel > 1) {
      setPanOffset({
        x: initialPan.current.x + diffX,
        y: initialPan.current.y + diffY,
      });
    } else {
      setDragOffset(diffX);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (zoomLevel === 1) {
      if (dragOffset < -50) {
        nextPhoto();
      } else if (dragOffset > 50) {
        prevPhoto();
      }
      setDragOffset(0);
    }

    startX.current = null;
    startY.current = null;
  };

  // Mobile inline carousel touch handlers
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

      {/* ===== 3. LIGHTGALLERY FULL-SCREEN LIGHTBOX MODAL ===== */}
      {mounted && isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-[#0b0b0b]/96 backdrop-blur-md text-white select-none animate-in fade-in-0 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={`LightGallery ${propertyName}`}
        >
          {/* ----- Top Toolbar (LightGallery lg-toolbar) ----- */}
          <div className="relative h-14 shrink-0 flex items-center justify-between border-b border-white/10 bg-black/50 px-4 sm:px-6 z-40 backdrop-blur-sm">
            {/* Left: Property Name (hidden on small mobile, visible on sm+) */}
            <div className="flex items-center min-w-0 max-w-[28%] sm:max-w-[36%]">
              <span className="hidden sm:inline text-xs sm:text-sm font-medium text-white/90 truncate">
                {propertyName}
              </span>
            </div>

            {/* Center: Image Counter Only (e.g. 1 / 4) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none select-none">
              <span className="font-mono text-sm sm:text-base font-semibold tracking-widest text-white">
                {currentModalIndex + 1} / {images.length}
              </span>
            </div>

            {/* Right: LightGallery Tool Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Zoom Out Button */}
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                title="Perkecil ( - )"
                className="grid size-8 sm:size-9 place-items-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Zoom out"
              >
                <ZoomOut className="size-4 sm:size-4.5" />
              </button>

              {/* Zoom Percentage / Reset Button */}
              <button
                type="button"
                onClick={resetZoomAndPan}
                title="Reset Zoom"
                className="font-mono text-[11px] text-white/80 hover:text-white px-1.5 py-0.5 hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              {/* Zoom In Button */}
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                title="Perbesar ( + )"
                className="grid size-8 sm:size-9 place-items-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Zoom in"
              >
                <ZoomIn className="size-4 sm:size-4.5" />
              </button>

              <span className="text-white/20 mx-1">|</span>

              {/* Toggle Thumbnails Drawer Button */}
              <button
                type="button"
                onClick={() => setShowThumbnails((prev) => !prev)}
                title="Tampilkan / Sembunyikan Thumbnail ( T )"
                className={cn(
                  "grid size-8 sm:size-9 place-items-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer",
                  showThumbnails && "bg-white/15 text-white"
                )}
                aria-label="Toggle thumbnails"
              >
                <LayoutGrid className="size-4 sm:size-4.5" />
              </button>

              {/* Toggle Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Layar Penuh ( F )"
                className="grid size-8 sm:size-9 place-items-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? (
                  <Minimize className="size-4 sm:size-4.5" />
                ) : (
                  <Maximize className="size-4 sm:size-4.5" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeLightbox}
                title={`Tutup ( Esc ) — ${tClose}`}
                className="grid size-8 sm:size-9 place-items-center text-white/80 hover:text-white hover:bg-red-500/80 active:scale-95 transition-colors cursor-pointer ml-1"
                aria-label={tClose}
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* ----- Main Viewport Slider Track (LightGallery lg-inner) ----- */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Left Prev Navigation Arrow (LightGallery lg-prev) */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className="absolute left-3 sm:left-6 z-30 pointer-events-auto grid size-11 sm:size-12 place-items-center border border-white/15 bg-black/50 text-white/90 backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Foto sebelumnya"
                title="Sebelumnya ( ← )"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}

            {/* Active Displayed Image with Real-time Drag Displacement & Zoom */}
            <div
              className="relative max-h-[70vh] sm:max-h-[74vh] w-full flex items-center justify-center select-none"
              style={{
                transform: `translate3d(${dragOffset + panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomLevel})`,
                transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                cursor: zoomLevel > 1 ? "move" : "grab",
              }}
              onDoubleClick={handleDoubleClick}
              title={zoomLevel === 1 ? "Klik ganda untuk perbesar 2x" : "Klik ganda untuk reset"}
            >
              <img
                src={currentPhoto?.url}
                alt={currentPhoto?.title || propertyName}
                draggable={false}
                className="max-h-[70vh] sm:max-h-[74vh] w-auto max-w-full object-contain shadow-2xl pointer-events-none select-none transition-opacity duration-200"
              />
            </div>

            {/* Right Next Navigation Arrow (LightGallery lg-next) */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className="absolute right-3 sm:right-6 z-30 pointer-events-auto grid size-11 sm:size-12 place-items-center border border-white/15 bg-black/50 text-white/90 backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Foto berikutnya"
                title="Berikutnya ( → )"
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {/* Bottom Caption Pill */}
            <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center pointer-events-none px-4">
              <span className="inline-block border border-white/15 bg-black/60 px-3.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                {currentPhoto?.title}
              </span>
            </div>
          </div>

          {/* ----- Bottom Thumbnail Drawer (LightGallery lg-thumb) ----- */}
          {showThumbnails && (
            <div className="shrink-0 border-t border-white/10 bg-black/75 px-4 py-2.5 z-40 backdrop-blur-md transition-all duration-300">
              <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 overflow-x-auto py-1">
                {images.map((img, idx) => {
                  const isActive = idx === currentModalIndex;
                  return (
                    <button
                      key={`${img.url}-${idx}`}
                      type="button"
                      onClick={() => {
                        setActiveIdx(idx);
                        resetZoomAndPan();
                      }}
                      className={cn(
                        "group relative size-14 sm:size-16 shrink-0 overflow-hidden border transition-all cursor-pointer",
                        isActive
                          ? "border-2 border-white opacity-100 ring-2 ring-white/30 scale-105"
                          : "border-white/15 opacity-40 hover:opacity-85 hover:border-white/40"
                      )}
                      aria-label={`Lihat foto ${idx + 1}`}
                      title={img.title}
                    >
                      {/* LightGallery active caret indicator */}
                      {isActive && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white z-10" />
                      )}
                      <img
                        src={img.url}
                        alt={img.title}
                        draggable={false}
                        className="h-full w-full object-cover pointer-events-none select-none transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

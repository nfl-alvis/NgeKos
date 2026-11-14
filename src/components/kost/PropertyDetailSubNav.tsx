"use client";

import { useEffect, useState, useRef } from "react";
import { formatIDR, cn } from "@/lib/utils";

export interface PropertyDetailSubNavProps {
  propertyName: string;
  minPrice: number;
  isAvailable: boolean;
  isEn?: boolean;
}

export const DETAIL_NAV_ITEMS = [
  { id: "foto-properti", labelId: "Foto Properti", labelEn: "Photos" },
  { id: "fasilitas-kamar", labelId: "Fasilitas Kamar", labelEn: "Room Facilities" },
  { id: "fasilitas-umum", labelId: "Fasilitas Umum", labelEn: "Shared Facilities" },
  { id: "lokasi", labelId: "Lokasi", labelEn: "Location" },
  { id: "review", labelId: "Review", labelEn: "Reviews" },
  { id: "pemilik", labelId: "Pemilik Kos", labelEn: "Owner" },
];

export interface SectionPosition {
  id: string;
  top: number;
}

export function determineActiveSection({
  scrollPos,
  viewportHeight,
  documentHeight,
  sectionPositions,
  headerOffset = 135,
}: {
  scrollPos: number;
  viewportHeight: number;
  documentHeight: number;
  sectionPositions: SectionPosition[];
  headerOffset?: number;
}): string {
  if (sectionPositions.length === 0) return "";

  // If scrolled near the bottom of the page, activate the last valid section
  if (documentHeight > 0 && viewportHeight + scrollPos >= documentHeight - 50) {
    return sectionPositions[sectionPositions.length - 1].id;
  }

  let currentActive = sectionPositions[0].id;
  for (const { id, top } of sectionPositions) {
    if (scrollPos >= top - headerOffset) {
      currentActive = id;
    }
  }

  return currentActive;
}

export default function PropertyDetailSubNav({
  propertyName,
  minPrice,
  isAvailable,
  isEn = false,
}: PropertyDetailSubNavProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeId, setActiveId] = useState<string>("foto-properti");

  // Track if programmatic smooth scrolling is in progress to prevent scrollspy jitter
  const isNavigatingRef = useRef<string | null>(null);
  const scrollDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      // Show sticky navbar when user scrolls past the top gallery (e.g. > 380px)
      setIsVisible(scrollPos > 380);

      // If programmatic scrolling is active, do NOT override activeId to avoid flicker
      if (isNavigatingRef.current) {
        if (scrollDebounceTimerRef.current) {
          clearTimeout(scrollDebounceTimerRef.current);
        }
        scrollDebounceTimerRef.current = setTimeout(() => {
          isNavigatingRef.current = null;
        }, 150);
        return;
      }

      const sectionPositions: SectionPosition[] = [];
      for (const item of DETAIL_NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          sectionPositions.push({ id: item.id, top });
        }
      }

      const nextActive = determineActiveSection({
        scrollPos,
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        sectionPositions,
        headerOffset: 135,
      });

      if (nextActive) {
        setActiveId(nextActive);
      }
    };

    // User gesture cancels programmatic lock immediately so user feels in control
    const handleUserInterrupt = () => {
      if (isNavigatingRef.current) {
        isNavigatingRef.current = null;
        if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
        handleScroll();
      }
    };

    // scrollend event supported in modern browsers
    const handleScrollEnd = () => {
      if (isNavigatingRef.current) {
        isNavigatingRef.current = null;
        if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scrollend", handleScrollEnd, { passive: true });
    window.addEventListener("wheel", handleUserInterrupt, { passive: true });
    window.addEventListener("touchmove", handleUserInterrupt, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scrollend", handleScrollEnd);
      window.removeEventListener("wheel", handleUserInterrupt);
      window.removeEventListener("touchmove", handleUserInterrupt);
      if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Lock activeId immediately to clicked tab so underline stays locked
    setActiveId(id);
    isNavigatingRef.current = id;

    if (scrollDebounceTimerRef.current) clearTimeout(scrollDebounceTimerRef.current);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    const headerOffset = 125;
    const elPosition = el.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = Math.max(0, elPosition - headerOffset);

    // If already at or very close to destination, unlock immediately
    if (Math.abs(window.scrollY - offsetPosition) < 2) {
      isNavigatingRef.current = null;
      return;
    }

    // Fallback release after 800ms
    fallbackTimerRef.current = setTimeout(() => {
      isNavigatingRef.current = null;
    }, 800);

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={cn(
        "fixed top-16 left-0 right-0 z-40 border-b border-nk-border bg-nk-surface/95 backdrop-blur-md transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto shadow-sm"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
      role="navigation"
      aria-label="Navigasi Bagian Kos"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10">
        {/* Scrollable Tabs */}
        <div className="no-scrollbar flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          {DETAIL_NAV_ITEMS.map((item) => {
            const label = isEn ? item.labelEn : item.labelId;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "relative px-3 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                  isActive
                    ? "text-nk-accent font-semibold"
                    : "text-nk-text-muted hover:text-nk-text"
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-nk-accent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Booking CTA on desktop */}
        <div className="hidden lg:flex items-center gap-4 py-2 shrink-0">
          <div className="text-right">
            <span className="text-[11px] text-nk-text-muted block leading-none">
              {isEn ? "Starting from" : "Mulai dari"}
            </span>
            <span className="text-sm font-bold text-nk-accent">
              {formatIDR(minPrice)}{" "}
              <span className="text-[11px] font-normal text-nk-text-muted">
                {isEn ? "/ month" : "/ bulan"}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection("fasilitas-kamar")}
            disabled={!isAvailable}
            className="inline-flex items-center justify-center rounded-none bg-nk-accent px-4 py-2 text-xs font-semibold text-nk-text-inverse hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
          >
            {isAvailable
              ? isEn
                ? "Select Room"
                : "Pilih Kamar"
              : isEn
                ? "Full"
                : "Kamar Penuh"}
          </button>
        </div>
      </div>
    </div>
  );
}

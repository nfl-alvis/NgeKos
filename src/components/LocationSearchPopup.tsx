"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type GeoResult = {
  name: string;
  formatted: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  resultType: string;
  category: string;
  lon: number | null;
  lat: number | null;
};

export type LocationPick =
  | { kind: "query"; text: string }
  | { kind: "nearby"; lat: number; lon: number }
  | { kind: "campus"; label: string; city: string }
  | { kind: "area"; label: string; city: string }
  | { kind: "station"; label: string; city: string };

const TABS = ["campus", "area", "station"] as const;
type Tab = (typeof TABS)[number];

// ── Quick picks (popular, shown as inline chips above the directory) ──
const QUICK_OPTIONS: Record<Tab, { label: string; city: string }[]> = {
  campus: [
    { label: "UGM", city: "Yogyakarta" },
    { label: "UI", city: "Jakarta" },
    { label: "ITB", city: "Bandung" },
    { label: "ITS", city: "Surabaya" },
    { label: "UNPAD", city: "Bandung" },
    { label: "UNAIR", city: "Surabaya" },
    { label: "UNDIP", city: "Semarang" },
    { label: "UB", city: "Malang" },
    { label: "UNY", city: "Yogyakarta" },
    { label: "BINUS", city: "Jakarta" },
  ],
  area: [
    { label: "Dago", city: "Bandung" },
    { label: "Setiabudi", city: "Bandung" },
    { label: "Kotabaru", city: "Yogyakarta" },
    { label: "Caturtunggal", city: "Yogyakarta" },
    { label: "Menteng", city: "Jakarta" },
    { label: "Tebet", city: "Jakarta" },
    { label: "Wonokromo", city: "Surabaya" },
    { label: "Sumbersari", city: "Malang" },
    { label: "Dinoyo", city: "Malang" },
    { label: "Tembalang", city: "Semarang" },
  ],
  station: [
    { label: "Stasiun Bandung", city: "Bandung" },
    { label: "Stasiun Tugu", city: "Yogyakarta" },
    { label: "Stasiun Gambir", city: "Jakarta" },
    { label: "Stasiun Gubeng", city: "Surabaya" },
    { label: "Halte Trans Bandung Dago", city: "Dago, Bandung" },
    { label: "Halte Trans Jogja UGM", city: "Yogyakarta" },
    { label: "Halte TransJakarta Monas", city: "Jakarta" },
    { label: "Stasiun Lempuyangan", city: "Yogyakarta" },
    { label: "Stasiun Kiaracondong", city: "Bandung" },
    { label: "Stasiun Malang", city: "Malang" },
  ],
};

// ── Directory: organised by city, each tab has its own city-tree ──
const CITIES = [
  "Bandung",
  "Yogyakarta",
  "Jakarta",
  "Surabaya",
  "Malang",
  "Semarang",
] as const;

const DIRECTORY: Record<Tab, Record<string, { label: string; city: string }[]>> = {
  campus: {
    Bandung: [
      { label: "ITB", city: "Bandung" },
      { label: "UNPAD", city: "Bandung" },
      { label: "UPI", city: "Bandung" },
      { label: "Telkom University", city: "Bandung" },
      { label: "UNPAR", city: "Bandung" },
    ],
    Yogyakarta: [
      { label: "UGM", city: "Yogyakarta" },
      { label: "UNY", city: "Yogyakarta" },
      { label: "UII", city: "Yogyakarta" },
      { label: "UMY", city: "Yogyakarta" },
      { label: "Sanata Dharma", city: "Yogyakarta" },
    ],
    Jakarta: [
      { label: "UI", city: "Jakarta" },
      { label: "BINUS", city: "Jakarta" },
      { label: "Trisakti", city: "Jakarta" },
      { label: "Atma Jaya", city: "Jakarta" },
      { label: "UNJ", city: "Jakarta" },
    ],
    Surabaya: [
      { label: "ITS", city: "Surabaya" },
      { label: "UNAIR", city: "Surabaya" },
      { label: "UPN Veteran", city: "Surabaya" },
      { label: "UK Petra", city: "Surabaya" },
      { label: "Universitas Ciputra", city: "Surabaya" },
    ],
    Malang: [
      { label: "UB", city: "Malang" },
      { label: "UM", city: "Malang" },
      { label: "UIN Malang", city: "Malang" },
      { label: "Polinema", city: "Malang" },
      { label: "Universitas Merdeka", city: "Malang" },
    ],
    Semarang: [
      { label: "UNDIP", city: "Semarang" },
      { label: "UNNES", city: "Semarang" },
      { label: "Soegijapranata", city: "Semarang" },
      { label: "Polines", city: "Semarang" },
      { label: "Universitas Wahid Hasyim", city: "Semarang" },
    ],
  },
  area: {
    Bandung: [
      { label: "Dago", city: "Bandung" },
      { label: "Setiabudi", city: "Bandung" },
      { label: "Cihampelas", city: "Bandung" },
      { label: "Riau", city: "Bandung" },
      { label: "Buahbatu", city: "Bandung" },
    ],
    Yogyakarta: [
      { label: "Kotabaru", city: "Yogyakarta" },
      { label: "Caturtunggal", city: "Yogyakarta" },
      { label: "Demangan", city: "Yogyakarta" },
      { label: "Gejayan", city: "Yogyakarta" },
      { label: "Timoho", city: "Yogyakarta" },
    ],
    Jakarta: [
      { label: "Menteng", city: "Jakarta" },
      { label: "Tebet", city: "Jakarta" },
      { label: "Kemang", city: "Jakarta" },
      { label: "Kelapa Gading", city: "Jakarta" },
      { label: "Pondok Indah", city: "Jakarta" },
    ],
    Surabaya: [
      { label: "Wonokromo", city: "Surabaya" },
      { label: "Gubeng", city: "Surabaya" },
      { label: "Sukolilo", city: "Surabaya" },
      { label: "Mulyorejo", city: "Surabaya" },
      { label: "Bubutan", city: "Surabaya" },
    ],
    Malang: [
      { label: "Sumbersari", city: "Malang" },
      { label: "Dinoyo", city: "Malang" },
      { label: "Lowokwaru", city: "Malang" },
      { label: "Sawojajar", city: "Malang" },
      { label: "Blimbing", city: "Malang" },
    ],
    Semarang: [
      { label: "Tembalang", city: "Semarang" },
      { label: "Gajahmungkur", city: "Semarang" },
      { label: "Semarang Tengah", city: "Semarang" },
      { label: "Pleburan", city: "Semarang" },
      { label: "Ngaliyan", city: "Semarang" },
    ],
  },
  station: {
    Bandung: [
      { label: "Stasiun Bandung", city: "Bandung" },
      { label: "Stasiun Kiaracondong", city: "Bandung" },
      { label: "Halte Trans Bandung Dago", city: "Bandung" },
      { label: "Halte Trans Bandung Cibiru", city: "Bandung" },
      { label: "Leuwipanjang", city: "Bandung" },
    ],
    Yogyakarta: [
      { label: "Stasiun Tugu", city: "Yogyakarta" },
      { label: "Stasiun Lempuyangan", city: "Yogyakarta" },
      { label: "Halte Trans Jogja UGM", city: "Yogyakarta" },
      { label: "Halte Trans Jogja Malioboro", city: "Yogyakarta" },
      { label: "Terminal Giwangan", city: "Yogyakarta" },
    ],
    Jakarta: [
      { label: "Stasiun Gambir", city: "Jakarta" },
      { label: "Stasiun Senen", city: "Jakarta" },
      { label: "Halte TransJakarta Monas", city: "Jakarta" },
      { label: "Halte TransJakarta Blok M", city: "Jakarta" },
      { label: "MRT Bundaran HI", city: "Jakarta" },
    ],
    Surabaya: [
      { label: "Stasiun Gubeng", city: "Surabaya" },
      { label: "Stasiun Pasar Turi", city: "Surabaya" },
      { label: "Halte Suroboyo Bus", city: "Surabaya" },
      { label: "Terminal Purabaya", city: "Surabaya" },
      { label: "Pelabuhan Tanjung Perak", city: "Surabaya" },
    ],
    Malang: [
      { label: "Stasiun Malang", city: "Malang" },
      { label: "Stasiun Malang Kotalama", city: "Malang" },
      { label: "Terminal Arjosari", city: "Malang" },
      { label: "Terminal Landungsari", city: "Malang" },
      { label: "Halte Malang Kota", city: "Malang" },
    ],
    Semarang: [
      { label: "Stasiun Semarang Tawang", city: "Semarang" },
      { label: "Stasiun Semarang Poncol", city: "Semarang" },
      { label: "Terminal Terboyo", city: "Semarang" },
      { label: "Pelabuhan Tanjung Emas", city: "Semarang" },
      { label: "BRT Semarang", city: "Semarang" },
    ],
  },
};

export default function LocationSearchPopup({
  open,
  onClose,
  onPick,
  initialQuery = "",
  onQueryChange,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (pick: LocationPick) => void;
  /** teks yang sudah diketik di input hero - dibawa ke popup agar autocomplete jalan */
  initialQuery?: string;
  /** sinkron balik ketikan popup ke input hero (tombol Enter di hero memakai nilai ini) */
  onQueryChange?: (v: string) => void;
}) {
  const t = useTranslations("hero");
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("campus");
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length < 3) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `/api/geocode?text=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) throw new Error("geocode failed");
        const data = await res.json();
        if (!cancelled && !controller.signal.aborted) setResults(data.features || []);
      } catch {
        if (controller.signal.aborted) return;
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled && abortRef.current === controller) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  // fokus + seed query dari input hero (pakai default value state, bukan
  // setState-in-effect; efek hanya untuk fokus agar tidak memicu reset query)
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const tabs = useMemo(
    () => TABS.map((tab) => ({ tab, label: t(`popup.tab.${tab}`) })),
    [t]
  );

  const handleNearby = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPick({
          kind: "nearby",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        onClose();
      },
      () => onClose()
    );
  }, [onPick, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* backdrop - full cover */}
      <div
        className="fixed inset-0 z-[60] bg-nk-text/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* popup panel - centered top overlay, not full-width */}
      <div
        className="fixed inset-x-0 top-0 z-[70] flex justify-center pt-16 md:pt-20"
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="mx-auto w-full max-w-lg max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-nk-border bg-nk-surface shadow-xl">
          {/* search input */}
        <div className="flex items-center gap-2.5 border-b border-nk-border px-4 py-3">
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 text-nk-text-muted" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onQueryChange?.(e.target.value);
            }}
            placeholder={t("placeholder")}
            className="w-full bg-transparent text-sm text-nk-text outline-none placeholder:text-nk-text-muted"
            aria-label={t("placeholder")}
          />
          {loading && (
            <span className="text-xs text-nk-text-muted">{t("popup.searching")}</span>
          )}
        </div>

        {/* autocomplete results */}
        {results.length > 0 && (
          <ul className="max-h-48 overflow-y-auto border-b border-nk-border">
            {results.map((r, i) => (
              <li key={`${r.formatted}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    onPick({ kind: "query", text: r.formatted });
                    onClose();
                  }}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-nk-warm"
                >
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-nk-text-muted" aria-hidden="true"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-nk-text">
                      {r.name || r.line1}
                    </span>
                    <span className="truncate text-xs text-nk-text-muted">
                      {r.line2 || r.formatted}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* nearby */}
        <div className="border-b border-nk-border px-4 py-3">
          <button
            type="button"
            onClick={handleNearby}
            className="inline-flex items-center gap-2 text-sm font-medium text-nk-accent transition-opacity hover:opacity-80"
          >
            <Image
              src="/icons/nearby-map.png"
              alt=""
              width={28}
              height={28}
              loading="eager"
              unoptimized
              className="size-[15px] shrink-0"
            />
            {t("popup.nearby")}
          </button>
        </div>

        {/* tabs */}
        <div className="flex border-b border-nk-border">
          {tabs.map(({ tab, label }) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2.5 text-sm transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-nk-accent font-medium text-nk-text"
                  : "text-nk-text-muted hover:text-nk-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* quick picks row */}
        <div className="border-b border-nk-border px-4 py-3">
          <p className="mb-2 text-xs font-medium text-nk-text-muted">
            {t("popup.popularSection")}
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_OPTIONS[activeTab].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  onPick({ kind: activeTab, label: opt.label, city: opt.city });
                  onClose();
                }}
                className="inline-flex items-center rounded-md border border-nk-dark-border bg-nk-bg px-2.5 py-1 text-xs font-medium text-nk-text transition-colors hover:border-nk-accent hover:bg-nk-section"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* accordion directory - organised by city */}
        <div className="px-4 pb-2 pt-3">
          <p className="mb-2 text-xs font-medium text-nk-text-muted">
            {t("popup.directoryTitle", { tab: t(`popup.tab.${activeTab}`) })}
          </p>
          {CITIES.map((city) => {
            const items = DIRECTORY[activeTab]?.[city];
            if (!items || items.length === 0) return null;
            return (
              <Accordion key={city}>
                <AccordionItem value={city}>
                  <AccordionTrigger className="py-2.5 text-sm font-medium text-nk-text">
                    {city}
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <div className="flex flex-wrap gap-2">
                      {items.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            onPick({ kind: activeTab, label: item.label, city: item.city });
                            onClose();
                          }}
                          className="inline-flex items-center rounded-md border border-nk-border bg-nk-bg px-2.5 py-1 text-xs text-nk-text transition-colors hover:border-nk-accent hover:bg-nk-warm"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </div>
        </div>
      </div>
    </>,
    document.body
  );
}
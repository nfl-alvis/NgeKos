"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CITIES } from "@/lib/data/properties";
import LocationSearchPopup, { type LocationPick } from "@/components/LocationSearchPopup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SearchBar() {
  const t = useTranslations("hero");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("kota", city);
    router.push(`/kost${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handlePick(pick: LocationPick) {
    const params = new URLSearchParams();
    switch (pick.kind) {
      case "query":
        params.set("q", pick.text);
        break;
      case "nearby":
        params.set("lat", String(pick.lat));
        params.set("lon", String(pick.lon));
        break;
      case "campus":
      case "area":
      case "station":
        params.set("q", pick.label);
        params.set("kota", pick.city);
        break;
    }
    router.push(`/kost?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="relative flex w-full max-w-2xl flex-col border border-nk-border bg-nk-surface sm:flex-row"
    >
      <div className="flex flex-1 items-center gap-2.5 border-b border-nk-border px-4 py-3 sm:border-b-0 sm:border-r">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-nk-text-muted" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={q}
          onFocus={() => setPopupOpen(true)}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full bg-transparent text-left text-sm text-nk-text outline-none placeholder:text-nk-text-muted"
          aria-label={t("placeholder")}
        />
      </div>

      <div className="flex items-center gap-2.5 border-b border-nk-border bg-nk-section px-4 py-3 sm:border-b-0 sm:border-r">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-nk-text-muted" aria-hidden="true">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <Select
          value={city || null}
          onValueChange={(v) => setCity(v ?? "")}
          items={CITIES.map((c) => ({ label: c, value: c }))}
        >
          <SelectTrigger className="h-auto w-full cursor-pointer border-none bg-transparent px-0 py-0 text-sm text-nk-text shadow-none">
            <SelectValue placeholder={t("popular")} className="truncate" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="">{t("popular")}</SelectItem>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center gap-2 bg-nk-accent px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:h-auto"
      >
        {t("search")}
      </button>

      {/* location search popup - portalled to body, pinned to the top of the viewport.
          key di-remount tiap buka supaya query ter-seed ulang dari input hero. */}
      <LocationSearchPopup
        key={popupOpen ? "popup-open" : "popup-closed"}
        open={popupOpen}
        initialQuery={q}
        onQueryChange={setQ}
        onClose={() => setPopupOpen(false)}
        onPick={handlePick}
      />
    </form>
  );
}

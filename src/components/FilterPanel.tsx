"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { CITIES } from "@/lib/data/properties";
import { FACILITY_META } from "@/lib/data/facilities";
import type { Facility } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export interface FilterState {
  kota: string;
  maxPrice: number;
  fasilitas: string[];
  gender: string;
  sort: string;
  onlyAvailable?: boolean;
}

interface Props {
  state: FilterState;
}

const PRICE_STEPS = [0, 1000000, 1500000, 2000000, 3000000, 5000000];

export default function FilterPanel({ state }: Props) {
  const t = useTranslations("list");
  const router = useRouter();
  const pathname = usePathname();

  function update(next: Partial<FilterState>) {
    const merged = { ...state, ...next };
    const query: Record<string, string | string[]> = {};
    if (merged.kota) query.kota = merged.kota;
    if (merged.maxPrice > 0) query.max = String(merged.maxPrice);
    if (merged.fasilitas.length > 0) query.fas = merged.fasilitas;
    if (merged.gender) query.gender = merged.gender;
    if (merged.sort) query.sort = merged.sort;
    if (merged.onlyAvailable) query.avail = "1";
    router.replace({ pathname, query });
  }

  function toggleFacility(f: Facility) {
    const has = state.fasilitas.includes(f);
    update({
      fasilitas: has
        ? state.fasilitas.filter((x) => x !== f)
        : [...state.fasilitas, f],
    });
  }

  function reset() {
    router.replace({ pathname, query: {} });
  }

  return (
    <div className="space-y-6 border border-nk-border bg-nk-section p-5 lg:sticky lg:top-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-nk-text">{t("filter")}</h2>
        <button
          onClick={reset}
          className="text-xs text-nk-text-muted transition-colors hover:text-nk-accent"
        >
          {t("reset")}
        </button>
      </div>

      {/* City */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-nk-text-muted">
          {t("city")}
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => update({ kota: "" })}
            className={cn(
              "border border-nk-border px-3 py-1.5 text-xs transition-colors",
              !state.kota
                ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                : "text-nk-text-muted hover:border-nk-accent"
            )}
          >
            {t("allCities")}
          </button>
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => update({ kota: c })}
              className={cn(
                "border border-nk-border px-3 py-1.5 text-xs transition-colors",
                state.kota === c
                  ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                  : "text-nk-text-muted hover:border-nk-accent"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="space-y-2.5">
        <label htmlFor="max-price" className="block text-xs font-semibold text-nk-text-muted">
          {t("maxPrice")}
        </label>
        <input
          id="max-price"
          type="range"
          min={0}
          max={PRICE_STEPS.length - 1}
          step={1}
          value={Math.max(0, PRICE_STEPS.indexOf(state.maxPrice))}
          onChange={(e) => update({ maxPrice: PRICE_STEPS[Number(e.target.value)] })}
          className="w-full accent-nk-accent"
        />
        <div className="flex justify-between text-[10px] text-nk-text-muted">
          <span>{state.maxPrice ? `Rp ${(state.maxPrice / 1000000).toFixed(state.maxPrice % 1000000 === 0 ? 0 : 1)} jt` : t("genderAll")}</span>
        </div>
      </div>

      {/* Ketersediaan Kamar */}
      <div className="pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!state.onlyAvailable}
            onChange={(e) => update({ onlyAvailable: e.target.checked })}
            className="size-4 rounded-none border border-nk-border accent-nk-accent"
          />
          <span className="text-xs font-medium text-nk-text">
            {t("onlyAvailable")}
          </span>
        </label>
      </div>

      {/* Gender */}
      <div className="space-y-2.5">
        <span className="block text-xs font-semibold text-nk-text-muted">
          {t("gender")}
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { v: "", l: t("genderAll") },
            { v: "mixed", l: t("genderMixed") },
            { v: "male", l: t("genderMale") },
            { v: "female", l: t("genderFemale") },
          ].map((g) => (
            <button
              key={g.v}
              onClick={() => update({ gender: g.v })}
              className={cn(
                "border border-nk-border px-3 py-1.5 text-xs transition-colors",
                state.gender === g.v
                  ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                  : "text-nk-text-muted hover:border-nk-accent"
              )}
            >
              {g.l}
            </button>
          ))}
        </div>
      </div>

      {/* Facilities */}
      <div className="space-y-2.5">
        <span className="block text-xs font-semibold text-nk-text-muted">
          {t("facilities")}
        </span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FACILITY_META) as Facility[]).map((f) => (
            <button
              key={f}
              onClick={() => toggleFacility(f)}
              aria-pressed={state.fasilitas.includes(f)}
              className={cn(
                "border border-nk-border px-3 py-1.5 text-xs transition-colors",
                state.fasilitas.includes(f)
                  ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                  : "text-nk-text-muted hover:border-nk-accent"
              )}
            >
              {FACILITY_META[f].labelId}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-2.5">
        <label htmlFor="sort" className="block text-xs font-semibold text-nk-text-muted">
          {t("sort")}
        </label>
        <select
          id="sort"
          value={state.sort}
          onChange={(e) => update({ sort: e.target.value })}
          className="w-full cursor-pointer border border-nk-border bg-nk-bg px-3 py-2 text-sm text-nk-text outline-none"
        >
          <option value="rating">{t("sortRating")}</option>
          <option value="price-asc">{t("sortPriceAsc")}</option>
          <option value="price-desc">{t("sortPriceDesc")}</option>
        </select>
      </div>
    </div>
  );
}
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import FilterPanel, { type FilterState } from "@/components/FilterPanel";
import PropertyCard from "@/components/PropertyCard";
import { getVerifiedProperties } from "@/lib/data/properties";
import type { Property, Facility } from "@/lib/data/types";

export function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return params.then(({ locale }) => ({
    title: locale === "en" ? "Explore Boarding Houses" : "Jelajahi Kost",
  }));
}

function filterAndSort(list: Property[], filters: FilterState): Property[] {
  const result = list.filter((p) => {
    if (filters.kota && p.city !== filters.kota) return false;
    if (filters.maxPrice > 0 && p.minPrice > filters.maxPrice) return false;
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.fasilitas.length > 0) {
      const pf = new Set(p.facilities);
      if (!filters.fasilitas.every((f) => pf.has(f as Facility))) return false;
    }
    return true;
  });

  switch (filters.sort) {
    case "price-asc":
      result.sort((a, b) => a.minPrice - b.minPrice);
      break;
    case "price-desc":
      result.sort((a, b) => b.minPrice - a.minPrice);
      break;
    default:
      result.sort((a, b) => b.rating - a.rating);
  }

  return result;
}

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kota?: string; max?: string; fas?: string | string[]; gender?: string; sort?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const filterState: FilterState = {
    kota: sp.kota || "",
    maxPrice: Number(sp.max) || 0,
    fasilitas: Array.isArray(sp.fas) ? sp.fas : sp.fas ? [sp.fas] : [],
    gender: sp.gender || "",
    sort: sp.sort || "rating",
  };

  const all = getVerifiedProperties();
  const filtered = filterAndSort(all, filterState);

  return (
    <>
      {/* Header */}
      <section className="border-b border-nk-border">
        <div className="mx-auto w-full max-w-7xl px-6 py-14 lg:px-10 lg:py-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-light tracking-tight text-nk-text md:text-5xl">
              {t("list.title")}
            </h1>
            <p className="mt-4 text-sm text-nk-text-muted">
              {t("list.subtitle")}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-0 border-b border-nk-border lg:grid-cols-[300px_1fr]">
        {/* Sidebar filter */}
        <aside className="border-b border-nk-border p-6 lg:border-b-0 lg:border-r lg:p-8">
          <FilterPanel state={filterState} />
        </aside>

        {/* Grid */}
        <div className="p-6 lg:p-8">
          <p className="mb-8 text-sm text-nk-text-muted">
            {t("list.resultCount", { count: filtered.length })}
          </p>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <PropertyCard key={p.slug} property={p} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <h3 className="text-xl font-medium tracking-tight text-nk-text">{t("list.emptyTitle")}</h3>
              <p className="mt-2 max-w-sm text-sm text-nk-text-muted">{t("list.emptyBody")}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
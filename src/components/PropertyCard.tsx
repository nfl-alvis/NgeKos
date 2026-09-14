import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Property } from "@/lib/data/types";
import { formatIDR, formatDistance } from "@/lib/utils";

const GENDER_LABEL: Record<Property["gender"], "genderMixed" | "genderMale" | "genderFemale"> = {
  mixed: "genderMixed",
  male: "genderMale",
  female: "genderFemale",
};

export default async function PropertyCard({ property }: { property: Property }) {
  const t = await getTranslations("card");
  const totalAvailable = property.roomTypes.reduce((s, r) => s + r.available, 0);

  return (
    <Link
      href={`/kost/${property.slug}`}
      className="group flex h-full flex-col border border-nk-border bg-nk-bg p-6 transition-colors hover:bg-nk-section focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
    >
      <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden bg-nk-section">
        <Image
          src={`https://picsum.photos/seed/${property.imageSeed}/800/450`}
          alt={property.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {property.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-nk-text backdrop-blur-sm">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t("verified")}
          </span>
        )}
        <span className="absolute bottom-3 right-3 rounded-md bg-nk-dark/85 px-2.5 py-1 text-xs font-medium text-nk-text-inverse">
          {formatDistance(property.distanceToCampusM)}
        </span>
      </div>

      {/* tipe (putra/putri/campur) + jumlah tersedia, di atas nama */}
      <div className="flex items-center gap-2">
        <span className="inline-flex shrink-0 items-center rounded-md border border-nk-dark-border bg-nk-section px-2 py-0.5 text-xs font-medium text-nk-text">
          {t(GENDER_LABEL[property.gender])}
        </span>
        <span className="flex min-w-0 items-center gap-1 text-xs text-nk-text-muted">
          {totalAvailable > 0 ? (
            <>
              <span className="font-medium text-nk-text">{totalAvailable}</span>
              <span className="truncate">{t("available")}</span>
            </>
          ) : (
            <span>{t("full")}</span>
          )}
        </span>
      </div>

      <h3 className="mt-2.5 min-w-0 truncate text-base font-medium tracking-tight text-nk-text">
        {property.name}
      </h3>

      <p className="mt-1 flex items-center gap-1 text-xs text-nk-text-muted">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {property.district}, {property.city}
      </p>

      <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-nk-text-muted">
        <span className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-nk-star" aria-hidden="true">
            <path d="M12 2l2.9 6.26L21.5 9.27l-5 4.87L17.8 21 12 17.77 6.2 21l1.3-6.86-5-4.87 6.6-1.01L12 2z" />
          </svg>
          <span className="text-nk-star">{property.rating.toFixed(1)}</span> ({property.reviewCount})
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 4h20v14H2z" />
            <path d="M8 21h8" />
          </svg>
          {property.roomTypes.length} {t("roomTypes")}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5 border-t border-nk-border pt-4">
        <span className="text-xs text-nk-text-muted">{t("from")}</span>
        <span className="text-xl font-medium tracking-tight text-nk-text">
          {formatIDR(property.minPrice)}
        </span>
        <span className="text-xs text-nk-text-muted">{t("perMonth")}</span>
      </div>
    </Link>
  );
}

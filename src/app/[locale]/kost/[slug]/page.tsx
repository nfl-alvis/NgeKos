import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPropertyBySlug, getVerifiedProperties } from "@/lib/data/properties";
import { FACILITY_META } from "@/lib/data/facilities";
import { formatIDR, formatDistance, cn } from "@/lib/utils";

export async function generateStaticParams() {
  const props = getVerifiedProperties();
  return props.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPropertyBySlug(slug);
  if (!p) return { title: "Not Found" };
  return {
    title: `${p.name} — ${p.district}, ${p.city}`,
    description: p.tagline,
  };
}

export default async function DetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const p = getPropertyBySlug(slug);

  if (!p) notFound();

  return (
    <>
      {/* Back link */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-8 lg:px-10">
        <Link
          href="/kost"
          className="inline-flex items-center gap-1.5 text-sm text-nk-text-muted transition-colors hover:text-nk-accent"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          {t("detail.back")}
        </Link>
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10 lg:py-12">
        {/* Gallery */}
        <div className="grid grid-cols-1 gap-[1px] bg-nk-border lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden bg-nk-section">
            <img
              src={`https://picsum.photos/seed/${p.imageSeed}-main/1200/750`}
              alt={p.name}
              className="aspect-[16/10] w-full object-cover lg:aspect-auto lg:h-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-[1px] bg-nk-border lg:grid-cols-1">
            <div className="overflow-hidden bg-nk-section">
              <img
                src={`https://picsum.photos/seed/${p.imageSeed}-b/600/400`}
                alt={`${p.name} — interior`}
                className="aspect-[3/2] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden bg-nk-section">
              <img
                src={`https://picsum.photos/seed/${p.imageSeed}-c/600/400`}
                alt={`${p.name} — lingkungan`}
                className="aspect-[3/2] w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
          <div className="space-y-12">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn(
                  "inline-flex items-center gap-1.5 border border-nk-border px-3 py-1 text-xs",
                  p.verified ? "text-nk-accent" : "text-nk-text-muted"
                )}>
                  {p.verified && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  {t("detail.verified")}
                </span>
                <span className="inline-flex items-center gap-1 text-sm text-nk-text-muted">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-nk-star" aria-hidden="true">
                    <path d="M12 2l2.9 6.26L21.5 9.27l-5 4.87L17.8 21 12 17.77 6.2 21l1.3-6.86-5-4.87 6.6-1.01L12 2z" />
                  </svg>
                  <span className="text-nk-star">{p.rating.toFixed(1)}</span> ({p.reviewCount} {t("detail.reviews")})
                </span>
              </div>

              <h1 className="text-4xl font-light tracking-tight text-nk-text md:text-5xl">
                {p.name}
              </h1>
              <p className="text-sm text-nk-text-muted">{p.tagline}</p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-nk-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {p.address}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {p.district}, {p.city}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  {formatDistance(p.distanceToCampusM)} {t("detail.distance")}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-light tracking-tight text-nk-text">
                {t("detail.description")}
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-nk-text-muted">
                {p.description}
              </p>
            </div>

            {/* Facilities */}
            <div className="space-y-4">
              <h2 className="text-xl font-light tracking-tight text-nk-text">
                {t("detail.facilities")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {p.facilities.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 border border-nk-border px-3 py-1.5 text-xs text-nk-text"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-nk-accent" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {FACILITY_META[f]?.labelId || f}
                  </span>
                ))}
              </div>
            </div>

            {/* Room Types */}
            <div className="space-y-4">
              <h2 className="text-xl font-light tracking-tight text-nk-text">
                {t("detail.roomTypes")}
              </h2>
              <div className="grid gap-[1px] bg-nk-border sm:grid-cols-2">
                {p.roomTypes.map((rt) => (
                  <div
                    key={rt.id}
                    className="bg-nk-bg p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium tracking-tight text-nk-text">
                        {rt.name}
                      </span>
                      <span className="text-base font-light text-nk-text">
                        {formatIDR(rt.pricePerMonth)}
                        <span className="text-xs text-nk-text-muted">
                          {t("detail.perMonth")}
                        </span>
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-nk-border pt-3 text-xs text-nk-text-muted">
                      <span>{rt.sizeM2} m&sup2;</span>
                      <span className={cn(
                        rt.available > 0 ? "text-nk-accent" : "text-nk-text-muted"
                      )}>
                        {rt.available > 0
                          ? `${rt.available} ${t("detail.availableNow")}`
                          : t("detail.full")}
                      </span>
                    </div>
                    {rt.available > 0 && (
                      <Link
                        href={`/kost/${p.slug}/ajukan?kamar=${rt.id}`}
                        className="mt-4 inline-flex w-full items-center justify-center border border-nk-accent px-4 py-2.5 text-xs font-medium text-nk-accent transition-colors duration-200 hover:bg-nk-accent hover:text-nk-text-inverse"
                      >
                        {t("detail.pickRoom")}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Deposit */}
            <div className="space-y-4">
              <h2 className="text-xl font-light tracking-tight text-nk-text">
                {t("detail.deposit")}
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-nk-text-muted">
                {p.depositInfo}
              </p>
            </div>
          </div>

          {/* Sidebar — CTA */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-nk-border bg-nk-section p-6">
              <div className="space-y-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-light tracking-tight text-nk-text">
                    {formatIDR(p.minPrice)}
                  </span>
                  <span className="text-sm text-nk-text-muted">{t("detail.perMonth")}</span>
                </div>
                <p className="text-sm text-nk-text-muted">
                  {t("detail.from")} {p.roomTypes.reduce((s, r) => s + r.available, 0)} {t("detail.available")}
                </p>

                <div className="space-y-2.5 border-t border-nk-border pt-5">
                  <div className="flex items-center justify-between text-sm text-nk-text-muted">
                    <span>{t("detail.gender")}</span>
                    <span className="font-medium text-nk-text">
                      {p.gender === "mixed" ? t("card.genderMixed") : p.gender === "male" ? t("card.genderMale") : t("card.genderFemale")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-nk-text-muted">
                    <span>{t("detail.location")}</span>
                    <span className="font-medium text-nk-text">{p.district}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <Link
                    href={`/kost/${p.slug}/ajukan`}
                    className="inline-flex w-full items-center justify-center bg-nk-accent px-6 py-3.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
                  >
                    {t("detail.book")}
                  </Link>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 border border-nk-border bg-nk-bg px-6 py-3.5 text-sm text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {t("detail.call")}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
import WhyFaq from "@/components/WhyFaq";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SearchBar from "@/components/SearchBar";
import PropertyCard from "@/components/PropertyCard";
import { getVerifiedProperties } from "@/lib/data/properties";
import { getCityImage, getCampusImage } from "@/lib/kosImages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Find Verified Boarding Houses" : "Cari Kost Terverifikasi",
  };
}

const CATEGORY_IMAGES = [
  { seed: "ngekost-cat-bandung", label: "Bandung", area: "Dago · Setiabudi", hero: 0 },
  { seed: "ngekost-cat-jogja", label: "Yogyakarta", area: "Kotabaru · Caturtunggal", hero: 1 },
  { seed: "ngekost-cat-jakarta", label: "Jakarta", area: "Menteng · Tebet", hero: 2 },
  { seed: "ngekost-cat-malang", label: "Malang", area: "Sumbersari · Dinoyo", hero: 3 },
];

const CAMPUS_TILES = [
  { name: "UGM", fullName: "Universitas Gadjah Mada", city: "Yogyakarta", seed: "ngekost-kampus-ugm" },
  { name: "UI", fullName: "Universitas Indonesia", city: "Jakarta", seed: "ngekost-kampus-ui" },
  { name: "ITB", fullName: "Institut Teknologi Bandung", city: "Bandung", seed: "ngekost-kampus-itb" },
  { name: "ITS", fullName: "Institut Teknologi Sepuluh Nopember", city: "Surabaya", seed: "ngekost-kampus-its" },
  { name: "UNPAD", fullName: "Universitas Padjadjaran", city: "Bandung", seed: "ngekost-kampus-unpad" },
  { name: "UNAIR", fullName: "Universitas Airlangga", city: "Surabaya", seed: "ngekost-kampus-unair" },
  { name: "UNDIP", fullName: "Universitas Diponegoro", city: "Semarang", seed: "ngekost-kampus-undip" },
  { name: "UB", fullName: "Universitas Brawijaya", city: "Malang", seed: "ngekost-kampus-ub" },
];

const WHY_ICONS = [
  {
    key: "agent",
    seed: "ngekost-why-agent",
    path: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M16 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  },
  {
    key: "favorite",
    seed: "ngekost-why-favorite",
    path: "M12 2l2.9 6.26L21.5 9.27l-5 4.87L17.8 21 12 17.77 6.2 21l1.3-6.86-5-4.87 6.6-1.01L12 2z",
  },
  {
    key: "promo",
    seed: "ngekost-why-promo",
    path: "M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8",
  },
  {
    key: "guide",
    seed: "ngekost-why-guide",
    path: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15ZM10 6h4",
  },
];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const props = getVerifiedProperties();
  const featured = props.slice(0, 4);

  return (
    <>
      {/* ===== HERO - giant type + search ===== */}
      <section className="relative overflow-hidden border-b border-nk-border">
        {/* full-bleed background video (mirror of hero-bg-flipped), opaque */}
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right"
        >
          <source src="/assets/hero-bg-flipped.mp4" type="video/mp4" />
        </video>
        {/* overlay: solid white on left (text zone), fades from 20% */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-nk-bg from-20% via-nk-bg/30 via-60% to-transparent" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-6 py-24 md:py-32 lg:px-10">
          <p className="mb-6 text-sm font-medium text-nk-text-muted">
            {t("hero.tagline")}
          </p>
          <h1 className="max-w-4xl font-sans text-5xl font-light leading-[1.02] tracking-tight text-nk-text sm:text-6xl md:text-7xl lg:text-8xl">
            {t("hero.title1")}
            <br />
            {t("hero.title2")}
          </h1>
          <div className="mx-auto mt-12 w-full max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* ===== FEATURED / KOST UNGGULAN - hairline grid ===== */}
      <section className="border-b border-nk-border">
        <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="flex items-center justify-between pb-10">
            <h2 className="text-2xl font-light tracking-tight text-nk-text sm:text-3xl">
              {t("featured.title")}
            </h2>
            <Link
              href="/kost"
              className="hidden text-sm text-nk-text underline underline-offset-4 transition-colors hover:text-nk-text-muted sm:block"
            >
              {t("featured.viewAll")}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <PropertyCard key={p.slug} property={p} />
            ))}
          </div>

          <div className="mt-8 sm:hidden">
            <Link
              href="/kost"
              className="block w-full border border-nk-border bg-nk-bg px-6 py-3 text-center text-sm text-nk-text transition-colors hover:bg-nk-section"
            >
              {t("featured.viewAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== SHOP BY CATEGORY - full-height image columns ===== */}
      <section className="border-b border-nk-border">
        <div className="mx-auto w-full max-w-7xl px-6 pt-16 lg:px-10">
          <div className="flex items-end justify-between pb-8">
            <h2 className="text-2xl font-light tracking-tight text-nk-text sm:text-3xl">
              {t("category.title")}
            </h2>
            <Link
              href="/kost"
              className="hidden text-sm text-nk-text underline underline-offset-4 transition-colors hover:text-nk-text-muted sm:block"
            >
              {t("category.viewAll")}
            </Link>
          </div>
        </div>

        <div className="flex flex-col border-t border-nk-border lg:h-[75vh] lg:flex-row">
          {CATEGORY_IMAGES.map((cat) => (
            <Link
              key={cat.label}
              href={`/kost?kota=${encodeURIComponent(cat.label)}`}
              className="group relative flex-1 overflow-hidden border-b border-nk-border last:border-b-0 lg:h-full lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] ease-out group-hover:scale-105"
                style={{ backgroundImage: `url(${getCityImage(cat.label)})` }}
              />
              <div className="absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-nk-bg via-nk-bg/80 to-transparent" />
              <div className="relative z-10 flex h-[38vh] flex-col p-6 lg:h-full lg:p-8 lg:pt-12">
                <h3 className="text-xl font-light tracking-tight text-nk-text lg:text-2xl">
                  {cat.label}
                </h3>
                <div className="mt-auto pb-2">
                  <div className="flex w-full items-center justify-between border-t border-nk-text/10 pt-4">
                    <span className="text-xs font-medium text-nk-text">
                      {t("category.explore")}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-nk-text opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      style={{ transform: "translateX(-8px)" }}
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      {/* ===== KOS SEKITAR KAMPUS - clickable campus logo cards (mamikos ref) ===== */}
      <section className="border-b border-nk-border">
        <div className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="flex items-end justify-between pb-10">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-light tracking-tight text-nk-text sm:text-3xl">
                {t("campus.title")}
              </h2>
              <p className="max-w-md text-sm text-nk-text-muted">{t("campus.subtitle")}</p>
            </div>
            <Link
              href="/kost"
              className="hidden text-sm text-nk-text underline underline-offset-4 transition-colors hover:text-nk-text-muted sm:block"
            >
              {t("campus.seeAll")}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {CAMPUS_TILES.map((campus) => (
              <Link
                key={campus.name}
                href={`/kost?kota=${encodeURIComponent(campus.city)}`}
                title={`${campus.name} - ${campus.fullName}`}
                className="group relative flex flex-col items-center justify-between rounded-2xl border border-nk-border bg-nk-surface p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-nk-accent/40 hover:shadow-sm sm:p-6"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-nk-warm/60 p-3 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={getCampusImage(campus.name)}
                    alt={`Logo ${campus.name}`}
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="mt-4 flex flex-col items-center">
                  <span className="text-base font-semibold tracking-tight text-nk-text transition-colors group-hover:text-nk-accent">
                    {campus.name}
                  </span>
                  <span className="mt-0.5 text-xs text-nk-text-muted">
                    {campus.city}
                  </span>
                </div>

                <div className="mt-4 flex w-full items-center justify-between border-t border-nk-border/60 pt-3">
                  <span className="text-xs font-medium text-nk-text-muted transition-colors group-hover:text-nk-text">
                    {t("category.explore")}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-nk-text opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    style={{ transform: "translateX(-8px)" }}
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 sm:hidden">
            <Link
              href="/kost"
              className="block w-full border border-nk-border bg-nk-bg px-6 py-3 text-center text-sm text-nk-text transition-colors hover:bg-nk-section"
            >
              {t("campus.seeAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== WHY NGEKOST - 2x2 checkerboard, warm tint ===== */}
      <section className="mt-16 border-y border-nk-border bg-nk-warm md:mt-24">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-[1px] bg-nk-border md:grid-cols-2">
          {/* Row 1 · Left: agent (verified) text */}
          <div className="flex flex-col justify-center gap-3 bg-nk-warm px-6 py-12 md:px-10 lg:py-16">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-nk-text"
              aria-hidden="true"
            >
              <path d={WHY_ICONS[0].path} />
            </svg>
            <h3 className="text-2xl font-light leading-tight tracking-tight text-nk-text sm:text-3xl">
              {t("why.agent")}
            </h3>
            <p className="max-w-sm text-sm leading-relaxed text-nk-text-muted sm:text-base">
              {t("why.agentBody")}
            </p>
            <Link
              href="/kost"
              className="mt-2 inline-flex w-fit items-center gap-2 bg-nk-accent px-6 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              {t("why.learnMore")}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Row 1 · Right: image */}
          <div className="overflow-hidden bg-nk-warm">
            <Image
              src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"
              alt={t("why.agent")}
              width={900}
              height={680}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Row 2 · Left: image */}
          <div className="overflow-hidden bg-nk-warm">
            <Image
              src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80"
              alt={t("why.favorite")}
              width={900}
              height={680}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Row 2 · Right: FAQ (heading + accordion) */}
          <div className="bg-nk-warm px-6 py-12 text-left md:px-10 lg:py-16">
            <h2 className="text-2xl font-light leading-tight tracking-tight text-nk-text sm:text-3xl">
              {t("why.heading")}
            </h2>
            <p className="mt-3 max-w-md text-left text-sm leading-relaxed text-nk-text-muted sm:text-base">
              {t("why.subheading")}
            </p>
            <div className="mt-6">
              <WhyFaq />
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <section className="border-y border-nk-dark-border/40 bg-nk-dark text-nk-text-inverse">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 md:grid-cols-3">
          {[
            { value: "120+", label: t("stats.properties") },
            { value: "6", label: t("stats.cities") },
            { value: "8.4rb", label: t("stats.tenants") },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center justify-center gap-2 bg-nk-dark px-6 py-10 text-center border-nk-dark-border/40 ${
                i > 0 ? "border-t md:border-t-0 md:border-l" : ""
              }`}
            >
              <div className="text-4xl font-light tracking-tight md:text-5xl">
                {s.value}
              </div>
              <div className="text-sm text-nk-dark-border/70">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

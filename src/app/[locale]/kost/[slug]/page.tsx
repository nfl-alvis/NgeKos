import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPropertyBySlug, getVerifiedProperties } from "@/lib/data/properties";
import { FACILITY_META } from "@/lib/data/facilities";
import { formatIDR, formatDistance, cn } from "@/lib/utils";
import BookingCta from "@/components/BookingCta";
import FacilityIcon from "@/components/FacilityIcon";
import BookingSidebarActions from "@/components/BookingSidebarActions";
import { BookingFlowProvider } from "@/components/BookingFlowProvider";
import FavoriteButton from "@/components/FavoriteButton";
import PropertyReviewsSection from "@/components/PropertyReviewsSection";
import ReportPropertyModal from "@/components/ReportPropertyModal";
import PropertyGallery from "@/components/PropertyGallery";
import { getProperty, propertyDto } from "@/server/property-service";
import { getKosImage, getKosGalleryItems } from "@/lib/kosImages";
import type { Property, Gender, Facility } from "@/lib/data/types";

function toUiProperty(dto: ReturnType<typeof propertyDto>): Property {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    tagline: dto.tagline ?? "",
    description: dto.description,
    city: dto.city,
    district: dto.district,
    address: dto.address,
    gender: (dto.gender.toLowerCase() as Gender) ?? "mixed",
    verified: dto.status === "VERIFIED",
    active: dto.status === "VERIFIED",
    rating: dto.rating,
    reviewCount: dto.reviewCount,
    imageSeed: dto.slug,
    facilities: dto.facilities.map((f) => f.key as Facility),
    minPrice: dto.minPrice,
    distanceToCampusM: dto.distanceToCampusM ?? 0,
    depositAmount: dto.depositAmount,
    depositInfo: dto.depositAmount ? `DP Rp ${dto.depositAmount.toLocaleString("id-ID")}` : "Tanpa deposit",
    verificationStatus: dto.status === "VERIFIED" ? "verified" : dto.status === "REJECTED" ? "rejected" : "pending",
    roomTypes: dto.roomTypes.map((rt) => ({
      id: rt.id,
      name: rt.name,
      pricePerMonth: rt.pricePerMonth,
      available: rt.available,
      total: rt.total,
      sizeM2: rt.sizeM2 ?? 12,
    })),
  };
}

export function parsePropertyRules(property: Property): {
  cleanDescription: string;
  rules: string[];
  patokan?: string;
  highlights: { label: string; tone: "green" | "blue" | "amber" | "neutral" }[];
} {
  const desc = property.description || "";
  let cleanDescription = desc;
  let rules: string[] = [];
  let patokan: string | undefined;

  const patokanMatch = desc.match(/Patokan:\s*([^\n]+)/i);
  if (patokanMatch) {
    patokan = patokanMatch[1].trim();
  }

  const rulesMatch = desc.match(
    /(?:Aturan & Ketentuan Kos|Peraturan Kos|Persyaratan Sewa|Aturan Kos):\s*([\s\S]+)/i
  );
  if (rulesMatch) {
    const rawRules = rulesMatch[1];
    rules = rawRules
      .split(/\r?\n/)
      .map((line) => line.replace(/^[\s•\-\*]+/, "").trim())
      .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("patokan:"));

    cleanDescription = desc
      .replace(/(?:Aturan & Ketentuan Kos|Peraturan Kos|Persyaratan Sewa|Aturan Kos):\s*([\s\S]+)/i, "")
      .replace(/Patokan:\s*[^\n]+/i, "")
      .trim();
  }

  if (rules.length === 0) {
    if (property.gender === "female") {
      rules.push("Khusus Penghuni Putri");
    } else if (property.gender === "male") {
      rules.push("Khusus Penghuni Putra");
    } else {
      rules.push("Tipe Kos Campur (Putra / Putri)");
    }

    const has24h = property.facilities?.some(
      (f) => f === "access-24h" || (typeof f === "object" && (f as any)?.key === "access-24h")
    );
    if (has24h) {
      rules.push("Akses gerbang 24 Jam (bebas jam malam)");
    } else {
      rules.push("Akses gerbang berlaku hingga pukul 23:00 WIB");
    }

    rules.push("Wajib menyertakan KTP asli saat pengajuan sewa");
    rules.push("Dilarang merokok di dalam kamar ber-AC");
    rules.push("Dilarang membawa minuman keras atau zat terlarang");
    rules.push("Tamu lawan jenis dilarang menginap di dalam kamar");
    rules.push("Menjaga kebersihan dan ketertiban area bersama");
  }

  const highlights: { label: string; tone: "green" | "blue" | "amber" | "neutral" }[] = [];

  if (property.gender === "female") {
    highlights.push({ label: "Khusus Putri", tone: "blue" });
  } else if (property.gender === "male") {
    highlights.push({ label: "Khusus Putra", tone: "blue" });
  } else {
    highlights.push({ label: "Campur (Putra/Putri)", tone: "neutral" });
  }

  const has24h = property.facilities?.some(
    (f) => f === "access-24h" || (typeof f === "object" && (f as any)?.key === "access-24h")
  );
  if (has24h || rules.some((r) => r.toLowerCase().includes("24 jam"))) {
    highlights.push({ label: "Akses 24 Jam", tone: "green" });
  } else {
    highlights.push({ label: "Jam Malam Berlaku", tone: "amber" });
  }

  if (rules.some((r) => r.toLowerCase().includes("ktp"))) {
    highlights.push({ label: "Wajib KTP", tone: "neutral" });
  }
  if (rules.some((r) => r.toLowerCase().includes("pasutri") || r.toLowerCase().includes("buku nikah"))) {
    highlights.push({ label: "Boleh Pasutri (Surat Nikah)", tone: "green" });
  }
  if (rules.some((r) => r.toLowerCase().includes("hewan"))) {
    highlights.push({ label: "Boleh Bawa Hewan", tone: "neutral" });
  }

  return { cleanDescription: cleanDescription || desc, rules, patokan, highlights };
}

export async function generateStaticParams() {
  const props = getVerifiedProperties();
  return props.map((p) => ({ slug: p.slug }));
}

import JsonLd from "@/components/seo/JsonLd";
import { getPropertySchema, getBreadcrumbSchema } from "@/lib/seo/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  let p: Property | null = null;
  try {
    const dbProp = await getProperty(slug);
    if (dbProp) p = toUiProperty(dbProp);
  } catch {
    p = null;
  }
  if (!p) {
    p = getPropertyBySlug(slug) ?? null;
  }
  if (!p) return { title: "Kost Tidak Ditemukan" };

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";
  const isEn = locale === "en";
  const genderLabel =
    p.gender === "female"
      ? (isEn ? "Female" : "Putri")
      : p.gender === "male"
      ? (isEn ? "Male" : "Putra")
      : (isEn ? "Mixed" : "Campur");

  const title = `${p.name} - Kost ${genderLabel} di ${p.district}, ${p.city}`;
  const description = `${p.name} (${genderLabel}) di ${p.district}, ${p.city}. Sewa mulai ${formatIDR(p.minPrice)}/bulan. Fasilitas: ${p.facilities.slice(0, 5).join(", ")}. Dekat kampus, foto asli 100%, aman & terverifikasi di NgeKos.`;
  const kosImages = getKosGalleryItems(p.slug, p.name);
  const mainImage = kosImages[0]?.url
    ? kosImages[0].url.startsWith("http")
      ? kosImages[0].url
      : `${BASE_URL}${kosImages[0].url}`
    : `${BASE_URL}/assets/hero-bg.png`;

  return {
    title,
    description,
    keywords: [
      p.name,
      `kost ${p.name.toLowerCase()}`,
      `kost ${p.district.toLowerCase()}`,
      `kost ${p.city.toLowerCase()}`,
      `kost ${genderLabel.toLowerCase()} ${p.city.toLowerCase()}`,
      `sewa kost ${p.city.toLowerCase()}`,
      `kost murah ${p.city.toLowerCase()}`,
      "ngekos",
      "kost malang",
    ],
    alternates: {
      canonical: `/${locale}/kost/${slug}`,
      languages: {
        "id-ID": `/id/kost/${slug}`,
        "en-US": `/en/kost/${slug}`,
      },
    },
    openGraph: {
      title: `${title} | NgeKos`,
      description,
      url: `${BASE_URL}/${locale}/kost/${slug}`,
      siteName: "NgeKos",
      locale: isEn ? "en_US" : "id_ID",
      type: "article",
      images: [
        {
          url: mainImage,
          width: 1200,
          height: 800,
          alt: p.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | NgeKos`,
      description,
      images: [mainImage],
    },
    other: {
      "geo.region": "ID-JI",
      "geo.placename": `${p.city}, Jawa Timur, Indonesia`,
      ...(p.latitude && p.longitude
        ? {
            "geo.position": `${p.latitude};${p.longitude}`,
            "ICBM": `${p.latitude}, ${p.longitude}`,
          }
        : {}),
    },
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
  const isEn = locale === "en";
  let p: Property | null = null;
  try {
    const dbProp = await getProperty(slug);
    if (dbProp) p = toUiProperty(dbProp);
  } catch {
    p = null;
  }
  if (!p) {
    p = getPropertyBySlug(slug) ?? null;
  }

  if (!p) notFound();

  const rulesData = parsePropertyRules(p);

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";
  const kosImages = getKosGalleryItems(p.slug, p.name);
  const imageUrls = kosImages.map((img) =>
    img.url.startsWith("http") ? img.url : `${BASE_URL}${img.url}`
  );

  const propertySchema = getPropertySchema(p, locale, imageUrls);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: locale === "en" ? "Home" : "Beranda", url: `/${locale}` },
    { name: locale === "en" ? "Boarding Houses" : "Daftar Kost", url: `/${locale}/kost` },
    { name: p.name, url: `/${locale}/kost/${p.slug}` },
  ]);

  return (
    <BookingFlowProvider>
      <JsonLd data={propertySchema} />
      <JsonLd data={breadcrumbSchema} />
      <>      {/* Back link */}
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
        <PropertyGallery
          propertyName={p.name}
          propertySlug={p.slug}
          images={getKosGalleryItems(p.slug || p.imageSeed, p.name)}
          tViewAll={t("detail.viewAllPhotos")}
          tClose={t("detail.closeGallery")}
        />

        {/* Body */}
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
          <div className="space-y-12">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                <FavoriteButton propertySlug={p.slug} propertyId={p.id} showText size="sm" />
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-nk-text md:text-4xl">
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
              <h2 className="text-xl font-medium tracking-tight text-nk-text">
                {t("detail.description")}
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-nk-text-muted">
                {rulesData.cleanDescription}
              </p>
            </div>

            {/* Facilities */}
            <div className="space-y-4">
              <h2 className="text-xl font-medium tracking-tight text-nk-text">
                {t("detail.facilities")}
              </h2>
              <div className="flex flex-wrap gap-2">
                {p.facilities.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 border border-nk-border bg-white px-3 py-1.5 text-xs text-nk-text"
                  >
                    <FacilityIcon facility={f} />
                    {FACILITY_META[f]?.labelId || f}
                  </span>
                ))}
              </div>
            </div>

            {/* Room Types */}
            <div className="space-y-4">
              <h2 className="text-xl font-medium tracking-tight text-nk-text">
                {t("detail.roomTypes")}
              </h2>
              <div className="grid sm:grid-cols-2">
                {p.roomTypes.map((rt) => (
                  <div
                    key={rt.id}
                    className="-mb-px -mr-px border border-nk-border bg-white p-6"
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
                    {rt.available > 0 ? (
                      <BookingCta
                        propertyName={p.name}
                        dpAmount={p.dpAmount}
                        initialRoomId={rt.id}
                        rooms={p.roomTypes.filter((r) => r.available > 0)}
                        className="mt-4 inline-flex w-full items-center justify-center border border-nk-accent px-4 py-2.5 text-xs font-medium text-nk-accent transition-colors duration-200 hover:bg-nk-accent hover:text-nk-text-inverse"
                      >
                        {t("detail.pickRoom")}
                      </BookingCta>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="mt-4 inline-flex w-full items-center justify-center border border-nk-border bg-nk-section px-4 py-2.5 text-xs font-medium text-nk-text-muted cursor-not-allowed opacity-60"
                      >
                        {t("detail.pickRoom")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Rules & Requirements / Aturan & Persyaratan Kos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium tracking-tight text-nk-text">
                  {isEn ? "Rental Rules & Requirements" : "Aturan & Persyaratan Kos"}
                </h2>
                <span className="text-xs text-nk-text-muted">
                  {rulesData.rules.length} {isEn ? "rules apply" : "ketentuan berlaku"}
                </span>
              </div>

              <div className="border border-nk-border bg-white p-6 space-y-6">
                {/* Visual Highlights Badges */}
                <div className="flex flex-wrap gap-2 pb-4 border-b border-nk-border">
                  {rulesData.highlights.map((h, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border",
                        h.tone === "green" && "border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]",
                        h.tone === "blue" && "border-blue-200 bg-blue-50 text-blue-800",
                        h.tone === "amber" && "border-[#EAD9A8] bg-[#FBF3DC] text-[#8A6A1F]",
                        h.tone === "neutral" && "border-nk-border bg-stone-50 text-nk-text"
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current opacity-70" />
                      {h.label}
                    </span>
                  ))}
                </div>

                {/* Structured Rules Checklist */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {rulesData.rules.map((rule, idx) => {
                    const isBan = /dilarang|tidak boleh|denda/i.test(rule);
                    const isDoc = /ktp|kk|buku nikah|dokumen|kartu keluarga/i.test(rule);
                    const isAccess = /jam malam|akses|24 jam/i.test(rule);

                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-nk-border/70 bg-stone-50/50 p-3.5 text-xs text-nk-text"
                      >
                        <div
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full mt-0.5",
                            isBan
                              ? "bg-rose-100 text-rose-700"
                              : isDoc
                                ? "bg-amber-100 text-amber-800"
                                : isAccess
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-emerald-100 text-emerald-800"
                          )}
                        >
                          {isBan ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        <span className="leading-relaxed">{rule}</span>
                      </div>
                    );
                  })}
                </div>

                {rulesData.patokan && (
                  <div className="flex items-center gap-2 pt-3 border-t border-nk-border text-xs text-nk-text-muted">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-nk-accent">
                      <circle cx="12" cy="10" r="3" />
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    </svg>
                    <span><strong>Patokan Lokasi:</strong> {rulesData.patokan}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Deposit */}
            <div className="space-y-4">
              <h2 className="text-xl font-medium tracking-tight text-nk-text">
                {t("detail.deposit")}
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-nk-text-muted">
                {p.depositInfo}
              </p>
            </div>

            {/* Reviews & Ratings */}
            <div className="pt-4 border-t border-nk-border">
              <PropertyReviewsSection
                propertyId={p.id}
                propertySlug={p.slug}
                propertyName={p.name}
                initialRating={p.rating}
                initialReviewCount={p.reviewCount}
              />
            </div>
          </div>

          {/* Sidebar - CTA */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-nk-dark-border bg-white p-6">
              <div className="space-y-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-nk-text">
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

                <div className="space-y-3 border-t border-nk-border pt-5">
                  <BookingSidebarActions
                    propertyName={p.name}
                    dpAmount={p.dpAmount ?? 0}
                    rooms={p.roomTypes.filter((r) => r.available > 0)}
                  />
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 border border-stone-300 bg-white px-6 py-3.5 text-sm font-medium text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {t("detail.call")}
                  </a>

                  {/* Report Kos button */}
                  <div className="flex items-center justify-center pt-2 border-t border-nk-border/60">
                    <ReportPropertyModal
                      propertyId={p.id}
                      propertySlug={p.slug}
                      propertyName={p.name}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
    </BookingFlowProvider>
  );
}
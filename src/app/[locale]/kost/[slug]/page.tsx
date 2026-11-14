import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPropertyBySlug, getVerifiedProperties, getMinAvailablePrice, getTotalAvailableRooms, ensureRoomTypeFacilities } from "@/lib/data/properties";
import { FACILITY_META, ROOM_FACILITY_KEYS } from "@/lib/data/facilities";
import { getNearbyPlaces, type NearbyPlace } from "@/lib/data/nearbyPlaces";
import { formatIDR, formatDistance, cn } from "@/lib/utils";
import BookingCta from "@/components/BookingCta";
import FacilityIcon from "@/components/FacilityIcon";
import BookingSidebarActions from "@/components/BookingSidebarActions";
import { BookingFlowProvider } from "@/components/BookingFlowProvider";
import FavoriteButton from "@/components/FavoriteButton";
import PropertyReviewsSection from "@/components/PropertyReviewsSection";
import ReportPropertyModal from "@/components/ReportPropertyModal";
import PropertyGallery from "@/components/PropertyGallery";
import PropertyDetailSubNav from "@/components/kost/PropertyDetailSubNav";
import { getProperty, propertyDto } from "@/server/property-service";
import { getKosImage, getKosGalleryItems } from "@/lib/kosImages";
import type { Property, Gender, Facility } from "@/lib/data/types";
import {
  parsePropertyRules,
  type RuleCategory,
  type RuleCategoryKey,
  type RuleItem,
  type RuleIconKey,
} from "@/lib/data/propertyRules";
import {
  Users,
  Clock,
  DoorOpen,
  DoorClosed,
  Ban,
  FileText,
  MapPin,
  CheckCircle2,
  Info,
  Navigation,
  ShieldCheck,
  Utensils,
  ShoppingCart,
  Landmark,
  GraduationCap,
  Hospital,
  Store,
  KeyRound,
  Moon,
  Heart,
  Cigarette,
  PawPrint,
  VolumeX,
  Sparkles,
  IdCard,
  CreditCard,
} from "lucide-react";

import PropertyLocationMap from "@/components/PropertyLocationMap";

const POI_ICONS: Record<NearbyPlace["iconType"], React.ComponentType<{ className?: string }>> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  worship: Landmark,
  "graduation-cap": GraduationCap,
  hospital: Hospital,
  mall: Store,
};

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
    dpAmount: dto.depositAmount ?? undefined,
    depositInfo: dto.depositAmount ? `DP Rp ${dto.depositAmount.toLocaleString("id-ID")}` : "Tanpa deposit",
    latitude: dto.latitude ?? undefined,
    longitude: dto.longitude ?? undefined,
    verificationStatus: dto.status === "VERIFIED" ? "verified" : dto.status === "REJECTED" ? "rejected" : "pending",
    owner: dto.owner,
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

export type { RuleItem, RuleCategoryKey, RuleCategory, RuleIconKey };

const RULE_ICONS: Record<RuleIconKey, React.ComponentType<{ className?: string }>> = {
  key: KeyRound,
  clock: Clock,
  moon: Moon,
  users: Users,
  heart: Heart,
  "door-closed": DoorClosed,
  "door-open": DoorOpen,
  cigarette: Cigarette,
  paw: PawPrint,
  ban: Ban,
  "volume-x": VolumeX,
  sparkles: Sparkles,
  "id-card": IdCard,
  "credit-card": CreditCard,
  "file-text": FileText,
  check: CheckCircle2,
  info: Info,
};

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
    if (dbProp) p = ensureRoomTypeFacilities(toUiProperty(dbProp));
  } catch {
    p = null;
  }
  if (!p) {
    const staticSeed = getPropertyBySlug(slug);
    p = staticSeed ? ensureRoomTypeFacilities(staticSeed) : null;
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
    if (dbProp) p = ensureRoomTypeFacilities(toUiProperty(dbProp));
  } catch {
    p = null;
  }
  if (!p) {
    const staticSeed = getPropertyBySlug(slug);
    p = staticSeed ? ensureRoomTypeFacilities(staticSeed) : null;
  }

  if (!p) notFound();

  const rulesData = parsePropertyRules(p);
  const sharedFacilities = p.facilities.filter((f) => !ROOM_FACILITY_KEYS.includes(f));
  const nearbyPlaces = getNearbyPlaces({
    city: p.city,
    district: p.district,
    address: p.address,
    distanceToCampusM: p.distanceToCampusM,
  });

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
      <PropertyDetailSubNav
        propertyName={p.name}
        minPrice={getMinAvailablePrice(p)}
        isAvailable={getTotalAvailableRooms(p) > 0}
        isEn={isEn}
      />
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
        <div id="foto-properti">
          <PropertyGallery
            propertyName={p.name}
            propertySlug={p.slug}
            images={getKosGalleryItems(p.slug || p.imageSeed, p.name)}
            tViewAll={t("detail.viewAllPhotos")}
            tClose={t("detail.closeGallery")}
          />
        </div>

        {/* Body */}
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
          <div className="divide-y divide-nk-border">
            {/* Header */}
            <div className="pb-8 space-y-4">
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

            {/* 1. Deskripsi Kos (Catatan dari Pemilik Kos) */}
            <section className="py-8 space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight text-nk-text">
                {t("detail.description")}
              </h2>
              <p className="text-sm leading-relaxed text-nk-text/80 whitespace-pre-line max-w-3xl">
                {rulesData.cleanDescription}
              </p>
            </section>

            {/* 2. Spesifikasi Tipe Kamar & Pilihan Kamar */}
            <section id="fasilitas-kamar" className="py-8 space-y-5">
              <h2 className="text-2xl font-semibold tracking-tight text-nk-text">
                {t("detail.roomTypes")}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {p.roomTypes.map((rt) => (
                  <div
                    key={rt.id}
                    className="flex flex-col justify-between border border-nk-border bg-white p-5 transition-shadow hover:shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-nk-text">
                            {rt.name}
                          </h3>
                          <p className="text-xs text-nk-text-muted mt-0.5">
                            {rt.sizeM2} m&sup2; ({Math.round(Math.sqrt(rt.sizeM2))} x {Math.round(rt.sizeM2 / Math.max(1, Math.round(Math.sqrt(rt.sizeM2))))} m)
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 text-[11px] font-medium border",
                            rt.available > 0
                              ? "border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]"
                              : "border-stone-200 bg-stone-100 text-stone-500"
                          )}
                        >
                          {rt.available > 0
                            ? `${rt.available} ${t("detail.availableNow")}`
                            : t("detail.full")}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 pt-2 border-t border-nk-border/60">
                        <span className="text-xl font-semibold text-nk-text">
                          {formatIDR(rt.pricePerMonth)}
                        </span>
                        <span className="text-xs text-nk-text-muted">
                          {t("detail.perMonth")}
                        </span>
                      </div>

                      {/* Fasilitas Kamar Spesifik Tipe Ini */}
                      {rt.facilities && rt.facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-nk-border/60">
                          {rt.facilities.map((f) => {
                            const meta = FACILITY_META[f];
                            const label = isEn ? (meta?.labelEn || f) : (meta?.labelId || f);
                            return (
                              <span
                                key={f}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border border-nk-border/80 bg-stone-50 text-nk-text"
                              >
                                <FacilityIcon facility={f} className="size-3.5 opacity-80" />
                                <span>{label}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-nk-border/60">
                      {rt.available > 0 ? (
                        <BookingCta
                          propertyName={p.name}
                          dpAmount={p.dpAmount}
                          initialRoomId={rt.id}
                          rooms={p.roomTypes.filter((r) => r.available > 0)}
                          className="inline-flex w-full items-center justify-center border border-nk-accent bg-nk-accent px-4 py-2.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-nk-accent/90"
                        >
                          {t("detail.pickRoom")}
                        </BookingCta>
                      ) : (
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="inline-flex w-full items-center justify-center border border-nk-border bg-stone-100 px-4 py-2.5 text-xs font-medium text-nk-text-muted cursor-not-allowed opacity-70"
                        >
                          {t("detail.pickRoom")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Fasilitas Bersama (Umum) */}
            <section id="fasilitas-umum" className="py-8 space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-nk-text">
                {t("detail.sharedFacilities")}
              </h2>

              {sharedFacilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 pt-1">
                  {sharedFacilities.map((f) => {
                    const meta = FACILITY_META[f];
                    const label = isEn ? (meta?.labelEn || f) : (meta?.labelId || f);
                    return (
                      <div key={f} className="flex items-center gap-3">
                        <FacilityIcon facility={f} className="size-6 shrink-0 opacity-90" />
                        <span className="text-sm sm:text-[15px] font-medium text-nk-text leading-tight">{label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-nk-text-muted italic py-1">
                  {t("detail.noSharedFacilities")}
                </p>
              )}
            </section>

            {/* 4. Ketentuan & Aturan Kos (Per Kategori Sebagai Section Mandiri) */}
            {rulesData.categories.map((category) => {
              const title = isEn ? category.titleEn : category.titleId;
              return (
                <section key={category.key} className="py-8 space-y-4">
                  <h2 className="text-2xl font-semibold tracking-tight text-nk-text">
                    {title}
                  </h2>
                  <ul className="space-y-3">
                    {category.items.map((item, iIdx) => {
                      const Icon = RULE_ICONS[item.iconKey || "info"] || Info;
                      return (
                        <li
                          key={iIdx}
                          className="flex items-center gap-3 text-sm text-nk-text leading-relaxed"
                        >
                          <Icon
                            className="size-4 shrink-0 text-nk-accent"
                            aria-hidden="true"
                          />
                          <span>{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            {/* 6. Lokasi & Lingkungan Sekitar (Maps + Automated Nearby POIs) */}
            <section id="lokasi" className="py-8 space-y-5">
              <h2 className="text-2xl font-semibold tracking-tight text-nk-text">
                {t("detail.neighborhoodTitle")}
              </h2>

              <div className="space-y-4 text-xs text-nk-text">
                <div className="flex items-start gap-3 border border-nk-border/80 bg-stone-50/50 p-4">
                  <MapPin className="size-4 shrink-0 text-nk-accent mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-nk-text">{p.address}</p>
                    <p className="text-nk-text-muted">{p.district}, {p.city}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-1 text-nk-text-muted">
                  <Navigation className="size-3.5 shrink-0 text-nk-accent" />
                  <span>{formatDistance(p.distanceToCampusM)} {t("detail.distance")}</span>
                </div>

                {rulesData.patokan && (
                  <div className="flex items-start gap-3 border border-amber-200 bg-[#FBF8EF] p-4 text-xs text-[#7A5A17]">
                    <Navigation className="size-4 shrink-0 text-[#8A6A1F] mt-0.5" />
                    <div>
                      <span className="font-semibold block text-[13px] text-[#5A410E]">
                        {t("detail.landmark")}
                      </span>
                      <p className="mt-0.5 leading-relaxed">{rulesData.patokan}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Location Map */}
              <div className="pt-2">
                <PropertyLocationMap
                  lat={p.latitude}
                  lng={p.longitude}
                  propertyName={p.name}
                  address={p.address}
                  city={p.city}
                  district={p.district}
                />
              </div>

              {/* Tempat Terdekat Sekitar Kos (Automated POIs matching reference image) */}
              <div className="pt-4 border-t border-nk-border/70">
                <div className="mb-4">
                  <h3 className="text-base font-semibold tracking-tight text-nk-text">
                    {t("detail.nearbyTitle")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  {nearbyPlaces.map((poi, idx) => {
                    const IconComponent = POI_ICONS[poi.iconType] || MapPin;
                    return (
                      <div key={idx} className="flex items-center gap-3.5">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm">
                          <IconComponent className="size-5 text-stone-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-nk-text truncate">{poi.name}</p>
                          <p className="text-xs text-nk-text-muted mt-0.5">{poi.distanceFormatted}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 7. Ketentuan Deposit & Pembayaran */}
            <section className="py-8 space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-nk-text">
                {t("detail.depositTerms")}
              </h2>
              <div className="flex items-start gap-3 border border-nk-border/80 bg-stone-50/50 p-4 text-xs text-nk-text leading-relaxed">
                <ShieldCheck className="size-4 shrink-0 text-nk-accent mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-nk-text">{p.depositInfo}</p>
                  <p className="text-nk-text-muted mt-1">
                    {isEn
                      ? "The booking deposit secures your room reservation. Remaining rental balance is settled upon check-in and key handover."
                      : "Uang muka/deposit mengikat reservasi kamar agar tidak diambil penyewa lain. Sisa pelunasan sewa diselesaikan saat serah terima kunci."}
                  </p>
                </div>
              </div>
            </section>

            {/* 8. Ulasan & Penilaian Penghuni */}
            <section id="review" className="py-8">
              <PropertyReviewsSection
                propertyId={p.id}
                propertySlug={p.slug}
                propertyName={p.name}
                initialRating={p.rating}
                initialReviewCount={p.reviewCount}
              />
            </section>

            {/* 9. Pengelola / Pemilik Kos */}
            <section id="pemilik" className="py-8 space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-nk-text">
                {isEn ? "Property Owner" : "Pemilik Kos"}
              </h2>
              <div className="flex items-center gap-4 border border-nk-border/80 bg-stone-50/50 p-5">
                <div className="flex size-14 items-center justify-center rounded-full bg-nk-accent/10 font-bold text-lg text-nk-accent shrink-0">
                  {(p.owner?.fullName || p.name).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-base text-nk-text truncate">
                      {p.owner?.fullName || `Pengelola ${p.name}`}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="size-3" />
                      {isEn ? "Verified Owner" : "Pemilik Terverifikasi"}
                    </span>
                  </div>
                  <p className="text-xs text-nk-text-muted">
                    {isEn
                      ? "Fast response · Active property manager on NgeKos"
                      : "Respon cepat · Pengelola aktif di NgeKos"}
                  </p>
                </div>
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-2 border border-nk-accent bg-nk-accent/10 px-4 py-2 text-xs font-semibold text-nk-accent transition-colors hover:bg-nk-accent hover:text-white"
                >
                  {isEn ? "Chat Owner" : "Hubungi Pemilik"}
                </a>
              </div>
            </section>
          </div>

          {/* Sidebar - CTA */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-nk-dark-border bg-white p-6">
              <div className="space-y-5">
                <div className="flex items-baseline justify-between gap-1.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight text-nk-text">
                      {formatIDR(getMinAvailablePrice(p))}
                    </span>
                    <span className="text-sm text-nk-text-muted">{t("detail.perMonth")}</span>
                  </div>
                  {getTotalAvailableRooms(p) === 0 && (
                    <span className="text-xs font-medium text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5">
                      {t("detail.full")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-nk-text-muted">
                  {getTotalAvailableRooms(p) > 0 ? (
                    <>
                      {t("detail.from")} {getTotalAvailableRooms(p)} {t("detail.available")}
                    </>
                  ) : (
                    <span>{t("detail.full")}</span>
                  )}
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
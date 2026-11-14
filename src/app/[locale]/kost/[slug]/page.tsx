import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPropertyBySlug, getVerifiedProperties } from "@/lib/data/properties";
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
import { getProperty, propertyDto } from "@/server/property-service";
import { getKosImage, getKosGalleryItems } from "@/lib/kosImages";
import type { Property, Gender, Facility } from "@/lib/data/types";
import {
  Users,
  Clock,
  DoorOpen,
  Ban,
  FileText,
  MapPin,
  CheckCircle2,
  BedDouble,
  Building2,
  Info,
  Navigation,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Utensils,
  ShoppingCart,
  Landmark,
  GraduationCap,
  Hospital,
  Store,
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

export type RuleItem = {
  text: string;
  type: "allowed" | "prohibited" | "neutral";
};

export type RuleCategoryKey = "occupancy" | "access" | "guest" | "conduct" | "documents";

export interface RuleCategory {
  key: RuleCategoryKey;
  titleId: string;
  titleEn: string;
  items: RuleItem[];
}

export function parsePropertyRules(property: Property): {
  cleanDescription: string;
  rules: string[];
  patokan?: string;
  highlights: { label: string; tone: "green" | "blue" | "amber" | "neutral" }[];
  categories: RuleCategory[];
} {
  const desc = property.description || "";
  let cleanDescription = desc;
  let parsedRules: string[] = [];
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
    parsedRules = rawRules
      .split(/\r?\n/)
      .map((line) => line.replace(/^[\s•\-\*]+/, "").trim())
      .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("patokan:"));

    cleanDescription = desc
      .replace(/(?:Aturan & Ketentuan Kos|Peraturan Kos|Persyaratan Sewa|Aturan Kos):\s*([\s\S]+)/i, "")
      .replace(/Patokan:\s*[^\n]+/i, "")
      .trim();
  } else {
    cleanDescription = desc.replace(/Patokan:\s*[^\n]+/i, "").trim();
  }

  const has24h = property.facilities?.some(
    (f) => f === "access-24h" || (typeof f === "object" && (f as any)?.key === "access-24h")
  );

  const catMap: Record<RuleCategoryKey, RuleItem[]> = {
    occupancy: [],
    access: [],
    guest: [],
    conduct: [],
    documents: [],
  };

  const classify = (text: string): { category: RuleCategoryKey; item: RuleItem } => {
    const lower = text.toLowerCase();
    const isProhibited =
      lower.includes("dilarang") ||
      lower.includes("tidak boleh") ||
      lower.includes("tidak diperkenankan") ||
      lower.includes("no smoking") ||
      lower.includes("jangan");

    const isAllowed =
      lower.includes("bebas") ||
      lower.includes("boleh") ||
      lower.includes("diperbolehkan") ||
      lower.includes("tersedia") ||
      lower.includes("24 jam") ||
      lower.includes("khusus");

    const type: RuleItem["type"] = isProhibited ? "prohibited" : isAllowed ? "allowed" : "neutral";

    if (
      lower.includes("tamu") ||
      lower.includes("kunjungan") ||
      lower.includes("lawan jenis") ||
      lower.includes("menginap")
    ) {
      return { category: "guest", item: { text, type } };
    }

    if (
      lower.includes("jam malam") ||
      lower.includes("24 jam") ||
      lower.includes("gerbang") ||
      lower.includes("kunci")
    ) {
      return { category: "access", item: { text, type } };
    }

    if (
      lower.includes("ktp") ||
      lower.includes("buku nikah") ||
      lower.includes("kartu keluarga") ||
      lower.includes("kk") ||
      lower.includes("identitas") ||
      lower.includes("dokumen") ||
      lower.includes("deposit") ||
      lower.includes("dp") ||
      lower.includes("pelunasan")
    ) {
      return { category: "documents", item: { text, type } };
    }

    if (
      lower.includes("putri") ||
      lower.includes("putra") ||
      lower.includes("campur") ||
      lower.includes("pasutri") ||
      lower.includes("kapasitas") ||
      lower.includes("orang per kamar") ||
      lower.includes("penghuni") ||
      lower.includes("kriteria") ||
      lower.includes("anak")
    ) {
      return { category: "occupancy", item: { text, type } };
    }

    return { category: "conduct", item: { text, type } };
  };

  for (const rule of parsedRules) {
    const { category, item } = classify(rule);
    catMap[category].push(item);
  }

  // Populate standard baseline items if empty to mirror Mamikos standard completeness
  if (catMap.occupancy.length === 0) {
    if (property.gender === "female") {
      catMap.occupancy.push({ text: "Khusus Penghuni Putri (Wanita)", type: "allowed" });
      catMap.occupancy.push({ text: "Maksimal 1 penghuni per kamar (biaya tambahan bila 2 orang)", type: "neutral" });
      catMap.occupancy.push({ text: "Tidak diperkenankan untuk pasutri", type: "prohibited" });
    } else if (property.gender === "male") {
      catMap.occupancy.push({ text: "Khusus Penghuni Putra (Pria)", type: "allowed" });
      catMap.occupancy.push({ text: "Maksimal 1 penghuni per kamar", type: "neutral" });
      catMap.occupancy.push({ text: "Tidak diperkenankan untuk pasutri", type: "prohibited" });
    } else {
      catMap.occupancy.push({ text: "Tipe Kos Campur (Putra & Putri di kamar/lantai terpisah)", type: "allowed" });
      catMap.occupancy.push({ text: "Pasutri diperbolehkan dengan membawa fotokopi Surat Nikah", type: "allowed" });
      catMap.occupancy.push({ text: "Maksimal 2 orang per kamar", type: "neutral" });
    }
  }

  if (catMap.access.length === 0) {
    if (has24h) {
      catMap.access.push({ text: "Akses gerbang 24 Jam (bebas jam malam)", type: "allowed" });
      catMap.access.push({ text: "Setiap penghuni diberikan kunci akses mandiri", type: "allowed" });
    } else {
      catMap.access.push({ text: "Akses gerbang ditutup pukul 23:00 WIB", type: "neutral" });
      catMap.access.push({ text: "Kepulangan larut malam wajib konfirmasi ke pengelola kos", type: "neutral" });
    }
    catMap.access.push({ text: "Wajib menutup dan mengunci kembali gerbang demi keamanan bersama", type: "neutral" });
  }

  if (catMap.guest.length === 0) {
    catMap.guest.push({ text: "Tamu lawan jenis dilarang masuk ke dalam kamar penghuni", type: "prohibited" });
    catMap.guest.push({ text: "Tamu boleh berkunjung di area ruang tamu bersama hingga pukul 21:00 WIB", type: "allowed" });
    catMap.guest.push({ text: "Tamu yang menginap wajib melapor pengelola kos sebelumnya", type: "neutral" });
  }

  if (catMap.conduct.length === 0) {
    catMap.conduct.push({ text: "Dilarang merokok di dalam kamar ber-AC atau lorong tertutup", type: "prohibited" });
    catMap.conduct.push({ text: "Dilarang membawa hewan peliharaan", type: "prohibited" });
    catMap.conduct.push({ text: "Dilarang membawa miras, narkoba, atau zat terlarang", type: "prohibited" });
    catMap.conduct.push({ text: "Menjaga ketenangan dan kenyamanan bersama setelah pukul 22:00 WIB", type: "allowed" });
    catMap.conduct.push({ text: "Menjaga kebersihan area bersama setelah selesai digunakan", type: "allowed" });
  }

  if (catMap.documents.length === 0) {
    catMap.documents.push({ text: "Wajib menyertakan foto KTP asli yang masih berlaku saat check-in", type: "allowed" });
    catMap.documents.push({ text: "Booking kamar wajib disertai deposit (DP) sesuai ketentuan", type: "neutral" });
    catMap.documents.push({ text: "Pelunasan sisa uang sewa dilakukan sebelum serah terima kunci", type: "neutral" });
  }

  const highlights: { label: string; tone: "green" | "blue" | "amber" | "neutral" }[] = [];
  if (property.gender === "female") {
    highlights.push({ label: "Khusus Putri", tone: "blue" });
  } else if (property.gender === "male") {
    highlights.push({ label: "Khusus Putra", tone: "blue" });
  } else {
    highlights.push({ label: "Campur (Putra/Putri)", tone: "neutral" });
  }

  if (has24h || catMap.access.some((i) => i.text.toLowerCase().includes("24 jam"))) {
    highlights.push({ label: "Akses 24 Jam", tone: "green" });
  } else {
    highlights.push({ label: "Jam Malam Berlaku", tone: "amber" });
  }

  highlights.push({ label: "Wajib KTP", tone: "neutral" });

  const allRulesText = [
    ...catMap.occupancy,
    ...catMap.access,
    ...catMap.guest,
    ...catMap.conduct,
    ...catMap.documents,
  ].map((i) => i.text.toLowerCase());

  if (allRulesText.some((t) => t.includes("pasutri") && !t.includes("tidak"))) {
    highlights.push({ label: "Boleh Pasutri (Buku Nikah)", tone: "green" });
  } else {
    highlights.push({ label: "Tanpa Pasutri", tone: "neutral" });
  }

  if (allRulesText.some((t) => t.includes("boleh bawa hewan") || (t.includes("hewan") && !t.includes("dilarang")))) {
    highlights.push({ label: "Boleh Bawa Hewan", tone: "neutral" });
  }

  const categories: RuleCategory[] = [
    {
      key: "occupancy",
      titleId: "Tipe & Kapasitas Penghuni",
      titleEn: "Occupancy & Tenant Type",
      items: catMap.occupancy,
    },
    {
      key: "access",
      titleId: "Akses & Jam Malam",
      titleEn: "Access & Curfew",
      items: catMap.access,
    },
    {
      key: "guest",
      titleId: "Kebijakan Tamu",
      titleEn: "Guest Policy",
      items: catMap.guest,
    },
    {
      key: "conduct",
      titleId: "Ketertiban & Larangan",
      titleEn: "Conduct & Prohibitions",
      items: catMap.conduct,
    },
    {
      key: "documents",
      titleId: "Syarat & Dokumen Sewa",
      titleEn: "Documents & Requirements",
      items: catMap.documents,
    },
  ];

  const flatRules = categories.flatMap((c) => c.items.map((i) => i.text));

  return {
    cleanDescription: cleanDescription || desc,
    rules: flatRules,
    patokan,
    highlights,
    categories,
  };
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
  const roomFacilities = p.facilities.filter((f) => ROOM_FACILITY_KEYS.includes(f));
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
              <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                {t("detail.description")}
              </h2>
              <p className="text-sm leading-relaxed text-nk-text/80 whitespace-pre-line max-w-3xl">
                {rulesData.cleanDescription}
              </p>
            </section>

            {/* 2. Spesifikasi Tipe Kamar & Pilihan Kamar */}
            <section className="py-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <BedDouble className="size-5 text-nk-text-muted" />
                    <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                      {t("detail.roomTypes")}
                    </h2>
                  </div>
                  <p className="text-xs text-nk-text-muted mt-1">
                    {isEn ? "Select your room type, dimension, and monthly rate" : "Pilih tipe kamar, luas ruangan, dan harga sewa bulanan"}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-700 border border-nk-border">
                  {p.roomTypes.length} {t("card.roomTypes")}
                </span>
              </div>

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

            {/* 3. Fasilitas Kamar (Pribadi) */}
            <section className="py-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-nk-text-muted" />
                    <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                      {t("detail.roomFacilities")}
                    </h2>
                  </div>
                  <p className="text-xs text-nk-text-muted mt-1">
                    {t("detail.roomFacilitiesSub")}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-700 border border-nk-border">
                  {roomFacilities.length} {isEn ? "items" : "fasilitas"}
                </span>
              </div>

              {roomFacilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roomFacilities.map((f) => {
                    const meta = FACILITY_META[f];
                    const label = isEn ? (meta?.labelEn || f) : (meta?.labelId || f);
                    return (
                      <div
                        key={f}
                        className="flex items-center justify-between gap-2 border border-nk-border/80 bg-white p-3.5 text-xs text-nk-text"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FacilityIcon facility={f} />
                          <span className="font-medium truncate">{label}</span>
                        </div>
                        <CheckCircle2 className="size-4 shrink-0 text-[#2F6B3C]" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-nk-text-muted italic bg-stone-50 border border-nk-border p-4">
                  {t("detail.noRoomFacilities")}
                </p>
              )}
            </section>

            {/* 4. Fasilitas Bersama (Umum) */}
            <section className="py-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="size-5 text-nk-text-muted" />
                    <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                      {t("detail.sharedFacilities")}
                    </h2>
                  </div>
                  <p className="text-xs text-nk-text-muted mt-1">
                    {t("detail.sharedFacilitiesSub")}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-700 border border-nk-border">
                  {sharedFacilities.length} {isEn ? "items" : "fasilitas"}
                </span>
              </div>

              {sharedFacilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {sharedFacilities.map((f) => {
                    const meta = FACILITY_META[f];
                    const label = isEn ? (meta?.labelEn || f) : (meta?.labelId || f);
                    return (
                      <div
                        key={f}
                        className="flex items-center justify-between gap-2 border border-nk-border/80 bg-white p-3.5 text-xs text-nk-text"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FacilityIcon facility={f} />
                          <span className="font-medium truncate">{label}</span>
                        </div>
                        <CheckCircle2 className="size-4 shrink-0 text-[#2F6B3C]" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-nk-text-muted italic bg-stone-50 border border-nk-border p-4">
                  {t("detail.noSharedFacilities")}
                </p>
              )}
            </section>

            {/* 5. Peraturan & Ketentuan Menginap */}
            <section className="py-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-nk-text-muted" />
                    <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                      {t("detail.rulesTitle")}
                    </h2>
                  </div>
                  <p className="text-xs text-nk-text-muted mt-1">
                    {t("detail.rulesSubtitle")}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-stone-100 text-stone-700 border border-nk-border">
                  {rulesData.categories.reduce((acc, c) => acc + c.items.length, 0)} {isEn ? "policies" : "ketentuan"}
                </span>
              </div>

              {/* Quick scanning highlight badges */}
              <div className="flex flex-wrap gap-2">
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

              {/* Categorized Rules Grid */}
              <div className="grid gap-6 sm:grid-cols-2 pt-2">
                {rulesData.categories.map((category) => {
                  const icon =
                    category.key === "occupancy" ? (
                      <Users className="size-4 text-stone-600" />
                    ) : category.key === "access" ? (
                      <Clock className="size-4 text-stone-600" />
                    ) : category.key === "guest" ? (
                      <DoorOpen className="size-4 text-stone-600" />
                    ) : category.key === "conduct" ? (
                      <Ban className="size-4 text-stone-600" />
                    ) : (
                      <FileText className="size-4 text-stone-600" />
                    );

                  const title = isEn ? category.titleEn : category.titleId;

                  return (
                    <div
                      key={category.key}
                      className={cn(
                        "space-y-2.5",
                        category.key === "conduct" && "sm:col-span-2"
                      )}
                    >
                      <div className="flex items-center gap-2 border-b border-nk-border/70 pb-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                          {icon}
                        </div>
                        <h3 className="text-sm font-semibold text-nk-text">{title}</h3>
                      </div>

                      <ul className="space-y-2">
                        {category.items.map((item, iIdx) => (
                          <li
                            key={iIdx}
                            className="flex items-start gap-2.5 text-xs text-nk-text leading-relaxed"
                          >
                            {item.type === "prohibited" ? (
                              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                                <Ban className="size-2.5" />
                              </span>
                            ) : item.type === "allowed" ? (
                              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="size-2.5" />
                              </span>
                            ) : (
                              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-700">
                                <Info className="size-2.5" />
                              </span>
                            )}
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 6. Lokasi & Lingkungan Sekitar (Maps + Automated Nearby POIs) */}
            <section className="py-8 space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-5 text-nk-text-muted" />
                  <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                    {t("detail.neighborhoodTitle")}
                  </h2>
                </div>
                <p className="text-xs text-nk-text-muted mt-1">
                  {isEn ? "Property address, interactive map, and surrounding essential spots" : "Alamat lengkap kos, peta lokasi interaktif, dan tempat penting di sekitar"}
                </p>
              </div>

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
                  <p className="text-xs text-nk-text-muted mt-0.5">
                    {t("detail.nearbySubtitle")}
                  </p>
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
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="size-5 text-nk-text-muted" />
                  <h2 className="text-xl font-semibold tracking-tight text-nk-text">
                    {t("detail.depositTerms")}
                  </h2>
                </div>
                <p className="text-xs text-nk-text-muted mt-1">
                  {isEn ? "Security deposit details and initial payment terms" : "Keterangan uang muka / deposit dan syarat pelunasan sewa"}
                </p>
              </div>
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
            <section className="py-8">
              <PropertyReviewsSection
                propertyId={p.id}
                propertySlug={p.slug}
                propertyName={p.name}
                initialRating={p.rating}
                initialReviewCount={p.reviewCount}
              />
            </section>
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
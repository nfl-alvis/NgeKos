import type { Property } from "@/lib/data/types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";

export function getWebSiteSchema(locale: string = "id") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "NgeKos",
    alternateName: [
      "Ngekos",
      "NgeKos App",
      "Ngekos Indonesia",
      "Ngekos Malang",
      "ngekos.biz.id",
      "NgeKost",
    ],
    url: `${BASE_URL}/${locale}`,
    description:
      "Platform pencarian dan sewa kost terverifikasi di Indonesia. Foto asli, harga transparan, fasilitas lengkap, dan jaminan bebas penipuan.",
    inLanguage: ["id-ID", "en-US"],
    publisher: {
      "@id": `${BASE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/${locale}/kost?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "NgeKos",
    legalName: "NgeKos Indonesia",
    url: BASE_URL,
    logo: `${BASE_URL}/assets/logo.png`,
    image: `${BASE_URL}/assets/hero-bg.png`,
    description:
      "Platform pencarian dan sistem sewa kost terverifikasi untuk anak kos dan pemilik properti di Indonesia.",
    email: "support@ngekos.biz.id",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Malang",
      addressRegion: "Jawa Timur",
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -7.983908,
      longitude: 112.621391,
    },
    sameAs: [
      "https://t.me/ngekos_bot",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@ngekos.biz.id",
      areaServed: "ID",
      availableLanguage: ["Indonesian", "English"],
    },
  };
}

export function getPropertySchema(property: Property, locale: string = "id", imageUrls: string[] = []) {
  const images = imageUrls.length > 0
    ? imageUrls
    : [`${BASE_URL}/assets/hero-bg.png`];

  const genderLabel =
    property.gender === "female"
      ? "Kost Putri"
      : property.gender === "male"
      ? "Kost Putra"
      : "Kost Campur";

  return {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "ApartmentComplex"],
    "@id": `${BASE_URL}/${locale}/kost/${property.slug}#lodging`,
    name: `${property.name} (${genderLabel})`,
    description: property.description || property.tagline,
    url: `${BASE_URL}/${locale}/kost/${property.slug}`,
    image: images,
    priceRange: `Rp ${property.minPrice.toLocaleString("id-ID")}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.district,
      addressRegion: property.city,
      addressCountry: "ID",
    },
    ...(property.latitude && property.longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          },
        }
      : {}),
    ...(property.rating && property.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: property.rating,
            reviewCount: property.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    amenityFeature: property.facilities.map((fac) => ({
      "@type": "LocationFeatureSpecification",
      name: fac,
      value: true,
    })),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IDR",
      lowPrice: property.minPrice,
      offerCount: property.roomTypes.reduce((acc, rt) => acc + (rt.available || 0), 0),
      availability: property.roomTypes.some((rt) => rt.available > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

export function getFaqSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

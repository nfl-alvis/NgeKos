import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import "@/app/globals.css";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import { SessionProvider } from "@/components/SessionProvider";
import JsonLd from "@/components/seo/JsonLd";
import { getWebSiteSchema, getOrganizationSchema } from "@/lib/seo/schema";

const sans = localFont({
  src: "../../fonts/Inter-VariableFont.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const defaultTitle = isEn
    ? "NgeKos - Verified Boarding House & Kost Rental in Indonesia"
    : "NgeKos - Cari Kost Terverifikasi & Sewa Kos Murah Bebas Ribet";

  const description = isEn
    ? "Discover verified boarding houses (kost) across Indonesia with 100% genuine photos, transparent pricing, complete amenities, and zero hidden fees. Book safely on NgeKos."
    : "Platform cari dan sewa kost terverifikasi di Indonesia. Temukan kost putra, putri, dan campur dekat kampus dengan foto asli, harga transparan, fasilitas lengkap, dan jaminan bebas penipuan.";

  const keywords = [
    "ngekos",
    "ngekost",
    "cari kost",
    "sewa kost",
    "kost malang",
    "kost terverifikasi",
    "kost dekat kampus",
    "kost ub",
    "kost um",
    "kost polinema",
    "kost murah",
    "kost putri",
    "kost putra",
    "kost campur",
    "kost eksklusif",
    "aplikasi kost",
    "sewa kamar kos",
    "kost indonesia",
    "boarding house malang",
    "ngekos.biz.id",
  ];

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: defaultTitle,
      template: "%s | NgeKos",
    },
    description,
    keywords,
    applicationName: "NgeKos",
    authors: [{ name: "NgeKos Team", url: BASE_URL }],
    creator: "NgeKos",
    publisher: "NgeKos",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "id-ID": "/id",
        "en-US": "/en",
        "x-default": "/id",
      },
    },
    openGraph: {
      title: defaultTitle,
      description,
      url: `${BASE_URL}/${locale}`,
      siteName: "NgeKos",
      locale: isEn ? "en_US" : "id_ID",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/assets/hero-bg.png`,
          width: 1200,
          height: 630,
          alt: "NgeKos - Platform Cari & Sewa Kost Terverifikasi Indonesia",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      images: [`${BASE_URL}/assets/hero-bg.png`],
      site: "@ngekosid",
      creator: "@ngekosid",
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    other: {
      "geo.region": "ID-JI",
      "geo.placename": "Malang, Jawa Timur, Indonesia",
      "geo.position": "-7.983908;112.621391",
      "ICBM": "-7.983908, 112.621391",
      rating: "general",
      target: "all",
      HandheldFriendly: "True",
      MobileOptimized: "320",
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  const webSiteSchema = getWebSiteSchema(locale);
  const organizationSchema = getOrganizationSchema();

  return (
    <html lang={locale} className={`${sans.variable}`}>
      <head>
        <JsonLd data={webSiteSchema} />
        <JsonLd data={organizationSchema} />
      </head>
      <body className={`${sans.className} ${sans.variable} grain min-h-dvh flex flex-col bg-nk-bg text-nk-text antialiased selection:bg-nk-accent selection:text-white`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[99] focus:rounded-md focus:bg-nk-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white">
          {(messages as unknown as { common?: { skip?: string } })?.common?.skip || "Skip to content"}
        </a>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <ConditionalNavbar />
            <main id="main-content" className="flex-1">{children}</main>
            <ConditionalFooter />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

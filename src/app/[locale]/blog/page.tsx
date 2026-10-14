import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import BlogIndexClient from "./BlogIndexClient";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "Blog & Boarding House Rental Guides | NgeKos"
    : "Blog, Tips Kost, & Panduan Sewa Anak Kos | NgeKos";
  const description = isEn
    ? "Helpful guides, budget tips, campus life hacks, and boarding house advice for students and renters across Indonesia."
    : "Kumpulan artikel tips mencari kost, panduan hemat anak kos, info seputar kehidupan kampus di Malang dan kota-kota besar di Indonesia.";

  return {
    title,
    description,
    keywords: [
      "tips anak kos",
      "panduan cari kost",
      "kost malang",
      "kehidupan kampus",
      "blog sewa kost",
      "ngekos",
    ],
    alternates: {
      canonical: `/${locale}/blog`,
      languages: {
        "id-ID": "/id/blog",
        "en-US": "/en/blog",
      },
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/blog`,
      siteName: "NgeKos",
      type: "website",
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <BlogIndexClient />;
}

import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import FaqClient from "./FaqClient";
import JsonLd from "@/components/seo/JsonLd";
import { getFaqSchema } from "@/lib/seo/schema";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn
    ? "Frequently Asked Questions (FAQ) | NgeKos"
    : "Pertanyaan Umum (FAQ) Seputar Sewa Kost | NgeKos";
  const description = isEn
    ? "Find answers about booking boarding houses, payments, verified listings, and owner management on NgeKos."
    : "Temukan jawaban lengkap seputar cara booking kos, metode pembayaran, keamanan transaksi, dan manajemen pemilik di NgeKos.";

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/faq`,
      languages: {
        "id-ID": "/id/faq",
        "en-US": "/en/faq",
      },
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/faq`,
      siteName: "NgeKos",
      type: "website",
    },
  };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });
  const groups = t.raw("groups") as Record<string, string>;
  const items = t.raw("items") as Record<string, string>;

  const faqItems = [
    { q: items.q1, a: items.a1 },
    { q: items.q2, a: items.a2 },
    { q: items.q3, a: items.a3 },
    { q: items.q4, a: items.q4a || items.a4 },
    { q: items.q5, a: items.a5 },
    { q: items.q6, a: items.a6 },
    { q: items.q7, a: items.a7 },
    { q: items.q8, a: items.a8 },
  ].filter((item) => item.q && item.a);

  const faqSchema = getFaqSchema(faqItems);

  return (
    <>
      <JsonLd data={faqSchema} />
      <FaqClient groups={groups} items={items} />
    </>
  );
}

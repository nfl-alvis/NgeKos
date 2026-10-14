import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import BlogDetailClient from "./BlogDetailClient";
import JsonLd from "@/components/seo/JsonLd";
import { getBreadcrumbSchema } from "@/lib/seo/schema";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

interface PostData {
  title: string;
  excerpt?: string;
  author?: string;
  date?: string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = t.raw("posts") as Record<string, PostData>;
  const post = posts[slug];
  if (!post) return { title: "Blog" };

  const title = `${post.title} | NgeKos Blog`;
  const description = post.excerpt || "Baca artikel panduan sewa kost dari tim NgeKos.";

  return {
    title,
    description,
    authors: post.author ? [{ name: post.author }] : undefined,
    alternates: {
      canonical: `/${locale}/blog/${slug}`,
      languages: {
        "id-ID": `/id/blog/${slug}`,
        "en-US": `/en/blog/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/blog/${slug}`,
      siteName: "NgeKos",
      type: "article",
      images: [
        {
          url: `${BASE_URL}/assets/hero-bg.png`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/assets/hero-bg.png`],
    },
  };
}

export function generateStaticParams() {
  return [];
}

export default async function BlogDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = t.raw("posts") as Record<string, PostData>;
  const post = posts[slug];
  if (!post) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author || "NgeKos Editorial Team",
    },
    publisher: {
      "@type": "Organization",
      name: "NgeKos",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/assets/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/${locale}/blog/${slug}`,
    },
    image: `${BASE_URL}/assets/hero-bg.png`,
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: locale === "en" ? "Home" : "Beranda", url: `/${locale}` },
    { name: "Blog", url: `/${locale}/blog` },
    { name: post.title, url: `/${locale}/blog/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <BlogDetailClient slug={slug} />
    </>
  );
}

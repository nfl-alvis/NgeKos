import type { MetadataRoute } from "next";
import { properties } from "@/lib/data/properties";
import postsId from "../../messages/id.json";
import postsEn from "../../messages/en.json";
import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";

const BLOG_SLUGS_ID = Object.keys(postsId.blog?.posts || {});
const BLOG_SLUGS_EN = Object.keys(postsEn.blog?.posts || {});

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/kost",
    "/about",
    "/blog",
    "/careers",
    "/mitra",
    "/help",
    "/faq",
    "/legal/syarat-ketentuan",
    "/legal/privasi",
  ];

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    const blogPosts = locale === "en" ? BLOG_SLUGS_EN : BLOG_SLUGS_ID;

    for (const path of staticPaths) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency: path === "" || path === "/kost" ? "daily" : "weekly",
        priority: path === "" ? 1.0 : path === "/kost" ? 0.9 : 0.7,
        alternates: {
          languages: {
            id: `${BASE_URL}/id${path}`,
            en: `${BASE_URL}/en${path}`,
          },
        },
      });
    }

    for (const property of properties) {
      entries.push({
        url: `${BASE_URL}/${locale}/kost/${property.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.9,
        alternates: {
          languages: {
            id: `${BASE_URL}/id/kost/${property.slug}`,
            en: `${BASE_URL}/en/kost/${property.slug}`,
          },
        },
      });
    }

    for (const slug of blogPosts) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: {
            id: `${BASE_URL}/id/blog/${slug}`,
            en: `${BASE_URL}/en/blog/${slug}`,
          },
        },
      });
    }
  }

  return entries;
}

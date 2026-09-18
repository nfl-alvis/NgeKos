import type { MetadataRoute } from "next";
import { properties } from "@/lib/data/properties";
import postsId from "../../messages/id.json";
import postsEn from "../../messages/en.json";
import { routing } from "@/i18n/routing";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ngekost.id";

const BLOG_SLUGS_ID = Object.keys(postsId.blog.posts);
const BLOG_SLUGS_EN = Object.keys(postsEn.blog.posts);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/kost",
    "/about",
    "/blog",
    "/karir",
    "/mitra",
    "/bantuan",
    "/faq",
    "/legal/syarat-ketentuan",
    "/legal/privasi",
    "/login",
    "/register",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    const blogPosts = locale === "en" ? BLOG_SLUGS_EN : BLOG_SLUGS_ID;

    for (const path of staticPaths) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }

    for (const property of properties) {
      entries.push({
        url: `${BASE_URL}/${locale}/kost/${property.slug}`,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    for (const slug of blogPosts) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${slug}`,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}

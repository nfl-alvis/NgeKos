import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.ngekos.biz.id";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/kost", "/about", "/blog", "/careers", "/mitra", "/help", "/faq", "/legal/"],
        disallow: [
          "/admin",
          "/admin/*",
          "/owner",
          "/owner/*",
          "/tenant",
          "/tenant/*",
          "/dashboard",
          "/dashboard/*",
          "/bookings",
          "/bookings/*",
          "/*/admin",
          "/*/admin/*",
          "/*/owner",
          "/*/owner/*",
          "/*/tenant",
          "/*/tenant/*",
          "/*/dashboard",
          "/*/dashboard/*",
          "/*/bookings",
          "/*/bookings/*",
          "/api/admin",
          "/api/admin/*",
          "/api/owner",
          "/api/owner/*",
          "/api/auth",
          "/api/auth/*",
        ],
      },
      // Izinkan AI Search & Crawlers untuk Generative Engine Optimization (GEO)
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "PerplexityBot",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
          "cohere-ai",
          "Bytespider",
        ],
        allow: ["/", "/kost", "/about", "/blog", "/careers", "/mitra", "/help", "/faq", "/llms.txt", "/llms-full.txt"],
        disallow: [
          "/admin/*",
          "/owner/*",
          "/tenant/*",
          "/dashboard/*",
          "/bookings/*",
          "/*/admin/*",
          "/*/owner/*",
          "/*/tenant/*",
          "/*/dashboard/*",
          "/*/bookings/*",
          "/api/*",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: "www.ngekos.biz.id",
  };
}

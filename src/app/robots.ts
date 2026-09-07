import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ngekost.id";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/id/admin/", "/en/admin/", "/id/owner/", "/en/owner/", "/id/bookings/", "/en/bookings/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

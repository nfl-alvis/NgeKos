import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/owner/booking",
        destination: "/owner/bookings",
        permanent: true,
      },
      {
        source: "/:locale(id|en)/owner/booking",
        destination: "/:locale/owner/bookings",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);

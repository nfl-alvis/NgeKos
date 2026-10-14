import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NgeKos - Cari & Sewa Kost Terverifikasi",
    short_name: "NgeKos",
    description: "Platform pencarian dan sewa kost terverifikasi di Indonesia. Foto asli, harga transparan, fasilitas lengkap.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F3EF",
    theme_color: "#3A2618",
    icons: [
      {
        src: "/assets/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

import Image from "next/image";
import type { Facility } from "@/lib/data/types";

/**
 * Ikon fasilitas dari Icons8 (style: iOS7 Outline, monochrome) — diambil
 * via Icons8 MCP server (https://mcp.icons8.com/mcp/), disimpan lokal di
 * public/icons/facilities/ biar tidak tergantung CDN & gratis tanpa API key.
 * Satu style untuk semua ikon; SVG berbayar, jadi format = PNG 28px.
 */
const FILES: Record<Facility, string> = {
  wifi: "wifi",
  ac: "ac",
  "bathroom-in": "bathroom-in",
  parking: "parking",
  kitchen: "kitchen",
  laundry: "laundry",
  bed: "bed",
  wardrobe: "wardrobe",
  desk: "desk",
  fridge: "fridge",
  "hot-water": "hot-water",
  cctv: "cctv",
  "access-24h": "access-24h",
};

export default function FacilityIcon({ facility }: { facility: Facility; className?: string }) {
  const name = FILES[facility];
  if (!name) return null;
  return (
    <Image
      src={`/icons/facilities/${name}.png`}
      alt=""
      width={28}
      height={28}
      loading="eager"
      unoptimized
      className="size-[14px] shrink-0 opacity-80"
    />
  );
}

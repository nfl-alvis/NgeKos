import type { ReactNode } from "react";
import type { Facility } from "@/lib/data/types";

/**
 * Ikon fasilitas: inline SVG stroke 1.6 currentColor (konvensi ikon proyek —
 * jangan import paket ikon, merusak build Next 16 RSC).
 */
const PATHS: Record<Facility, ReactNode> = {
  wifi: (
    <>
      <path d="M5 13a10 10 0 0 1 14 0" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M12 20h.01" />
    </>
  ),
  ac: (
    <>
      <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07 19.07 4.93" />
      <path d="M9 3.5 12 6l3-2.5M9 20.5 12 18l3 2.5" />
    </>
  ),
  "bathroom-in": (
    <>
      <path d="M4 12V5.5A1.5 1.5 0 0 1 5.5 4 1.5 1.5 0 0 1 7 5.5V12" />
      <path d="M3 12h12v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2Z" />
      <path d="M10 12v-2.5" />
      <path d="M7 19l-.5 2.5M11 19l-.5 2.5" />
    </>
  ),
  parking: (
    <>
      <circle cx="6.5" cy="16.5" r="3" />
      <circle cx="17.5" cy="16.5" r="3" />
      <path d="M6.5 16.5 9 10h4l2 4M15 10h2.5l1 3.5" />
      <path d="M10 10h6" />
    </>
  ),
  kitchen: (
    <>
      <path d="M4 10h16v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7Z" />
      <path d="M2 10h20" />
      <path d="M8 6V4.5a1.5 1.5 0 0 1 3 0V6M13 6V4.5a1.5 1.5 0 0 1 3 0V6" />
    </>
  ),
  laundry: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M4 8h16" />
      <circle cx="12" cy="15" r="4" />
      <path d="M8 8V5.5" />
      <path d="M16 8V5.5" />
    </>
  ),
  bed: (
    <>
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20" />
      <path d="M6 8v-4h8v4" />
    </>
  ),
  wardrobe: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M12 2v20" />
      <path d="M9.5 10v4M14.5 10v4" />
    </>
  ),
  desk: (
    <>
      <path d="M2 9h20M4 9v11M20 9v11" />
      <path d="M2 9 6 4h12l4 5" />
      <path d="M14 13h6v7h-6z" />
    </>
  ),
  fridge: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M5 10h14" />
      <path d="M9 5v3M9 13v3" />
    </>
  ),
  "hot-water": (
    <>
      <path d="M12 2s5.5 6.2 5.5 10.5a5.5 5.5 0 1 1-11 0C6.5 8.2 12 2 12 2Z" />
      <path d="M9.5 14a3 3 0 0 0 2 2.8" />
    </>
  ),
  cctv: (
    <>
      <path d="m3 7 14-3 1.5 5L4.5 12 3 7Z" />
      <path d="M4.5 12v6a2 2 0 0 0 2 2h3" />
      <path d="M18.5 9 21 8" />
    </>
  ),
  "access-24h": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
};

export default function FacilityIcon({
  facility,
  className,
}: {
  facility: Facility;
  className?: string;
}) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[facility] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}

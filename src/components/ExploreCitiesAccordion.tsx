"use client";

import { useTranslations } from "next-intl";
import AccordionGallery, { AccordionGalleryItem } from "@/components/ui/AccordionGallery";
import { CITY_IMAGES } from "@/lib/kosImages";

export default function ExploreCitiesAccordion() {
  const t = useTranslations("category");

  const items: AccordionGalleryItem[] = [
    {
      label: "Jakarta",
      sublabel: "Menteng · Tebet · Kuningan",
      ctaText: t("explore"),
      image: CITY_IMAGES.jakarta,
      link: "/kost?kota=Jakarta",
      alt: "Pilihan Kost di Jakarta",
    },
    {
      label: "Bandung",
      sublabel: "Dago · Setiabudi · Dipatiukur",
      ctaText: t("explore"),
      image: CITY_IMAGES.bandung,
      link: "/kost?kota=Bandung",
      alt: "Pilihan Kost di Bandung",
    },
    {
      label: "Yogyakarta",
      sublabel: "Kotabaru · Caturtunggal · Kaliurang",
      ctaText: t("explore"),
      image: CITY_IMAGES.yogyakarta,
      link: "/kost?kota=Yogyakarta",
      alt: "Pilihan Kost di Yogyakarta",
    },
    {
      label: "Surabaya",
      sublabel: "Wonokromo · Gubeng · Rungkut",
      ctaText: t("explore"),
      image: CITY_IMAGES.surabaya,
      link: "/kost?kota=Surabaya",
      alt: "Pilihan Kost di Surabaya",
    },
    {
      label: "Malang",
      sublabel: "Sumbersari · Dinoyo · Lowokwaru",
      ctaText: t("explore"),
      image: CITY_IMAGES.malang,
      link: "/kost?kota=Malang",
      alt: "Pilihan Kost di Malang",
    },
  ];

  return (
    <div className="w-full">
      <AccordionGallery
        items={items}
        defaultIndex={2}
        expandRatio={0.52}
        trigger="hover"
        tilt={0}
        radius={0}
      />
    </div>
  );
}

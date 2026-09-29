"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import AccordionGallery, { AccordionGalleryItem } from "@/components/ui/AccordionGallery";
import { CITY_IMAGES } from "@/lib/kosImages";

export default function ExploreCitiesAccordion() {
  const t = useTranslations("category");
  const router = useRouter();

  const cities: AccordionGalleryItem[] = [
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

  const handleCityClick = (item: AccordionGalleryItem) => {
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <div className="w-full">
      <AccordionGallery
        items={cities}
        defaultIndex={1}
        height={480}
        radius={18}
        gap={12}
        expandRatio={0.48}
        tilt={7}
        parallax={0.5}
        grayscale={true}
        trigger="hover"
        accentColor="#2F6B3C"
        overlayColor="#0a0a0a"
        textColor="#ffffff"
        onItemClick={handleCityClick}
      />
    </div>
  );
}

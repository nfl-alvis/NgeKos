"use client";

import AccordionGallery, { AccordionGalleryItem } from "@/components/ui/AccordionGallery";
import { CITY_IMAGES } from "@/lib/kosImages";

export default function ExploreCitiesAccordion() {
  const items: AccordionGalleryItem[] = [
    {
      label: "Jakarta",
      image: CITY_IMAGES.jakarta,
      link: "/kost?kota=Jakarta",
      alt: "Pilihan Kost di Jakarta",
    },
    {
      label: "Bandung",
      image: CITY_IMAGES.bandung,
      link: "/kost?kota=Bandung",
      alt: "Pilihan Kost di Bandung",
    },
    {
      label: "Yogyakarta",
      image: CITY_IMAGES.yogyakarta,
      link: "/kost?kota=Yogyakarta",
      alt: "Pilihan Kost di Yogyakarta",
    },
    {
      label: "Surabaya",
      image: CITY_IMAGES.surabaya,
      link: "/kost?kota=Surabaya",
      alt: "Pilihan Kost di Surabaya",
    },
    {
      label: "Malang",
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
        radius={2}
      />
    </div>
  );
}

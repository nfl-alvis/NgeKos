export interface KosImageSet {
  main: string;
  room: string;
  bathroom?: string;
  common?: string;
}

export const KOS_IMAGES: Record<string, KosImageSet> = {
  "kost-dparagon-ijen-nirwana": {
    main: "/images/kost/kost-dparagon-ijen-nirwana/main.jpg",
    room: "/images/kost/kost-dparagon-ijen-nirwana/room.jpg",
    bathroom: "/images/kost/kost-dparagon-ijen-nirwana/bathroom.jpg",
    common: "/images/kost/kost-dparagon-ijen-nirwana/common.jpg",
  },
  "kost-dparagon-songgolangit": {
    main: "/images/kost/kost-dparagon-songgolangit/main.jpg",
    room: "/images/kost/kost-dparagon-songgolangit/room.jpg",
    bathroom: "/images/kost/kost-dparagon-songgolangit/bathroom.jpg",
    common: "/images/kost/kost-dparagon-songgolangit/common.jpg",
  },
  "kost-putri-bu-sastro": {
    main: "/images/kost/kost-putri-bu-sastro/main.jpg",
    room: "/images/kost/kost-putri-bu-sastro/room.jpg",
    bathroom: "/images/kost/kost-putri-bu-sastro/bathroom.jpg",
    common: "/images/kost/kost-putri-bu-sastro/common.jpg",
  },
  "kost-2nd-home-putri-exclusive": {
    main: "/images/kost/kost-2nd-home-putri-exclusive/main.jpg",
    room: "/images/kost/kost-2nd-home-putri-exclusive/room.jpg",
    bathroom: "/images/kost/kost-2nd-home-putri-exclusive/bathroom.jpg",
    common: "/images/kost/kost-2nd-home-putri-exclusive/common.jpg",
  },
  "kost-denta-putra": {
    main: "/images/kost/kost-denta-putra/main.jpg",
    room: "/images/kost/kost-denta-putra/room.jpg",
    bathroom: "/images/kost/kost-denta-putra/bathroom.jpg",
    common: "/images/kost/kost-denta-putra/common.jpg",
  },
  "kost-compact-room-candi-mendut": {
    main: "/images/kost/kost-compact-room-candi-mendut/main.jpg",
    room: "/images/kost/kost-compact-room-candi-mendut/room.jpg",
    bathroom: "/images/kost/kost-compact-room-candi-mendut/bathroom.jpg",
    common: "/images/kost/kost-compact-room-candi-mendut/common.jpg",
  },
  "kost-rahardian-putri-griyashanta": {
    main: "/images/kost/kost-rahardian-putri-griyashanta/main.jpg",
    room: "/images/kost/kost-rahardian-putri-griyashanta/room.jpg",
    bathroom: "/images/kost/kost-rahardian-putri-griyashanta/bathroom.jpg",
    common: "/images/kost/kost-rahardian-putri-griyashanta/common.jpg",
  },
  "kost-siguragura-cozy-kos": {
    main: "/images/kost/kost-siguragura-cozy-kos/main.jpg",
    room: "/images/kost/kost-siguragura-cozy-kos/room.jpg",
    bathroom: "/images/kost/kost-siguragura-cozy-kos/bathroom.jpg",
    common: "/images/kost/kost-siguragura-cozy-kos/common.jpg",
  },
  "kost-dparagon-bukit-dieng": {
    main: "/images/kost/kost-dparagon-bukit-dieng/main.jpg",
    room: "/images/kost/kost-dparagon-bukit-dieng/room.jpg",
    bathroom: "/images/kost/kost-dparagon-bukit-dieng/bathroom.jpg",
    common: "/images/kost/kost-dparagon-bukit-dieng/common.jpg",
  },
  "kost-putra-abah-muchtar": {
    main: "/images/kost/kost-putra-abah-muchtar/main.jpg",
    room: "/images/kost/kost-putra-abah-muchtar/room.jpg",
    bathroom: "/images/kost/kost-putra-abah-muchtar/bathroom.jpg",
    common: "/images/kost/kost-putra-abah-muchtar/common.jpg",
  },
  "kost-lunna-gading-kasri": {
    main: "/images/kost/kost-lunna-gading-kasri/main.jpg",
    room: "/images/kost/kost-lunna-gading-kasri/room.jpg",
    bathroom: "/images/kost/kost-lunna-gading-kasri/bathroom.jpg",
    common: "/images/kost/kost-lunna-gading-kasri/common.jpg",
  },
  "kost-putri-cipanas-10": {
    main: "/images/kost/kost-putri-cipanas-10/main.jpg",
    room: "/images/kost/kost-putri-cipanas-10/room.jpg",
    bathroom: "/images/kost/kost-putri-cipanas-10/bathroom.jpg",
    common: "/images/kost/kost-putri-cipanas-10/common.jpg",
  },
  "kost-cakra-kaktus-putra": {
    main: "/images/kost/kost-cakra-kaktus-putra/main.jpg",
    room: "/images/kost/kost-cakra-kaktus-putra/room.jpg",
    bathroom: "/images/kost/kost-cakra-kaktus-putra/bathroom.jpg",
    common: "/images/kost/kost-cakra-kaktus-putra/common.jpg",
  },
  "kost-bougenville-summbersari": {
    main: "/images/kost/kost-bougenville-summbersari/main.jpg",
    room: "/images/kost/kost-bougenville-summbersari/room.jpg",
    bathroom: "/images/kost/kost-bougenville-summbersari/bathroom.jpg",
    common: "/images/kost/kost-bougenville-summbersari/common.jpg",
  },
};

const DEFAULT_KOS_IMAGES: KosImageSet = {
  main: "/images/kost/kost-dparagon-ijen-nirwana/main.jpg",
  room: "/images/kost/kost-dparagon-ijen-nirwana/room.jpg",
  bathroom: "/images/kost/kost-dparagon-ijen-nirwana/bathroom.jpg",
  common: "/images/kost/kost-dparagon-ijen-nirwana/common.jpg",
};

/**
 * Mengembalikan URL gambar kos nyata berkualitas tinggi (kamar, interior, fasilitas)
 * berdasarkan slug atau imageSeed properti.
 */
export function getKosImage(
  slugOrSeed?: string,
  variant: "main" | "room" | "b" | "c" | "bathroom" | "common" = "main"
): string {
  if (!slugOrSeed) return DEFAULT_KOS_IMAGES.main;
  if (slugOrSeed.startsWith("http://") || slugOrSeed.startsWith("https://") || slugOrSeed.startsWith("/")) {
    return slugOrSeed;
  }

  let cleanKey = slugOrSeed.toLowerCase().replace(/(-main|-b|-c|-room)$/, "");
  if (!cleanKey.startsWith("kost-")) {
    const withPrefix = `kost-${cleanKey}`;
    if (KOS_IMAGES[withPrefix]) {
      cleanKey = withPrefix;
    }
  }

  const set = KOS_IMAGES[cleanKey] ?? DEFAULT_KOS_IMAGES;

  if (variant === "room" || variant === "b") return set.room;
  if (variant === "c" || variant === "bathroom") return set.bathroom ?? set.room;
  if (variant === "common") return set.common ?? set.main;
  return set.main;
}

export interface KosGalleryItem {
  url: string;
  title: string;
  category: "all" | "facade" | "room" | "bathroom" | "common";
}

export function getKosGalleryItems(
  slugOrSeed?: string,
  propertyName = "Kost"
): KosGalleryItem[] {
  let cleanKey = (slugOrSeed || "").toLowerCase().replace(/(-main|-b|-c|-room)$/, "");
  if (!cleanKey.startsWith("kost-")) {
    const withPrefix = `kost-${cleanKey}`;
    if (KOS_IMAGES[withPrefix]) {
      cleanKey = withPrefix;
    }
  }

  const set = KOS_IMAGES[cleanKey] ?? DEFAULT_KOS_IMAGES;
  const items: KosGalleryItem[] = [
    { url: set.main, title: `${propertyName} - Tampak Depan`, category: "facade" },
    { url: set.room, title: `${propertyName} - Kamar Tidur`, category: "room" },
  ];
  if (set.bathroom) {
    items.push({ url: set.bathroom, title: `${propertyName} - Kamar Mandi`, category: "bathroom" });
  }
  if (set.common) {
    items.push({ url: set.common, title: `${propertyName} - Area Bersama & Fasilitas`, category: "common" });
  }
  return items;
}

export const CITY_IMAGES: Record<string, string> = {
  jakarta: "/images/cities/jakarta.jpg",
  bandung: "/images/cities/bandung.jpg",
  yogyakarta: "/images/cities/yogyakarta.jpg",
  surabaya: "/images/cities/surabaya.jpg",
  malang: "/images/cities/malang.jpg",
  semarang: "/images/cities/semarang.jpg",
  solo: "/images/cities/solo.jpg",
  bali: "/images/cities/bali.jpg",
  medan: "/images/cities/medan.jpg",
  bogor: "/images/cities/bogor.jpg",
  depok: "/images/cities/depok.jpg",
  tangerang: "/images/cities/tangerang.jpg",
};

export function getCityImage(cityOrSeed: string): string {
  const key = cityOrSeed.toLowerCase().replace(/^ngekost-cat-/, "");
  return CITY_IMAGES[key] ?? CITY_IMAGES.jakarta;
}

export const CAMPUS_IMAGES: Record<string, string> = {
  ugm: "/images/kampus/ugm.png",
  ui: "/images/kampus/ui.png",
  itb: "/images/kampus/itb.png",
  its: "/images/kampus/its.png",
  unpad: "/images/kampus/unpad.png",
  unair: "/images/kampus/unair.png",
  undip: "/images/kampus/undip.png",
  ub: "/images/kampus/ub.png",
};

export function getCampusImage(nameOrSeed: string): string {
  const key = nameOrSeed.toLowerCase().replace(/^ngekost-kampus-/, "");
  return CAMPUS_IMAGES[key] ?? CAMPUS_IMAGES.ugm;
}

export const BLOG_IMAGES: Record<string, string> = {
  "cara-memilih-kost": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
  "dekorasi-kamar-kost": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
  "tips-hemat-anak-kost": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
  "hak-dan-kewajiban-penyewa": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
};

export function getBlogImage(slugOrSeed: string): string {
  const key = slugOrSeed.toLowerCase().replace(/^blog-/, "");
  return BLOG_IMAGES[key] ?? DEFAULT_KOS_IMAGES.main;
}


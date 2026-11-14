export type NearbyPlaceCategory =
  | "culinary"
  | "minimarket"
  | "worship"
  | "campus"
  | "health"
  | "mall";

export interface NearbyPlace {
  category: NearbyPlaceCategory;
  categoryLabelId: string;
  categoryLabelEn: string;
  name: string;
  distanceMeters: number;
  distanceFormatted: string;
  iconType: "utensils" | "shopping-cart" | "worship" | "graduation-cap" | "hospital" | "mall";
}

export function formatNearbyDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
}

interface PropertyLocationContext {
  city?: string;
  district?: string;
  address?: string;
  distanceToCampusM?: number;
}

export function getNearbyPlaces(property: PropertyLocationContext): NearbyPlace[] {
  const city = (property.city || "").trim();
  const district = (property.district || "").trim();
  const campusDist = property.distanceToCampusM && property.distanceToCampusM > 0
    ? property.distanceToCampusM
    : 1200;

  const isSurabaya = /surabaya/i.test(city) || /surabaya/i.test(district) || /surabaya/i.test(property.address || "");
  const isMalang = /malang/i.test(city) || /malang/i.test(district) || /malang/i.test(property.address || "");
  const isJakarta = /jakarta/i.test(city) || /jakarta/i.test(district) || /jakarta/i.test(property.address || "");
  const isBandung = /bandung/i.test(city) || /bandung/i.test(district) || /bandung/i.test(property.address || "");
  const isYogya = /jogja|yogyakarta|sleman|bantul/i.test(city) || /jogja|yogyakarta/i.test(property.address || "");

  if (isSurabaya) {
    return [
      {
        category: "culinary",
        categoryLabelId: "Warteg & Kuliner Terdekat",
        categoryLabelEn: "Nearby Food & Dining",
        name: "Warteg Citra Muncul",
        distanceMeters: 965,
        distanceFormatted: formatNearbyDistance(965),
        iconType: "utensils",
      },
      {
        category: "minimarket",
        categoryLabelId: "Minimarket Terdekat",
        categoryLabelEn: "Nearby Minimarket",
        name: "Alfamart",
        distanceMeters: 1600,
        distanceFormatted: formatNearbyDistance(1600),
        iconType: "shopping-cart",
      },
      {
        category: "worship",
        categoryLabelId: "Tempat Ibadah Terdekat",
        categoryLabelEn: "Nearby Place of Worship",
        name: "Gereja Katolik Kristus Raja",
        distanceMeters: 2400,
        distanceFormatted: formatNearbyDistance(2400),
        iconType: "worship",
      },
      {
        category: "campus",
        categoryLabelId: "Kampus / Universitas Terdekat",
        categoryLabelEn: "Nearby University",
        name: "Universitas Airlangga",
        distanceMeters: campusDist || 2300,
        distanceFormatted: formatNearbyDistance(campusDist || 2300),
        iconType: "graduation-cap",
      },
      {
        category: "health",
        categoryLabelId: "Rumah Sakit Terdekat",
        categoryLabelEn: "Nearby Hospital",
        name: "RS Mitra Keluarga Kenjeran",
        distanceMeters: 1100,
        distanceFormatted: formatNearbyDistance(1100),
        iconType: "hospital",
      },
      {
        category: "mall",
        categoryLabelId: "Mall & Belanja Terdekat",
        categoryLabelEn: "Nearby Shopping Mall",
        name: "Grand City Surabaya",
        distanceMeters: 3000,
        distanceFormatted: formatNearbyDistance(3000),
        iconType: "mall",
      },
    ];
  }

  if (isMalang) {
    return [
      {
        category: "culinary",
        categoryLabelId: "Warteg & Kuliner Terdekat",
        categoryLabelEn: "Nearby Food & Dining",
        name: "Warteg Barokah Soekarno Hatta",
        distanceMeters: 450,
        distanceFormatted: formatNearbyDistance(450),
        iconType: "utensils",
      },
      {
        category: "minimarket",
        categoryLabelId: "Minimarket Terdekat",
        categoryLabelEn: "Nearby Minimarket",
        name: "Alfamart Terusan Borobudur",
        distanceMeters: 380,
        distanceFormatted: formatNearbyDistance(380),
        iconType: "shopping-cart",
      },
      {
        category: "worship",
        categoryLabelId: "Tempat Ibadah Terdekat",
        categoryLabelEn: "Nearby Place of Worship",
        name: "Masjid Raden Patah UB",
        distanceMeters: 850,
        distanceFormatted: formatNearbyDistance(850),
        iconType: "worship",
      },
      {
        category: "campus",
        categoryLabelId: "Kampus / Universitas Terdekat",
        categoryLabelEn: "Nearby University",
        name: "Universitas Brawijaya (UB)",
        distanceMeters: campusDist || 750,
        distanceFormatted: formatNearbyDistance(campusDist || 750),
        iconType: "graduation-cap",
      },
      {
        category: "health",
        categoryLabelId: "Rumah Sakit Terdekat",
        categoryLabelEn: "Nearby Hospital",
        name: "RS Universitas Brawijaya",
        distanceMeters: 1200,
        distanceFormatted: formatNearbyDistance(1200),
        iconType: "hospital",
      },
      {
        category: "mall",
        categoryLabelId: "Mall & Belanja Terdekat",
        categoryLabelEn: "Nearby Shopping Mall",
        name: "Malang Town Square (Matos)",
        distanceMeters: 1400,
        distanceFormatted: formatNearbyDistance(1400),
        iconType: "mall",
      },
    ];
  }

  if (isJakarta) {
    return [
      {
        category: "culinary",
        categoryLabelId: "Warteg & Kuliner Terdekat",
        categoryLabelEn: "Nearby Food & Dining",
        name: "Warteg Kharisma Bahari",
        distanceMeters: 320,
        distanceFormatted: formatNearbyDistance(320),
        iconType: "utensils",
      },
      {
        category: "minimarket",
        categoryLabelId: "Minimarket Terdekat",
        categoryLabelEn: "Nearby Minimarket",
        name: "Alfamart",
        distanceMeters: 450,
        distanceFormatted: formatNearbyDistance(450),
        iconType: "shopping-cart",
      },
      {
        category: "worship",
        categoryLabelId: "Tempat Ibadah Terdekat",
        categoryLabelEn: "Nearby Place of Worship",
        name: "Masjid Jami' Al-Ikhlas",
        distanceMeters: 600,
        distanceFormatted: formatNearbyDistance(600),
        iconType: "worship",
      },
      {
        category: "campus",
        categoryLabelId: "Kampus / Universitas Terdekat",
        categoryLabelEn: "Nearby University",
        name: "Universitas Terdekat",
        distanceMeters: campusDist || 1500,
        distanceFormatted: formatNearbyDistance(campusDist || 1500),
        iconType: "graduation-cap",
      },
      {
        category: "health",
        categoryLabelId: "Rumah Sakit Terdekat",
        categoryLabelEn: "Nearby Hospital",
        name: "RSUD / Faskes Terdekat",
        distanceMeters: 1300,
        distanceFormatted: formatNearbyDistance(1300),
        iconType: "hospital",
      },
      {
        category: "mall",
        categoryLabelId: "Mall & Belanja Terdekat",
        categoryLabelEn: "Nearby Shopping Mall",
        name: "Pusat Perbelanjaan & Mall",
        distanceMeters: 2800,
        distanceFormatted: formatNearbyDistance(2800),
        iconType: "mall",
      },
    ];
  }

  if (isBandung) {
    return [
      {
        category: "culinary",
        categoryLabelId: "Warteg & Kuliner Terdekat",
        categoryLabelEn: "Nearby Food & Dining",
        name: "Warteg Barokah & Pujasera",
        distanceMeters: 420,
        distanceFormatted: formatNearbyDistance(420),
        iconType: "utensils",
      },
      {
        category: "minimarket",
        categoryLabelId: "Minimarket Terdekat",
        categoryLabelEn: "Nearby Minimarket",
        name: "Alfamart Dipatiukur",
        distanceMeters: 550,
        distanceFormatted: formatNearbyDistance(550),
        iconType: "shopping-cart",
      },
      {
        category: "worship",
        categoryLabelId: "Tempat Ibadah Terdekat",
        categoryLabelEn: "Nearby Place of Worship",
        name: "Masjid Salman ITB",
        distanceMeters: 900,
        distanceFormatted: formatNearbyDistance(900),
        iconType: "worship",
      },
      {
        category: "campus",
        categoryLabelId: "Kampus / Universitas Terdekat",
        categoryLabelEn: "Nearby University",
        name: "Institut Teknologi Bandung (ITB)",
        distanceMeters: campusDist || 1100,
        distanceFormatted: formatNearbyDistance(campusDist || 1100),
        iconType: "graduation-cap",
      },
      {
        category: "health",
        categoryLabelId: "Rumah Sakit Terdekat",
        categoryLabelEn: "Nearby Hospital",
        name: "RS Santo Borromeus",
        distanceMeters: 1300,
        distanceFormatted: formatNearbyDistance(1300),
        iconType: "hospital",
      },
      {
        category: "mall",
        categoryLabelId: "Mall & Belanja Terdekat",
        categoryLabelEn: "Nearby Shopping Mall",
        name: "Cihampelas Walk (Ciwalk)",
        distanceMeters: 2200,
        distanceFormatted: formatNearbyDistance(2200),
        iconType: "mall",
      },
    ];
  }

  if (isYogya) {
    return [
      {
        category: "culinary",
        categoryLabelId: "Warteg & Kuliner Terdekat",
        categoryLabelEn: "Nearby Food & Dining",
        name: "Warmindo & Warteg Barokah",
        distanceMeters: 380,
        distanceFormatted: formatNearbyDistance(380),
        iconType: "utensils",
      },
      {
        category: "minimarket",
        categoryLabelId: "Minimarket Terdekat",
        categoryLabelEn: "Nearby Minimarket",
        name: "Alfamart Kaliurang",
        distanceMeters: 480,
        distanceFormatted: formatNearbyDistance(480),
        iconType: "shopping-cart",
      },
      {
        category: "worship",
        categoryLabelId: "Tempat Ibadah Terdekat",
        categoryLabelEn: "Nearby Place of Worship",
        name: "Masjid Kampus UGM",
        distanceMeters: 850,
        distanceFormatted: formatNearbyDistance(850),
        iconType: "worship",
      },
      {
        category: "campus",
        categoryLabelId: "Kampus / Universitas Terdekat",
        categoryLabelEn: "Nearby University",
        name: "Universitas Gadjah Mada (UGM)",
        distanceMeters: campusDist || 950,
        distanceFormatted: formatNearbyDistance(campusDist || 950),
        iconType: "graduation-cap",
      },
      {
        category: "health",
        categoryLabelId: "Rumah Sakit Terdekat",
        categoryLabelEn: "Nearby Hospital",
        name: "RS Panti Rapih",
        distanceMeters: 1400,
        distanceFormatted: formatNearbyDistance(1400),
        iconType: "hospital",
      },
      {
        category: "mall",
        categoryLabelId: "Mall & Belanja Terdekat",
        categoryLabelEn: "Nearby Shopping Mall",
        name: "Pakulonan Mall Jogja",
        distanceMeters: 2400,
        distanceFormatted: formatNearbyDistance(2400),
        iconType: "mall",
      },
    ];
  }

  // General fallback tailored to provided district / city
  const locSuffix = district || city ? `(${district || city})` : "";
  return [
    {
      category: "culinary",
      categoryLabelId: "Warteg & Kuliner Terdekat",
      categoryLabelEn: "Nearby Food & Dining",
      name: `Warteg & Sentra Kuliner ${locSuffix}`.trim(),
      distanceMeters: 420,
      distanceFormatted: formatNearbyDistance(420),
      iconType: "utensils",
    },
    {
      category: "minimarket",
      categoryLabelId: "Minimarket Terdekat",
      categoryLabelEn: "Nearby Minimarket",
      name: "Alfamart",
      distanceMeters: 650,
      distanceFormatted: formatNearbyDistance(650),
      iconType: "shopping-cart",
    },
    {
      category: "worship",
      categoryLabelId: "Tempat Ibadah Terdekat",
      categoryLabelEn: "Nearby Place of Worship",
      name: `Masjid / Rumah Ibadah ${locSuffix}`.trim(),
      distanceMeters: 750,
      distanceFormatted: formatNearbyDistance(750),
      iconType: "worship",
    },
    {
      category: "campus",
      categoryLabelId: "Kampus / Universitas Terdekat",
      categoryLabelEn: "Nearby University",
      name: "Kampus Terdekat",
      distanceMeters: campusDist,
      distanceFormatted: formatNearbyDistance(campusDist),
      iconType: "graduation-cap",
    },
    {
      category: "health",
      categoryLabelId: "Rumah Sakit Terdekat",
      categoryLabelEn: "Nearby Hospital",
      name: `RSUD / Klinik Faskes ${city || "Sekitar"}`.trim(),
      distanceMeters: 1300,
      distanceFormatted: formatNearbyDistance(1300),
      iconType: "hospital",
    },
    {
      category: "mall",
      categoryLabelId: "Mall & Belanja Terdekat",
      categoryLabelEn: "Nearby Shopping Mall",
      name: `Pusat Perbelanjaan & Mall ${city || ""}`.trim(),
      distanceMeters: 2600,
      distanceFormatted: formatNearbyDistance(2600),
      iconType: "mall",
    },
  ];
}

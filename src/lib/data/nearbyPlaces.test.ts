import { describe, it, expect } from "vitest";
import { getNearbyPlaces, formatNearbyDistance } from "./nearbyPlaces";

describe("nearbyPlaces", () => {
  it("formats distances properly in meters and kilometers", () => {
    expect(formatNearbyDistance(450)).toBe("450 m");
    expect(formatNearbyDistance(965)).toBe("965 m");
    expect(formatNearbyDistance(1000)).toBe("1 km");
    expect(formatNearbyDistance(1600)).toBe("1.6 km");
    expect(formatNearbyDistance(2400)).toBe("2.4 km");
  });

  it("returns Surabaya reference POIs accurately", () => {
    const places = getNearbyPlaces({
      city: "Surabaya",
      district: "Tambaksari",
      address: "Jl. Tambaksari No. 15",
    });

    expect(places).toHaveLength(6);
    const culinary = places.find((p) => p.category === "culinary");
    expect(culinary?.name).toBe("Warteg Citra Muncul");
    expect(culinary?.distanceFormatted).toBe("965 m");

    const minimarket = places.find((p) => p.category === "minimarket");
    expect(minimarket?.name).toBe("Alfamart");
    expect(minimarket?.distanceFormatted).toBe("1.6 km");

    const worship = places.find((p) => p.category === "worship");
    expect(worship?.name).toBe("Gereja Katolik Kristus Raja");
    expect(worship?.distanceFormatted).toBe("2.4 km");

    const campus = places.find((p) => p.category === "campus");
    expect(campus?.name).toBe("Universitas Airlangga");

    const health = places.find((p) => p.category === "health");
    expect(health?.name).toBe("RS Mitra Keluarga Kenjeran");

    const mall = places.find((p) => p.category === "mall");
    expect(mall?.name).toBe("Grand City Surabaya");
  });

  it("returns Malang POIs for Malang properties", () => {
    const places = getNearbyPlaces({
      city: "Malang",
      district: "Lowokwaru",
      distanceToCampusM: 800,
    });

    expect(places).toHaveLength(6);
    expect(places.some((p) => p.name.includes("Brawijaya"))).toBe(true);
    expect(places.some((p) => p.name.includes("Matos"))).toBe(true);
  });

  it("returns fallback POIs for other locations without throwing", () => {
    const places = getNearbyPlaces({
      city: "Semarang",
      district: "Tembalang",
      distanceToCampusM: 500,
    });

    expect(places).toHaveLength(6);
    expect(places.every((p) => p.name && p.distanceFormatted)).toBe(true);
  });
});

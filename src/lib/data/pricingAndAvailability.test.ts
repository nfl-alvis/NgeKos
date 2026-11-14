import { describe, it, expect } from "vitest";
import {
  getMinAvailablePrice,
  getTotalAvailableRooms,
  filterAndSortProperties,
} from "./properties";
import type { Property } from "./types";

const mockKosSoldOutCheapest: Property = {
  slug: "kos-a",
  name: "Kos Murah Tapi Habis",
  tagline: "",
  description: "",
  city: "Malang",
  district: "Lowokwaru",
  address: "Jl. Bunga 1",
  gender: "mixed",
  verified: true,
  active: true,
  rating: 4.8,
  reviewCount: 20,
  imageSeed: "kos-a",
  facilities: ["wifi", "ac"],
  roomTypes: [
    { id: "rt-1", name: "Standard", pricePerMonth: 800000, available: 0, total: 5, sizeM2: 12 },
    { id: "rt-2", name: "Deluxe", pricePerMonth: 1500000, available: 2, total: 5, sizeM2: 16 },
  ],
  minPrice: 800000,
  distanceToCampusM: 500,
  depositInfo: "Tanpa DP",
  verificationStatus: "verified",
};

const mockKosAllFull: Property = {
  slug: "kos-b",
  name: "Kos Penuh Total",
  tagline: "",
  description: "",
  city: "Malang",
  district: "Lowokwaru",
  address: "Jl. Bunga 2",
  gender: "mixed",
  verified: true,
  active: true,
  rating: 4.9,
  reviewCount: 50,
  imageSeed: "kos-b",
  facilities: ["wifi"],
  roomTypes: [
    { id: "rt-3", name: "Standard", pricePerMonth: 700000, available: 0, total: 10, sizeM2: 12 },
  ],
  minPrice: 700000,
  distanceToCampusM: 300,
  depositInfo: "Tanpa DP",
  verificationStatus: "verified",
};

const mockKosCheapestAvailable: Property = {
  slug: "kos-c",
  name: "Kos Tersedia Lengkap",
  tagline: "",
  description: "",
  city: "Malang",
  district: "Lowokwaru",
  address: "Jl. Bunga 3",
  gender: "mixed",
  verified: true,
  active: true,
  rating: 4.5,
  reviewCount: 10,
  imageSeed: "kos-c",
  facilities: ["wifi", "ac"],
  roomTypes: [
    { id: "rt-4", name: "Standard", pricePerMonth: 900000, available: 3, total: 5, sizeM2: 12 },
    { id: "rt-5", name: "Deluxe", pricePerMonth: 1800000, available: 1, total: 3, sizeM2: 18 },
  ],
  minPrice: 900000,
  distanceToCampusM: 700,
  depositInfo: "Tanpa DP",
  verificationStatus: "verified",
};

describe("Pricing and Availability logic (Issue #26)", () => {
  it("computes dynamic starting price from cheapest room that is actually available", () => {
    // When 800k is sold out (0 available) and 1.5jt has 2 available:
    expect(getMinAvailablePrice(mockKosSoldOutCheapest)).toBe(1500000);

    // When 900k is available:
    expect(getMinAvailablePrice(mockKosCheapestAvailable)).toBe(900000);

    // When all rooms are full, fallback to base minPrice:
    expect(getMinAvailablePrice(mockKosAllFull)).toBe(700000);
  });

  it("calculates total available rooms correctly", () => {
    expect(getTotalAvailableRooms(mockKosSoldOutCheapest)).toBe(2);
    expect(getTotalAvailableRooms(mockKosAllFull)).toBe(0);
    expect(getTotalAvailableRooms(mockKosCheapestAvailable)).toBe(4);
  });

  it("filters out full properties when onlyAvailable is checked", () => {
    const list = [mockKosSoldOutCheapest, mockKosAllFull, mockKosCheapestAvailable];
    const filtered = filterAndSortProperties(list, {
      kota: "",
      maxPrice: 0,
      fasilitas: [],
      gender: "",
      sort: "rating",
      onlyAvailable: true,
    });

    expect(filtered.map((p) => p.slug)).not.toContain("kos-b");
    expect(filtered).toHaveLength(2);
  });

  it("filters maxPrice against available room price, not sold-out cheaper room", () => {
    // User wants kos <= 1.000.000
    // mockKosSoldOutCheapest has 800k room (FULL) and 1.5jt room (AVAILABLE).
    // It should NOT match because the available room is 1.5jt!
    const list = [mockKosSoldOutCheapest, mockKosCheapestAvailable];
    const filtered = filterAndSortProperties(list, {
      kota: "",
      maxPrice: 1000000,
      fasilitas: [],
      gender: "",
      sort: "rating",
    });

    expect(filtered.map((p) => p.slug)).toEqual(["kos-c"]);
  });

  it("prioritizes properties with available rooms over 100% full properties", () => {
    // Even though mockKosAllFull has higher rating (4.9 vs 4.8 & 4.5),
    // available properties should appear first
    const list = [mockKosAllFull, mockKosSoldOutCheapest, mockKosCheapestAvailable];
    const sorted = filterAndSortProperties(list, {
      kota: "",
      maxPrice: 0,
      fasilitas: [],
      gender: "",
      sort: "rating",
    });

    expect(sorted[0].slug).not.toBe("kos-b");
    expect(sorted[sorted.length - 1].slug).toBe("kos-b");
  });
});

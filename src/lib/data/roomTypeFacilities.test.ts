import { describe, it, expect } from "vitest";
import { separateFacilities, isRoomFacility, isSharedFacility } from "./facilities";
import { ensureRoomTypeFacilities } from "./properties";
import type { Property, Facility } from "./types";

describe("RoomType specific facilities (Issue #27)", () => {
  it("separates room and shared facilities properly", () => {
    const mixed: Facility[] = [
      "wifi",
      "ac",
      "bathroom-in",
      "parking",
      "kitchen",
      "bed",
      "cctv",
    ];

    const { roomFacilities, sharedFacilities } = separateFacilities(mixed);
    expect(roomFacilities).toEqual(["ac", "bathroom-in", "bed"]);
    expect(sharedFacilities).toEqual(["wifi", "parking", "kitchen", "cctv"]);
  });

  it("identifies room facility vs shared facility correctly", () => {
    expect(isRoomFacility("ac")).toBe(true);
    expect(isRoomFacility("bathroom-in")).toBe(true);
    expect(isRoomFacility("wifi")).toBe(false);

    expect(isSharedFacility("wifi")).toBe(true);
    expect(isSharedFacility("cctv")).toBe(true);
    expect(isSharedFacility("ac")).toBe(false);
  });

  it("automatically inherits legacy property room facilities when roomType has no facilities defined", () => {
    const legacyProperty: Property = {
      slug: "kos-legacy",
      name: "Kos Legacy",
      tagline: "",
      description: "",
      city: "Malang",
      district: "Lowokwaru",
      address: "Jl. Veteran",
      gender: "mixed",
      verified: true,
      active: true,
      rating: 4.5,
      reviewCount: 10,
      imageSeed: "kos-legacy",
      facilities: ["wifi", "ac", "bathroom-in", "parking"],
      roomTypes: [
        { id: "rt-1", name: "Standard", pricePerMonth: 1000000, available: 2, total: 5, sizeM2: 12 },
      ],
      minPrice: 1000000,
      distanceToCampusM: 500,
      depositInfo: "Tanpa DP",
      verificationStatus: "verified",
    };

    const enhanced = ensureRoomTypeFacilities(legacyProperty);
    expect(enhanced.roomTypes[0].facilities).toEqual(["ac", "bathroom-in"]);
  });

  it("preserves explicit roomType facilities when already provided", () => {
    const modernProperty: Property = {
      slug: "kos-modern",
      name: "Kos Modern",
      tagline: "",
      description: "",
      city: "Malang",
      district: "Lowokwaru",
      address: "Jl. Veteran",
      gender: "mixed",
      verified: true,
      active: true,
      rating: 4.8,
      reviewCount: 15,
      imageSeed: "kos-modern",
      facilities: ["wifi", "parking", "cctv"],
      roomTypes: [
        {
          id: "rt-std",
          name: "Standard Non-AC",
          pricePerMonth: 800000,
          available: 2,
          total: 5,
          sizeM2: 12,
          facilities: ["bed", "wardrobe"],
        },
        {
          id: "rt-dlx",
          name: "Deluxe AC",
          pricePerMonth: 1500000,
          available: 1,
          total: 3,
          sizeM2: 16,
          facilities: ["ac", "bathroom-in", "bed", "wardrobe", "hot-water"],
        },
      ],
      minPrice: 800000,
      distanceToCampusM: 400,
      depositInfo: "Tanpa DP",
      verificationStatus: "verified",
    };

    const enhanced = ensureRoomTypeFacilities(modernProperty);
    expect(enhanced.roomTypes[0].facilities).toEqual(["bed", "wardrobe"]);
    expect(enhanced.roomTypes[1].facilities).toEqual(["ac", "bathroom-in", "bed", "wardrobe", "hot-water"]);
  });
});

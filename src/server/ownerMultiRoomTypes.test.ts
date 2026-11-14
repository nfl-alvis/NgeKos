import { describe, it, expect } from "vitest";
import { propertyCreateSchema, roomTypeCreateSchema } from "./validation";
import {
  savePropertyDraft,
  getSavedPropertyDraft,
  deleteSavedPropertyDraft,
  type PropertyFormDraft,
} from "@/lib/propertyDraft";
import { separateFacilities, ROOM_FACILITY_KEYS, SHARED_FACILITY_KEYS } from "@/lib/data/facilities";
import type { Facility } from "@/lib/data/types";

describe("Owner Multi-Room Types & Facilities Validation", () => {
  it("validates property creation with multiple room types and room-specific facilities", () => {
    const payload = {
      name: "Kos Melati Eksklusif",
      description: "Kos eksklusif dan nyaman di pusat kota dekat universitas.",
      city: "Surabaya",
      district: "Gubeng",
      address: "Jl. Airlangga No. 10, Surabaya",
      postalCode: "60286",
      gender: "FEMALE",
      facilities: ["wifi", "parking", "kitchen", "ac", "bathroom-in", "bed", "wardrobe"],
      roomTypes: [
        {
          name: "Tipe A (Standar)",
          pricePerMonth: 1200000,
          sizeM2: 12,
          total: 5,
          available: 3,
          facilities: ["bed", "wardrobe"],
        },
        {
          name: "Tipe B (Deluxe VIP)",
          pricePerMonth: 2200000,
          sizeM2: 20,
          total: 3,
          available: 2,
          facilities: ["bed", "wardrobe", "ac", "bathroom-in", "hot-water", "desk"],
        },
      ],
    };

    const parsed = propertyCreateSchema.parse(payload);
    expect(parsed.name).toBe("Kos Melati Eksklusif");
    expect(parsed.roomTypes).toHaveLength(2);
    expect(parsed.roomTypes![0].facilities).toEqual(["bed", "wardrobe"]);
    expect(parsed.roomTypes![1].facilities).toEqual([
      "bed",
      "wardrobe",
      "ac",
      "bathroom-in",
      "hot-water",
      "desk",
    ]);
  });

  it("validates roomTypeCreateSchema with room-specific facilities", () => {
    const newRoomType = {
      name: "Executive Suite",
      pricePerMonth: 2500000,
      sizeM2: 24,
      capacity: 1,
      facilities: ["ac", "bathroom-in", "hot-water", "bed", "desk"],
    };

    const parsed = roomTypeCreateSchema.parse(newRoomType);
    expect(parsed.name).toBe("Executive Suite");
    expect(parsed.pricePerMonth).toBe(2500000);
    expect(parsed.facilities).toEqual(["ac", "bathroom-in", "hot-water", "bed", "desk"]);
  });

  it("correctly separates building shared facilities from room facilities", () => {
    const combinedFacilities: Facility[] = [
      "wifi",
      "parking",
      "kitchen",
      "ac",
      "bed",
      "wardrobe",
      "cctv",
      "bathroom-in",
    ];

    const { sharedFacilities, roomFacilities } = separateFacilities(combinedFacilities);

    expect(sharedFacilities).toEqual(["wifi", "parking", "kitchen", "cctv"]);
    expect(roomFacilities).toEqual(["ac", "bed", "wardrobe", "bathroom-in"]);

    sharedFacilities.forEach((f) => {
      expect(SHARED_FACILITY_KEYS).toContain(f);
    });

    roomFacilities.forEach((f) => {
      expect(ROOM_FACILITY_KEYS).toContain(f);
    });
  });

  it("correctly saves and loads draft with multiple room types and room-specific facilities", () => {
    // Mock localStorage
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        for (const k in storage) delete storage[k];
      },
      length: 0,
      key: () => null,
    };
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    const draftData: Partial<PropertyFormDraft> = {
      namaKos: "Kos Harmony",
      tipeKamar: "Tipe Superior",
      tipeKamarFacilities: ["bed", "ac", "bathroom-in"],
      extraRoomTypes: [
        {
          id: "extra-1",
          name: "Tipe Suite Balcon",
          ukuranKamar: "4 x 5 meter",
          totalKamar: 4,
          kamarKosong: 2,
          hargaBulanan: "2500000",
          facilities: ["bed", "ac", "bathroom-in", "hot-water", "desk", "wardrobe"],
        },
      ],
      fasilitasBersama: ["WiFi Internet", "Dapur Bersama", "Area Parkir (Motor / Mobil)"],
    };

    savePropertyDraft(draftData);
    const loaded = getSavedPropertyDraft();

    expect(loaded).not.toBeNull();
    expect(loaded?.namaKos).toBe("Kos Harmony");
    expect(loaded?.tipeKamarFacilities).toEqual(["bed", "ac", "bathroom-in"]);
    expect(loaded?.extraRoomTypes).toHaveLength(1);
    expect(loaded?.extraRoomTypes![0].name).toBe("Tipe Suite Balcon");
    expect(loaded?.extraRoomTypes![0].facilities).toEqual([
      "bed",
      "ac",
      "bathroom-in",
      "hot-water",
      "desk",
      "wardrobe",
    ]);

    deleteSavedPropertyDraft();
    expect(getSavedPropertyDraft()).toBeNull();
  });
});

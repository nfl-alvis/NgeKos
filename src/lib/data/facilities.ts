import type { Facility } from "./types";

export const FACILITY_META: Record<
  Facility,
  { labelId: string; labelEn: string }
> = {
  wifi: { labelId: "WiFi", labelEn: "WiFi" },
  ac: { labelId: "AC", labelEn: "Air conditioning" },
  "bathroom-in": { labelId: "Kamar mandi dalam", labelEn: "Private bathroom" },
  parking: { labelId: "Parkir motor", labelEn: "Motorbike parking" },
  kitchen: { labelId: "Dapur bersama", labelEn: "Shared kitchen" },
  laundry: { labelId: "Laundry", labelEn: "Laundry service" },
  bed: { labelId: "Kasur", labelEn: "Bed provided" },
  wardrobe: { labelId: "Lemari", labelEn: "Wardrobe" },
  desk: { labelId: "Meja belajar", labelEn: "Study desk" },
  fridge: { labelId: "Kulkas bersama", labelEn: "Shared fridge" },
  "hot-water": { labelId: "Air panas", labelEn: "Hot water" },
  cctv: { labelId: "CCTV", labelEn: "CCTV" },
  "access-24h": { labelId: "Akses 24 jam", labelEn: "24h access" },
};

export const ROOM_FACILITY_KEYS: Facility[] = [
  "bathroom-in",
  "ac",
  "bed",
  "wardrobe",
  "desk",
  "hot-water",
];

export const SHARED_FACILITY_KEYS: Facility[] = [
  "wifi",
  "parking",
  "kitchen",
  "laundry",
  "fridge",
  "cctv",
  "access-24h",
];

export function isRoomFacility(facility: string): facility is Facility {
  return (ROOM_FACILITY_KEYS as string[]).includes(facility);
}

export function isSharedFacility(facility: string): facility is Facility {
  return (SHARED_FACILITY_KEYS as string[]).includes(facility);
}

export function separateFacilities(facilities: Facility[]): {
  roomFacilities: Facility[];
  sharedFacilities: Facility[];
} {
  const roomFacilities = facilities.filter(isRoomFacility);
  const sharedFacilities = facilities.filter(isSharedFacility);
  return { roomFacilities, sharedFacilities };
}

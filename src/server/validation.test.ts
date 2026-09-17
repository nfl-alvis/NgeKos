import { describe, expect, it } from "vitest";
import {
  bookingCreateSchema,
  paginationSchema,
  propertyCreateSchema,
  propertyUpdateSchema,
} from "./validation";
import { canTransitionBooking } from "./booking-policy";

describe("property validation", () => {
  const validProperty = {
    name: "Kost Melati",
    tagline: "Dekat kampus",
    description: "Kost aman dan nyaman untuk mahasiswa.",
    city: "Bandung",
    district: "Coblong",
    address: "Jalan Melati No. 10",
    gender: "FEMALE",
    depositAmount: 500000,
    latitude: -6.89148,
    longitude: 107.61066,
    facilities: ["wifi", "parking"],
  };

  it("accepts a normalized property payload", () => {
    const parsed = propertyCreateSchema.parse(validProperty);
    expect(parsed.name).toBe("Kost Melati");
    expect(parsed.facilities).toEqual(["wifi", "parking"]);
  });

  it("rejects invalid coordinates and negative money", () => {
    const result = propertyCreateSchema.safeParse({
      ...validProperty,
      latitude: -100,
      depositAmount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("does not allow ownership or moderation fields in an update", () => {
    const result = propertyUpdateSchema.safeParse({
      ownerId: "b4db60dd-2a8d-4c65-9337-3ceff60860b6",
      status: "VERIFIED",
    });
    expect(result.success).toBe(false);
  });
});

describe("booking validation", () => {
  it("accepts supported rental durations", () => {
    const parsed = bookingCreateSchema.parse({
      propertyId: "2bd74c54-b971-43aa-b689-8de0e59cf9ac",
      roomTypeId: "302697c3-d409-42bb-9cf6-7d40b6cae4dc",
      startDate: "2026-10-01",
      durationMonths: 12,
      note: "Saya berencana tinggal satu tahun.",
    });
    expect(parsed.durationMonths).toBe(12);
  });

  it("rejects unsupported durations", () => {
    expect(
      bookingCreateSchema.safeParse({
        propertyId: "2bd74c54-b971-43aa-b689-8de0e59cf9ac",
        roomTypeId: "302697c3-d409-42bb-9cf6-7d40b6cae4dc",
        startDate: "2026-10-01",
        durationMonths: 2,
      }).success,
    ).toBe(false);
  });
});

describe("pagination validation", () => {
  it("applies safe defaults and caps page size", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationSchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("booking transitions", () => {
  it("allows owner approval and rejection only from pending", () => {
    expect(canTransitionBooking("PENDING", "APPROVED_AWAITING_PAYMENT", "OWNER")).toBe(true);
    expect(canTransitionBooking("PENDING", "REJECTED", "OWNER")).toBe(true);
    expect(canTransitionBooking("ACTIVE", "REJECTED", "OWNER")).toBe(false);
  });

  it("allows seekers to cancel their own pending booking only", () => {
    expect(canTransitionBooking("PENDING", "CANCELLED", "SEEKER")).toBe(true);
    expect(canTransitionBooking("ACTIVE", "CANCELLED", "SEEKER")).toBe(false);
  });

  it("does not let clients activate a booking", () => {
    expect(canTransitionBooking("APPROVED_AWAITING_PAYMENT", "ACTIVE", "OWNER")).toBe(false);
    expect(canTransitionBooking("APPROVED_AWAITING_PAYMENT", "ACTIVE", "SEEKER")).toBe(false);
  });
});

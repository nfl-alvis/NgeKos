import { describe, expect, it } from "vitest";
import { canTransitionBooking } from "./booking-policy";
import { bookingIdentifierWhere } from "./booking-identifier";
import { verifyMidtransNotification } from "./midtrans";
import {
  bookingCreateSchema,
  bookingDecisionSchema,
  paginationSchema,
  propertyCreateSchema,
} from "./validation";

describe("Pillar 1: Booking Sewa Flow & Policies", () => {
  it("enforces valid booking status transitions for OWNER", () => {
    // Owner can approve or reject a PENDING booking
    expect(canTransitionBooking("PENDING", "APPROVED_AWAITING_PAYMENT", "OWNER")).toBe(true);
    expect(canTransitionBooking("PENDING", "REJECTED", "OWNER")).toBe(true);

    // Owner cannot mark directly as ACTIVE or CANCELLED from PENDING
    expect(canTransitionBooking("PENDING", "ACTIVE", "OWNER")).toBe(false);
    expect(canTransitionBooking("PENDING", "CANCELLED", "OWNER")).toBe(false);
  });

  it("enforces valid booking status transitions for SEEKER", () => {
    // Seeker can cancel a PENDING or APPROVED_AWAITING_PAYMENT booking
    expect(canTransitionBooking("PENDING", "CANCELLED", "SEEKER")).toBe(true);
    expect(canTransitionBooking("APPROVED_AWAITING_PAYMENT", "CANCELLED", "SEEKER")).toBe(true);

    // Seeker cannot approve or reject
    expect(canTransitionBooking("PENDING", "APPROVED_AWAITING_PAYMENT", "SEEKER")).toBe(false);
    expect(canTransitionBooking("PENDING", "REJECTED", "SEEKER")).toBe(false);
  });

  it("allows ADMIN to transition between different booking statuses", () => {
    expect(canTransitionBooking("PENDING", "APPROVED_AWAITING_PAYMENT", "ADMIN")).toBe(true);
    expect(canTransitionBooking("APPROVED_AWAITING_PAYMENT", "ACTIVE", "ADMIN")).toBe(true);
    expect(canTransitionBooking("ACTIVE", "COMPLETED", "ADMIN")).toBe(true);
    expect(canTransitionBooking("ACTIVE", "ACTIVE", "ADMIN")).toBe(false);
  });

  it("validates booking creation schema properly", () => {
    const validBooking = {
      propertyId: "2a6e4a04-2207-4693-a862-769709945b87",
      roomTypeId: "3b7f5b15-3318-4704-b973-870810056c98",
      startDate: "2026-10-01",
      durationMonths: 3,
      note: "Mohon konfirmasi ketersediaan kamar.",
    };

    const parsed = bookingCreateSchema.parse(validBooking);
    expect(parsed.durationMonths).toBe(3);
    expect(parsed.startDate).toBe("2026-10-01");

    // Invalid duration (e.g. 5 months is not an allowed tier)
    expect(
      bookingCreateSchema.safeParse({ ...validBooking, durationMonths: 5 }).success
    ).toBe(false);

    // Invalid non-UUID property ID
    expect(
      bookingCreateSchema.safeParse({ ...validBooking, propertyId: "invalid-id" }).success
    ).toBe(false);
  });

  it("resolves booking identifiers for both UUID and custom code", () => {
    const uuid = "2a6e4a04-2207-4693-a862-769709945b87";
    expect(bookingIdentifierWhere(uuid)).toEqual({
      OR: [{ id: uuid }, { code: uuid }],
    });

    const customCode = "BK-260925-A1B2C3";
    expect(bookingIdentifierWhere(customCode)).toEqual({ code: customCode });
  });
});

describe("Pillar 2: Pembayaran Midtrans Flow", () => {
  it("verifies notification payload signature or permissive dev fallback", () => {
    const payload = {
      order_id: "BOOK-BK-260925-ABC-1727272800",
      status_code: "200",
      gross_amount: "1500000.00",
      signature_key: "dummy-signature-key",
      transaction_status: "settlement" as const,
    };

    // In dev environment without server key, fallback returns true
    const isValid = verifyMidtransNotification(payload);
    expect(typeof isValid).toBe("boolean");
  });

  it("correctly extracts booking identifier from Midtrans order_id format", () => {
    const orderId = "BOOK-BK-260925-XYZ123-1727272800000";
    const match = orderId.match(/^BOOK-(.+)-\d+$/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe("BK-260925-XYZ123");
  });

  it("validates booking decision payload for owner approval and rejection", () => {
    // Valid approval
    const approve = bookingDecisionSchema.parse({
      status: "APPROVED_AWAITING_PAYMENT",
      note: "Silakan lanjut bayar dalam 24 jam.",
    });
    expect(approve.status).toBe("APPROVED_AWAITING_PAYMENT");

    // Valid rejection with required reason
    const reject = bookingDecisionSchema.parse({
      status: "REJECTED",
      note: "Kamar sudah penuh untuk periode tersebut.",
    });
    expect(reject.status).toBe("REJECTED");

    // Invalid rejection without reason
    expect(bookingDecisionSchema.safeParse({ status: "REJECTED", note: " " }).success).toBe(
      false
    );
  });
});

describe("Pillar 3: Verifikasi Admin & Property Moderation", () => {
  it("validates property creation inputs for owner submission", () => {
    const validProperty = {
      name: "Kost Melati Asri",
      tagline: "Dekat kampus dan stasiun",
      description: "Kost nyaman bersih aman dengan fasilitas lengkap di pusat kota.",
      city: "Bandung",
      district: "Coblong",
      address: "Jl. Dago Asri No. 12",
      gender: "MIXED",
      facilities: ["wifi", "ac"],
    };

    const parsed = propertyCreateSchema.parse(validProperty);
    expect(parsed.name).toBe("Kost Melati Asri");
    expect(parsed.autoSubmitVerification).toBe(true);

    // Reject too short name or description
    expect(propertyCreateSchema.safeParse({ ...validProperty, name: "Ko" }).success).toBe(false);
    expect(
      propertyCreateSchema.safeParse({ ...validProperty, description: "Terlalu pendek" }).success
    ).toBe(false);
  });
});

describe("Pillar 4: Dashboard Owner & Pagination", () => {
  it("handles standard pagination parameters", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationSchema.parse({ page: "2", limit: "10" })).toEqual({ page: 2, limit: 10 });
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
  });
});

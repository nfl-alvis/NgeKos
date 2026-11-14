import type { BookingStatus } from "@prisma/client";

export interface BookingCheckState {
  status: BookingStatus;
  checkedInAt?: Date | string | null;
  checkedOutAt?: Date | string | null;
  checkOutRequestedAt?: Date | string | null;
}

export type PolicyResult =
  | { allowed: true; reason?: undefined }
  | {
      allowed: false;
      reason:
        | "INVALID_STATUS"
        | "NOT_CHECKED_IN"
        | "ALREADY_CHECKED_IN"
        | "CHECKOUT_ALREADY_REQUESTED"
        | "ALREADY_CHECKED_OUT";
    };

export function canTenantCheckIn(booking: BookingCheckState): PolicyResult {
  if (booking.status !== "ACTIVE") {
    return { allowed: false, reason: "INVALID_STATUS" };
  }
  if (booking.checkedInAt) {
    return { allowed: false, reason: "ALREADY_CHECKED_IN" };
  }
  return { allowed: true };
}

export function canOwnerCheckIn(booking: BookingCheckState): PolicyResult {
  if (booking.status !== "ACTIVE") {
    return { allowed: false, reason: "INVALID_STATUS" };
  }
  if (booking.checkedInAt) {
    return { allowed: false, reason: "ALREADY_CHECKED_IN" };
  }
  return { allowed: true };
}

export function canTenantRequestCheckOut(booking: BookingCheckState): PolicyResult {
  if (booking.status !== "ACTIVE") {
    return { allowed: false, reason: "INVALID_STATUS" };
  }
  if (booking.checkedOutAt) {
    return { allowed: false, reason: "ALREADY_CHECKED_OUT" };
  }
  if (!booking.checkedInAt) {
    return { allowed: false, reason: "NOT_CHECKED_IN" };
  }
  if (booking.checkOutRequestedAt) {
    return { allowed: false, reason: "CHECKOUT_ALREADY_REQUESTED" };
  }
  return { allowed: true };
}

export function canOwnerConfirmCheckOut(booking: BookingCheckState): PolicyResult {
  if (booking.status !== "ACTIVE") {
    return { allowed: false, reason: "INVALID_STATUS" };
  }
  if (booking.checkedOutAt) {
    return { allowed: false, reason: "ALREADY_CHECKED_OUT" };
  }
  if (!booking.checkedInAt) {
    return { allowed: false, reason: "NOT_CHECKED_IN" };
  }
  return { allowed: true };
}

import type { BookingStatus, UserRole } from "@prisma/client";

const ownerTransitions: Partial<Record<BookingStatus, readonly BookingStatus[]>> = {
  PENDING: ["APPROVED_AWAITING_PAYMENT", "REJECTED"],
};

const seekerTransitions: Partial<Record<BookingStatus, readonly BookingStatus[]>> = {
  PENDING: ["CANCELLED"],
  APPROVED_AWAITING_PAYMENT: ["CANCELLED"],
};

export function canTransitionBooking(
  current: BookingStatus,
  next: BookingStatus,
  role: UserRole,
): boolean {
  if (role === "ADMIN") return current !== next;
  const transitions = role === "OWNER" ? ownerTransitions : seekerTransitions;
  return transitions[current]?.includes(next) ?? false;
}

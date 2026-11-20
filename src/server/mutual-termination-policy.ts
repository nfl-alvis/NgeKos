export interface DailyProrataRefundParams {
  periodStart: Date;
  periodEnd: Date;
  terminationDate: Date;
  periodRentAmount: number;
  futurePaidTermsAmount?: number;
  depositAmount?: number;
  damageDeductionAmount?: number;
}

export interface DailyProrataRefundResult {
  totalDaysInPeriod: number;
  daysUsed: number;
  daysUnused: number;
  rentRefundAmount: number;
  depositRefundAmount: number;
  totalRefundToTenant: number;
  damageCompensationToOwner: number;
}

export function calculateDailyProrataRefund(
  params: DailyProrataRefundParams
): DailyProrataRefundResult {
  const startMs = new Date(params.periodStart).getTime();
  const endMs = new Date(params.periodEnd).getTime();
  const termMs = new Date(params.terminationDate).getTime();

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDaysInPeriod = Math.max(1, Math.round((endMs - startMs) / msPerDay));
  const rawDaysUsed = Math.round((termMs - startMs) / msPerDay);
  const daysUsed = Math.max(0, Math.min(totalDaysInPeriod, rawDaysUsed));
  const daysUnused = Math.max(0, totalDaysInPeriod - daysUsed);

  const dailyRate = params.periodRentAmount / totalDaysInPeriod;
  const futureTerms = Number(params.futurePaidTermsAmount || 0);
  const rentRefundAmount = Math.round(dailyRate * daysUnused) + futureTerms;

  const deposit = Number(params.depositAmount || 0);
  const damage = Number(params.damageDeductionAmount || 0);
  const damageCompensationToOwner = Math.min(deposit, Math.max(0, damage));
  const depositRefundAmount = Math.max(0, deposit - damageCompensationToOwner);

  return {
    totalDaysInPeriod,
    daysUsed,
    daysUnused,
    rentRefundAmount,
    depositRefundAmount,
    totalRefundToTenant: rentRefundAmount + depositRefundAmount,
    damageCompensationToOwner,
  };
}

export interface TerminationRequestState {
  status: string;
  terminationStatus?: string | null;
}

export type TerminationPolicyResult =
  | { allowed: true; reason?: undefined }
  | {
      allowed: false;
      reason:
        | "INVALID_STATUS"
        | "ALREADY_REQUESTED"
        | "NOT_REQUESTED"
        | "CANNOT_CONFIRM_OWN_REQUEST";
    };

export function canRequestTermination(
  booking: TerminationRequestState
): TerminationPolicyResult {
  if (booking.status !== "ACTIVE") {
    return { allowed: false, reason: "INVALID_STATUS" };
  }
  if (booking.terminationStatus === "REQUESTED") {
    return { allowed: false, reason: "ALREADY_REQUESTED" };
  }
  return { allowed: true };
}

export function canConfirmTermination(params: {
  status: string;
  terminationStatus?: string | null;
  requestedBy?: string | null;
  currentActorRole: "TENANT" | "OWNER" | "ADMIN";
}): TerminationPolicyResult {
  if (params.status !== "ACTIVE") {
    return { allowed: false, reason: "INVALID_STATUS" };
  }
  if (params.terminationStatus !== "REQUESTED") {
    return { allowed: false, reason: "NOT_REQUESTED" };
  }
  if (
    params.currentActorRole !== "ADMIN" &&
    params.currentActorRole === params.requestedBy
  ) {
    return { allowed: false, reason: "CANNOT_CONFIRM_OWN_REQUEST" };
  }
  return { allowed: true };
}

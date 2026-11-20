import { calculateFirstInvoice, type BillingCycle } from "@/server/billing-cycle-service";

export type LeaseExpiringStatus =
  | "ACTIVE_NORMAL"
  | "EXPIRING_H30"
  | "EXPIRING_H7"
  | "EXPIRED"
  | "NOT_ACTIVE";

export interface LeaseExpirationInfo {
  endDate: Date;
  daysRemaining: number;
  expiringStatus: LeaseExpiringStatus;
  isExpiringNotice: boolean;
  isEligibleForExtension: boolean;
}

/**
 * Calculates end date of a lease from its start date and duration in months.
 */
export function calculateLeaseEndDate(startDate: Date | string, durationMonths: number): Date {
  const start = typeof startDate === "string" ? new Date(startDate) : new Date(startDate.getTime());
  const end = new Date(start.getTime());
  end.setUTCMonth(end.getUTCMonth() + durationMonths);
  return end;
}

/**
 * Evaluates remaining days and expiration alert stage (H-30, H-7, Expired, Normal).
 */
export function getLeaseExpirationInfo(params: {
  startDate: Date | string;
  durationMonths: number;
  referenceDate?: Date | string;
  status?: string;
  checkedOutAt?: Date | string | null;
}): LeaseExpirationInfo {
  const endDate = calculateLeaseEndDate(params.startDate, params.durationMonths);
  const ref = params.referenceDate
    ? typeof params.referenceDate === "string"
      ? new Date(params.referenceDate)
      : new Date(params.referenceDate.getTime())
    : new Date();

  // If booking is not ACTIVE or already checked out
  if ((params.status && params.status !== "ACTIVE") || params.checkedOutAt) {
    return {
      endDate,
      daysRemaining: 0,
      expiringStatus: "NOT_ACTIVE",
      isExpiringNotice: false,
      isEligibleForExtension: false,
    };
  }

  // Calculate day difference
  const diffTime = endDate.getTime() - ref.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      endDate,
      daysRemaining,
      expiringStatus: "EXPIRED",
      isExpiringNotice: true,
      isEligibleForExtension: true,
    };
  }

  if (daysRemaining <= 7) {
    return {
      endDate,
      daysRemaining,
      expiringStatus: "EXPIRING_H7",
      isExpiringNotice: true,
      isEligibleForExtension: true,
    };
  }

  if (daysRemaining <= 30) {
    return {
      endDate,
      daysRemaining,
      expiringStatus: "EXPIRING_H30",
      isExpiringNotice: true,
      isEligibleForExtension: true,
    };
  }

  return {
    endDate,
    daysRemaining,
    expiringStatus: "ACTIVE_NORMAL",
    isExpiringNotice: false,
    isEligibleForExtension: true,
  };
}

/**
 * Checks whether an existing booking can be extended.
 */
export function canExtendLease(booking: {
  status: string;
  checkedOutAt?: Date | string | null;
  terminationStatus?: string | null;
}): { allowed: boolean; reason?: "NOT_ACTIVE" | "ALREADY_CHECKED_OUT" | "TERMINATION_PENDING" } {
  if (booking.status !== "ACTIVE") {
    return { allowed: false, reason: "NOT_ACTIVE" };
  }
  if (booking.checkedOutAt) {
    return { allowed: false, reason: "ALREADY_CHECKED_OUT" };
  }
  if (booking.terminationStatus === "REQUESTED") {
    return { allowed: false, reason: "TERMINATION_PENDING" };
  }
  return { allowed: true };
}

export interface ExtensionInvoiceCalculation {
  additionalMonths: number;
  billingCycle: BillingCycle;
  termRentAmount: number;
  newDepositCharged: number;
  totalFirstPaymentDue: number;
  totalExtensionRent: number;
  rolloverDepositAmount: number;
  rolloverNotice: string;
}

/**
 * Calculates extension invoice details with rollover deposit (0 additional deposit charged).
 */
export function calculateExtensionInvoice(params: {
  monthlyPrice: number;
  additionalMonths: number;
  billingCycle?: BillingCycle;
  existingDeposit?: number | null;
}): ExtensionInvoiceCalculation {
  const cycle: BillingCycle = params.billingCycle || "MONTHLY";
  const existingDeposit = Number(params.existingDeposit || 0);

  // Compute first term rent with 0 new deposit
  const invoiceResult = calculateFirstInvoice({
    monthlyPrice: params.monthlyPrice,
    deposit: 0, // Rollover! Zero new deposit charged
    billingCycle: cycle,
    durationMonths: params.additionalMonths,
  });

  return {
    additionalMonths: params.additionalMonths,
    billingCycle: cycle,
    termRentAmount: invoiceResult.termRentAmount,
    newDepositCharged: 0,
    totalFirstPaymentDue: invoiceResult.termRentAmount,
    totalExtensionRent: params.monthlyPrice * params.additionalMonths,
    rolloverDepositAmount: existingDeposit,
    rolloverNotice: `Uang jaminan (deposit) sebesar Rp ${existingDeposit.toLocaleString("id-ID")} otomatis bergulir tanpa pungutan ulang.`,
  };
}

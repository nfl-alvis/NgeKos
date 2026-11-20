export type BillingCycle =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUALLY"
  | "ANNUALLY";

export interface CalculateFirstInvoiceParams {
  monthlyPrice: number;
  deposit?: number | null;
  billingCycle: BillingCycle;
  durationMonths: number;
}

export interface FirstInvoiceResult {
  termRentAmount: number;
  depositAmount: number;
  totalFirstPayment: number;
  totalInstallments: number;
}

export function calculateFirstInvoice(
  params: CalculateFirstInvoiceParams
): FirstInvoiceResult {
  const deposit = Number(params.deposit || 0);
  const monthly = Number(params.monthlyPrice || 0);

  let termRentAmount = 0;
  let totalInstallments = 1;

  switch (params.billingCycle) {
    case "WEEKLY":
      termRentAmount = Math.round(monthly / 4);
      totalInstallments = Math.max(1, params.durationMonths * 4);
      break;
    case "MONTHLY":
      termRentAmount = monthly;
      totalInstallments = Math.max(1, params.durationMonths);
      break;
    case "QUARTERLY":
      termRentAmount = monthly * 3;
      totalInstallments = Math.max(1, Math.ceil(params.durationMonths / 3));
      break;
    case "SEMI_ANNUALLY":
      termRentAmount = monthly * 6;
      totalInstallments = Math.max(1, Math.ceil(params.durationMonths / 6));
      break;
    case "ANNUALLY":
      termRentAmount = monthly * 12;
      totalInstallments = Math.max(1, Math.ceil(params.durationMonths / 12));
      break;
  }

  return {
    termRentAmount,
    depositAmount: deposit,
    totalFirstPayment: termRentAmount + deposit,
    totalInstallments,
  };
}

export function calculatePaymentDeadline(approvedAt = new Date()): Date {
  return new Date(approvedAt.getTime() + 24 * 60 * 60 * 1000);
}

export function isPaymentDeadlinePassed(
  deadline: Date,
  now = new Date()
): boolean {
  return now.getTime() > new Date(deadline).getTime();
}

export function calculateNextAnchorDueDate(params: {
  checkInDate: Date;
  billingCycle: BillingCycle;
  installmentIndex: number;
}): Date {
  const baseDate = new Date(params.checkInDate);
  const anchorDay = baseDate.getDate();

  const next = new Date(baseDate);

  switch (params.billingCycle) {
    case "WEEKLY":
      next.setDate(next.getDate() + 7 * params.installmentIndex);
      return next;
    case "MONTHLY": {
      const targetMonth = baseDate.getMonth() + params.installmentIndex;
      next.setMonth(targetMonth);
      // Handle day of month overflow (e.g. 31st in shorter months)
      if (next.getDate() !== anchorDay) {
        next.setDate(0); // last day of target month
      }
      return next;
    }
    case "QUARTERLY": {
      const targetMonth = baseDate.getMonth() + 3 * params.installmentIndex;
      next.setMonth(targetMonth);
      if (next.getDate() !== anchorDay) {
        next.setDate(0);
      }
      return next;
    }
    case "SEMI_ANNUALLY": {
      const targetMonth = baseDate.getMonth() + 6 * params.installmentIndex;
      next.setMonth(targetMonth);
      if (next.getDate() !== anchorDay) {
        next.setDate(0);
      }
      return next;
    }
    case "ANNUALLY": {
      next.setFullYear(baseDate.getFullYear() + params.installmentIndex);
      return next;
    }
  }
}

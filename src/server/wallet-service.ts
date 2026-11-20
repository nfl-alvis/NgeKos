import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import {
  Prisma,
  type Wallet,
  type WalletTransaction,
  type PayoutRequest,
  type WalletTransactionType,
  type WalletTransactionStatus,
  type PayoutStatus,
} from "@prisma/client";

export const MIN_PAYOUT_AMOUNT = 50000;

export function formatCurrencyIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s+/g, " ");
}

export interface PayoutValidationParams {
  currentBalance: number;
  requestedAmount: number;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  minPayoutAmount?: number;
}

export type PayoutValidationResult =
  | { allowed: true; remainingBalance: number; reason?: undefined }
  | {
      allowed: false;
      remainingBalance?: undefined;
      reason: "INSUFFICIENT_BALANCE" | "BELOW_MINIMUM" | "INVALID_BANK_DETAILS";
    };

export function calculatePayoutValidation(
  params: PayoutValidationParams
): PayoutValidationResult {
  const minPayout = params.minPayoutAmount ?? MIN_PAYOUT_AMOUNT;

  if (params.requestedAmount < minPayout) {
    return { allowed: false, reason: "BELOW_MINIMUM" };
  }

  if (params.requestedAmount > params.currentBalance) {
    return { allowed: false, reason: "INSUFFICIENT_BALANCE" };
  }

  if (
    params.bankName !== undefined &&
    params.accountNumber !== undefined &&
    params.accountHolder !== undefined
  ) {
    if (
      !params.bankName?.trim() ||
      !params.accountNumber?.trim() ||
      !params.accountHolder?.trim()
    ) {
      return { allowed: false, reason: "INVALID_BANK_DETAILS" };
    }
  }

  return {
    allowed: true,
    remainingBalance: params.currentBalance - params.requestedAmount,
  };
}

export interface LazyEscrowReleaseResult {
  eligibleToRelease: Array<{
    id: string;
    amount: number | Prisma.Decimal;
    payoutEligibleAt: Date | null;
  }>;
  stillHeld: Array<{
    id: string;
    amount: number | Prisma.Decimal;
    payoutEligibleAt: Date | null;
  }>;
  totalReleaseAmount: number;
}

export function evaluateLazyEscrowRelease(
  transactions: Array<{
    id: string;
    amount: number | Prisma.Decimal;
    type: string;
    status: string;
    payoutEligibleAt: Date | null;
  }>,
  now = new Date()
): LazyEscrowReleaseResult {
  const eligibleToRelease: Array<{
    id: string;
    amount: number | Prisma.Decimal;
    payoutEligibleAt: Date | null;
  }> = [];
  const stillHeld: Array<{
    id: string;
    amount: number | Prisma.Decimal;
    payoutEligibleAt: Date | null;
  }> = [];
  let totalReleaseAmount = 0;

  for (const tx of transactions) {
    if (tx.type === "EARNING_HOLD" && tx.status === "PENDING") {
      if (tx.payoutEligibleAt && new Date(tx.payoutEligibleAt) <= now) {
        eligibleToRelease.push({
          id: tx.id,
          amount: tx.amount,
          payoutEligibleAt: tx.payoutEligibleAt,
        });
        totalReleaseAmount += Number(tx.amount);
      } else {
        stillHeld.push({
          id: tx.id,
          amount: tx.amount,
          payoutEligibleAt: tx.payoutEligibleAt,
        });
      }
    }
  }

  return { eligibleToRelease, stillHeld, totalReleaseAmount };
}

/**
 * Gets or creates the wallet for a profile and synchronizes any pending escrow release.
 */
export async function getOrCreateWallet(profileId: string) {
  let wallet = await prisma.wallet.findUnique({
    where: { profileId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        profileId,
        balance: 0,
        heldBalance: 0,
      },
    });
  }

  // Run lazy escrow sync
  await syncLazyEscrowRelease(wallet.id);

  // Return fresh wallet state with relations
  return prisma.wallet.findUniqueOrThrow({
    where: { id: wallet.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      payouts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

/**
 * Automatically evaluates and releases matured escrow transactions for a wallet.
 */
export async function syncLazyEscrowRelease(walletId: string) {
  const now = new Date();
  const pendingHolds = await prisma.walletTransaction.findMany({
    where: {
      walletId,
      type: "EARNING_HOLD",
      status: "PENDING",
      payoutEligibleAt: { lte: now },
    },
  });

  if (pendingHolds.length === 0) return;

  const totalToRelease = pendingHolds.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  );

  await prisma.$transaction(async (tx) => {
    // 1. Update wallet balances
    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: totalToRelease },
        heldBalance: { decrement: totalToRelease },
      },
    });

    // 2. Mark transactions as COMPLETED and record releasedAt
    await tx.walletTransaction.updateMany({
      where: {
        id: { in: pendingHolds.map((t) => t.id) },
      },
      data: {
        status: "COMPLETED",
        releasedAt: now,
      },
    });

    // 3. Create ESCROW_RELEASE transaction entry for each released hold
    for (const hold of pendingHolds) {
      await tx.walletTransaction.create({
        data: {
          walletId,
          amount: hold.amount,
          type: "ESCROW_RELEASE",
          status: "COMPLETED",
          referenceId: hold.referenceId,
          description: `Pencairan dana sewa dari escrow (ref: ${hold.referenceId || hold.id})`,
          releasedAt: now,
        },
      });
    }
  });
}

/**
 * Places rental payment in escrow (Held Balance) for the owner.
 */
export async function holdEscrow(params: {
  ownerProfileId: string;
  amount: number;
  referenceId: string;
  description: string;
  payoutEligibleAt?: Date;
}) {
  const wallet = await getOrCreateWallet(params.ownerProfileId);

  return prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        heldBalance: { increment: params.amount },
      },
    });

    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: params.amount,
        type: "EARNING_HOLD",
        status: "PENDING",
        referenceId: params.referenceId,
        description: params.description,
        payoutEligibleAt: params.payoutEligibleAt,
      },
    });
  });
}

/**
 * Submits a payout request from the owner's active balance.
 */
export async function requestPayout(params: {
  profileId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}) {
  const wallet = await getOrCreateWallet(params.profileId);
  const currentBalance = Number(wallet.balance);

  const validation = calculatePayoutValidation({
    currentBalance,
    requestedAmount: params.amount,
    bankName: params.bankName,
    accountNumber: params.accountNumber,
    accountHolder: params.accountHolder,
  });

  if (!validation.allowed) {
    if (validation.reason === "INSUFFICIENT_BALANCE") {
      throw new ApiError(
        400,
        "INSUFFICIENT_BALANCE",
        "Saldo tidak mencukupi untuk melakukan penarikan dana"
      );
    }
    if (validation.reason === "BELOW_MINIMUM") {
      throw new ApiError(
        400,
        "BELOW_MINIMUM",
        `Penarikan dana minimal adalah ${formatCurrencyIdr(MIN_PAYOUT_AMOUNT)}`
      );
    }
    throw new ApiError(
      400,
      "INVALID_BANK_DETAILS",
      "Informasi rekening bank tidak lengkap"
    );
  }

  return prisma.$transaction(async (tx) => {
    // 1. Deduct from balance
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { decrement: params.amount },
      },
    });

    // 2. Create PayoutRequest
    const payout = await tx.payoutRequest.create({
      data: {
        walletId: wallet.id,
        amount: params.amount,
        bankName: params.bankName,
        accountNumber: params.accountNumber,
        accountHolder: params.accountHolder,
        status: "PENDING",
      },
    });

    // 3. Record WITHDRAWAL transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: params.amount,
        type: "WITHDRAWAL",
        status: "PENDING",
        referenceId: payout.id,
        description: `Penarikan dana ke rekening ${params.bankName} ${params.accountNumber} a.n. ${params.accountHolder}`,
      },
    });

    return payout;
  });
}

/**
 * Admin action to approve (confirm transfer) or reject payout request.
 */
export async function processPayout(params: {
  payoutId: string;
  adminProfileId: string;
  action: "APPROVE" | "REJECT";
  referenceNumber?: string;
  proofUrl?: string;
  adminNote?: string;
}) {
  const payout = await prisma.payoutRequest.findUniqueOrThrow({
    where: { id: params.payoutId },
    include: { wallet: true },
  });

  if (payout.status !== "PENDING") {
    throw new ApiError(
      400,
      "ALREADY_PROCESSED",
      "Permohonan penarikan dana ini sudah diproses sebelumnya"
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    if (params.action === "APPROVE") {
      const updated = await tx.payoutRequest.update({
        where: { id: params.payoutId },
        data: {
          status: "COMPLETED",
          referenceNumber: params.referenceNumber || `TRX-${Date.now()}`,
          proofUrl: params.proofUrl,
          adminNote: params.adminNote || "Transfer berhasil dikonfirmasi",
          processedById: params.adminProfileId,
          processedAt: now,
        },
      });

      // Update WITHDRAWAL transaction status to COMPLETED
      await tx.walletTransaction.updateMany({
        where: {
          walletId: payout.walletId,
          referenceId: payout.id,
          type: "WITHDRAWAL",
        },
        data: {
          status: "COMPLETED",
          releasedAt: now,
        },
      });

      return updated;
    } else {
      // REJECT: Refund the balance back to wallet
      const updated = await tx.payoutRequest.update({
        where: { id: params.payoutId },
        data: {
          status: "REJECTED",
          adminNote: params.adminNote || "Penarikan ditolak oleh admin",
          processedById: params.adminProfileId,
          processedAt: now,
        },
      });

      // Refund back to balance
      await tx.wallet.update({
        where: { id: payout.walletId },
        data: {
          balance: { increment: payout.amount },
        },
      });

      // Update WITHDRAWAL transaction to CANCELLED
      await tx.walletTransaction.updateMany({
        where: {
          walletId: payout.walletId,
          referenceId: payout.id,
          type: "WITHDRAWAL",
        },
        data: {
          status: "CANCELLED",
        },
      });

      return updated;
    }
  });
}

/**
 * Credits a wallet with funds (e.g. for rent refund, deposit refund, damage compensation).
 */
export async function creditWallet(params: {
  profileId: string;
  amount: number;
  type: WalletTransactionType;
  description: string;
  referenceId?: string;
}) {
  const wallet = await getOrCreateWallet(params.profileId);

  return prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: params.amount },
      },
    });

    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: params.amount,
        type: params.type,
        status: "COMPLETED",
        referenceId: params.referenceId,
        description: params.description,
        releasedAt: new Date(),
      },
    });
  });
}

import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { getOrCreateWallet } from "@/server/wallet-service";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const wallet = await getOrCreateWallet(profile.id);

  return successResponse({
    id: wallet.id,
    balance: Number(wallet.balance),
    heldBalance: Number(wallet.heldBalance),
    transactions: wallet.transactions.map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      type: tx.type,
      status: tx.status,
      referenceId: tx.referenceId,
      description: tx.description,
      payoutEligibleAt: tx.payoutEligibleAt,
      releasedAt: tx.releasedAt,
      createdAt: tx.createdAt,
    })),
    payouts: wallet.payouts.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      bankName: p.bankName,
      accountNumber: p.accountNumber,
      accountHolder: p.accountHolder,
      status: p.status,
      referenceNumber: p.referenceNumber,
      proofUrl: p.proofUrl,
      adminNote: p.adminNote,
      createdAt: p.createdAt,
      processedAt: p.processedAt,
    })),
  });
});

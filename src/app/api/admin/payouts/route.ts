import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { PayoutStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: Request) => {
  await requireUser(["ADMIN"]);

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  const whereClause: { status?: PayoutStatus } = {};
  if (statusParam && Object.values(PayoutStatus).includes(statusParam as PayoutStatus)) {
    whereClause.status = statusParam as PayoutStatus;
  }

  const payouts = await prisma.payoutRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      wallet: {
        include: {
          profile: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      },
      processedBy: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  return successResponse(
    payouts.map((p) => ({
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
      user: p.wallet.profile,
      processedBy: p.processedBy,
    }))
  );
});

import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { payoutRequestSchema } from "@/server/validation";
import { requestPayout } from "@/server/wallet-service";

export const dynamic = "force-dynamic";

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const input = await parseJson(request, payoutRequestSchema);

  const payout = await requestPayout({
    profileId: profile.id,
    amount: input.amount,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountHolder: input.accountHolder,
  });

  return successResponse(payout, { status: 201 });
});

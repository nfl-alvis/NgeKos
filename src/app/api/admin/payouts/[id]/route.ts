import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { processPayoutSchema } from "@/server/validation";
import { processPayout } from "@/server/wallet-service";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["ADMIN"]);
  const input = await parseJson(request, processPayoutSchema);

  const result = await processPayout({
    payoutId: id,
    adminProfileId: profile.id,
    action: input.action,
    referenceNumber: input.referenceNumber,
    proofUrl: input.proofUrl,
    adminNote: input.adminNote,
  });

  return successResponse(result);
});

import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createRefundRequest, listRefundRequests } from "@/server/refund-service";
import { refundListQuerySchema, refundRequestCreateSchema } from "@/server/validation";

export const GET = withApi(async (request: Request) => {
  const { profile } = await requireUser();

  const { searchParams } = new URL(request.url);
  const rawQuery = {
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    bookingId: searchParams.get("bookingId") ?? undefined,
  };

  const parsed = refundListQuerySchema.parse(rawQuery);
  const result = await listRefundRequests(profile, parsed);

  return successResponse(result.items, {
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    },
  });
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const input = await parseJson(request, refundRequestCreateSchema);
  const created = await createRefundRequest(profile, input, request);
  return successResponse(created, { status: 201 });
});

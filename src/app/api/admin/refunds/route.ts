import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { listRefundRequests } from "@/server/refund-service";
import { refundListQuerySchema } from "@/server/validation";

export const GET = withApi(async (request: Request) => {
  const { profile } = await requireUser(["ADMIN"]);

  const { searchParams } = new URL(request.url);
  const rawQuery = {
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
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
      stats: result.stats,
    },
  });
});

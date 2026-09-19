import { getAuthContext, requireUser } from "@/server/auth";
import { createReview, listReviews } from "@/server/engagement-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { reviewCreateSchema } from "@/server/validation";

export const GET = withApi(async (request: Request) => {
  const propertyId = new URL(request.url).searchParams.get("propertyId") ?? undefined;
  const auth = propertyId ? null : await getAuthContext();
  return successResponse(await listReviews(auth?.profile ?? null, propertyId));
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  return successResponse(await createReview(profile, await parseJson(request, reviewCreateSchema)), { status: 201 });
});

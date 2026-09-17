import { z } from "zod";
import { requireUser } from "@/server/auth";
import { deleteReview, updateReview } from "@/server/engagement-service";
import { parseJson, successResponse, withApi } from "@/server/http";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ rating: z.coerce.number().int().min(1).max(5).optional(), body: z.string().trim().min(10).max(3000).optional() }).strict().refine((v) => Object.keys(v).length > 0);

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["SEEKER"]);
  return successResponse(await updateReview(profile, id, await parseJson(request, schema)));
});

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["SEEKER"]);
  await deleteReview(profile, id);
  return new Response(null, { status: 204 });
});

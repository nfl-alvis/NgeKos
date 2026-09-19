import { z } from "zod";
import { requireUser } from "@/server/auth";
import { addFavorite, listFavorites } from "@/server/engagement-service";
import { parseJson, successResponse, withApi } from "@/server/http";

const schema = z.object({ propertyId: z.string().trim().min(1) }).strict();

export const GET = withApi(async () => {
  const { profile } = await requireUser();
  return successResponse(await listFavorites(profile));
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const { propertyId } = await parseJson(request, schema);
  await addFavorite(profile, propertyId);
  return successResponse({ propertyId }, { status: 201 });
});

import { requireUser } from "@/server/auth";
import { removeFavorite } from "@/server/engagement-service";
import { withApi } from "@/server/http";

type Context = { params: Promise<{ propertyId: string }> };

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { propertyId } = await context.params;
  const { profile } = await requireUser(["SEEKER"]);
  await removeFavorite(profile, propertyId);
  return new Response(null, { status: 204 });
});

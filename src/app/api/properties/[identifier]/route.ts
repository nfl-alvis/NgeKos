import { getAuthContext, requireUser } from "@/server/auth";
import { deleteProperty, getProperty, updateProperty } from "@/server/property-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { propertyUpdateSchema } from "@/server/validation";

type Context = { params: Promise<{ identifier: string }> };

export const GET = withApi(async (_request: Request, context: Context) => {
  const { identifier } = await context.params;
  const auth = await getAuthContext();
  return successResponse(await getProperty(identifier, auth?.profile));
});

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { identifier } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, propertyUpdateSchema);
  return successResponse(await updateProperty(profile, identifier, input));
});

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { identifier } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  await deleteProperty(profile, identifier);
  return new Response(null, { status: 204 });
});

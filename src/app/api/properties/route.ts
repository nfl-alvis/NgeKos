import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createProperty, listOwnerProperties, listPublicProperties } from "@/server/property-service";
import { propertyListQuerySchema } from "@/server/properties";
import { propertyCreateSchema } from "@/server/validation";

function queryFrom(request: Request) {
  const params = new URL(request.url).searchParams;
  return propertyListQuerySchema.parse({
    page: params.get("page") ?? undefined,
    limit: params.get("limit") ?? undefined,
    q: params.get("q") ?? undefined,
    city: params.get("city") ?? params.get("kota") ?? undefined,
    maxPrice: params.get("maxPrice") ?? params.get("max") ?? undefined,
    facilities: [...params.getAll("facility"), ...params.getAll("fas")],
    gender: params.get("gender") ?? undefined,
    sort: params.get("sort") ?? undefined,
  });
}

export const GET = withApi(async (request: Request) => {
  const query = queryFrom(request);
  const mine = new URL(request.url).searchParams.get("mine") === "true";
  const result = mine
    ? await listOwnerProperties((await requireUser(["OWNER", "ADMIN"])).profile, query)
    : await listPublicProperties(query);
  return successResponse(result.items, { meta: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser(["OWNER"]);
  const input = await parseJson(request, propertyCreateSchema);
  return successResponse(await createProperty(profile, input), { status: 201 });
});

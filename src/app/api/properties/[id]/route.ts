import { getAuthContext, requireUser } from "@/server/auth";
import { deleteProperty, getProperty, updateProperty } from "@/server/property-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { propertyUpdateSchema } from "@/server/validation";
import { recordAuditLog } from "@/server/audit-service";

type Context = { params: Promise<{ id: string }> };

export const GET = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const auth = await getAuthContext();
  return successResponse(await getProperty(id, auth?.profile));
});

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, propertyUpdateSchema);
  const updated = await updateProperty(profile, id, input);

  if (profile.role === "ADMIN") {
    let action = "property.update";
    if (input.status === "INACTIVE") action = "property.disable";
    else if (input.status === "VERIFIED") action = "property.enable";

    await recordAuditLog({
      actor: profile,
      action,
      entityType: "PROPERTY",
      entityId: id,
      description: `Admin ${profile.fullName} updated property ${id}`,
      metadata: {
        target: `Property ${id}`,
        changes: input,
      },
      request,
    });
  }

  return successResponse(updated);
});

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  await deleteProperty(profile, id);

  if (profile.role === "ADMIN") {
    await recordAuditLog({
      actor: profile,
      action: "property.delete",
      entityType: "PROPERTY",
      entityId: id,
      description: `Admin ${profile.fullName} deleted property ${id}`,
      metadata: {
        target: `Property ${id}`,
        propertyId: id,
      },
      request: _request,
    });
  }

  return new Response(null, { status: 204 });
});

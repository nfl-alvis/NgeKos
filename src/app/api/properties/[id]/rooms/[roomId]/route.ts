import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { deleteRoomUnit, updateRoomUnitStatus } from "@/server/room-service";
import { recordAuditLog } from "@/server/audit-service";

type Context = { params: Promise<{ id: string; roomId: string }> };
const schema = z.object({ status: z.enum(["AVAILABLE", "MAINTENANCE", "OCCUPIED"]) }).strict();

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id, roomId } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const { status } = await parseJson(request, schema);
  const updated = await updateRoomUnitStatus(profile, id, roomId, status);

  if (profile.role === "ADMIN") {
    await recordAuditLog({
      actor: profile,
      action: "room.update",
      entityType: "ROOM",
      entityId: roomId,
      description: `Admin ${profile.fullName} updated room ${roomId} status to ${status}`,
      metadata: { propertyId: id, roomId, status },
      request,
    });
  }

  return successResponse(updated);
});

export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { id, roomId } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const res = await deleteRoomUnit(profile, id, roomId);

  if (profile.role === "ADMIN") {
    await recordAuditLog({
      actor: profile,
      action: "room.delete",
      entityType: "ROOM",
      entityId: roomId,
      description: `Admin ${profile.fullName} deleted room ${roomId}`,
      metadata: { propertyId: id, roomId },
      request: _request,
    });
  }

  return successResponse(res);
});

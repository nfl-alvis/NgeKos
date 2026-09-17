import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { updateRoomUnitStatus } from "@/server/room-service";

type Context = { params: Promise<{ id: string; roomId: string }> };
const schema = z.object({ status: z.enum(["AVAILABLE", "MAINTENANCE"]) }).strict();

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id, roomId } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const { status } = await parseJson(request, schema);
  return successResponse(await updateRoomUnitStatus(profile, id, roomId, status));
});

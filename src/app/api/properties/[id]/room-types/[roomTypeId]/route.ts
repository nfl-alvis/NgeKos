import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { updateRoomType } from "@/server/room-service";
import { roomTypeCreateSchema } from "@/server/validation";

type Context = { params: Promise<{ id: string; roomTypeId: string }> };

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id, roomTypeId } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, roomTypeCreateSchema.partial());
  return successResponse(await updateRoomType(profile, id, roomTypeId, input));
});

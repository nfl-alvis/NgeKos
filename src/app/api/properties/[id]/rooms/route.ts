import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createRoomUnit } from "@/server/room-service";
import { roomUnitCreateSchema } from "@/server/validation";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, roomUnitCreateSchema);
  return successResponse(await createRoomUnit(profile, id, input), { status: 201 });
});

import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createRoomType } from "@/server/room-service";
import { roomTypeCreateSchema } from "@/server/validation";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, roomTypeCreateSchema);
  return successResponse(await createRoomType(profile, id, input), { status: 201 });
});

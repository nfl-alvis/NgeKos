import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createRoomUnit } from "@/server/room-service";
import { z } from "zod";

type Context = { params: Promise<{ id: string; roomTypeId: string }> };

const roomUnitSubSchema = z
  .object({
    number: z.string().trim().min(1).max(50),
    floor: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? String(v) : undefined)),
    orientation: z.string().trim().max(100).optional(),
  })
  .strict();

export const POST = withApi(async (request: Request, context: Context) => {
  const { id, roomTypeId } = await context.params;
  const { profile } = await requireUser(["OWNER", "ADMIN"]);
  const input = await parseJson(request, roomUnitSubSchema);
  const created = await createRoomUnit(profile, id, {
    roomTypeId,
    number: input.number,
    floor: input.floor,
    orientation: input.orientation,
  });
  return successResponse(created, { status: 201 });
});

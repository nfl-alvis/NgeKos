import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { updateReportStatus } from "@/server/report-service";

const updateReportSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED", "DISMISSED"] as const),
  resolution: z.string().max(1000).optional(),
});

type Context = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["ADMIN"]);
  const input = await parseJson(request, updateReportSchema);

  const updated = await updateReportStatus(profile, id, input.status, input.resolution);
  return successResponse(updated);
});

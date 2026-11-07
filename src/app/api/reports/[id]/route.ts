import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { updateReportStatus } from "@/server/report-service";
import { recordAuditLog } from "@/server/audit-service";

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

  const action = input.status === "RESOLVED" ? "report.resolve" : "report.dismiss";
  await recordAuditLog({
    actor: profile,
    action,
    entityType: "REPORT",
    entityId: id,
    description: `Admin ${profile.fullName} updated report #${id.slice(0, 8)} status to ${input.status}`,
    metadata: {
      target: `Report #${id.slice(0, 8)}`,
      reportId: id,
      status: input.status,
      resolution: input.resolution,
    },
    request,
  });

  return successResponse(updated);
});

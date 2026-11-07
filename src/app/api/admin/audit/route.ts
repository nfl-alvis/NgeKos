import { z } from "zod";
import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { listAuditLogs } from "@/server/audit-service";

const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(20),
    search: z.string().trim().max(100).optional(),
    group: z.string().trim().optional(),
    action: z.string().trim().optional(),
    entityType: z.string().trim().optional(),
    actorId: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate).getTime();
        const end = new Date(data.endDate).getTime();
        if (!isNaN(start) && !isNaN(end) && start > end) {
          return false;
        }
      }
      return true;
    },
    {
      message: "startDate cannot be after endDate",
      path: ["startDate"],
    }
  );

export const GET = withApi(async (request: Request) => {
  await requireUser(["ADMIN"]);

  const { searchParams } = new URL(request.url);
  const rawQuery = {
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    group: searchParams.get("group") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    entityType: searchParams.get("entityType") ?? undefined,
    actorId: searchParams.get("actorId") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  };

  const parsed = querySchema.parse(rawQuery);
  const result = await listAuditLogs(parsed);

  return successResponse(result.items, { meta: result.meta });
});

import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { createReport, listReports } from "@/server/report-service";
import type { ReportStatus, ReportTarget } from "@prisma/client";

const createReportSchema = z.object({
  targetType: z.enum(["PROPERTY", "USER", "REVIEW", "CONTENT"] as const),
  targetId: z.string().min(1, "Target ID wajib diisi"),
  reason: z.string().min(3, "Alasan pelaporan minimal 3 karakter"),
  details: z.string().max(1000).optional(),
});

export const GET = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ReportStatus | undefined;
  const targetType = url.searchParams.get("targetType") as ReportTarget | undefined;

  const reports = await listReports(profile, { status, targetType });
  return successResponse(reports);
});

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const input = await parseJson(request, createReportSchema);

  const report = await createReport(profile, input);
  return successResponse(report, { status: 201 });
});

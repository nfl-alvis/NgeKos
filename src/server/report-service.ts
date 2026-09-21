import "server-only";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import type { Profile, ReportStatus, ReportTarget } from "@prisma/client";

export interface CreateReportInput {
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  details?: string;
}

export async function createReport(profile: Profile, input: CreateReportInput) {
  if (!input.reason || input.reason.trim().length < 3) {
    throw new ApiError(400, "INVALID_REASON", "Alasan pelaporan minimal 3 karakter.");
  }

  // Jika targetType adalah PROPERTY, pastikan targetId adalah UUID valid
  let targetId = input.targetId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

  if (!isUuid && input.targetType === "PROPERTY") {
    const prop = await prisma.property.findFirst({
      where: { slug: targetId },
      select: { id: true },
    });
    if (prop) {
      targetId = prop.id;
    } else {
      throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti yang dilaporkan tidak ditemukan.");
    }
  }

  return prisma.report.create({
    data: {
      reporterId: profile.id,
      targetType: input.targetType,
      targetId,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      status: "OPEN",
    },
    include: {
      reporter: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });
}

export async function listReports(
  profile: Profile,
  options?: { status?: ReportStatus; targetType?: ReportTarget }
) {
  const where: any = {};
  if (options?.status) where.status = options.status;
  if (options?.targetType) where.targetType = options.targetType;

  // Jika bukan admin, hanya bisa melihat laporan miliknya sendiri
  if (profile.role !== "ADMIN") {
    where.reporterId = profile.id;
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      reporter: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  // Ambil data target tambahan untuk kenyamanan display (misal nama properti)
  const propertyIds = reports
    .filter((r) => r.targetType === "PROPERTY")
    .map((r) => r.targetId);

  const properties = propertyIds.length > 0
    ? await prisma.property.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, name: true, slug: true, city: true },
      })
    : [];

  const propertyMap = new Map(properties.map((p) => [p.id, p]));

  return reports.map((r) => {
    const prop = r.targetType === "PROPERTY" ? propertyMap.get(r.targetId) : null;
    return {
      ...r,
      targetName: prop ? prop.name : r.targetId,
      targetSlug: prop ? prop.slug : null,
      targetCity: prop ? prop.city : null,
    };
  });
}

export async function updateReportStatus(
  profile: Profile,
  id: string,
  status: ReportStatus,
  resolution?: string
) {
  if (profile.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Hanya admin yang dapat memperbarui status laporan.");
  }

  const existing = await prisma.report.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "REPORT_NOT_FOUND", "Laporan tidak ditemukan.");
  }

  return prisma.report.update({
    where: { id },
    data: {
      status,
      resolution: resolution?.trim() || null,
      resolvedAt: status !== "OPEN" ? new Date() : null,
    },
  });
}

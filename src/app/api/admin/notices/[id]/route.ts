import { requireUser } from "@/server/auth";
import { successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit-service";

type Context = { params: Promise<{ id: string }> };

/** Hapus satu pengumuman broadcast (notification bertipe ANNOUNCEMENT). */
export const DELETE = withApi(async (_request: Request, context: Context) => {
  const { profile } = await requireUser(["ADMIN"]);
  const { id } = await context.params;

  const existing = await prisma.notification.findFirst({
    where: { id, type: "ANNOUNCEMENT" },
    select: { id: true, title: true },
  });
  if (!existing) {
    throw new ApiError(404, "NOTICE_NOT_FOUND", "Announcement not found");
  }

  await prisma.notification.delete({ where: { id: existing.id } });

  await recordAuditLog({
    actor: profile,
    action: "notify.delete",
    entityType: "NOTICE",
    entityId: existing.id,
    description: `Admin ${profile.fullName} deleted announcement "${existing.title}"`,
    metadata: {
      target: existing.title,
      noticeId: existing.id,
      title: existing.title,
    },
    request: _request,
  });

  return successResponse({ success: true, id: existing.id, title: existing.title });
});

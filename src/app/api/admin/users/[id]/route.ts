import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/server/audit-service";

type Context = { params: Promise<{ id: string }> };

const updateUserSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]).optional(),
  role: z.enum(["SEEKER", "OWNER", "ADMIN"]).optional(),
});

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { profile } = await requireUser(["ADMIN"]);
  const { id } = await context.params;

  if (profile.id === id) {
    throw new ApiError(400, "CANNOT_MODIFY_SELF", "You cannot change the status of your own account.");
  }

  const existing = await prisma.profile.findUnique({
    where: { id },
    select: { id: true, email: true, fullName: true, role: true, status: true },
  });
  if (!existing) {
    throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  }

  const input = await parseJson(request, updateUserSchema);

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.profile.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.role ? { role: input.role } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    let action = "user.update";
    if (input.status === "SUSPENDED") {
      action = upd.role === "OWNER" ? "owner.suspend" : "user.ban";
    } else if (input.status === "BLOCKED") {
      action = "user.ban";
    } else if (input.status === "ACTIVE") {
      action = upd.role === "OWNER" ? "owner.reactivate" : "user.unban";
    } else if (input.role) {
      action = "admin.role";
    }

    await recordAuditLog({
      tx,
      actor: profile,
      action,
      entityType: "USER",
      entityId: upd.id,
      description: `Admin ${profile.fullName} updated user ${upd.fullName} (${upd.email})`,
      metadata: {
        target: `${upd.fullName} (${upd.email})`,
        previousStatus: existing.status,
        newStatus: upd.status,
        previousRole: existing.role,
        newRole: upd.role,
      },
      request,
    });

    return upd;
  });

  return successResponse(updated);
});

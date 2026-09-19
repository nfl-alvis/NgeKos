import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const updateUserSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BLOCKED"]).optional(),
  role: z.enum(["SEEKER", "OWNER", "ADMIN"]).optional(),
});

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { profile } = await requireUser(["ADMIN"]);
  const { id } = await context.params;

  if (profile.id === id) {
    throw new ApiError(400, "CANNOT_MODIFY_SELF", "Anda tidak dapat mengubah status akun Anda sendiri.");
  }

  const input = await parseJson(request, updateUserSchema);

  const updated = await prisma.profile.update({
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

  return successResponse(updated);
});

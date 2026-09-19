import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async () => {
  await requireUser(["ADMIN"]);

  const users = await prisma.profile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      lastSeenAt: true,
      _count: {
        select: {
          bookings: true,
          properties: true,
        },
      },
    },
  });

  return successResponse(users);
});

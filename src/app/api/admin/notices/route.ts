import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi } from "@/server/http";
import { prisma } from "@/lib/prisma";

const noticeSchema = z.object({
  target: z.enum(["owner", "seeker", "semua"]),
  title: z.string().trim().min(4).max(80),
  body: z.string().trim().min(10).max(280),
}).strict();

export const POST = withApi(async (request: Request) => {
  await requireUser(["ADMIN"]);
  const input = await parseJson(request, noticeSchema);

  const roleFilter =
    input.target === "owner"
      ? { role: "OWNER" as const }
      : input.target === "seeker"
        ? { role: "SEEKER" as const }
        : {};

  const targetUsers = await prisma.profile.findMany({
    where: {
      ...roleFilter,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (targetUsers.length > 0) {
    await prisma.notification.createMany({
      data: targetUsers.map((u) => ({
        profileId: u.id,
        type: "ANNOUNCEMENT",
        title: input.title,
        body: input.body,
      })),
    });
  }

  return successResponse({
    count: targetUsers.length,
    title: input.title,
    target: input.target,
  }, { status: 201 });
});

export const GET = withApi(async () => {
  await requireUser(["ADMIN"]);
  const notices = await prisma.notification.findMany({
    where: { type: "ANNOUNCEMENT" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return successResponse(notices);
});

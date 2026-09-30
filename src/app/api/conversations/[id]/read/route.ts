import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { prisma } from "@/lib/prisma";

export const POST = withApi(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const { id } = await context.params;

  const conv = await prisma.conversation.findFirst({
    where: { id, deletedAt: null },
  });

  if (!conv) {
    return successResponse({ readCount: 0 });
  }

  const isOwner = auth.profile.id === conv.ownerId;
  const targetSenderRole = isOwner ? "CONTACT" : "OWNER";

  const updated = await prisma.message.updateMany({
    where: {
      conversationId: conv.id,
      senderRole: targetSenderRole,
      readAt: null,
      deletedAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return successResponse({ readCount: updated.count });
});

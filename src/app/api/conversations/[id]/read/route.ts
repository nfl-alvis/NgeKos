import { z } from "zod";
import { requireUser } from "@/server/auth";
import { successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";

export const POST = withApi(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireUser(["OWNER", "SEEKER"]);
  const { id } = await context.params;

  if (!z.string().uuid().safeParse(id).success) {
    throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
  }

  const conv = await prisma.conversation.findFirst({
    where: { id, deletedAt: null },
  });
  if (!conv) {
    throw new ApiError(404, "NOT_FOUND", "Conversation not found.");
  }

  // Hardening: hanya peserta percakapan yang boleh menandai baca. Tanpa ini,
  // pengguna terautentikasi mana pun yang mengetahui id percakapan dapat
  // mengubah `readAt` pesan orang lain.
  const isParticipant =
    auth.profile.id === conv.ownerId ||
    (conv.contactId !== null && auth.profile.id === conv.contactId);
  if (!isParticipant) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this conversation.");
  }

  const targetSenderRole = auth.profile.id === conv.ownerId ? "CONTACT" : "OWNER";

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

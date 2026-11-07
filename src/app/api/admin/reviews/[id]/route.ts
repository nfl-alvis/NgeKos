import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { recordAuditLog } from "@/server/audit-service";

const updateReviewStatusSchema = z.object({
  status: z.enum(["PUBLISHED", "HIDDEN", "FLAGGED"] as const),
});

type Context = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const { profile } = await requireUser(["ADMIN"]);
  const input = await parseJson(request, updateReviewStatusSchema);

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "REVIEW_NOT_FOUND", "Review not found.");
  }

  const action = input.status === "HIDDEN" ? "review.hide" : "review.show";

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.review.update({
      where: { id },
      data: { status: input.status },
    });

    // Recalculate average rating for the property
    const aggregate = await tx.review.aggregate({
      where: { propertyId: existing.propertyId, status: "PUBLISHED", deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });

    await tx.property.update({
      where: { id: existing.propertyId },
      data: {
        averageRating: new Prisma.Decimal(aggregate._avg.rating ?? 0),
        reviewCount: aggregate._count,
      },
    });

    await recordAuditLog({
      tx,
      actor: profile,
      action,
      entityType: "REVIEW",
      entityId: id,
      description: `Admin ${profile.fullName} updated review ${id} status to ${input.status}`,
      metadata: {
        target: `Review on property ${existing.propertyId}`,
        propertyId: existing.propertyId,
        status: input.status,
      },
      request,
    });

    return r;
  });

  return successResponse(updated);
});

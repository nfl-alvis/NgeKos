import { z } from "zod";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const updateReviewStatusSchema = z.object({
  status: z.enum(["PUBLISHED", "HIDDEN", "FLAGGED"] as const),
});

type Context = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (request: Request, context: Context) => {
  const { id } = await context.params;
  await requireUser(["ADMIN"]);
  const input = await parseJson(request, updateReviewStatusSchema);

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "REVIEW_NOT_FOUND", "Ulasan tidak ditemukan.");
  }

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

    return r;
  });

  return successResponse(updated);
});

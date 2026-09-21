import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async () => {
  await requireUser(["ADMIN"]);

  const reviews = await prisma.review.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, fullName: true, email: true },
      },
      property: {
        select: { id: true, name: true, slug: true, city: true },
      },
    },
  });

  const mapped = reviews.map((r) => ({
    id: r.id,
    authorName: r.author?.fullName || r.author?.email || "Penyewa",
    rating: r.rating,
    propertyName: r.property?.name || "Kost",
    propertySlug: r.property?.slug || "",
    body: r.body,
    status: r.status,
    createdAt: r.createdAt,
    flagged: r.rating <= 2,
  }));

  return successResponse(mapped);
});

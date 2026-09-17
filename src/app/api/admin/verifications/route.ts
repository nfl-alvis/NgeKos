import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, withApi } from "@/server/http";

export const GET = withApi(async () => {
  const { profile } = await requireUser(["ADMIN"]);
  if (!["SUPER", "VERIFIER"].includes(profile.adminRole ?? "")) {
    return successResponse([]);
  }
  const rows = await prisma.propertyVerification.findMany({
    where: { decision: null },
    orderBy: { submittedAt: "asc" },
    include: { property: { include: { owner: { select: { id: true, fullName: true, email: true, createdAt: true } }, images: true, roomTypes: true } } },
  });
  return successResponse(rows.map((row) => ({ ...row, property: { ...row.property, minMonthlyPrice: Number(row.property.minMonthlyPrice), depositAmount: row.property.depositAmount === null ? null : Number(row.property.depositAmount), averageRating: Number(row.property.averageRating), roomTypes: row.property.roomTypes.map((room) => ({ ...room, pricePerMonth: Number(room.pricePerMonth), sizeM2: room.sizeM2 === null ? null : Number(room.sizeM2) })) } })));
});

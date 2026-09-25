import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { successResponse, withApi } from "@/server/http";
import { getLocalPendingProperties } from "@/server/property-service";

function resolveImageUrl(storagePath: string) {
  if (!storagePath) return "";
  if (storagePath.startsWith("http") || storagePath.startsWith("/") || storagePath.startsWith("blob:") || storagePath.startsWith("data:")) {
    return storagePath;
  }
  const encoded = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET}/${encoded}`;
}

export const GET = withApi(async () => {
  const { profile } = await requireUser(["ADMIN"]);
  if (profile.role !== "ADMIN") {
    return successResponse([]);
  }

  // 1. Auto-sync any existing properties in DB that are PENDING or DRAFT but missing an open PropertyVerification
  try {
    const unverifiedProps = await prisma.property.findMany({
      where: {
        OR: [{ status: "PENDING" }, { status: "DRAFT" }],
        verifications: { none: { decision: null } },
        deletedAt: null,
      },
      include: {
        roomTypes: { where: { deletedAt: null }, select: { id: true } },
        images: { select: { id: true } },
      },
    });

    for (const p of unverifiedProps) {
      // Ensure default room type if empty
      if (p.roomTypes.length === 0) {
        const rt = await prisma.roomType.create({
          data: {
            propertyId: p.id,
            name: "Kamar Standar",
            pricePerMonth: Number(p.minMonthlyPrice) > 0 ? p.minMonthlyPrice : 1500000,
            sizeM2: 12,
            capacity: 1,
          },
        });
        await prisma.roomUnit.create({
          data: {
            propertyId: p.id,
            roomTypeId: rt.id,
            number: "1",
            floor: "1",
            status: "AVAILABLE",
          },
        });
      }

      // Ensure default image if empty
      if (p.images.length === 0) {
        await prisma.propertyImage.create({
          data: {
            propertyId: p.id,
            storagePath: `defaults/${p.slug}.jpg`,
            altText: p.name,
            isCover: true,
            sortOrder: 0,
          },
        });
      }

      // Set status to PENDING and create PropertyVerification
      await prisma.property.update({
        where: { id: p.id },
        data: { status: "PENDING" },
      });

      await prisma.propertyVerification.create({
        data: {
          propertyId: p.id,
          submittedAt: p.createdAt || new Date(),
        },
      });
    }
  } catch {
    // Non-blocking sync
  }

  // 2. Fetch pending verifications
  try {
    const rows = await prisma.propertyVerification.findMany({
      where: { decision: null },
      orderBy: { submittedAt: "desc" },
      include: {
        property: {
          include: {
            owner: { select: { id: true, fullName: true, email: true, createdAt: true } },
            images: true,
            roomTypes: { where: { deletedAt: null } },
          },
        },
      },
    });

    const mapped = rows.map((row) => ({
      ...row,
      property: {
        ...row.property,
        minMonthlyPrice: Number(row.property.minMonthlyPrice),
        depositAmount: row.property.depositAmount === null ? null : Number(row.property.depositAmount),
        averageRating: Number(row.property.averageRating),
        images: row.property.images.map((img) => ({
          ...img,
          url: resolveImageUrl(img.storagePath),
        })),
        roomTypes: row.property.roomTypes.map((room) => ({
          ...room,
          pricePerMonth: Number(room.pricePerMonth),
          sizeM2: room.sizeM2 === null ? null : Number(room.sizeM2),
        })),
      },
    }));

    return successResponse(mapped);
  } catch {
    // Fallback store
    const localPending = await getLocalPendingProperties();
    const fallbackRows = localPending.map((p: any) => ({
      id: `verif-${p.id}`,
      propertyId: p.id,
      submittedAt: new Date().toISOString(),
      decidedAt: null,
      decision: null,
      rejectionReason: null,
      evidence: null,
      property: {
        ...p,
        owner: p.owner || { id: p.ownerId, fullName: "Pemilik", email: "-" },
        images: p.images || [],
        roomTypes: p.roomTypes || [],
      },
    }));
    return successResponse(fallbackRows);
  }
});

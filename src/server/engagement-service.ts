import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type ComplaintStatus, type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import type { z } from "zod";
import type { complaintCreateSchema, reviewCreateSchema } from "@/server/validation";

type ComplaintInput = z.infer<typeof complaintCreateSchema>;
type ReviewInput = z.infer<typeof reviewCreateSchema>;

export async function listFavorites(profile: Profile) {
  const rows = await prisma.favorite.findMany({
    where: { profileId: profile.id, property: { status: "VERIFIED", deletedAt: null } },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        select: {
          id: true, slug: true, name: true, city: true, district: true,
          minMonthlyPrice: true, averageRating: true, reviewCount: true,
          images: { where: { isCover: true }, take: 1, select: { storagePath: true } },
        },
      },
    },
  });
  return rows.map(({ property, createdAt }) => ({
    ...property,
    minPrice: Number(property.minMonthlyPrice),
    rating: Number(property.averageRating),
    createdAt,
  }));
}

export async function addFavorite(profile: Profile, propertyId: string) {
  const property = await prisma.property.findFirst({ where: { id: propertyId, status: "VERIFIED", deletedAt: null }, select: { id: true } });
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
  await prisma.favorite.upsert({ where: { profileId_propertyId: { profileId: profile.id, propertyId } }, update: {}, create: { profileId: profile.id, propertyId } });
}

export async function removeFavorite(profile: Profile, propertyId: string) {
  await prisma.favorite.deleteMany({ where: { profileId: profile.id, propertyId } });
}

export async function listReviews(profile: Profile | null, propertyId?: string) {
  return prisma.review.findMany({
    where: propertyId
      ? { propertyId, status: "PUBLISHED", deletedAt: null }
      : profile
        ? { authorId: profile.id, deletedAt: null }
        : { id: "00000000-0000-0000-0000-000000000000" },
    orderBy: { createdAt: "desc" },
    select: { id: true, propertyId: true, agreementId: true, rating: true, body: true, status: true, createdAt: true, updatedAt: true, author: { select: { id: true, fullName: true, avatarUrl: true } } },
  });
}

async function refreshPropertyRating(tx: Prisma.TransactionClient, propertyId: string) {
  const aggregate = await tx.review.aggregate({ where: { propertyId, status: "PUBLISHED", deletedAt: null }, _avg: { rating: true }, _count: true });
  await tx.property.update({ where: { id: propertyId }, data: { averageRating: new Prisma.Decimal(aggregate._avg.rating ?? 0), reviewCount: aggregate._count } });
}

export async function createReview(profile: Profile, input: ReviewInput) {
  const agreement = await prisma.rentalAgreement.findFirst({ where: { id: input.agreementId, tenantId: profile.id, status: { in: ["ACTIVE", "EXPIRED"] } }, select: { id: true, propertyId: true } });
  if (!agreement) throw new ApiError(403, "REVIEW_NOT_ELIGIBLE", "Anda belum memenuhi syarat untuk mengulas properti ini");
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({ data: { agreementId: agreement.id, propertyId: agreement.propertyId, authorId: profile.id, rating: input.rating, body: input.body } });
    await refreshPropertyRating(tx, agreement.propertyId);
    return review;
  });
}

export async function updateReview(profile: Profile, id: string, input: { rating?: number; body?: string }) {
  const review = await prisma.review.findFirst({ where: { id, authorId: profile.id, deletedAt: null }, select: { propertyId: true } });
  if (!review) throw new ApiError(404, "REVIEW_NOT_FOUND", "Ulasan tidak ditemukan");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({ where: { id }, data: input });
    await refreshPropertyRating(tx, review.propertyId);
    return updated;
  });
}

export async function deleteReview(profile: Profile, id: string) {
  const review = await prisma.review.findFirst({ where: { id, authorId: profile.id, deletedAt: null }, select: { propertyId: true } });
  if (!review) throw new ApiError(404, "REVIEW_NOT_FOUND", "Ulasan tidak ditemukan");
  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id }, data: { deletedAt: new Date() } });
    await refreshPropertyRating(tx, review.propertyId);
  });
}

function complaintCode() {
  return `CMP-${new Date().getUTCFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function listComplaints(profile: Profile) {
  const where = profile.role === "ADMIN" ? {} : profile.role === "OWNER" ? { property: { ownerId: profile.id } } : { tenantId: profile.id };
  return prisma.complaint.findMany({ where, orderBy: { createdAt: "desc" }, include: { property: { select: { id: true, name: true, slug: true } }, agreement: { select: { id: true, roomUnit: { select: { number: true } } } }, history: { orderBy: { createdAt: "asc" } } } });
}

export async function createComplaint(profile: Profile, input: ComplaintInput) {
  const agreement = await prisma.rentalAgreement.findFirst({ where: { id: input.agreementId, tenantId: profile.id, status: "ACTIVE" }, select: { propertyId: true } });
  if (!agreement) throw new ApiError(403, "AGREEMENT_NOT_ACTIVE", "Kontrak aktif tidak ditemukan");
  return prisma.complaint.create({ data: { ...input, code: complaintCode(), propertyId: agreement.propertyId, tenantId: profile.id, history: { create: { status: "OPEN", updatedById: profile.id } } } });
}

const complaintTransitions: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "CLOSED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

export async function updateComplaint(profile: Profile, id: string, status: ComplaintStatus, note?: string) {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({ where: { id }, include: { property: { select: { ownerId: true } } } });
    if (!complaint) throw new ApiError(404, "COMPLAINT_NOT_FOUND", "Pengaduan tidak ditemukan");
    if (profile.role !== "ADMIN" && complaint.property.ownerId !== profile.id) throw new ApiError(403, "FORBIDDEN", "Pengaduan ini bukan untuk properti Anda");
    if (!complaintTransitions[complaint.status].includes(status)) throw new ApiError(409, "INVALID_COMPLAINT_TRANSITION", "Perubahan status pengaduan tidak diizinkan");
    return tx.complaint.update({ where: { id }, data: { status, ownerNote: note, ...(status === "RESOLVED" ? { resolvedAt: new Date() } : {}), ...(status === "CLOSED" ? { closedAt: new Date() } : {}), history: { create: { status, note, updatedById: profile.id } } } });
  });
}

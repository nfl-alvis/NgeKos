import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type InvoiceStatus, type Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import type { z } from "zod";
import type { announcementCreateSchema, invoiceCreateSchema } from "@/server/validation";

type InvoiceInput = z.infer<typeof invoiceCreateSchema>;
type AnnouncementInput = z.infer<typeof announcementCreateSchema>;

function invoiceCode() {
  return `INV-${new Date().toISOString().slice(2, 7).replace("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function listInvoices(profile: Profile) {
  const where = profile.role === "ADMIN" ? {} : profile.role === "OWNER" ? { property: { ownerId: profile.id } } : { tenantId: profile.id };
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    include: { property: { select: { id: true, name: true, slug: true } }, tenant: { select: { id: true, fullName: true, email: true } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  return invoices.map((invoice) => ({
    ...invoice,
    amount: Number(invoice.amount),
    payments: invoice.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
  }));
}

export async function createInvoice(profile: Profile, input: InvoiceInput) {
  const agreement = await prisma.rentalAgreement.findFirst({
    where: { id: input.agreementId, ...(profile.role === "ADMIN" ? {} : { property: { ownerId: profile.id } }) },
    select: { id: true, tenantId: true, propertyId: true },
  });
  if (!agreement) throw new ApiError(404, "AGREEMENT_NOT_FOUND", "Kontrak tidak ditemukan");
  const invoice = await prisma.invoice.create({
    data: {
      code: invoiceCode(), agreementId: agreement.id, tenantId: agreement.tenantId, propertyId: agreement.propertyId,
      periodStart: new Date(`${input.periodStart}T00:00:00.000Z`), periodEnd: new Date(`${input.periodEnd}T00:00:00.000Z`), dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
      amount: new Prisma.Decimal(input.amount), notes: input.notes, status: "ISSUED", issuedAt: new Date(),
    },
  });
  return { ...invoice, amount: Number(invoice.amount) };
}

export async function updateInvoice(profile: Profile, id: string, status: Extract<InvoiceStatus, "ISSUED" | "CANCELLED" | "PAID">, note?: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id }, include: { property: { select: { ownerId: true } } } });
    if (!invoice) throw new ApiError(404, "INVOICE_NOT_FOUND", "Tagihan tidak ditemukan");
    if (profile.role !== "ADMIN" && invoice.property.ownerId !== profile.id) throw new ApiError(403, "FORBIDDEN", "Tagihan ini bukan untuk properti Anda");
    if (["PAID", "CANCELLED"].includes(invoice.status)) throw new ApiError(409, "INVOICE_FINAL", "Tagihan ini sudah berstatus final");
    if (status === "PAID") {
      await tx.payment.create({ data: { invoiceId: id, recordedById: profile.id, method: "MANUAL", status: "VERIFIED", amount: invoice.amount, note, paidAt: new Date(), verifiedAt: new Date() } });
    }
    const updated = await tx.invoice.update({ where: { id }, data: { status, notes: note ?? invoice.notes, ...(status === "PAID" ? { paidAt: new Date() } : {}), ...(status === "ISSUED" ? { issuedAt: new Date() } : {}) } });
    return { ...updated, amount: Number(updated.amount) };
  });
}

export async function listAnnouncements(profile: Profile) {
  const where: Prisma.AnnouncementWhereInput =
    profile.role === "ADMIN"
      ? {}
      : profile.role === "OWNER"
        ? { property: { ownerId: profile.id } }
        : { property: { agreements: { some: { tenantId: profile.id, status: "ACTIVE" } } }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
  return prisma.announcement.findMany({ where, orderBy: { publishedAt: "desc" }, include: { property: { select: { id: true, name: true, slug: true } }, reads: { where: { profileId: profile.id }, select: { readAt: true } } } });
}

export async function createAnnouncement(profile: Profile, input: AnnouncementInput) {
  const property = await prisma.property.findFirst({ where: { id: input.propertyId, deletedAt: null, ...(profile.role === "ADMIN" ? {} : { ownerId: profile.id }) }, select: { id: true } });
  if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
  return prisma.announcement.create({ data: { propertyId: input.propertyId, authorId: profile.id, title: input.title, body: input.body, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null } });
}

export async function markAnnouncementRead(profile: Profile, id: string) {
  const announcement = await prisma.announcement.findFirst({ where: { id, property: { agreements: { some: { tenantId: profile.id, status: "ACTIVE" } } } }, select: { id: true } });
  if (!announcement) throw new ApiError(404, "ANNOUNCEMENT_NOT_FOUND", "Pengumuman tidak ditemukan");
  await prisma.announcementRead.upsert({ where: { announcementId_profileId: { announcementId: id, profileId: profile.id } }, update: { readAt: new Date() }, create: { announcementId: id, profileId: profile.id } });
}

export async function listNotifications(profile: Profile) {
  return prisma.notification.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function markNotificationRead(profile: Profile, id?: string) {
  if (id) {
    const changed = await prisma.notification.updateMany({ where: { id, profileId: profile.id }, data: { readAt: new Date() } });
    if (!changed.count) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notifikasi tidak ditemukan");
  } else {
    await prisma.notification.updateMany({ where: { profileId: profile.id, readAt: null }, data: { readAt: new Date() } });
  }
}

export async function submitPropertyVerification(profile: Profile, propertyId: string) {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findFirst({ where: { id: propertyId, ownerId: profile.id, deletedAt: null }, include: { _count: { select: { roomTypes: true, images: true } } } });
    if (!property) throw new ApiError(404, "PROPERTY_NOT_FOUND", "Properti tidak ditemukan");
    if (!["DRAFT", "REJECTED"].includes(property.status)) throw new ApiError(409, "INVALID_PROPERTY_STATUS", "Properti tidak dapat diajukan pada status saat ini");
    if (!property._count.roomTypes || !property._count.images) throw new ApiError(422, "PROPERTY_INCOMPLETE", "Tambahkan tipe kamar dan foto sebelum mengajukan verifikasi");
    await tx.property.update({ where: { id: propertyId }, data: { status: "PENDING", rejectionNote: null } });
    return tx.propertyVerification.create({ data: { propertyId } });
  });
}

export async function decidePropertyVerification(profile: Profile, verificationId: string, decision: "APPROVED" | "REJECTED", reason?: string) {
  if (profile.role !== "ADMIN" || !["SUPER", "VERIFIER"].includes(profile.adminRole ?? "")) throw new ApiError(403, "FORBIDDEN", "Role admin tidak dapat memverifikasi properti");
  if (decision === "REJECTED" && !reason) throw new ApiError(422, "REJECTION_REASON_REQUIRED", "Alasan penolakan wajib diisi");
  return prisma.$transaction(async (tx) => {
    const verification = await tx.propertyVerification.findFirst({ where: { id: verificationId, decision: null }, select: { propertyId: true } });
    if (!verification) throw new ApiError(404, "VERIFICATION_NOT_FOUND", "Pengajuan verifikasi tidak ditemukan");
    await tx.property.update({ where: { id: verification.propertyId }, data: { status: decision === "APPROVED" ? "VERIFIED" : "REJECTED", rejectionNote: decision === "REJECTED" ? reason : null, publishedAt: decision === "APPROVED" ? new Date() : undefined } });
    return tx.propertyVerification.update({ where: { id: verificationId }, data: { decision, rejectionReason: reason, decidedAt: new Date(), decidedById: profile.id } });
  });
}

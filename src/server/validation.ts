import { z } from "zod";

const trimmedText = (min: number, max: number) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
const money = z.coerce.number().int().min(0).max(100_000_000_000);
const isoDate = z.iso.date();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const propertyCreateSchema = z
  .object({
    name: trimmedText(3, 120),
    tagline: optionalText(180),
    description: trimmedText(20, 10_000),
    city: trimmedText(2, 100),
    district: trimmedText(2, 100),
    address: trimmedText(5, 500),
    postalCode: z.string().trim().regex(/^\d{5}$/).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    gender: z.enum(["MIXED", "MALE", "FEMALE"]),
    depositAmount: money.optional(),
    distanceToCampusM: z.coerce.number().int().min(0).max(1_000_000).optional(),
    maxRooms: z.coerce.number().int().min(1).max(10_000).optional(),
    facilities: z.array(z.string().trim().min(1).max(64)).max(50).default([]),
    roomTypes: z
      .array(
        z.object({
          name: trimmedText(1, 100),
          description: optionalText(2_000),
          pricePerMonth: money,
          sizeM2: z.coerce.number().positive().max(10_000).optional(),
          total: z.coerce.number().int().min(1).max(1_000).default(1),
          available: z.coerce.number().int().min(0).max(1_000).optional(),
        })
      )
      .optional(),
    images: z
      .array(
        z.object({
          url: z.string().trim().optional(),
          storagePath: z.string().trim().optional(),
          isCover: z.boolean().optional(),
          altText: optionalText(250),
        })
      )
      .optional(),
    autoSubmitVerification: z.boolean().optional().default(true),
  })
  .strict();

export const propertyUpdateSchema = propertyCreateSchema
  .omit({ facilities: true, roomTypes: true, images: true, autoSubmitVerification: true })
  .partial()
  .extend({
    facilities: z.array(z.string().trim().min(1).max(64)).max(50).optional(),
    status: z.enum(["DRAFT", "PENDING", "VERIFIED", "REJECTED", "INACTIVE"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "No fields to update" });

export const roomTypeCreateSchema = z
  .object({
    name: trimmedText(1, 100),
    description: optionalText(2_000),
    pricePerMonth: money,
    sizeM2: z.coerce.number().positive().max(10_000).optional(),
    capacity: z.coerce.number().int().min(1).max(20).default(1),
  })
  .strict();

export const roomUnitCreateSchema = z
  .object({
    roomTypeId: z.uuid(),
    number: trimmedText(1, 50),
    floor: optionalText(50),
    orientation: optionalText(100),
  })
  .strict();

export const bookingCreateSchema = z
  .object({
    propertyId: z.uuid(),
    roomTypeId: z.uuid(),
    roomUnitId: z.uuid().optional(),
    startDate: isoDate,
    durationMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
    note: optionalText(2_000),
  })
  .strict();

export const bookingDecisionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("APPROVED_AWAITING_PAYMENT"), roomUnitId: z.uuid().optional(), note: optionalText(1_000) }).strict(),
  z.object({ status: z.literal("REJECTED"), note: trimmedText(3, 1_000) }).strict(),
  z.object({ status: z.literal("CANCELLED"), note: optionalText(1_000) }).strict(),
]);

export const profileUpdateSchema = z
  .object({
    fullName: trimmedText(2, 120).optional(),
    phone: z.string().trim().regex(/^(\+62|0)8\d{7,12}$/).optional(),
    birthPlace: optionalText(120),
    occupation: optionalText(120),
    avatarUrl: z.url().max(2_000).optional(),
    locale: z.enum(["id", "en"]).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    marketingNotifications: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "No fields to update" });

export const complaintCreateSchema = z
  .object({
    agreementId: z.string().uuid().optional(),
    propertyId: z.string().optional(),
    propertySlug: z.string().optional(),
    category: z.enum(["FACILITY", "CLEANLINESS", "SECURITY", "PAYMENT", "OTHER"]),
    title: trimmedText(3, 160),
    description: trimmedText(10, 5_000),
  })
  .strict();

export const reviewCreateSchema = z
  .object({
    agreementId: z.string().uuid().optional(),
    propertyId: z.string().optional(),
    propertySlug: z.string().optional(),
    rating: z.coerce.number().int().min(1).max(5),
    body: trimmedText(10, 3_000),
  })
  .strict();

export const invoiceCreateSchema = z
  .object({
    agreementId: z.uuid(),
    periodStart: isoDate,
    periodEnd: isoDate,
    dueDate: isoDate,
    amount: money,
    notes: optionalText(2_000),
  })
  .strict()
  .refine((value) => value.periodEnd >= value.periodStart, {
    message: "periodEnd must not be before periodStart",
    path: ["periodEnd"],
  });

export const announcementCreateSchema = z
  .object({
    propertyId: z.uuid(),
    title: trimmedText(3, 160),
    body: trimmedText(3, 5_000),
    expiresAt: z.iso.datetime().optional(),
  })
  .strict();

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const verifyOtpSchema = z
  .object({
    email: z.email().trim(),
    token: z.string().trim().min(6).max(10),
    role: z.enum(["seeker", "owner"]).optional(),
  })
  .strict();

export const resendOtpSchema = z
  .object({
    email: z.email().trim(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.email().trim(),
    locale: z.enum(["id", "en"]).default("id"),
  })
  .strict();

/**
 * Dua mode reset password:
 * - OTP: { email, token, password } — token berupa kode OTP 8 digit dari email
 *   atau token hash dari tautan reset pada email.
 * - Sesi: { password } — pemanggil membawa sesi hasil klik tautan reset.
 */
export const resetPasswordSchema = z.union([
  z
    .object({
      email: z.email().trim(),
      token: z.string().trim().min(6).max(128),
      password: z.string().min(8).max(128),
    })
    .strict(),
  z
    .object({
      password: z.string().min(8).max(128),
    })
    .strict(),
]);

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const refundRequestCreateSchema = z
  .object({
    bookingId: z.string().trim().min(3).max(100),
    paymentId: z.string().trim().uuid().optional(),
    amount: z.coerce.number().int().min(1).max(100_000_000_000).optional(),
    reason: trimmedText(5, 2_000),
  })
  .strict();

export const refundDecisionSchema = z.discriminatedUnion("decision", [
  z
    .object({
      decision: z.literal("APPROVED"),
      adminNote: optionalText(1_000),
    })
    .strict(),
  z
    .object({
      decision: z.literal("REJECTED"),
      reason: trimmedText(3, 2_000),
      adminNote: optionalText(1_000),
    })
    .strict(),
  z
    .object({
      decision: z.literal("PROCESSED"),
      adminNote: optionalText(1_000),
    })
    .strict(),
]);

export const refundListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "PROCESSED", "CANCELLED"]).optional(),
    search: z.string().trim().max(100).optional(),
    bookingId: z.string().trim().optional(),
  })
  .strict();

export type RefundRequestCreateInput = z.infer<typeof refundRequestCreateSchema>;
export type RefundDecisionInput = z.infer<typeof refundDecisionSchema>;
export type RefundListQueryInput = z.infer<typeof refundListQuerySchema>;

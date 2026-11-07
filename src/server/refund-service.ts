import "server-only";
import { Prisma, type Profile, type RefundStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { recordAuditLog } from "@/server/audit-service";
import { bookingIdentifierWhere } from "@/server/booking-identifier";
import type {
  RefundDecisionInput,
  RefundListQueryInput,
  RefundRequestCreateInput,
} from "@/server/validation";

const refundInclude = {
  booking: {
    select: {
      id: true,
      code: true,
      status: true,
      roomUnitId: true,
      property: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      payments: {
        where: { status: { in: ["VERIFIED", "REFUNDED"] } },
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          reference: true,
          midtransOrderId: true,
        },
      },
    },
  },
  applicant: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
  decidedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
  payment: {
    select: {
      id: true,
      amount: true,
      method: true,
      reference: true,
      midtransOrderId: true,
      status: true,
    },
  },
} satisfies Prisma.RefundRequestInclude;

export type RefundRecord = Prisma.RefundRequestGetPayload<{
  include: typeof refundInclude;
}>;

export interface RefundDto {
  id: string;
  bookingId: string;
  rawBookingId: string;
  bookingStatus: string;
  propertyName: string;
  propertySlug: string;
  user: string;
  userEmail: string;
  userId: string;
  userPhone: string | null;
  amount: number;
  reason: string;
  reasonId: string;
  reasonEn: string;
  status: RefundStatus;
  uiStatus: "diajukan" | "disetujui" | "ditolak" | "diproses" | "dibatalkan";
  rejectionReason: string | null;
  adminNote: string | null;
  decidedAt: string | null;
  decidedBy: { id: string; name: string; email: string } | null;
  processedAt: string | null;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  payment: {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    midtransOrderId: string | null;
    status: string;
  } | null;
}

export function formatRefundDto(r: RefundRecord): RefundDto {
  let uiStatus: RefundDto["uiStatus"] = "diajukan";
  if (r.status === "APPROVED") uiStatus = "disetujui";
  else if (r.status === "REJECTED") uiStatus = "ditolak";
  else if (r.status === "PROCESSED") uiStatus = "diproses";
  else if (r.status === "CANCELLED") uiStatus = "dibatalkan";

  return {
    id: r.id,
    bookingId: r.booking?.code || r.bookingId,
    rawBookingId: r.bookingId,
    bookingStatus: r.booking?.status || "UNKNOWN",
    propertyName: r.booking?.property?.name || "Kost",
    propertySlug: r.booking?.property?.slug || "",
    user: r.applicant?.fullName || r.applicant?.email || "Penyewa",
    userEmail: r.applicant?.email || "",
    userId: r.applicantId,
    userPhone: r.applicant?.phone ?? null,
    amount: Number(r.amount),
    reason: r.reason,
    reasonId: r.reason,
    reasonEn: r.reason,
    status: r.status,
    uiStatus,
    rejectionReason: r.rejectionReason,
    adminNote: r.adminNote,
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    decidedBy: r.decidedBy
      ? {
          id: r.decidedBy.id,
          name: r.decidedBy.fullName,
          email: r.decidedBy.email,
        }
      : null,
    processedAt: r.processedAt ? r.processedAt.toISOString() : null,
    requestedAt: r.createdAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    payment: r.payment
      ? {
          id: r.payment.id,
          amount: Number(r.payment.amount),
          method: r.payment.method,
          reference: r.payment.reference,
          midtransOrderId: r.payment.midtransOrderId,
          status: r.payment.status,
        }
      : null,
  };
}

/**
 * Menjalankan operasi database di dalam transaksi PostgreSQL berisolasi Serializable,
 * dengan penanganan retry otomatis terhadap serialization failure (Prisma P2034)
 * menggunakan exponential backoff dan jitter.
 */
async function withSerializableTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await prisma.$transaction(
        async (tx) => action(tx),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      attempt++;
      const isSerializationFailure =
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") ||
        (error instanceof Error &&
          (error.message.includes("could not serialize access") ||
            error.message.includes("P2034") ||
            error.message.includes("serialization failure")));

      if (isSerializationFailure && attempt <= maxRetries) {
        const delay = Math.floor(Math.pow(2, attempt) * 25 + Math.random() * 25);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (isSerializationFailure) {
        throw new ApiError(
          409,
          "CONCURRENCY_CONFLICT",
          "Permintaan sedang diproses secara bersamaan oleh transaksi lain. Silakan coba sesaat lagi.",
        );
      }

      throw error;
    }
  }
}

/**
 * Pengajuan refund baru oleh pengguna yang berhak (atau admin).
 * Memvalidasi booking, status pembayaran terverifikasi, jumlah yang memenuhi syarat,
 * dan mencegah race condition serta pengajuan ganda secara atomik.
 */
export async function createRefundRequest(
  profile: Profile,
  input: RefundRequestCreateInput,
  request?: Request,
): Promise<RefundDto> {
  return withSerializableTransaction(async (tx) => {
    // 1. Ambil data booking beserta pembayaran terverifikasi dan refund yang sudah ada
    const booking = await tx.booking.findFirst({
      where: bookingIdentifierWhere(input.bookingId),
      include: {
        property: { select: { id: true, name: true, slug: true } },
        applicant: { select: { id: true, fullName: true, email: true, phone: true } },
        payments: {
          where: { status: "VERIFIED" },
          orderBy: { createdAt: "desc" },
        },
        refundRequests: {
          where: {
            status: { in: ["PENDING", "APPROVED", "PROCESSED"] },
          },
        },
      },
    });

    if (!booking) {
      throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking tidak ditemukan");
    }

    // 2. Hak akses: hanya pemohon booking atau admin yang dapat mengajukan refund
    if (profile.role !== "ADMIN" && booking.applicantId !== profile.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke booking ini");
    }

    // 3. Validasi pembayaran yang berhasil (status VERIFIED) menggunakan Prisma.Decimal
    const totalVerifiedPayment = booking.payments.reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );

    if (totalVerifiedPayment.lessThanOrEqualTo(0)) {
      throw new ApiError(
        400,
        "NO_VERIFIED_PAYMENT",
        "Booking ini belum memiliki pembayaran yang berhasil/terverifikasi untuk direfund",
      );
    }

    // 4. Cegah pengajuan ganda jika sudah ada refund yang berstatus PENDING
    const hasPendingRefund = booking.refundRequests.some((r) => r.status === "PENDING");
    if (hasPendingRefund) {
      throw new ApiError(
        409,
        "PENDING_REFUND_EXISTS",
        "Sudah ada pengajuan refund yang sedang menunggu peninjauan admin untuk booking ini",
      );
    }

    // 5. Hitung sisa nominal yang masih dapat direfund untuk booking ini
    const allocatedAmount = booking.refundRequests.reduce(
      (sum, r) => sum.add(new Prisma.Decimal(r.amount)),
      new Prisma.Decimal(0),
    );
    const remainingRefundable = totalVerifiedPayment.sub(allocatedAmount);

    if (remainingRefundable.lessThanOrEqualTo(0)) {
      throw new ApiError(
        400,
        "MAX_REFUND_EXCEEDED",
        "Seluruh dana pembayaran untuk booking ini sudah direfund atau disetujui",
      );
    }

    const requestedDecimal =
      input.amount !== undefined ? new Prisma.Decimal(input.amount) : remainingRefundable;

    if (requestedDecimal.lessThanOrEqualTo(0)) {
      throw new ApiError(422, "INVALID_AMOUNT", "Nominal refund harus lebih besar dari 0");
    }

    if (requestedDecimal.greaterThan(remainingRefundable)) {
      throw new ApiError(
        422,
        "AMOUNT_EXCEEDS_REMAINING",
        `Nominal refund (Rp${requestedDecimal.toNumber().toLocaleString("id-ID")}) melebihi sisa dana pembayaran yang dapat dikembalikan (Rp${remainingRefundable.toNumber().toLocaleString("id-ID")})`,
      );
    }

    // 6. Tentukan relasi pembayaran dan validasi batas alokasi pembayaran
    let targetPaymentId: string | null = null;
    if (input.paymentId) {
      const matchingPayment = booking.payments.find((p) => p.id === input.paymentId);
      if (!matchingPayment) {
        throw new ApiError(
          422,
          "INVALID_PAYMENT_REF",
          "Referensi pembayaran tidak valid atau tidak berstatus terverifikasi",
        );
      }

      // Hitung alokasi dana khusus untuk pembayaran ini
      const paymentAllocated = booking.refundRequests
        .filter((r) => r.paymentId === matchingPayment.id)
        .reduce((sum, r) => sum.add(new Prisma.Decimal(r.amount)), new Prisma.Decimal(0));
      const paymentRemaining = new Prisma.Decimal(matchingPayment.amount).sub(paymentAllocated);

      if (paymentRemaining.lessThanOrEqualTo(0)) {
        throw new ApiError(
          422,
          "PAYMENT_FULLY_REFUNDED",
          "Dana pada pembayaran ini sudah seluruhnya dialokasikan untuk refund",
        );
      }

      if (requestedDecimal.greaterThan(paymentRemaining)) {
        throw new ApiError(
          422,
          "PAYMENT_AMOUNT_EXCEEDED",
          `Nominal refund (Rp${requestedDecimal.toNumber().toLocaleString("id-ID")}) melebihi sisa dana pada pembayaran terpilih (Rp${paymentRemaining.toNumber().toLocaleString("id-ID")})`,
        );
      }

      targetPaymentId = matchingPayment.id;
    } else {
      // Jika paymentId tidak spesifik, cari pembayaran yang memiliki sisa nominal cukup
      const eligiblePayment = booking.payments.find((p) => {
        const allocated = booking.refundRequests
          .filter((r) => r.paymentId === p.id)
          .reduce((sum, r) => sum.add(new Prisma.Decimal(r.amount)), new Prisma.Decimal(0));
        return new Prisma.Decimal(p.amount).sub(allocated).greaterThanOrEqualTo(requestedDecimal);
      });
      targetPaymentId = eligiblePayment?.id ?? booking.payments[0]?.id ?? null;
    }

    // 7. Buat baris RefundRequest secara persisten
    const created = await tx.refundRequest.create({
      data: {
        bookingId: booking.id,
        paymentId: targetPaymentId,
        applicantId: booking.applicantId,
        amount: requestedDecimal,
        reason: input.reason,
        status: "PENDING",
      },
      include: refundInclude,
    });

    // 8. Catat audit log secara atomik terikat dalam transaksi database
    await recordAuditLog({
      tx,
      actor: profile,
      action: "refund.request",
      entityType: "REFUND_REQUEST",
      entityId: created.id,
      description: `Pengajuan refund sebesar Rp${requestedDecimal.toNumber().toLocaleString("id-ID")} diajukan untuk booking ${booking.code}`,
      metadata: {
        refundRequestId: created.id,
        bookingId: booking.id,
        bookingCode: booking.code,
        amount: requestedDecimal.toNumber(),
        reason: input.reason,
        targetPaymentId,
      },
      request,
    });

    // 9. Kirim notifikasi in-app kepada pemohon jika profileId valid
    try {
      await tx.notification.create({
        data: {
          profileId: booking.applicantId,
          type: "PAYMENT",
          title: "Pengajuan Refund Diterima",
          body: `Pengajuan refund sebesar Rp${requestedDecimal.toNumber().toLocaleString("id-ID")} untuk ${booking.property.name} berhasil diajukan dan sedang menunggu peninjauan admin.`,
          linkUrl: "/dashboard/payments",
        },
      });
    } catch (notifErr) {
      console.error("[RefundService] Gagal membuat notifikasi pengajuan refund:", notifErr);
    }

    return formatRefundDto(created);
  });
}

/**
 * Daftar pengajuan refund dengan filter, pencarian, dan pagination.
 * Admin dapat melihat semua refund; pengguna biasa hanya refund miliknya sendiri.
 */
export async function listRefundRequests(
  profile: Profile,
  query: RefundListQueryInput,
): Promise<{
  items: RefundDto[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  stats: {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    processedCount: number;
    openAmount: number;
  };
}> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const where: Prisma.RefundRequestWhereInput = {
    ...(profile.role === "ADMIN" ? {} : { applicantId: profile.id }),
    ...(query.status ? { status: query.status } : {}),
    ...(query.bookingId ? { bookingId: query.bookingId } : {}),
  };

  if (query.search && query.search.trim().length > 0) {
    const q = query.search.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    where.OR = [
      ...(isUuid ? [{ id: q }] : []),
      { reason: { contains: q, mode: "insensitive" } },
      {
        booking: {
          code: { contains: q, mode: "insensitive" },
        },
      },
      {
        applicant: {
          fullName: { contains: q, mode: "insensitive" },
        },
      },
      {
        applicant: {
          email: { contains: q, mode: "insensitive" },
        },
      },
      {
        booking: {
          property: {
            name: { contains: q, mode: "insensitive" },
          },
        },
      },
    ];
  }

  // Hitung statistik untuk panel admin
  const statsScope: Prisma.RefundRequestWhereInput =
    profile.role === "ADMIN" ? {} : { applicantId: profile.id };

  const [items, total, pendingAgg, approvedCount, rejectedCount, processedCount] =
    await prisma.$transaction([
      prisma.refundRequest.findMany({
        where,
        include: refundInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.refundRequest.count({ where }),
      prisma.refundRequest.aggregate({
        where: { ...statsScope, status: "PENDING" },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.refundRequest.count({
        where: { ...statsScope, status: "APPROVED" },
      }),
      prisma.refundRequest.count({
        where: { ...statsScope, status: "REJECTED" },
      }),
      prisma.refundRequest.count({
        where: { ...statsScope, status: "PROCESSED" },
      }),
    ]);

  return {
    items: items.map(formatRefundDto),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
    stats: {
      pendingCount: pendingAgg._count,
      openAmount: Number(pendingAgg._sum.amount ?? 0),
      approvedCount,
      rejectedCount,
      processedCount,
    },
  };
}

/**
 * Mengambil detail satu refund request berdasarkan ID.
 * Menjamin isolasi hak akses: seeker hanya dapat melihat refund miliknya.
 */
export async function getRefundRequest(profile: Profile, id: string): Promise<RefundDto> {
  const refund = await prisma.refundRequest.findUnique({
    where: { id },
    include: refundInclude,
  });

  if (!refund) {
    throw new ApiError(404, "REFUND_NOT_FOUND", "Pengajuan refund tidak ditemukan");
  }

  if (profile.role !== "ADMIN" && refund.applicantId !== profile.id) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke pengajuan refund ini");
  }

  return formatRefundDto(refund);
}

/**
 * Keputusan admin terhadap refund: APPROVE, REJECT, atau PROCESSED (manual disbursement complete).
 * Dilindungi transaksi dengan Serializable isolation untuk mencegah race condition / double decision.
 */
export async function decideRefundRequest(
  profile: Profile,
  id: string,
  input: RefundDecisionInput,
  request?: Request,
): Promise<RefundDto> {
  if (profile.role !== "ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "Hanya admin yang memiliki wewenang memutuskan refund");
  }

  return withSerializableTransaction(async (tx) => {
    const existing = await tx.refundRequest.findUnique({
      where: { id },
      include: refundInclude,
    });

    if (!existing) {
      throw new ApiError(404, "REFUND_NOT_FOUND", "Pengajuan refund tidak ditemukan");
    }

    // Validasi transisi status
    if (input.decision === "APPROVED") {
      if (existing.status !== "PENDING") {
        throw new ApiError(
          409,
          "INVALID_STATUS_TRANSITION",
          `Pengajuan refund tidak dapat disetujui karena status saat ini adalah ${existing.status}`,
        );
      }

      const updated = await tx.refundRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          decidedById: profile.id,
          decidedAt: new Date(),
          adminNote: input.adminNote ?? existing.adminNote,
        },
        include: refundInclude,
      });

      // Audit log atomik
      await recordAuditLog({
        tx,
        actor: profile,
        action: "refund.approve",
        entityType: "REFUND_REQUEST",
        entityId: id,
        description: `Admin ${profile.fullName} menyetujui pengajuan refund ${id} sebesar Rp${Number(existing.amount).toLocaleString("id-ID")} (menunggu pencairan manual)`,
        metadata: {
          refundRequestId: id,
          bookingId: existing.bookingId,
          bookingCode: existing.booking?.code,
          amount: Number(existing.amount),
          decision: "APPROVED",
          adminNote: input.adminNote,
        },
        request,
      });

      // Notifikasi in-app
      try {
        await tx.notification.create({
          data: {
            profileId: existing.applicantId,
            type: "PAYMENT",
            title: "Permohonan Refund Disetujui",
            body: `Permohonan refund sebesar Rp${Number(existing.amount).toLocaleString("id-ID")} untuk booking ${existing.booking?.code || ""} telah disetujui admin dan sedang dalam antrean pencairan manual.`,
            linkUrl: "/dashboard/payments",
          },
        });
      } catch (notifErr) {
        console.error("[RefundService] Notifikasi approve gagal:", notifErr);
      }

      return formatRefundDto(updated);
    }

    if (input.decision === "REJECTED") {
      if (existing.status !== "PENDING" && existing.status !== "APPROVED") {
        throw new ApiError(
          409,
          "INVALID_STATUS_TRANSITION",
          `Pengajuan refund tidak dapat ditolak karena status saat ini adalah ${existing.status}`,
        );
      }

      const rejectionReason = "reason" in input && input.reason ? input.reason : "Ditolak oleh admin";

      const updated = await tx.refundRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason,
          decidedById: profile.id,
          decidedAt: new Date(),
          adminNote: input.adminNote ?? existing.adminNote,
        },
        include: refundInclude,
      });

      // Audit log atomik
      await recordAuditLog({
        tx,
        actor: profile,
        action: "refund.reject",
        entityType: "REFUND_REQUEST",
        entityId: id,
        description: `Admin ${profile.fullName} menolak pengajuan refund ${id}. Alasan: ${rejectionReason}`,
        metadata: {
          refundRequestId: id,
          bookingId: existing.bookingId,
          bookingCode: existing.booking?.code,
          amount: Number(existing.amount),
          decision: "REJECTED",
          rejectionReason,
          adminNote: input.adminNote,
        },
        request,
      });

      // Notifikasi in-app
      try {
        await tx.notification.create({
          data: {
            profileId: existing.applicantId,
            type: "PAYMENT",
            title: "Permohonan Refund Ditolak",
            body: `Permohonan refund untuk booking ${existing.booking?.code || ""} ditolak. Alasan: ${rejectionReason}`,
            linkUrl: "/dashboard/payments",
          },
        });
      } catch (notifErr) {
        console.error("[RefundService] Notifikasi reject gagal:", notifErr);
      }

      return formatRefundDto(updated);
    }

    if (input.decision === "PROCESSED") {
      // Hanya yang APPROVED yang dapat ditandai selesai dicairkan
      if (existing.status !== "APPROVED") {
        throw new ApiError(
          409,
          "INVALID_STATUS_TRANSITION",
          `Pengembalian dana hanya dapat ditandai selesai jika sebelumnya sudah disetujui (APPROVED). Status saat ini: ${existing.status}`,
        );
      }

      const processedAt = new Date();
      const updated = await tx.refundRequest.update({
        where: { id },
        data: {
          status: "PROCESSED",
          processedAt,
          adminNote: input.adminNote ?? existing.adminNote,
        },
        include: refundInclude,
      });

      // Ambil data pembayaran dan refund untuk verifikasi penuh vs parsial
      const bookingData =
        (await tx.booking.findUnique({
          where: { id: existing.bookingId },
          include: {
            payments: {
              where: { status: { in: ["VERIFIED", "REFUNDED"] } },
            },
            refundRequests: {
              where: { status: "PROCESSED" },
            },
          },
        })) ?? existing.booking;

      const bookingPayments =
        bookingData && "payments" in bookingData ? bookingData.payments : existing.booking?.payments ?? [];
      const bookingRefunds =
        bookingData && "refundRequests" in bookingData
          ? (bookingData.refundRequests as Array<{ id: string; amount: Prisma.Decimal | number; paymentId: string | null }>)
          : [];

      // Total seluruh pembayaran booking yang sukses/terverifikasi
      const totalBookingPayments = bookingPayments.reduce(
        (sum, p) => sum.add(new Prisma.Decimal(p.amount)),
        new Prisma.Decimal(0),
      );

      // Hitung total refund yang sudah PROCESSED untuk booking ini (termasuk refund saat ini)
      const alreadyCountedCurrent = bookingRefunds.some((r) => r.id === id);
      const totalBookingProcessed = bookingRefunds
        .reduce((sum, r) => sum.add(new Prisma.Decimal(r.amount)), new Prisma.Decimal(0))
        .add(alreadyCountedCurrent ? new Prisma.Decimal(0) : new Prisma.Decimal(existing.amount));

      // 1. Update Payment jika terikat
      if (existing.paymentId) {
        const paymentRecord = bookingPayments.find((p) => p.id === existing.paymentId) ?? existing.payment;
        if (paymentRecord) {
          const paymentProcessed = bookingRefunds
            .filter((r) => r.paymentId === existing.paymentId)
            .reduce((sum, r) => sum.add(new Prisma.Decimal(r.amount)), new Prisma.Decimal(0))
            .add(alreadyCountedCurrent ? new Prisma.Decimal(0) : new Prisma.Decimal(existing.amount));

          const isPaymentFullyRefunded = paymentProcessed.greaterThanOrEqualTo(
            new Prisma.Decimal(paymentRecord.amount),
          );

          if (isPaymentFullyRefunded) {
            await tx.payment.update({
              where: { id: existing.paymentId },
              data: {
                status: "REFUNDED",
                note: `Refund penuh selesai diproses (Ref: ${id})`,
              },
            });
          } else {
            await tx.payment.update({
              where: { id: existing.paymentId },
              data: {
                note: `Refund parsial selesai diproses sebesar Rp${Number(existing.amount).toLocaleString("id-ID")} (Ref: ${id})`,
              },
            });
          }
        }
      }

      // 2. Evaluasi apakah booking direfund PENUH
      const isBookingFullyRefunded =
        totalBookingPayments.greaterThan(0) &&
        totalBookingProcessed.greaterThanOrEqualTo(totalBookingPayments);

      if (isBookingFullyRefunded) {
        // Hanya batalkan booking dan bebaskan kamar jika benar-benar FULL refund
        if (
          existing.booking &&
          (existing.booking.status === "ACTIVE" || existing.booking.status === "APPROVED_AWAITING_PAYMENT")
        ) {
          await tx.booking.update({
            where: { id: existing.bookingId },
            data: {
              status: "CANCELLED",
              cancelledAt: processedAt,
              statusNote: `Booking dibatalkan akibat pengembalian dana penuh (Refund ID: ${id})`,
              history: {
                create: {
                  status: "CANCELLED",
                  note: `Booking dibatalkan akibat proses refund penuh selesai (${id})`,
                  actorId: profile.id,
                },
              },
            },
          });

          if (existing.booking.roomUnitId) {
            await tx.roomUnit.update({
              where: { id: existing.booking.roomUnitId },
              data: { status: "AVAILABLE" },
            });
          }
        }
      } else {
        // Refund parsial: perbarui statusNote tanpa membatalkan sewa atau mengusir penghuni
        await tx.booking.update({
          where: { id: existing.bookingId },
          data: {
            statusNote: `Refund parsial diproses sebesar Rp${Number(existing.amount).toLocaleString("id-ID")} (Refund ID: ${id})`,
          },
        });
      }

      // Audit log atomik
      await recordAuditLog({
        tx,
        actor: profile,
        action: "refund.process",
        entityType: "REFUND_REQUEST",
        entityId: id,
        description: `Admin ${profile.fullName} menyelesaikan pencairan manual refund ${id} sebesar Rp${Number(existing.amount).toLocaleString("id-ID")}${isBookingFullyRefunded ? " (Refund Penuh)" : " (Refund Parsial)"}`,
        metadata: {
          refundRequestId: id,
          bookingId: existing.bookingId,
          bookingCode: existing.booking?.code,
          amount: Number(existing.amount),
          decision: "PROCESSED",
          isBookingFullyRefunded,
          adminNote: input.adminNote,
        },
        request,
      });

      // Notifikasi in-app
      try {
        await tx.notification.create({
          data: {
            profileId: existing.applicantId,
            type: "PAYMENT",
            title: "Dana Refund Berhasil Dikembalikan",
            body: `Pengembalian dana sebesar Rp${Number(existing.amount).toLocaleString("id-ID")} untuk booking ${existing.booking?.code || ""} telah selesai diproses.`,
            linkUrl: "/dashboard/payments",
          },
        });
      } catch (notifErr) {
        console.error("[RefundService] Notifikasi process gagal:", notifErr);
      }

      return formatRefundDto(updated);
    }

    throw new ApiError(400, "INVALID_DECISION", "Keputusan tidak dikenal");
  });
}

/**
 * Pembatalan refund oleh pemohon sebelum diputuskan admin.
 */
export async function cancelRefundRequest(
  profile: Profile,
  id: string,
  request?: Request,
): Promise<RefundDto> {
  return withSerializableTransaction(async (tx) => {
    const existing = await tx.refundRequest.findUnique({
      where: { id },
      include: refundInclude,
    });

    if (!existing) {
      throw new ApiError(404, "REFUND_NOT_FOUND", "Pengajuan refund tidak ditemukan");
    }

    if (profile.role !== "ADMIN" && existing.applicantId !== profile.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki hak membatalkan pengajuan ini");
    }

    if (existing.status !== "PENDING") {
      throw new ApiError(
        409,
        "CANNOT_CANCEL",
        `Pengajuan refund tidak dapat dibatalkan karena sudah berstatus ${existing.status}`,
      );
    }

    const updated = await tx.refundRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
      include: refundInclude,
    });

    await recordAuditLog({
      tx,
      actor: profile,
      action: "refund.cancel",
      entityType: "REFUND_REQUEST",
      entityId: id,
      description: `Pengajuan refund ${id} dibatalkan oleh ${profile.fullName || profile.email}`,
      metadata: {
        refundRequestId: id,
        bookingId: existing.bookingId,
        amount: Number(existing.amount),
      },
      request,
    });

    return formatRefundDto(updated);
  });
}

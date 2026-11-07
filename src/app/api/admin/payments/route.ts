import { requireUser } from "@/server/auth";
import { successResponse, withApi } from "@/server/http";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async () => {
  await requireUser(["ADMIN"]);

  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          include: {
            applicant: { select: { fullName: true, email: true } },
            property: { select: { name: true, slug: true } },
          },
        },
        invoice: {
          include: {
            tenant: { select: { fullName: true, email: true } },
            property: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["PAID", "PENDING", "OVERDUE"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        tenant: { select: { fullName: true, email: true } },
        property: { select: { name: true, slug: true } },
        agreement: { select: { booking: { select: { code: true } } } },
      },
    }),
  ]);

  const rows: any[] = [];
  const seenIds = new Set<string>();

  for (const p of payments) {
    const txId = p.midtransOrderId || p.reference || p.id;
    seenIds.add(txId);
    let st: "settlement" | "pending" | "expired" | "refund" = "pending";
    if (p.status === "VERIFIED") st = "settlement";
    else if (p.status === "FAILED") st = "expired";
    else if (p.status === "REFUNDED") st = "refund";

    const payer =
      p.booking?.applicant?.fullName ||
      p.invoice?.tenant?.fullName ||
      p.booking?.applicant?.email ||
      p.invoice?.tenant?.email ||
      "Penyewa";

    const propName =
      p.booking?.property?.name ||
      p.invoice?.property?.name ||
      "Kost";

    const amt = Number(p.amount);
    const fee = Math.round(amt * 0.015); // ~1.5% gateway fee

    rows.push({
      id: txId,
      bookingId: p.booking?.code || p.bookingId || p.invoiceId || "-",
      payer,
      propertyName: propName,
      method: p.paymentType || (p.method === "MIDTRANS" ? "gopay" : "va-bca"),
      amount: amt,
      fee,
      status: st,
      at: (p.paidAt || p.createdAt).toISOString(),
    });
  }

  // Also include invoices that don't have linked payments
  for (const inv of invoices) {
    const invId = inv.code || `INV-${inv.id.slice(0, 8)}`;
    if (seenIds.has(invId)) continue;

    let st: "settlement" | "pending" | "expired" | "refund" = "pending";
    if (inv.status === "PAID") st = "settlement";
    else if (inv.status === "OVERDUE") st = "expired";

    const amt = Number(inv.amount);
    const fee = Math.round(amt * 0.015);

    rows.push({
      id: invId,
      bookingId: inv.agreement?.booking?.code || inv.code || "-",
      payer: inv.tenant?.fullName || inv.tenant?.email || "Penyewa",
      propertyName: inv.property?.name || "Kost",
      method: "va-bca",
      amount: amt,
      fee,
      status: st,
      at: (inv.paidAt || inv.createdAt).toISOString(),
    });
  }

  return successResponse(rows);
});

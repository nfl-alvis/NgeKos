import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/server/auth";
import { parseJson, successResponse, withApi, ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { createSnapTransaction, getMidtransConfig } from "@/server/midtrans";

const DEFAULT_PLANS = [
  {
    code: "starter",
    name: "Starter",
    description: "Untuk pemilik kos pemula dengan unit terbatas.",
    priceMonthly: 99000,
    maxProperties: 3,
    maxRooms: 15,
    advancedAnalytics: false,
  },
  {
    code: "professional",
    name: "Professional",
    description: "Paket paling populer untuk pengelola beberapa properti.",
    priceMonthly: 249000,
    maxProperties: 10,
    maxRooms: 60,
    advancedAnalytics: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Solusi tanpa batas untuk bisnis kos skala besar.",
    priceMonthly: 599000,
    maxProperties: 0,
    maxRooms: 0,
    advancedAnalytics: true,
  },
];

async function ensurePlans() {
  const existing = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { priceMonthly: "asc" },
  });
  if (existing.length > 0) {
    return existing;
  }

  for (const p of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        priceMonthly: p.priceMonthly,
        maxProperties: p.maxProperties,
        maxRooms: p.maxRooms,
        advancedAnalytics: p.advancedAnalytics,
        active: true,
      },
      create: {
        code: p.code,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        maxProperties: p.maxProperties,
        maxRooms: p.maxRooms,
        advancedAnalytics: p.advancedAnalytics,
        active: true,
      },
    });
  }

  return prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { priceMonthly: "asc" },
  });
}

interface FormattedSubscriptionInput {
  id: string;
  planId: string;
  status: string;
  trialEndsAt: Date | string | null;
  currentPeriodEnd: Date | string;
  plan: {
    id: string;
    code: string;
    name: string;
    priceMonthly: Prisma.Decimal | number;
    maxProperties: number;
    maxRooms: number;
    advancedAnalytics: boolean;
  };
}

function formatSubscription(sub: FormattedSubscriptionInput) {
  const now = new Date();
  const trialEnd = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const endDate = new Date(sub.currentPeriodEnd);
  const activeUntil = endDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    id: sub.id,
    planId: sub.planId,
    planCode: sub.plan.code,
    planName: sub.plan.name,
    status: sub.status,
    trialDaysLeft,
    activeUntil,
    currentPeriodEnd: sub.currentPeriodEnd,
    plan: {
      id: sub.plan.id,
      code: sub.plan.code,
      name: sub.plan.name,
      priceMonthly: Number(sub.plan.priceMonthly),
      maxProperties: sub.plan.maxProperties,
      maxRooms: sub.plan.maxRooms,
      advancedAnalytics: sub.plan.advancedAnalytics,
    },
  };
}

export const GET = withApi(async () => {
  const { profile } = await requireUser();
  const plans = await ensurePlans();

  let sub = await prisma.subscription.findFirst({
    where: { ownerId: profile.id },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!sub) {
    const defaultPlan = plans[0];
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    sub = await prisma.subscription.create({
      data: {
        ownerId: profile.id,
        planId: defaultPlan.id,
        status: "TRIAL",
        trialEndsAt: trialEnds,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnds,
      },
      include: { plan: true },
    });
  }

  return successResponse({
    subscription: formatSubscription(sub),
    plans: plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      priceMonthly: Number(p.priceMonthly),
      maxProperties: p.maxProperties,
      maxRooms: p.maxRooms,
      advancedAnalytics: p.advancedAnalytics,
      recommended: p.code === "professional",
    })),
  });
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("change_plan"),
    planId: z.string().min(1),
  }),
  z.object({
    action: z.literal("cancel"),
  }),
]);

export const POST = withApi(async (request: Request) => {
  const { profile } = await requireUser();
  const body = await parseJson(request, actionSchema);

  const existingSub = await prisma.subscription.findFirst({
    where: { ownerId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  if (body.action === "cancel") {
    if (!existingSub) {
      throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Langganan tidak ditemukan.");
    }
    const updated = await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        status: "GRACE_PERIOD",
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });
    return successResponse({ subscription: formatSubscription(updated) });
  }

  // Aksi change_plan
  const plans = await ensurePlans();
  const targetPlan = plans.find((p) => p.id === body.planId || p.code === body.planId);
  if (!targetPlan) {
    throw new ApiError(404, "PLAN_NOT_FOUND", "Paket langganan tidak ditemukan.");
  }

  const priceMonthly = Number(targetPlan.priceMonthly);

  // Jika paket berbayar, integrasikan dengan Midtrans Snap Checkout
  // (Mencegah free bypass aktivasi Enterprise/Pro tanpa bayar)
  if (priceMonthly > 0) {
    const config = getMidtransConfig();
    if (!config.isConfigured) {
      throw new ApiError(
        503,
        "PAYMENT_GATEWAY_NOT_CONFIGURED",
        "Midtrans payment gateway belum dikonfigurasi di server."
      );
    }

    const orderId = `SUB-${profile.id.slice(0, 8)}-${targetPlan.code}-${Date.now()}`;

    // Buat token transaksi Snap di Midtrans
    let snapResult;
    try {
      snapResult = await createSnapTransaction({
        orderId,
        grossAmount: priceMonthly,
        customerDetails: {
          first_name: profile.fullName || "Pemilik Kos",
          email: profile.email || "owner@ngekost.id",
          phone: profile.phone || undefined,
        },
        itemDetails: [
          {
            id: targetPlan.id,
            name: `Langganan NgeKos ${targetPlan.name}`.slice(0, 50),
            price: Math.round(priceMonthly),
            quantity: 1,
          },
        ],
      });
    } catch (error) {
      if (error instanceof TypeError && error.message === "fetch failed") {
        throw new ApiError(
          503,
          "PAYMENT_GATEWAY_UNAVAILABLE",
          "Tidak dapat terhubung ke Midtrans. Coba beberapa saat lagi."
        );
      }
      throw error;
    }

    // Catat record Payment dengan status PENDING
    await prisma.payment.create({
      data: {
        method: "MIDTRANS",
        status: "PENDING",
        amount: new Prisma.Decimal(priceMonthly),
        reference: orderId,
        midtransOrderId: orderId,
        snapToken: snapResult.token,
        recordedById: profile.id,
        note: `Langganan paket: ${targetPlan.name} (${targetPlan.code})`,
      },
    });

    return successResponse({
      requiresPayment: true,
      orderId,
      grossAmount: priceMonthly,
      token: snapResult.token,
      redirectUrl: snapResult.redirect_url,
      plan: {
        id: targetPlan.id,
        code: targetPlan.code,
        name: targetPlan.name,
        priceMonthly,
      },
    });
  }

  // Paket gratis/trial langsung diaktifkan tanpa pembayaran
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let updated;
  if (existingSub) {
    updated = await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        planId: targetPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
      },
      include: { plan: true },
    });
  } else {
    updated = await prisma.subscription.create({
      data: {
        ownerId: profile.id,
        planId: targetPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  return successResponse({
    requiresPayment: false,
    subscription: formatSubscription(updated),
  });
});

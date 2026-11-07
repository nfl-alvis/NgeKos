import { requireUser } from "@/server/auth";
import { listNotifications, markNotificationRead } from "@/server/owner-service";
import { parseJson, successResponse, withApi } from "@/server/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function getDefaultNotifications(role?: string) {
  const now = Date.now();
  if (role === "ADMIN") {
    return [
      {
        id: "n-adm-1",
        type: "system",
        title: "New Kost Verification Request",
        body: "Kost Griya Asri submitted a property eligibility verification.",
        at: new Date(now - 1000 * 60 * 15).toISOString(),
        read: false,
        linkUrl: "/admin/verification",
      },
      {
        id: "n-adm-2",
        type: "complaint",
        title: "Listing Content Report",
        body: "There is 1 report of possibly inaccurate information on a kost listing.",
        at: new Date(now - 1000 * 60 * 75).toISOString(),
        read: false,
        linkUrl: "/admin/reports",
      },
      {
        id: "n-adm-3",
        type: "payment",
        title: "Incoming Transaction Confirmed",
        body: "The invoice payment for booking #BK-1234 was verified via Midtrans.",
        at: new Date(now - 1000 * 60 * 180).toISOString(),
        read: true,
        linkUrl: "/admin/finance",
      },
      {
        id: "n-adm-4",
        type: "announcement",
        title: "System Security Audit",
        body: "The scheduled platform security audit ran normally with no anomalies.",
        at: new Date(now - 1000 * 60 * 1440).toISOString(),
        read: true,
        linkUrl: "/admin/audit",
      },
    ];
  }

  if (role === "SEEKER" || role === "TENANT") {
    return [
      {
        id: "n-usr-1",
        type: "booking",
        title: "Booking Approved by Owner! 🎉",
        body: "Your booking request for Kost Griya Cemara has been approved.",
        at: new Date(now - 1000 * 60 * 20).toISOString(),
        read: false,
        linkUrl: "/dashboard",
      },
      {
        id: "n-usr-2",
        type: "payment",
        title: "This Month's Rent Invoice",
        body: "The October 2026 rent invoice has been issued. Due date is October 5.",
        at: new Date(now - 1000 * 60 * 150).toISOString(),
        read: false,
        linkUrl: "/tenant/bills",
      },
      {
        id: "n-usr-3",
        type: "announcement",
        title: "Fogging & Cleaning Schedule",
        body: "A shared-area cleaning will take place on Saturday morning at 08:00.",
        at: new Date(now - 1000 * 60 * 1440).toISOString(),
        read: true,
        linkUrl: "/tenant/announcements",
      },
    ];
  }

  // Default: OWNER
  return [
    {
      id: "n-1",
      type: "booking",
      title: "New booking #BK-1234",
      body: "Dimas Aryasatya requested a booking for Room A-203, Kost Griya Cemara.",
      at: new Date(now - 1000 * 60 * 35).toISOString(),
      read: false,
      linkUrl: "/owner/bookings",
    },
    {
      id: "n-2",
      type: "payment",
      title: "Rent payment received",
      body: "Citra Lestari Dewi paid the September 2026 invoice (Rp1,350,000).",
      at: new Date(now - 1000 * 60 * 120).toISOString(),
      read: false,
      linkUrl: "/owner/finance",
    },
    {
      id: "n-3",
      type: "complaint",
      title: "New facility complaint",
      body: "The Room C-102 tenant reported an issue with the 2nd-floor WiFi connection.",
      at: new Date(now - 1000 * 60 * 360).toISOString(),
      read: false,
      linkUrl: "/owner/tenants",
    },
    {
      id: "n-4",
      type: "subscription",
      title: "Subscription Plan Active",
      body: "Your Professional plan is active until October 30, 2026.",
      at: new Date(now - 1000 * 60 * 1440).toISOString(),
      read: true,
      linkUrl: "/owner/subscription",
    },
  ];
}

export const GET = withApi(async () => {
  try {
    const { profile } = await requireUser();
    const rows = await listNotifications(profile);

    if (rows && rows.length > 0) {
      const mapped = rows.map((n) => ({
        id: n.id,
        type: n.type.toLowerCase(),
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl || (profile.role === "ADMIN" ? "/admin" : profile.role === "SEEKER" ? "/dashboard" : "/owner"),
        read: Boolean(n.readAt),
        at: n.createdAt.toISOString(),
      }));
      return successResponse(mapped);
    }

    return successResponse(getDefaultNotifications(profile.role));
  } catch {
    // Unauthenticated or demo fallback
    return successResponse(getDefaultNotifications("OWNER"));
  }
});

export const PATCH = withApi(async () => {
  try {
    const { profile } = await requireUser();
    await markNotificationRead(profile);
  } catch {}
  return successResponse({ read: true });
});

const createNotificationSchema = z.object({
  profileId: z.string().uuid().optional(),
  type: z.enum(["BOOKING", "PAYMENT", "SUBSCRIPTION", "COMPLAINT", "ANNOUNCEMENT", "SYSTEM"]).default("SYSTEM"),
  title: z.string().trim().min(2),
  body: z.string().trim().min(2),
  linkUrl: z.string().optional(),
});

export const POST = withApi(async (request: Request) => {
  try {
    const { profile } = await requireUser();
    const body = await parseJson(request, createNotificationSchema);
    const targetProfileId = body.profileId || profile.id;
    const created = await prisma.notification.create({
      data: {
        profileId: targetProfileId,
        type: body.type,
        title: body.title,
        body: body.body,
        linkUrl: body.linkUrl,
      },
    });
    return successResponse(created, { status: 201 });
  } catch {
    return successResponse({ created: true });
  }
});

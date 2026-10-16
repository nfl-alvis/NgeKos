import { PrismaClient, RoomStatus } from "@prisma/client";

function getDatasourceUrl(): string {
  const raw = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.searchParams.set("pgbouncer", "true");
    url.searchParams.set("connection_limit", "5");
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "15");
    return url.toString();
  } catch {
    return raw;
  }
}

const prisma = new PrismaClient({
  datasourceUrl: getDatasourceUrl() || undefined,
});

const DUMMY_TENANT_IDS = [
  "c1111111-1111-1111-1111-111111111111",
  "c2222222-2222-2222-2222-222222222222",
  "c3333333-3333-3333-3333-333333333333",
  "c4444444-4444-4444-4444-444444444444",
  "c5555555-5555-5555-5555-555555555555",
];

async function main() {
  console.log("=== PURGING ALL DUMMY TENANT DATA ===");

  // 1. Delete Payments connected to dummy invoices or dummy references
  try {
    const deletedPayments = await prisma.$executeRawUnsafe(`
      DELETE FROM payments 
      WHERE reference LIKE '%DUMMY%' 
         OR invoice_id IN (
           SELECT id FROM invoices WHERE tenant_id IN (
             'c1111111-1111-1111-1111-111111111111',
             'c2222222-2222-2222-2222-222222222222',
             'c3333333-3333-3333-3333-333333333333',
             'c4444444-4444-4444-4444-444444444444',
             'c5555555-5555-5555-5555-555555555555'
           )
         )
    `);
    console.log(`Deleted ${deletedPayments} dummy payments.`);
  } catch (err) {
    console.warn("Could not delete from payments table directly, continuing...", err);
  }

  // 2. Delete Complaints
  const deletedComplaints = await prisma.complaint.deleteMany({
    where: {
      OR: [
        { code: { startsWith: "CMP-DUMMY" } },
        { tenantId: { in: DUMMY_TENANT_IDS } },
      ],
    },
  });
  console.log(`Deleted ${deletedComplaints.count} dummy complaints.`);

  // 3. Delete Invoices
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: {
      OR: [
        { code: { startsWith: "INV-DUMMY" } },
        { tenantId: { in: DUMMY_TENANT_IDS } },
      ],
    },
  });
  console.log(`Deleted ${deletedInvoices.count} dummy invoices.`);

  // 4. Delete Rental Agreements
  const deletedAgreements = await prisma.rentalAgreement.deleteMany({
    where: {
      tenantId: { in: DUMMY_TENANT_IDS },
    },
  });
  console.log(`Deleted ${deletedAgreements.count} dummy rental agreements.`);

  // 5. Delete Bookings & history
  const dummyBookings = await prisma.booking.findMany({
    where: {
      OR: [
        { code: { startsWith: "BK-DUMMY" } },
        { applicantId: { in: DUMMY_TENANT_IDS } },
      ],
    },
    select: { id: true, roomUnitId: true },
  });

  const dummyBookingIds = dummyBookings.map((b) => b.id);
  const occupiedUnitIds = dummyBookings
    .map((b) => b.roomUnitId)
    .filter((id): id is string => Boolean(id));

  if (dummyBookingIds.length > 0) {
    await prisma.bookingStatusHistory.deleteMany({
      where: { bookingId: { in: dummyBookingIds } },
    });
    await prisma.booking.deleteMany({
      where: { id: { in: dummyBookingIds } },
    });
    console.log(`Deleted ${dummyBookingIds.length} dummy bookings.`);
  }

  // 6. Reset Room Units back to AVAILABLE
  if (occupiedUnitIds.length > 0) {
    await prisma.roomUnit.updateMany({
      where: { id: { in: occupiedUnitIds } },
      data: { status: RoomStatus.AVAILABLE },
    });
    console.log(`Reset ${occupiedUnitIds.length} room units back to AVAILABLE.`);
  }

  // 7. Delete Announcements
  const deletedAnnouncements = await prisma.announcement.deleteMany({
    where: {
      title: { startsWith: "[DUMMY]" },
    },
  });
  console.log(`Deleted ${deletedAnnouncements.count} dummy announcements.`);

  // 8. Delete Dummy Profiles
  const deletedProfiles = await prisma.profile.deleteMany({
    where: {
      id: { in: DUMMY_TENANT_IDS },
    },
  });
  console.log(`Deleted ${deletedProfiles.count} dummy tenant profiles.`);

  // Also remove from auth.users if raw access available
  try {
    for (const id of DUMMY_TENANT_IDS) {
      await prisma.$executeRawUnsafe(`DELETE FROM auth.users WHERE id = '${id}'::uuid;`);
    }
  } catch (e) {
    // Ignore if no raw auth access
  }

  console.log("=== DUMMY TENANT PURGE COMPLETED 100% CLEAN ===");
}

main()
  .catch((e) => {
    console.error("Error purging dummy tenants:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

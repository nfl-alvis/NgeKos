import {
  PrismaClient,
  BookingStatus,
  AgreementStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  ComplaintCategory,
  ComplaintStatus,
  RoomStatus,
} from "@prisma/client";

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

export const DUMMY_TENANT_PROFILES = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    email: "imade.sudiarta@gmail.com",
    fullName: "I Made Sudiarta",
    phone: "+62 812-3456-7801",
    propertySlug: "kost-dparagon-ijen-nirwana",
    unitNumber: "D-01",
    monthlyRent: 2100000,
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    email: "anisa.rahmawati@dummy.ngekos.biz.id",
    fullName: "Anisa Rahmawati",
    phone: "+62 813-8890-1234",
    propertySlug: "kost-putri-bu-sastro",
    unitNumber: "D-01",
    monthlyRent: 1250000,
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    email: "dimas.pratama@dummy.ngekos.biz.id",
    fullName: "Dimas Pratama",
    phone: "+62 856-7788-9900",
    propertySlug: "kost-dparagon-songgolangit",
    unitNumber: "D-01",
    monthlyRent: 1950000,
  },
  {
    id: "c4444444-4444-4444-4444-444444444444",
    email: "nabila.putri@dummy.ngekos.biz.id",
    fullName: "Nabila Putri",
    phone: "+62 878-2233-4455",
    propertySlug: "kost-bougenville-summbersari",
    unitNumber: "S-01",
    monthlyRent: 950000,
  },
  {
    id: "c5555555-5555-5555-5555-555555555555",
    email: "farhan.ramadhan@dummy.ngekos.biz.id",
    fullName: "Farhan Ramadhan",
    phone: "+62 811-9988-7766",
    propertySlug: "kost-dparagon-ijen-nirwana",
    unitNumber: "V-01",
    monthlyRent: 2600000,
  },
];

async function main() {
  console.log("=== SEEDING DUMMY TENANTS & OPERATIONS ===");

  // 1. Upsert Profiles for Tenants
  for (const t of DUMMY_TENANT_PROFILES) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          '${t.id}'::uuid,
          'authenticated',
          'authenticated',
          '${t.email}',
          crypt('Password123!', gen_salt('bf', 10)),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{"full_name":"${t.fullName}","role":"seeker"}'::jsonb,
          NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = '${t.email}',
          raw_user_meta_data = '{"full_name":"${t.fullName}","role":"seeker"}'::jsonb,
          updated_at = NOW();
      `);
    } catch (e: any) {
      // Ignored if auth schema not direct access
    }

    await prisma.profile.upsert({
      where: { id: t.id },
      update: {
        fullName: t.fullName,
        email: t.email,
        phone: t.phone,
        role: "SEEKER",
        status: "ACTIVE",
      },
      create: {
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        phone: t.phone,
        role: "SEEKER",
        status: "ACTIVE",
        locale: "id",
      },
    });

    console.log(`Seeded Profile: ${t.fullName} (${t.email})`);
  }

  // 2. Create Active Bookings, Agreements, Invoices, & Payments
  let idx = 1;
  let primaryAgreementId = "";
  let primaryPropertyId = "";

  for (const t of DUMMY_TENANT_PROFILES) {
    console.log(`Processing tenancy for ${t.fullName} (${t.propertySlug})...`);
    const property = await prisma.property.findUnique({
      where: { slug: t.propertySlug },
      include: { roomTypes: true },
    });

    if (!property) {
      console.warn(`Property ${t.propertySlug} not found, skipping.`);
      continue;
    }

    if (t.id === DUMMY_TENANT_PROFILES[0].id) {
      primaryPropertyId = property.id;
    }

    const roomType = property.roomTypes[0];
    if (!roomType) {
      console.warn(`No room type for ${property.name}, skipping.`);
      continue;
    }

    console.log(`Found property: ${property.name}, RoomType: ${roomType.name}`);

    // Find or create Unit
    let unit = await prisma.roomUnit.findFirst({
      where: { propertyId: property.id, number: t.unitNumber },
    });

    if (!unit) {
      unit = await prisma.roomUnit.create({
        data: {
          propertyId: property.id,
          roomTypeId: roomType.id,
          number: t.unitNumber,
          status: RoomStatus.OCCUPIED,
        },
      });
      console.log(`Created room unit ${unit.number}`);
    } else {
      await prisma.roomUnit.update({
        where: { id: unit.id },
        data: { status: RoomStatus.OCCUPIED },
      });
      console.log(`Updated room unit ${unit.number} to OCCUPIED`);
    }

    const bookingCode = `BK-DUMMY-0${idx}`;
    const booking = await prisma.booking.upsert({
      where: { code: bookingCode },
      update: {
        status: BookingStatus.ACTIVE,
        roomUnitId: unit.id,
        monthlyPriceSnapshot: t.monthlyRent,
      },
      create: {
        code: bookingCode,
        applicantId: t.id,
        propertyId: property.id,
        roomTypeId: roomType.id,
        roomUnitId: unit.id,
        startDate: new Date("2026-08-01"),
        durationMonths: 12,
        status: BookingStatus.ACTIVE,
        monthlyPriceSnapshot: t.monthlyRent,
        depositSnapshot: 500000,
        approvedAt: new Date("2026-07-28T10:00:00Z"),
      },
    });

    // Agreement
    const agreement = await prisma.rentalAgreement.upsert({
      where: { bookingId: booking.id },
      update: {
        status: AgreementStatus.ACTIVE,
        monthlyRent: t.monthlyRent,
      },
      create: {
        bookingId: booking.id,
        tenantId: t.id,
        propertyId: property.id,
        roomUnitId: unit.id,
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-07-31"),
        monthlyRent: t.monthlyRent,
        depositAmount: 500000,
        status: AgreementStatus.ACTIVE,
        terms: "Perjanjian sewa standar NgeKos Malang 12 bulan.",
      },
    });

    if (t.id === DUMMY_TENANT_PROFILES[0].id) {
      primaryAgreementId = agreement.id;
    }

    // Invoices
    const inv1Code = `INV-DUMMY-${idx}-08`;
    const inv1 = await prisma.invoice.upsert({
      where: { code: inv1Code },
      update: { status: InvoiceStatus.PAID },
      create: {
        code: inv1Code,
        agreementId: agreement.id,
        tenantId: t.id,
        propertyId: property.id,
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        dueDate: new Date("2026-08-05"),
        amount: t.monthlyRent,
        status: InvoiceStatus.PAID,
        paidAt: new Date("2026-08-02T10:00:00Z"),
      },
    });

    // Payment for inv1
    await prisma.$executeRawUnsafe(
      `DELETE FROM payments WHERE invoice_id = $1::uuid`,
      inv1.id
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO payments (id, invoice_id, method, status, amount, reference, paid_at, verified_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, 'BANK_TRANSFER'::"PaymentMethod", 'VERIFIED'::"PaymentStatus", $2, $3, $4::timestamptz, $5::timestamptz, NOW(), NOW())`,
      inv1.id,
      t.monthlyRent,
      `BCA-DUMMY-${idx}-08`,
      "2026-08-02T10:00:00Z",
      "2026-08-02T11:00:00Z"
    );

    const inv2Code = `INV-DUMMY-${idx}-09`;
    const inv2 = await prisma.invoice.upsert({
      where: { code: inv2Code },
      update: { status: InvoiceStatus.PAID },
      create: {
        code: inv2Code,
        agreementId: agreement.id,
        tenantId: t.id,
        propertyId: property.id,
        periodStart: new Date("2026-09-01"),
        periodEnd: new Date("2026-09-30"),
        dueDate: new Date("2026-09-05"),
        amount: t.monthlyRent,
        status: InvoiceStatus.PAID,
        paidAt: new Date("2026-09-01T14:30:00Z"),
      },
    });

    await prisma.$executeRawUnsafe(
      `DELETE FROM payments WHERE invoice_id = $1::uuid`,
      inv2.id
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO payments (id, invoice_id, method, status, amount, reference, paid_at, verified_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, 'BANK_TRANSFER'::"PaymentMethod", 'VERIFIED'::"PaymentStatus", $2, $3, $4::timestamptz, $5::timestamptz, NOW(), NOW())`,
      inv2.id,
      t.monthlyRent,
      `BCA-DUMMY-${idx}-09`,
      "2026-09-01T14:30:00Z",
      "2026-09-01T15:00:00Z"
    );

    const inv3Code = `INV-DUMMY-${idx}-10`;
    await prisma.invoice.upsert({
      where: { code: inv3Code },
      update: { status: InvoiceStatus.PENDING },
      create: {
        code: inv3Code,
        agreementId: agreement.id,
        tenantId: t.id,
        propertyId: property.id,
        periodStart: new Date("2026-10-01"),
        periodEnd: new Date("2026-10-31"),
        dueDate: new Date("2026-10-25"),
        amount: t.monthlyRent,
        status: InvoiceStatus.PENDING,
      },
    });

    idx++;
  }

  // 3. Create Complaints for primary tenant if agreement exists
  if (primaryAgreementId && primaryPropertyId) {
    const primaryTenantId = DUMMY_TENANT_PROFILES[0].id;

    await prisma.complaint.upsert({
      where: { code: "CMP-DUMMY-01" },
      update: { status: ComplaintStatus.IN_PROGRESS },
      create: {
        code: "CMP-DUMMY-01",
        agreementId: primaryAgreementId,
        propertyId: primaryPropertyId,
        tenantId: primaryTenantId,
        category: ComplaintCategory.FACILITY,
        title: "Kran wastafel kamar mandi menetes halus",
        description: "Kran wastafel sedikit menetes airnya saat diputar tertutup rapat.",
        status: ComplaintStatus.IN_PROGRESS,
        ownerNote: "Sudah dikonfirmasi. Teknisi pipa dijadwalkan datang besok pukul 10.00 WIB.",
      },
    });

    await prisma.complaint.upsert({
      where: { code: "CMP-DUMMY-02" },
      update: { status: ComplaintStatus.RESOLVED },
      create: {
        code: "CMP-DUMMY-02",
        agreementId: primaryAgreementId,
        propertyId: primaryPropertyId,
        tenantId: primaryTenantId,
        category: ComplaintCategory.FACILITY,
        title: "Koneksi WiFi lantai 1 sempat lambat di jam malam",
        description: "Kecepatan internet turun drastis di atas pukul 20.00 WIB.",
        status: ComplaintStatus.RESOLVED,
        ownerNote: "Access point router sudah direstart dan kabel LAN diganti baru. Koneksi kembali normal.",
        resolvedAt: new Date("2026-08-21T11:00:00Z"),
      },
    });

    // Announcements from Owner
    const owner = await prisma.profile.findFirst({ where: { role: "OWNER" } });
    if (owner) {
      await prisma.announcement.deleteMany({
        where: { title: { startsWith: "[DUMMY]" } },
      });

      await prisma.announcement.create({
        data: {
          propertyId: primaryPropertyId,
          authorId: owner.id,
          title: "[DUMMY] Pembersihan Rutin Toren Air & Filter",
          body: "Diberitahukan kepada seluruh penghuni bahwa hari Minggu, 18 Oktober 2026 pukul 08.00–10.00 WIB akan dilakukan pembersihan toren air. Aliran air dimatikan sementara selama pengerjaan.",
        },
      });

      await prisma.announcement.create({
        data: {
          propertyId: primaryPropertyId,
          authorId: owner.id,
          title: "[DUMMY] Pemberlakuan Akses Kartu RFID Gerbang Baru",
          body: "Mulai 1 November 2026, gerbang utama menggunakan sistem kartu akses RFID mandiri 24 jam. Kartu dapat diambil di kantor pengelola mulai tanggal 25 Oktober.",
        },
      });
    }

    console.log("Seeded Complaints & Announcements for Primary Tenant.");
  }

  console.log("=== DUMMY TENANT SEED COMPLETED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("Error seeding dummy tenants:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

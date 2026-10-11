import { PrismaClient, PropertyGender, PropertyStatus, RoomStatus } from "@prisma/client";
import { properties } from "../src/lib/data/properties";
import { KOS_IMAGES } from "../src/lib/kosImages";

function getDatasourceUrl(): string {
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "20");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

const prisma = new PrismaClient({
  datasourceUrl: getDatasourceUrl() || undefined,
});

const genderMap: Record<string, PropertyGender> = {
  mixed: PropertyGender.MIXED,
  male: PropertyGender.MALE,
  female: PropertyGender.FEMALE,
};

const statusMap: Record<string, PropertyStatus> = {
  verified: PropertyStatus.VERIFIED,
  pending: PropertyStatus.PENDING,
  rejected: PropertyStatus.REJECTED,
};

async function seedDummyAccounts() {
  const OWNER_ID = "58983471-0904-40df-beb8-3a51888b176b";
  const OWNER_EMAIL = "owner@ngekost.id";
  const OWNER_PASS = "Password123!";
  const OWNER_NAME = "Ratri Wulandari (Owner Demo)";

  const ADMIN_ID = "a1111111-1111-1111-1111-111111111111";
  const ADMIN_EMAIL = "admin@ngekost.id";
  const ADMIN_PASS = "Password123!";
  const ADMIN_NAME = "Bayu Pratama (Admin Demo)";

  // Owner in auth.users & identities
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, recovery_sent_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        '${OWNER_ID}'::uuid,
        'authenticated',
        'authenticated',
        '${OWNER_EMAIL}',
        crypt('${OWNER_PASS}', gen_salt('bf', 10)),
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
        NOW(), NOW(), '', '', '', ''
      )
      ON CONFLICT (id) DO UPDATE SET
        email = '${OWNER_EMAIL}',
        encrypted_password = crypt('${OWNER_PASS}', gen_salt('bf', 10)),
        email_confirmed_at = NOW(),
        raw_user_meta_data = '{"full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
        updated_at = NOW();
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        '${OWNER_ID}'::uuid,
        '{"sub":"${OWNER_ID}","email":"${OWNER_EMAIL}","full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
        'email',
        '${OWNER_ID}',
        NOW(), NOW(), NOW()
      )
      ON CONFLICT (provider, provider_id) DO UPDATE SET
        identity_data = '{"sub":"${OWNER_ID}","email":"${OWNER_EMAIL}","full_name":"${OWNER_NAME}","role":"owner"}'::jsonb,
        updated_at = NOW();
    `);
  } catch (err: any) {
    console.warn("Notice: Owner auth.users raw execution skipped:", err?.message || err);
  }

  const owner = await prisma.profile.upsert({
    where: { id: OWNER_ID },
    update: { email: OWNER_EMAIL, fullName: OWNER_NAME, role: "OWNER", status: "ACTIVE" },
    create: { id: OWNER_ID, email: OWNER_EMAIL, fullName: OWNER_NAME, role: "OWNER", status: "ACTIVE", locale: "id" },
  });

  // Admin in auth.users & identities
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, recovery_sent_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        '${ADMIN_ID}'::uuid,
        'authenticated',
        'authenticated',
        '${ADMIN_EMAIL}',
        crypt('${ADMIN_PASS}', gen_salt('bf', 10)),
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
        NOW(), NOW(), '', '', '', ''
      )
      ON CONFLICT (id) DO UPDATE SET
        email = '${ADMIN_EMAIL}',
        encrypted_password = crypt('${ADMIN_PASS}', gen_salt('bf', 10)),
        email_confirmed_at = NOW(),
        raw_user_meta_data = '{"full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
        updated_at = NOW();
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        '${ADMIN_ID}'::uuid,
        '{"sub":"${ADMIN_ID}","email":"${ADMIN_EMAIL}","full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
        'email',
        '${ADMIN_ID}',
        NOW(), NOW(), NOW()
      )
      ON CONFLICT (provider, provider_id) DO UPDATE SET
        identity_data = '{"sub":"${ADMIN_ID}","email":"${ADMIN_EMAIL}","full_name":"${ADMIN_NAME}","role":"admin"}'::jsonb,
        updated_at = NOW();
    `);
  } catch (err: any) {
    console.warn("Notice: Admin auth.users raw execution skipped:", err?.message || err);
  }

  await prisma.profile.upsert({
    where: { id: ADMIN_ID },
    update: { email: ADMIN_EMAIL, fullName: ADMIN_NAME, role: "ADMIN", adminRole: "SUPER", status: "ACTIVE" },
    create: { id: ADMIN_ID, email: ADMIN_EMAIL, fullName: ADMIN_NAME, role: "ADMIN", adminRole: "SUPER", status: "ACTIVE", locale: "id" },
  });

  return owner;
}

async function cleanStaleDummyProperties(validSlugs: string[]) {
  const staleProperties = await prisma.property.findMany({
    where: { slug: { notIn: validSlugs } },
    select: { id: true, slug: true },
  });

  if (staleProperties.length === 0) return;

  console.log(`Found ${staleProperties.length} stale/dummy properties to remove...`);

  for (const stale of staleProperties) {
    // 1. Delete payments connected to invoices of this property
    const staleInvoices = await prisma.invoice.findMany({
      where: { propertyId: stale.id },
      select: { id: true },
    });
    const invoiceIds = staleInvoices.map((inv) => inv.id);
    if (invoiceIds.length > 0) {
      await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
    }

    // 2. Delete rental agreements
    await prisma.rentalAgreement.deleteMany({ where: { propertyId: stale.id } });

    // 3. Delete bookings and their history
    const staleBookings = await prisma.booking.findMany({
      where: { propertyId: stale.id },
      select: { id: true },
    });
    const bookingIds = staleBookings.map((b) => b.id);
    if (bookingIds.length > 0) {
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
    }

    // 4. Delete property relations
    await prisma.review.deleteMany({ where: { propertyId: stale.id } });
    await prisma.complaint.deleteMany({ where: { propertyId: stale.id } });
    await prisma.propertyVerification.deleteMany({ where: { propertyId: stale.id } });
    await prisma.favorite.deleteMany({ where: { propertyId: stale.id } });
    await prisma.propertyImage.deleteMany({ where: { propertyId: stale.id } });
    await prisma.propertyFacility.deleteMany({ where: { propertyId: stale.id } });
    await prisma.roomUnit.deleteMany({ where: { propertyId: stale.id } });
    await prisma.roomType.deleteMany({ where: { propertyId: stale.id } });
    await prisma.property.delete({ where: { id: stale.id } });
    console.log(`Cleaned up stale property: ${stale.slug}`);
  }
}

async function main() {
  const owner = await seedDummyAccounts();

  // 1. Clean up old non-Malang dummy properties
  const validSlugs = properties.map((p) => p.slug);
  await cleanStaleDummyProperties(validSlugs);

  // 2. Upsert authentic Malang Kota properties
  for (const item of properties) {
    const status = statusMap[item.verificationStatus] ?? PropertyStatus.VERIFIED;
    const property = await prisma.property.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        tagline: item.tagline,
        description: item.description,
        city: item.city,
        district: item.district,
        address: item.address,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        gender: genderMap[item.gender] ?? PropertyGender.MIXED,
        status,
        rejectionNote: item.verificationNote ?? null,
        depositAmount: item.dpAmount ?? (item.depositInfo.includes("500") ? 500000 : null),
        minMonthlyPrice: item.minPrice,
        distanceToCampusM: item.distanceToCampusM,
        averageRating: item.rating,
        reviewCount: item.reviewCount,
        publishedAt: status === PropertyStatus.VERIFIED ? new Date() : null,
      },
      create: {
        ownerId: owner.id,
        slug: item.slug,
        name: item.name,
        tagline: item.tagline,
        description: item.description,
        city: item.city,
        district: item.district,
        address: item.address,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        gender: genderMap[item.gender] ?? PropertyGender.MIXED,
        status,
        rejectionNote: item.verificationNote ?? null,
        depositAmount: item.dpAmount ?? (item.depositInfo.includes("500") ? 500000 : null),
        minMonthlyPrice: item.minPrice,
        distanceToCampusM: item.distanceToCampusM,
        averageRating: item.rating,
        reviewCount: item.reviewCount,
        publishedAt: status === PropertyStatus.VERIFIED ? new Date() : null,
      },
    });

    // Facilities
    await prisma.propertyFacility.deleteMany({ where: { propertyId: property.id } });
    for (const key of item.facilities) {
      await prisma.propertyFacility.create({
        data: {
          property: { connect: { id: property.id } },
          facility: { connect: { key } },
        },
      });
    }

    // Authentic Property Images
    await prisma.propertyImage.deleteMany({ where: { propertyId: property.id } });
    const imgSet = KOS_IMAGES[item.slug];
    if (imgSet) {
      const imagesToCreate = [
        { storagePath: imgSet.main, sortOrder: 0, isCover: true, altText: `${item.name} - Tampak Depan` },
        { storagePath: imgSet.room, sortOrder: 1, isCover: false, altText: `${item.name} - Kamar Tidur` },
        ...(imgSet.bathroom ? [{ storagePath: imgSet.bathroom, sortOrder: 2, isCover: false, altText: `${item.name} - Kamar Mandi` }] : []),
        ...(imgSet.common ? [{ storagePath: imgSet.common, sortOrder: 3, isCover: false, altText: `${item.name} - Area Bersama` }] : []),
      ];
      for (const img of imagesToCreate) {
        await prisma.propertyImage.create({
          data: {
            propertyId: property.id,
            storagePath: img.storagePath,
            sortOrder: img.sortOrder,
            isCover: img.isCover,
            altText: img.altText,
          },
        });
      }
    }

    // Room Types & Units
    for (const rt of item.roomTypes) {
      const roomType = await prisma.roomType.upsert({
        where: { propertyId_name: { propertyId: property.id, name: rt.name } },
        update: {
          pricePerMonth: rt.pricePerMonth,
          sizeM2: rt.sizeM2,
        },
        create: {
          propertyId: property.id,
          name: rt.name,
          pricePerMonth: rt.pricePerMonth,
          sizeM2: rt.sizeM2,
          capacity: 1,
        },
      });

      const total = rt.total || 4;
      const available = rt.available ?? Math.floor(total / 2);
      for (let i = 1; i <= total; i++) {
        const unitNumber = `${rt.name.charAt(0).toUpperCase()}-${i.toString().padStart(2, "0")}`;
        const unitStatus = i <= available ? RoomStatus.AVAILABLE : RoomStatus.OCCUPIED;
        await prisma.roomUnit.upsert({
          where: { propertyId_number: { propertyId: property.id, number: unitNumber } },
          update: { roomTypeId: roomType.id },
          create: {
            propertyId: property.id,
            roomTypeId: roomType.id,
            number: unitNumber,
            status: unitStatus,
          },
        });
      }
    }

    console.log(`Seeded authentic property: ${item.name} (${item.slug}) with ${imgSet ? 'verified photos' : 'default photos'}`);
  }

  console.log("All 14 authentic Malang Kota properties seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

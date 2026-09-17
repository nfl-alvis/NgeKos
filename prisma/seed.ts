import { PrismaClient, PropertyGender, PropertyStatus, RoomStatus } from "@prisma/client";
import { properties } from "../src/lib/data/properties";

const prisma = new PrismaClient();

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

async function main() {
  const owner = await prisma.profile.findFirst({ where: { role: "OWNER" } });
  if (!owner) {
    console.log("No owner found to seed properties.");
    return;
  }

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

    console.log(`Seeded property: ${item.name} (${item.slug})`);
  }

  console.log("All properties seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

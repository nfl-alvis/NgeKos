import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import BookingApplyClient from "./BookingApplyClient";
import { getProperty } from "@/server/property-service";
import { getPropertyBySlug } from "@/lib/data/properties";
import type { Property, Gender, Facility } from "@/lib/data/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "booking" });
  return { title: t("title") };
}

export default async function BookingApplyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let initialProperty: Property | null = null;
  try {
    const dbProp = await getProperty(slug);
    if (dbProp) {
      initialProperty = {
        id: dbProp.id,
        slug: dbProp.slug,
        name: dbProp.name,
        tagline: dbProp.tagline ?? "",
        description: dbProp.description,
        city: dbProp.city,
        district: dbProp.district,
        address: dbProp.address,
        gender: (dbProp.gender.toLowerCase() as Gender) ?? "mixed",
        verified: dbProp.status === "VERIFIED",
        active: dbProp.status === "VERIFIED",
        rating: dbProp.rating,
        reviewCount: dbProp.reviewCount,
        imageSeed: dbProp.slug,
        facilities: dbProp.facilities.map((f: { key: string }) => f.key as Facility),
        minPrice: dbProp.minPrice,
        distanceToCampusM: dbProp.distanceToCampusM ?? 0,
        depositAmount: dbProp.depositAmount,
        depositInfo: dbProp.depositAmount ? `DP Rp ${dbProp.depositAmount.toLocaleString("id-ID")}` : "Tanpa deposit",
        verificationStatus: dbProp.status === "VERIFIED" ? "verified" : dbProp.status === "REJECTED" ? "rejected" : "pending",
        dpAmount: dbProp.depositAmount ?? undefined,
        roomTypes: dbProp.roomTypes.map((rt: { id: string; name: string; pricePerMonth: number; available: number; total: number; sizeM2?: number | null }) => ({
          id: rt.id,
          name: rt.name,
          pricePerMonth: rt.pricePerMonth,
          available: rt.available,
          total: rt.total,
          sizeM2: rt.sizeM2 ?? 12,
        })),
      };
    }
  } catch {
    const staticProp = getPropertyBySlug(slug);
    if (staticProp) initialProperty = staticProp;
  }

  return (
    <Suspense>
      <BookingApplyClient initialProperty={initialProperty} />
    </Suspense>
  );
}

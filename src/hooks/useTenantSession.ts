"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { tenants } from "@/lib/data/entities";
import { getPropertyBySlug, properties } from "@/lib/data/properties";
import { contractInfo, tenantRoomInfo, ownerContact } from "@/lib/data/userData";
import type { Property } from "@/lib/data/types";

export interface TenantData {
  id: string;
  name: string;
  email: string;
  phone: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  sizeM2: number;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  durationMonths: number;
  depositAmount: number;
  depositInfo: string;
  noticePeriodId: string;
  noticePeriodEn: string;
  joinedAt: string;
  propertyName: string;
  propertySlug: string;
  propertyAddress: string;
  propertyCity: string;
  property: Property;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  isDemo: boolean;
  hasActiveBooking: boolean;
  bookingCode?: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
}

import { ENABLE_TENANT_DUMMIES, dummyTenants } from "@/lib/data/tenantDummies";

const fallbackProperty = properties[0];
const primaryTenant = dummyTenants[0];

const initialTenantData: TenantData = ENABLE_TENANT_DUMMIES
  ? {
      id: primaryTenant.id,
      name: primaryTenant.name,
      email: primaryTenant.email,
      phone: primaryTenant.phone,
      roomNumber: primaryTenant.roomNumber,
      roomType: "Deluxe",
      floor: 1,
      sizeM2: 20,
      monthlyRent: primaryTenant.monthlyRent,
      startDate: "2026-08-01",
      endDate: "2027-07-31",
      durationMonths: 12,
      depositAmount: 500000,
      depositInfo: "DP Rp 500.000",
      noticePeriodId: contractInfo.noticePeriodId,
      noticePeriodEn: contractInfo.noticePeriodEn,
      joinedAt: primaryTenant.joinedAt,
      propertyName: primaryTenant.propertyName,
      propertySlug: primaryTenant.propertySlug,
      propertyAddress: fallbackProperty.address,
      propertyCity: fallbackProperty.city,
      property: fallbackProperty,
      ownerName: ownerContact.name,
      ownerPhone: ownerContact.phone,
      ownerEmail: ownerContact.email,
      isDemo: true,
      hasActiveBooking: true,
      bookingCode: "",
      checkedInAt: null,
      checkedOutAt: null,
    }
  : {
      id: "",
      name: "",
      email: "",
      phone: "",
      roomNumber: "",
      roomType: "",
      floor: 1,
      sizeM2: 0,
      monthlyRent: 0,
      startDate: "",
      endDate: "",
      durationMonths: 1,
      depositAmount: 0,
      depositInfo: "",
      noticePeriodId: contractInfo.noticePeriodId,
      noticePeriodEn: contractInfo.noticePeriodEn,
      joinedAt: "",
      propertyName: "",
      propertySlug: "",
      propertyAddress: "",
      propertyCity: "",
      property: fallbackProperty,
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      isDemo: false,
      hasActiveBooking: false,
      bookingCode: "",
      checkedInAt: null,
      checkedOutAt: null,
    };

export function useTenantSession() {
  const { user, ready } = useSession();
  const [data, setData] = useState<TenantData>(initialTenantData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    let isMounted = true;

    async function loadTenantData() {
      try {
        const res = await fetch("/api/bookings");
        if (!res.ok) {
          if (isMounted) setLoading(false);
          return;
        }

        const json = await res.json();
        const bookings = Array.isArray(json?.data) ? json.data : [];

        // Cari booking berstatus ACTIVE atau APPROVED_AWAITING_PAYMENT milik user
        const activeBooking =
          bookings.find((b: any) => b.status === "ACTIVE") ||
          bookings.find((b: any) => b.status === "APPROVED_AWAITING_PAYMENT") ||
          bookings[0];

        if (activeBooking && isMounted) {
          const propSlug =
            activeBooking.property?.slug ||
            activeBooking.propertyId ||
            "";

          const staticProp = propSlug ? getPropertyBySlug(propSlug) : undefined;
          const prop: Property = {
            ...(staticProp ?? fallbackProperty),
            id: activeBooking.property?.id || staticProp?.id || activeBooking.propertyId || "",
            name: activeBooking.property?.name || staticProp?.name || "Kost",
            address: activeBooking.property?.address || staticProp?.address || "-",
            city: activeBooking.property?.city || staticProp?.city || "",
            slug: propSlug || staticProp?.slug || "",
          };

          const sDate = typeof activeBooking.startDate === "string"
            ? activeBooking.startDate.slice(0, 10)
            : "";

          const dMonths = Number(activeBooking.durationMonths) || 1;
          const endD = sDate ? new Date(sDate) : new Date();
          endD.setMonth(endD.getMonth() + dMonths);
          const eDate = endD.toISOString().slice(0, 10);

          setData({
            id: activeBooking.id,
            bookingCode: activeBooking.code || activeBooking.id,
            name: user?.name || activeBooking.applicant?.fullName || "",
            email: user?.email || activeBooking.applicant?.email || "",
            phone: activeBooking.applicant?.phone || "",
            roomNumber: activeBooking.roomUnit?.number || activeBooking.roomNumber || "-",
            roomType: activeBooking.roomType?.name || "Kamar",
            floor: 1,
            sizeM2: activeBooking.roomType?.sizeM2 ?? tenantRoomInfo.sizeM2,
            monthlyRent: Number(activeBooking.monthlyPriceSnapshot) || 0,
            startDate: sDate,
            endDate: eDate,
            durationMonths: dMonths,
            depositAmount: Number(activeBooking.depositSnapshot) || 0,
            depositInfo: activeBooking.depositSnapshot
              ? `DP Rp ${Number(activeBooking.depositSnapshot).toLocaleString("id-ID")}`
              : "",
            noticePeriodId: contractInfo.noticePeriodId,
            noticePeriodEn: contractInfo.noticePeriodEn,
            joinedAt: sDate,
            propertyName: prop.name,
            propertySlug: prop.slug,
            propertyAddress: prop.address,
            propertyCity: prop.city,
            property: prop,
            ownerName: activeBooking.property?.owner?.fullName || "",
            ownerPhone: activeBooking.property?.owner?.phone || "",
            ownerEmail: "",
            isDemo: false,
            hasActiveBooking: activeBooking.status === "ACTIVE",
            checkedInAt: activeBooking.checkedInAt || null,
            checkedOutAt: activeBooking.checkedOutAt || null,
          });
        } else if (user && isMounted) {
          // User login tetapi belum ada booking di DB: biarkan kosong tanpa mock kos otomatis
          setData({
            ...initialTenantData,
            name: user.name || "",
            email: user.email || "",
            isDemo: false,
            hasActiveBooking: false,
            propertyName: "",
            propertySlug: "",
            propertyAddress: "",
            propertyCity: "",
            roomNumber: "",
            roomType: "",
            bookingCode: "",
            checkedInAt: null,
            checkedOutAt: null,
          });
        }
      } catch {
        // Biarkan state default kosong bila gagal memuat booking
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTenantData();

    return () => {
      isMounted = false;
    };
  }, [user, ready]);

  return { tenant: data, loading };
}

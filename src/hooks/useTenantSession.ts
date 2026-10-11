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
}

const fallbackProperty = properties[0];

const initialTenantData: TenantData = {
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
            fallbackProperty.slug;

          const prop = getPropertyBySlug(propSlug) || {
            ...fallbackProperty,
            name: activeBooking.property?.name || fallbackProperty.name,
            address: activeBooking.property?.address || fallbackProperty.address,
            city: activeBooking.property?.city || fallbackProperty.city,
            slug: propSlug,
          };

          const sDate = typeof activeBooking.startDate === "string"
            ? activeBooking.startDate.slice(0, 10)
            : contractInfo.startDate;

          const dMonths = Number(activeBooking.durationMonths) || 1;
          const endD = new Date(sDate);
          endD.setMonth(endD.getMonth() + dMonths);
          const eDate = endD.toISOString().slice(0, 10);

          setData({
            id: activeBooking.id,
            name: user?.name || activeBooking.applicant?.fullName || "",
            email: user?.email || activeBooking.applicant?.email || "",
            phone: activeBooking.applicant?.phone || "",
            roomNumber: activeBooking.roomUnit?.number || activeBooking.roomNumber || "-",
            roomType: activeBooking.roomType?.name || tenantRoomInfo.type,
            floor: 1,
            sizeM2: activeBooking.roomType?.sizeM2 ?? tenantRoomInfo.sizeM2,
            monthlyRent: Number(activeBooking.monthlyPriceSnapshot) || 0,
            startDate: sDate,
            endDate: eDate,
            durationMonths: dMonths,
            depositAmount: Number(activeBooking.depositSnapshot) || (prop.depositAmount ?? 0),
            depositInfo: activeBooking.depositSnapshot
              ? `DP Rp ${Number(activeBooking.depositSnapshot).toLocaleString("id-ID")}`
              : prop.depositInfo,
            noticePeriodId: contractInfo.noticePeriodId,
            noticePeriodEn: contractInfo.noticePeriodEn,
            joinedAt: sDate,
            propertyName: prop.name,
            propertySlug: prop.slug,
            propertyAddress: prop.address,
            propertyCity: prop.city,
            property: prop,
            ownerName: activeBooking.property?.owner?.fullName || ownerContact.name,
            ownerPhone: activeBooking.property?.owner?.phone || ownerContact.phone,
            ownerEmail: ownerContact.email,
            isDemo: false,
            hasActiveBooking: activeBooking.status === "ACTIVE",
          });
        } else if (user && isMounted) {
          // User login tetapi belum ada booking di DB: gunakan nama user asli
          setData((prev) => ({
            ...prev,
            name: user.name || prev.name,
            email: user.email || prev.email,
            isDemo: true,
            hasActiveBooking: false,
          }));
        }
      } catch {
        // Biarkan fallback ke default demo
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

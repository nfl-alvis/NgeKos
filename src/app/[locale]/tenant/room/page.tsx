"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Car,
  DoorClosed,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UtensilsCrossed,
  WashingMachine,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import FacilityIcon from "@/components/FacilityIcon";
import { FACILITY_META } from "@/lib/data/facilities";
import type { Facility } from "@/lib/data/types";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useSession } from "@/components/SessionProvider";
import { getKosImage } from "@/lib/kosImages";
import { cn } from "@/lib/utils";

type ApiBooking = {
  id: string;
  code?: string;
  status: string;
  startDate: string;
  endDate?: string;
  monthlyPriceSnapshot: number;
  property: {
    id: string;
    slug: string;
    name: string;
    city?: string;
    address?: string;
  };
  roomType?: {
    id: string;
    name: string;
    sizeM2?: number | null;
  };
  roomUnit?: {
    id: string;
    number: string;
    status: string;
    floor?: number | string | null;
    orientation?: string | null;
  };
};

type ApiFacility = {
  key: string;
  nameId?: string;
  nameEn?: string;
  icon?: string | null;
};

type ApiPropertyDetail = {
  id: string;
  slug: string;
  name: string;
  address?: string;
  facilities: ApiFacility[];
  roomTypes?: Array<{
    id: string;
    name: string;
    sizeM2?: number | null;
  }>;
};

const COMMON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  kitchen: UtensilsCrossed,
  laundry: WashingMachine,
  parking: Car,
  cctv: ShieldCheck,
};

const DEFAULT_COMMON_AREAS = [
  { key: "kitchen", hoursId: "06.00 – 22.00", hoursEn: "06:00 – 22:00" },
  { key: "laundry", hoursId: "Senin – Sabtu, 08.00 – 17.00", hoursEn: "Mon – Sat, 08:00 – 17:00" },
  { key: "parking", hoursId: "24 jam", hoursEn: "24 hours" },
  { key: "cctv", hoursId: "24 jam", hoursEn: "24 hours" },
];

/** Kamar Saya - detail kamar aktif, fasilitas kamar, area bersama. */
export default function TenantRoomPage() {
  const t = useTranslations("tenantPages.room");
  const locale = useLocale();
  const { user, ready } = useSession();

  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeBooking, setActiveBooking] = useState<ApiBooking | null>(null);
  const [propertyDetail, setPropertyDetail] = useState<ApiPropertyDetail | null>(null);

  const handleRefresh = useCallback(() => {
    setIsFetching(true);
    setErrorMessage(null);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;

    fetch("/api/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (bookingsRes) => {
        if (ignore) return;
        const rawBookings: ApiBooking[] = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
        const active = rawBookings.find(
          (b) => b.status === "ACTIVE" || b.status === "APPROVED_AWAITING_PAYMENT"
        );
        setActiveBooking(active || null);

        if (active?.property) {
          const identifier = active.property.slug || active.property.id;
          try {
            const propRes = await fetch(`/api/properties/${identifier}`);
            if (propRes.ok) {
              const json = await propRes.json();
              if (!ignore && json?.data) {
                setPropertyDetail(json.data);
              }
            }
          } catch {
            // Non-fatal property detail enrichment
          }
        }
        setIsFetching(false);
      })
      .catch(() => {
        if (!ignore) {
          setErrorMessage(
            locale === "id"
              ? "Gagal memuat rincian kamar. Silakan muat ulang halaman."
              : "Failed to load room details. Please reload the page."
          );
          setIsFetching(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [ready, user, locale, refreshKey]);

  const isLoading = !ready || (Boolean(user) && isFetching);

  const propertyName =
    propertyDetail?.name || activeBooking?.property?.name || (locale === "id" ? "Kost Saya" : "My Kost");
  const propertySlug = propertyDetail?.slug || activeBooking?.property?.slug || "";
  const roomNumber =
    activeBooking?.roomUnit?.number || activeBooking?.roomType?.name || "-";
  const floorNumber = activeBooking?.roomUnit?.floor || null;
  const roomTypeName = activeBooking?.roomType?.name || (locale === "id" ? "Kamar" : "Room");

  const matchingRoomType = propertyDetail?.roomTypes?.find(
    (rt) => rt.id === activeBooking?.roomType?.id || rt.name === activeBooking?.roomType?.name
  );
  const sizeM2 =
    activeBooking?.roomType?.sizeM2 ?? matchingRoomType?.sizeM2 ?? null;

  const facilities = propertyDetail?.facilities || [];

  return (
    <UserDashboardShell
      role="tenant"
      title={t("title")}
      greeting={
        user?.name
          ? `${locale === "id" ? "Halo" : "Hello"}, ${user.name.split(" ")[0]}`
          : undefined
      }
      actions={
        user ? (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-nk-surface px-3 py-1.5 text-xs font-medium text-nk-text transition hover:bg-nk-warm disabled:opacity-50"
            title={locale === "id" ? "Segarkan data kamar" : "Refresh room data"}
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>{locale === "id" ? "Perbarui" : "Refresh"}</span>
          </button>
        ) : undefined
      }
    >
      {/* Error state */}
      {errorMessage && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-md bg-red-100 px-3 py-1 font-medium text-red-900 hover:bg-red-200"
          >
            {locale === "id" ? "Coba Lagi" : "Retry"}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-3 animate-pulse"
          aria-label="Loading room"
        >
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="h-64 rounded-xl bg-nk-section" />
            <div className="h-32 rounded-xl bg-nk-section" />
            <div className="h-48 rounded-xl bg-nk-section" />
          </div>
          <div className="lg:col-span-1">
            <div className="h-44 rounded-xl bg-nk-section mb-6" />
            <div className="h-44 rounded-xl bg-nk-section" />
          </div>
        </div>
      ) : !user ? (
        /* Unauthenticated State */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-12 text-center shadow-sm">
          <LogIn className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h2 className="text-lg font-semibold text-nk-text">
            {locale === "id" ? "Masuk ke Akun Anda" : "Sign In to Your Account"}
          </h2>
          <p className="mt-1 text-sm text-nk-text-muted max-w-md mx-auto">
            {locale === "id"
              ? "Silakan masuk dengan akun penyewa Anda untuk melihat rincian kamar yang sedang Anda huni."
              : "Please sign in with your tenant account to view the details of your current room."}
          </p>
          <Link
            href="/login?from=/tenant/room"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : !activeBooking ? (
        /* Empty State */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-8 text-center sm:p-12 shadow-sm">
          <DoorClosed className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h3 className="text-base font-semibold text-nk-text">
            {locale === "id" ? "Belum Ada Kamar Aktif" : "No Active Room"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-nk-text-muted">
            {locale === "id"
              ? "Anda belum memiliki kamar kos aktif saat ini. Cari kamar impian dan ajukan sewa untuk melihat rincian kamar di sini."
              : "You do not have an active room at this time. Explore rooms and apply for a booking to see your room details here."}
          </p>
          <div className="mt-6">
            <Link
              href="/kost"
              className="inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-semibold text-nk-text-inverse hover:opacity-90"
            >
              {locale === "id" ? "Jelajahi Kos" : "Explore Kosts"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Authenticated View */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#FBF3DC]">
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <h2 className="text-sm font-semibold text-nk-text">
                  {t("header", { room: roomNumber })}
                </h2>
                <StatusBadge color="green">{t("occupied")}</StatusBadge>
              </div>
              <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10 sm:flex-row">
                <Image
                  src={getKosImage(propertySlug, "room")}
                  alt={propertyName}
                  width={140}
                  height={140}
                  className="size-28 shrink-0 self-start rounded-lg object-cover sm:size-36"
                />
                <dl className="grid flex-1 grid-cols-2 content-start gap-x-6 gap-y-3 text-sm">
                  <dt className="text-nk-text-muted">{t("fProperty")}</dt>
                  <dd className="text-right font-medium text-nk-text">{propertyName}</dd>
                  <dt className="text-nk-text-muted">{t("fFloor")}</dt>
                  <dd className="text-right font-medium tabular-nums text-nk-text">
                    {floorNumber != null ? t("floorValue", { floor: floorNumber }) : "-"}
                  </dd>
                  <dt className="text-nk-text-muted">{t("fType")}</dt>
                  <dd className="text-right font-medium text-nk-text">{roomTypeName}</dd>
                  <dt className="text-nk-text-muted">{t("fSize")}</dt>
                  <dd className="text-right font-medium tabular-nums text-nk-text">
                    {sizeM2 != null ? `${sizeM2} m²` : "-"}
                  </dd>
                  <dt className="text-nk-text-muted">{t("fOrientation")}</dt>
                  <dd className="text-right font-medium text-nk-text">
                    {activeBooking?.roomUnit?.orientation || "-"}
                  </dd>
                </dl>
              </div>
            </section>

            {/* Room / Property Facilities */}
            <DashSection
              title={t("facilitiesTitle")}
              bodyClass="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3"
            >
              {facilities.length === 0 ? (
                <p className="col-span-full py-2 text-sm text-nk-text-muted">
                  {locale === "id"
                    ? "Informasi fasilitas kamar mengacu pada fasilitas kos."
                    : "Room facility information follows property amenities."}
                </p>
              ) : (
                facilities.map((f) => (
                  <span
                    key={f.key}
                    className="flex items-center gap-2 rounded-md border border-nk-border bg-nk-section px-3 py-2 text-sm text-nk-text"
                  >
                    <FacilityIcon facility={f.key as Facility} />
                    {locale === "id"
                      ? f.nameId || FACILITY_META[f.key as keyof typeof FACILITY_META]?.labelId || f.key
                      : f.nameEn || FACILITY_META[f.key as keyof typeof FACILITY_META]?.labelEn || f.key}
                  </span>
                ))
              )}
            </DashSection>

            {/* Common Areas */}
            <DashSection title={t("commonTitle")} bodyClass="divide-y divide-nk-border">
              <ul className="flex flex-col">
                {DEFAULT_COMMON_AREAS.map((c) => {
                  const Icon = COMMON_ICONS[c.key] || ShieldCheck;
                  return (
                    <li key={c.key} className="flex items-center gap-3 px-4 py-3.5">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-section text-nk-text-muted"
                        aria-hidden="true"
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-nk-text">
                          {t(`common.${c.key}`)}
                        </p>
                        <p className="text-xs text-nk-text-muted">
                          {locale === "id" ? c.hoursId : c.hoursEn}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </DashSection>
          </div>

          <aside className="flex flex-col gap-6">
            <DashSection title={t("reportTitle")} bodyClass="p-4">
              <p className="text-sm text-nk-text-muted">{t("reportBody")}</p>
              <Link
                href="/tenant/complaints"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 border border-nk-border bg-nk-surface px-4 py-2.5 text-sm font-medium text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("reportCta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </DashSection>

            <DashSection title={t("contractTitle")} bodyClass="p-4">
              <p className="text-sm text-nk-text-muted">{t("contractBody")}</p>
              <Link
                href="/tenant/contract"
                className="mt-4 inline-flex w-full items-center justify-center bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("contractCta")}
              </Link>
            </DashSection>
          </aside>
        </div>
      )}
    </UserDashboardShell>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  LogIn,
  MapPin,
  RefreshCw,
  Star,
  User,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import FacilityIcon from "@/components/FacilityIcon";
import { FACILITY_META } from "@/lib/data/facilities";
import type { Facility } from "@/lib/data/types";
import { formatIDR, cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useSession } from "@/components/SessionProvider";
import { getKosImage } from "@/lib/kosImages";

type ApiBooking = {
  id: string;
  code?: string;
  status: string;
  startDate: string;
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
  };
  roomUnit?: {
    id: string;
    number: string;
    status: string;
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
  tagline?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  rating?: number;
  reviewCount?: number;
  distanceToCampusM?: number | null;
  facilities: ApiFacility[];
  owner?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
};

/** Kos Saya - profil lengkap properti yang sedang dihuni. */
export default function TenantPropertyPage() {
  const t = useTranslations("tenantPages.property");
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
              ? "Gagal memuat informasi properti. Silakan muat ulang halaman."
              : "Failed to load property information. Please reload the page."
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
  const propertyAddress =
    propertyDetail?.address || activeBooking?.property?.address || activeBooking?.property?.city || "-";
  const propertyRating = propertyDetail?.rating != null ? Number(propertyDetail.rating) : null;
  const propertyReviewCount = propertyDetail?.reviewCount || 0;

  const roomNumber =
    activeBooking?.roomUnit?.number || activeBooking?.roomType?.name || "-";
  const monthlyRent = Number(activeBooking?.monthlyPriceSnapshot || 0);

  const ownerName =
    propertyDetail?.owner?.fullName || (locale === "id" ? "Pengelola Kost" : "Kost Manager");
  const rawPhone = propertyDetail?.owner?.phone || null;
  const ownerPhone = rawPhone || "-";
  const ownerEmail = propertyDetail?.owner?.email || "-";
  const cleanPhone = rawPhone ? rawPhone.replace(/[^0-9]/g, "") : null;

  const facilities = propertyDetail?.facilities || [];

  const campusDistanceDisplay = propertyDetail?.distanceToCampusM
    ? `${propertyDetail.distanceToCampusM >= 1000 ? `${(propertyDetail.distanceToCampusM / 1000).toFixed(1)} km` : `${propertyDetail.distanceToCampusM} m`}`
    : null;

  const surroundingAreas = [
    ...(campusDistanceDisplay ? [{ key: "campus", v: campusDistanceDisplay }] : []),
  ];

  const infoRows = [
    { k: t("fAddress"), v: propertyAddress, icon: MapPin },
    { k: t("fOwner"), v: ownerName, icon: User },
    { k: t("fRoom"), v: t("roomValue", { room: roomNumber }), icon: null },
    { k: t("fRent"), v: `${formatIDR(monthlyRent)} ${t("perMonth")}`, icon: null },
  ];

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
            title={locale === "id" ? "Segarkan profil kos" : "Refresh property details"}
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
          aria-label="Loading property"
        >
          <div className="flex flex-col gap-6 lg:col-span-2">
            <div className="h-64 rounded-xl bg-nk-section" />
            <div className="h-44 rounded-xl bg-nk-section" />
            <div className="h-32 rounded-xl bg-nk-section" />
          </div>
          <div className="lg:col-span-1">
            <div className="h-64 rounded-xl bg-nk-section mb-6" />
            <div className="h-48 rounded-xl bg-nk-section" />
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
              ? "Silakan masuk dengan akun penyewa Anda untuk melihat profil lengkap kos yang sedang Anda huni."
              : "Please sign in with your tenant account to view details of the property where you reside."}
          </p>
          <Link
            href="/login?from=/tenant/property"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse hover:opacity-95"
          >
            <LogIn className="size-4" />
            {locale === "id" ? "Masuk Sekarang" : "Sign In Now"}
          </Link>
        </div>
      ) : !activeBooking ? (
        /* Empty State */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-8 text-center sm:p-12 shadow-sm">
          <Building2 className="mx-auto size-12 text-nk-text-muted opacity-40 mb-3" />
          <h3 className="text-base font-semibold text-nk-text">
            {locale === "id" ? "Belum Ada Kos Aktif" : "No Active Kost"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-nk-text-muted">
            {locale === "id"
              ? "Anda belum memiliki hunian kos aktif saat ini. Cari kamar impian dan ajukan sewa untuk melihat profil kos di sini."
              : "You do not have an active kost residence at this time. Explore rooms and apply for a booking to see property details here."}
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
            <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E9F4EC]">
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <h2 className="text-sm font-semibold text-nk-text">{t("title")}</h2>
                <StatusBadge color="green">{t("living")}</StatusBadge>
              </div>
              <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10 sm:flex-row">
                <Image
                  src={getKosImage(propertySlug, "main")}
                  alt={propertyName}
                  width={140}
                  height={140}
                  className="size-24 shrink-0 self-start rounded-lg object-cover sm:size-32"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-nk-text">{propertyName}</p>
                  {propertyDetail?.tagline && (
                    <p className="mt-1 text-xs text-nk-text-muted">{propertyDetail.tagline}</p>
                  )}
                  {propertyRating != null && propertyReviewCount > 0 ? (
                    <p className="mt-2 flex items-center gap-1 text-sm">
                      <Star className="size-4 fill-nk-star text-nk-star" aria-hidden="true" />
                      <span className="font-medium text-nk-star tabular-nums">
                        {propertyRating.toFixed(1)}
                      </span>
                      <span className="text-nk-text-muted">({propertyReviewCount})</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-nk-text-muted">
                      {locale === "id" ? "Belum ada ulasan" : "No reviews yet"}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {propertySlug && (
                      <Link
                        href={`/kost/${propertySlug}`}
                        className="inline-flex items-center gap-1.5 border border-nk-border bg-nk-surface px-3.5 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                      >
                        {t("publicPage")}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    )}
                    <Link
                      href="/tenant/room"
                      className="inline-flex items-center gap-1.5 bg-nk-accent px-3.5 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                    >
                      {t("myRoom")}
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Fakta Kos */}
            <DashSection title={t("facts")} bodyClass="divide-y divide-nk-border">
              <dl className="flex flex-col">
                {infoRows.map((f) => (
                  <div key={f.k} className="flex items-start justify-between gap-4 px-4 py-3.5">
                    <dt className="flex items-center gap-2 text-sm text-nk-text-muted">
                      {f.icon && <f.icon className="size-4 shrink-0" aria-hidden="true" />}
                      {f.k}
                    </dt>
                    <dd className="text-right text-sm font-medium text-nk-text">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </DashSection>

            {/* Fasilitas Kos */}
            <DashSection title={t("facilitiesTitle")} bodyClass="flex flex-wrap gap-2 p-4">
              {facilities.length === 0 ? (
                <p className="text-sm text-nk-text-muted">
                  {locale === "id"
                    ? "Informasi fasilitas kos belum tersedia."
                    : "Property facility information not available."}
                </p>
              ) : (
                facilities.map((f) => (
                  <span
                    key={f.key}
                    className="flex items-center gap-1.5 rounded-md border border-nk-border bg-nk-section px-2.5 py-1 text-xs text-nk-text"
                  >
                    <FacilityIcon facility={f.key as Facility} />
                    {locale === "id"
                      ? f.nameId || FACILITY_META[f.key as keyof typeof FACILITY_META]?.labelId || f.key
                      : f.nameEn || FACILITY_META[f.key as keyof typeof FACILITY_META]?.labelEn || f.key}
                  </span>
                ))
              )}
            </DashSection>
          </div>

          {/* Kontak Owner & Sekitar Kos */}
          <aside className="flex flex-col gap-6">
            <DashSection title={t("ownerTitle")} bodyClass="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-nk-section text-nk-text ring-1 ring-foreground/10">
                  <User className="size-6 text-nk-text-muted" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-nk-text">{ownerName}</p>
                  <p className="text-xs text-nk-text-muted">
                    {locale === "id" ? "Pemilik / Pengelola Resmi" : "Verified Property Owner"}
                  </p>
                </div>
              </div>
              <dl className="mt-4 flex flex-col gap-2 border-t border-nk-border pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-nk-text-muted">{t("ownerPhone")}</dt>
                  <dd className="font-medium tabular-nums text-nk-text">{ownerPhone}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-nk-text-muted">{t("ownerEmail")}</dt>
                  <dd className="truncate font-medium text-nk-text">{ownerEmail}</dd>
                </div>
              </dl>
              {cleanPhone && cleanPhone.length >= 8 && (
                <a
                  href={`https://wa.me/${cleanPhone.startsWith("0") ? `62${cleanPhone.slice(1)}` : cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-1.5 bg-[#2F6B3C] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  {t("waCta")}
                </a>
              )}
              <p className="mt-3 text-xs text-nk-text-muted">{t("ownerNote")}</p>
            </DashSection>

            <DashSection title={t("areaTitle")} bodyClass="p-4">
              {surroundingAreas.length > 0 ? (
                <ul className="flex flex-col text-sm">
                  {surroundingAreas.map((a) => (
                    <li
                      key={a.key}
                      className="flex items-center justify-between gap-3 border-b border-nk-border py-2.5 last:border-b-0"
                    >
                      <span className="text-nk-text-muted">{t(`area.${a.key}`)}</span>
                      <span className="font-medium tabular-nums text-nk-text">{a.v}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-nk-text-muted">
                  {locale === "id"
                    ? "Informasi area sekitar belum dicatat."
                    : "Neighbourhood information not recorded."}
                </p>
              )}
            </DashSection>
          </aside>
        </div>
      )}
    </UserDashboardShell>
  );
}

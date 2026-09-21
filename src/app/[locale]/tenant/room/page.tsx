"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Car, ShieldCheck, UtensilsCrossed, WashingMachine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import FacilityIcon from "@/components/FacilityIcon";
import { FACILITY_META } from "@/lib/data/facilities";
import { commonRooms, tenantRoomInfo } from "@/lib/data/userData";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useTenantSession } from "@/hooks/useTenantSession";

import { getKosImage } from "@/lib/kosImages";

const COMMON_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  kitchen: UtensilsCrossed,
  laundry: WashingMachine,
  parking: Car,
  cctv: ShieldCheck,
};

/** Kamar Saya - detail kamar aktif, fasilitas kamar, area bersama. */
export default function TenantRoomPage() {
  const t = useTranslations("tenantPages.room");
  const locale = useLocale();
  const { tenant } = useTenantSession();
  const property = tenant.property;

  return (
    <UserDashboardShell role="tenant" title={t("title")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#FBF3DC]">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">
                {t("header", { room: tenant.roomNumber })}
              </h2>
              <StatusBadge color="green">{t("occupied")}</StatusBadge>
            </div>
            <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10 sm:flex-row">
              <Image
                src={getKosImage(property.slug || property.imageSeed, "room")}
                alt={property.name}
                width={140}
                height={140}
                className="size-28 shrink-0 self-start rounded-lg object-cover sm:size-36"
              />
              <dl className="grid flex-1 grid-cols-2 content-start gap-x-6 gap-y-3 text-sm">
                <dt className="text-nk-text-muted">{t("fProperty")}</dt>
                <dd className="text-right font-medium text-nk-text">{property.name}</dd>
                <dt className="text-nk-text-muted">{t("fFloor")}</dt>
                <dd className="text-right font-medium tabular-nums text-nk-text">{t("floorValue", { floor: tenant.floor })}</dd>
                <dt className="text-nk-text-muted">{t("fType")}</dt>
                <dd className="text-right font-medium text-nk-text">{tenant.roomType}</dd>
                <dt className="text-nk-text-muted">{t("fSize")}</dt>
                <dd className="text-right font-medium tabular-nums text-nk-text">
                  {tenant.sizeM2} m² · {tenantRoomInfo.aspect}
                </dd>
                <dt className="text-nk-text-muted">{t("fOrientation")}</dt>
                <dd className="text-right font-medium text-nk-text">
                  {locale === "id" ? tenantRoomInfo.orientationId : tenantRoomInfo.orientationEn}
                </dd>
              </dl>
            </div>
          </section>

          <DashSection title={t("facilitiesTitle")} bodyClass="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {tenantRoomInfo.facilities.map((f) => (
              <span
                key={f}
                className="flex items-center gap-2 rounded-md border border-nk-border bg-nk-section px-3 py-2 text-sm text-nk-text"
              >
                <FacilityIcon facility={f} />
                {(locale === "id" ? FACILITY_META[f].labelId : FACILITY_META[f].labelEn)}
              </span>
            ))}
          </DashSection>

          <DashSection title={t("commonTitle")} bodyClass="divide-y divide-nk-border">
            <ul className="flex flex-col">
              {commonRooms.map((c) => {
                const Icon = COMMON_ICONS[c.key];
                return (
                  <li key={c.key} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-section text-nk-text-muted" aria-hidden="true">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-nk-text">{t(`common.${c.key}`)}</p>
                      <p className="text-xs text-nk-text-muted">{locale === "id" ? c.hoursId : c.hoursEn}</p>
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
    </UserDashboardShell>
  );
}

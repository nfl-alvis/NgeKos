"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, MapPin, Star, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import FacilityIcon from "@/components/FacilityIcon";
import { tenants } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import { FACILITY_META } from "@/lib/data/facilities";
import { nearbyAreas, ownerContact } from "@/lib/data/userData";
import { formatIDR } from "@/lib/utils";
import type { Facility } from "@/lib/data/types";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { useTenantSession } from "@/hooks/useTenantSession";
import { getKosImage } from "@/lib/kosImages";

/** Kos Saya - profil lengkap properti yang sedang dihuni. */
export default function TenantPropertyPage() {
  const t = useTranslations("tenantPages.property");
  const locale = useLocale();
  const { tenant } = useTenantSession();
  const property = tenant.property;

  const rows = [
    { k: t("fAddress"), v: property.address, icon: MapPin },
    { k: t("fOwner"), v: ownerContact.name, icon: null },
    { k: t("fRoom"), v: t("roomValue", { room: tenant.roomNumber }), icon: null },
    { k: t("fRent"), v: `${formatIDR(tenant.monthlyRent)} ${t("perMonth")}`, icon: null },
  ];

  return (
    <UserDashboardShell role="tenant" title={t("title")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E9F4EC]">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-sm font-semibold text-nk-text">{t("title")}</h2>
              <StatusBadge color="green">{t("living")}</StatusBadge>
            </div>
            <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10 sm:flex-row">
              <Image
                src={getKosImage(property.slug || property.imageSeed, "main")}
                alt={property.name}
                width={140}
                height={140}
                className="size-24 shrink-0 self-start rounded-lg object-cover sm:size-32"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-nk-text">{property.name}</p>
                <p className="mt-1 text-xs text-nk-text-muted">{property.tagline}</p>
                <p className="mt-2 flex items-center gap-1 text-sm">
                  <Star className="size-4 fill-nk-star text-nk-star" aria-hidden="true" />
                  <span className="font-medium text-nk-star tabular-nums">{property.rating.toFixed(1)}</span>
                  <span className="text-nk-text-muted">({property.reviewCount})</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/kost/${property.slug}`}
                    className="inline-flex items-center gap-1.5 border border-nk-border bg-nk-surface px-3.5 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                  >
                    {t("publicPage")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
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

          <DashSection title={t("facts")} bodyClass="divide-y divide-nk-border">
            <dl className="flex flex-col">
              {rows.map((f) => (
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

          <DashSection title={t("facilitiesTitle")} bodyClass="flex flex-wrap gap-2 p-4">
            {((property.facilities || []) as Facility[]).map((f) => {
              const meta = FACILITY_META[f];
              return (
                <span
                  key={f}
                  className="flex items-center gap-1.5 rounded-md border border-nk-border bg-nk-section px-2.5 py-1 text-xs text-nk-text"
                >
                  <FacilityIcon facility={f} />
                  {locale === "id" ? meta?.labelId ?? f : meta?.labelEn ?? f}
                </span>
              );
            })}
          </DashSection>
        </div>

        {/* kontak owner */}
        <aside className="flex flex-col gap-6">
          <DashSection title={t("ownerTitle")} bodyClass="p-4">
            <div className="flex items-center gap-3">
              <Image
                src={`https://picsum.photos/seed/${ownerContact.avatarSeed}/96/96`}
                alt=""
                width={44}
                height={44}
                className="size-11 shrink-0 rounded-full ring-1 ring-foreground/10"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-nk-text">{ownerContact.name}</p>
                <p className="text-xs text-nk-text-muted">{locale === "id" ? ownerContact.responseTimeId : ownerContact.responseTimeEn}</p>
              </div>
            </div>
            <dl className="mt-4 flex flex-col gap-2 border-t border-nk-border pt-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-nk-text-muted">{t("ownerPhone")}</dt>
                <dd className="font-medium tabular-nums text-nk-text">{ownerContact.phone}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-nk-text-muted">{t("ownerEmail")}</dt>
                <dd className="truncate font-medium text-nk-text">{ownerContact.email}</dd>
              </div>
            </dl>
            <a
              href={`https://wa.me/${ownerContact.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 bg-[#2F6B3C] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
            >
              {t("waCta")}
            </a>
            <p className="mt-3 text-xs text-nk-text-muted">{t("ownerNote")}</p>
          </DashSection>

          <DashSection title={t("areaTitle")} bodyClass="p-4">
            <ul className="flex flex-col text-sm">
              {nearbyAreas.map((a) => (
                <li key={a.key} className="flex items-center justify-between gap-3 border-b border-nk-border py-2.5 last:border-b-0">
                  <span className="text-nk-text-muted">{t(`area.${a.key}`)}</span>
                  <span className="font-medium tabular-nums text-nk-text">{a.v}</span>
                </li>
              ))}
            </ul>
          </DashSection>
        </aside>
      </div>
    </UserDashboardShell>
  );
}

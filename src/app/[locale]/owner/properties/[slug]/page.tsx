"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roomUnits, type RoomUnit } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import type { Property } from "@/lib/data/types";
import { formatIDR, cn } from "@/lib/utils";
import PropertyPhotoManager from "@/components/owner/PropertyPhotoManager";

const roomStatusColor: Record<RoomUnit["status"], { badge: "green" | "gray" | "red" | "yellow"; cls: string }> = {
  kosong: { badge: "green", cls: "border-[#BFDCC5] bg-[#E9F4EC]" },
  terisi: { badge: "gray", cls: "border-nk-border bg-nk-section" },
  maintenance: { badge: "red", cls: "border-[#EBC4C0] bg-[#FAEAE8] border-dashed" },
  dipesan: { badge: "yellow", cls: "border-[#EAD9A8] bg-[#FBF3DC]" },
};

export default function OwnerPropertyDetailPage() {
  const t = useTranslations("owner.detail");
  const propsT = useTranslations("owner.properties");
  const params = useParams<{ slug: string }>();

  const [property, setProperty] = useState<Property | null>(
    getPropertyBySlug(params.slug) ?? null
  );
  const [loading, setLoading] = useState(!property);
  const [tab, setTab] = useState<"rooms" | "photos" | "settings">("rooms");
  const [openType, setOpenType] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Record<string, RoomUnit[]>>(
    property ? { [property.slug]: roomUnits[property.slug] ?? [] } : {}
  );
  const [menuRoom, setMenuRoom] = useState<string | null>(null);

  useEffect(() => {
    if (!property && params.slug) {
      setLoading(true);
      fetch("/api/properties?mine=true")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data && Array.isArray(json.data)) {
            const found = json.data.find(
              (p: any) => p.slug === params.slug || p.id === params.slug
            );
            if (found) {
              const mapped: Property = {
                id: found.id,
                slug: found.slug,
                name: found.name,
                tagline: found.tagline ?? "",
                description: found.description,
                city: found.city,
                district: found.district,
                address: found.address,
                gender: found.gender ? found.gender.toLowerCase() : "mixed",
                verified: found.status === "VERIFIED",
                active: found.status === "VERIFIED",
                rating: found.rating ?? 0,
                reviewCount: found.reviewCount ?? 0,
                imageSeed: found.slug,
                facilities: (found.facilities || []).map((f: any) => f.key || f),
                minPrice: found.minPrice ?? 0,
                distanceToCampusM: found.distanceToCampusM ?? 0,
                depositInfo: found.depositAmount
                  ? `DP Rp ${found.depositAmount.toLocaleString("id-ID")}`
                  : "Tanpa deposit",
                depositAmount: found.depositAmount,
                verificationStatus:
                  found.status === "VERIFIED"
                    ? "verified"
                    : found.status === "REJECTED"
                      ? "rejected"
                      : "pending",
                verificationNote: found.rejectionNote ?? undefined,
                roomTypes: (found.roomTypes || []).map((rt: any) => ({
                  id: rt.id,
                  name: rt.name,
                  pricePerMonth: rt.pricePerMonth,
                  available: rt.available ?? 0,
                  total: rt.total ?? 0,
                  sizeM2: rt.sizeM2 ?? 12,
                })),
              };
              setProperty(mapped);

              const dynamicUnits: RoomUnit[] = [];
              (found.roomTypes || []).forEach((rt: any) => {
                const total = rt.total || 2;
                for (let i = 1; i <= total; i++) {
                  dynamicUnits.push({
                    number: `${rt.name.slice(0, 1).toUpperCase()}-${100 + i}`,
                    status: i <= (rt.available ?? 1) ? "kosong" : "terisi",
                  });
                }
              });
              setRooms({ [mapped.slug]: dynamicUnits });
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [property, params.slug]);

  if (loading) {
    return (
      <DashboardShell role="owner">
        <p className="py-24 text-center text-sm text-nk-text-muted">Memuat rincian properti...</p>
      </DashboardShell>
    );
  }

  if (!property) {
    return (
      <DashboardShell role="owner">
        <p className="py-24 text-center text-sm text-nk-text-muted">404 - Properti Tidak Ditemukan</p>
      </DashboardShell>
    );
  }

  const units = rooms[property.slug] ?? [];
  const setRoomStatus = (number: string, status: RoomUnit["status"]) => {
    setRooms((prev) => ({
      ...prev,
      [property.slug]: (prev[property.slug] ?? []).map((r) =>
        r.number === number ? { ...r, status } : r
      ),
    }));
    setMenuRoom(null);
  };

  const tabs = [
    { id: "rooms" as const, label: t("tabRooms") },
    { id: "photos" as const, label: t("tabPhotos") },
    { id: "settings" as const, label: t("tabSettings") },
  ];

  const statusLabel: Record<RoomUnit["status"], string> = {
    kosong: t("roomKosong"),
    terisi: t("roomTerisi"),
    maintenance: t("roomMaintenance"),
    dipesan: t("roomDipesan"),
  };

  return (
    <DashboardShell role="owner">
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-nk-text-muted">
        <Link href="/owner/properties" className="transition-colors hover:text-nk-text">
          {t("breadcrumb")}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-nk-text">{property.name}</span>
      </nav>

      {/* header info properti */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={`https://picsum.photos/seed/${property.imageSeed}/160/120`}
          alt={property.name}
          className="h-16 w-24 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-medium tracking-tight text-nk-text">{property.name}</h1>
            {property.verificationStatus === "verified" && (
              <StatusBadge color="green">{propsT("verified")}</StatusBadge>
            )}
            {property.verificationStatus === "pending" && (
              <StatusBadge color="yellow">{propsT("pending")}</StatusBadge>
            )}
            {property.verificationStatus === "rejected" && (
              <StatusBadge color="red">{propsT("rejected")}</StatusBadge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-nk-text-muted">{property.address}</p>
        </div>
        <button
          type="button"
          className="w-fit rounded-lg border border-nk-border px-4 py-2.5 text-sm font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
        >
          {t("edit")}
        </button>
      </section>

      {/* tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="mb-6 flex h-auto w-fit gap-1 rounded-none border-b border-nk-border bg-transparent p-0">
          {tabs.map((tab2) => (
            <TabsTrigger
              key={tab2.id}
              value={tab2.id}
              className="-mb-px rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-normal text-nk-text-muted shadow-none transition-colors data-[state=active]:border-nk-accent data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-nk-text data-[state=active]:shadow-none"
            >
              {tab2.label}
            </TabsTrigger>
          ))}
        </TabsList>

      </Tabs>

      {/* TAB: Tipe Kamar */}
      {tab === "rooms" && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-nk-accent px-4 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
            >
              {t("addRoomType")}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {property.roomTypes.map((rt) => (
              <div key={rt.id} className="rounded-lg border border-nk-border bg-nk-surface">
                {/* header tipe */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setOpenType(openType === rt.id ? null : rt.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={openType === rt.id}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn("shrink-0 text-nk-text-muted transition-transform", openType === rt.id && "rotate-90")}
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-nk-text">{rt.name}</span>
                      <span className="block text-xs text-nk-text-muted">
                        {formatIDR(rt.pricePerMonth)}{t("perMonth")} · {rt.available}/{rt.total} {t("roomKosong").toLowerCase()}
                      </span>
                    </span>
                  </button>
                  <div className="flex gap-2 sm:ml-auto">
                    <button
                      type="button"
                      className="rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-nk-border px-3 py-1.5 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm"
                    >
                      {t("addRoom")}
                    </button>
                  </div>
                </div>

                {/* isi expand: grid kartu kamar */}
                {openType === rt.id && (
                  <div className="border-t border-nk-border p-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                      {units.map((room) => {
                        const c = roomStatusColor[room.status];
                        return (
                          <div key={room.number} className="relative">
                            <button
                              type="button"
                              onClick={() => setMenuRoom(menuRoom === room.number ? null : room.number)}
                              className={cn(
                                "flex w-full flex-col items-start gap-1 rounded-md border p-2.5 text-left transition-colors hover:brightness-[0.98] active:scale-[0.98]",
                                c.cls
                              )}
                            >
                              <span className="font-mono text-sm font-medium tabular-nums text-nk-text">
                                {room.number}
                              </span>
                              <StatusBadge color={c.badge} className="!px-1.5 !py-0 text-[10px]">
                                {statusLabel[room.status]}
                              </StatusBadge>
                            </button>
                            {/* dropdown aksi cepat */}
                            {menuRoom === room.number && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setMenuRoom(null)} aria-hidden="true" />
                                <div className="absolute left-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-md border border-nk-border bg-nk-surface py-1 shadow-xl">
                                  <button
                                    type="button"
                                    onClick={() => setRoomStatus(room.number, "maintenance")}
                                    className="block w-full px-3 py-2 text-left text-xs text-nk-text transition-colors hover:bg-nk-warm"
                                  >
                                    {t("setMaintenance")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRoomStatus(room.number, "kosong")}
                                    className="block w-full px-3 py-2 text-left text-xs text-nk-text transition-colors hover:bg-nk-warm"
                                  >
                                    {t("setKosong")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Foto */}
      {tab === "photos" && (
        <PropertyPhotoManager slug={property.slug} propertyId={property.id} />
      )}

      {/* TAB: Pengaturan */}
      {tab === "settings" && (
        <div className="rounded-lg border border-dashed border-nk-border px-6 py-16 text-center text-sm text-nk-text-muted">
          {t("settingPlaceholder")}
        </div>
      )}
    </DashboardShell>
  );
}

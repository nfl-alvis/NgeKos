"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Heart,
  DoorOpen,
  MapPin,
  Star,
  Search,
  ArrowRight,
  ExternalLink,
  Trash2,
  Building2,
} from "lucide-react";
import { getPropertyBySlug, properties as staticProperties } from "@/lib/data/properties";
import type { Property } from "@/lib/data/types";
import { formatIDR, formatDistance, cn } from "@/lib/utils";
import { toggleFavorite, useUserOps } from "@/lib/userOpsStore";
import { getKosImage } from "@/lib/kosImages";

export default function FavoriteList() {
  const t = useTranslations("userDash.favorites");
  const ops = useUserOps();
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  useEffect(() => {
    fetch("/api/favorites")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          json.data.forEach((item: { slug?: string }) => {
            if (item.slug && !ops.favorites.includes(item.slug)) {
              toggleFavorite(item.slug);
            }
          });
        }
      })
      .catch(() => {});
  }, [ops.favorites]);

  const handleRemove = (slug: string) => {
    toggleFavorite(slug);
    fetch(`/api/favorites/${slug}`, { method: "DELETE" }).catch(() => {});
  };

  const favoriteProperties = useMemo(() => {
    return ops.favorites
      .map((slug) => getPropertyBySlug(slug))
      .filter((p): p is Property => Boolean(p));
  }, [ops.favorites]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    favoriteProperties.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set);
  }, [favoriteProperties]);

  const counts = useMemo(() => {
    const total = favoriteProperties.length;
    const available = favoriteProperties.filter((p) =>
      p.roomTypes.some((r) => r.available > 0)
    ).length;
    const avgPrice =
      total > 0
        ? Math.round(
            favoriteProperties.reduce((acc, p) => acc + p.minPrice, 0) / total
          )
        : 0;
    return { total, available, avgPrice, citiesCount: cities.length };
  }, [favoriteProperties, cities]);

  const filtered = useMemo(() => {
    return favoriteProperties.filter((p) => {
      if (selectedCity !== "all" && p.city !== selectedCity) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [favoriteProperties, selectedCity, search]);

  const statCards = [
    {
      key: "total",
      label: "Total Favorit",
      value: String(counts.total),
      sub: "Kos tersimpan",
      tint: "bg-[#FBF3DC]",
      iconTint: "bg-[#F3E3B8] text-[#8A6A1F]",
      icon: Heart,
    },
    {
      key: "available",
      label: "Kamar Tersedia",
      value: String(counts.available),
      sub: "Siap huni saat ini",
      tint: "bg-[#E9F4EC]",
      iconTint: "bg-[#CFE8D6] text-[#2F6B3C]",
      icon: DoorOpen,
    },
    {
      key: "avgPrice",
      label: "Rata-rata Sewa",
      value: counts.avgPrice > 0 ? formatIDR(counts.avgPrice) : "Rp 0",
      sub: "Per bulan",
      tint: "bg-[#E8EFF8]",
      iconTint: "bg-[#D3E0F0] text-[#33517C]",
      icon: Building2,
    },
    {
      key: "cities",
      label: "Pilihan Kota",
      value: String(counts.citiesCount),
      sub: "Kota terdaftar",
      tint: "bg-[#F3EDE6]",
      iconTint: "bg-nk-accent-subtle text-nk-accent",
      icon: MapPin,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.key}
            className={cn(
              "flex flex-col gap-1 overflow-hidden rounded-xl text-left ring-1 ring-foreground/10 transition-all",
              s.tint
            )}
          >
            <p className="px-4 pb-1 pt-3 text-xs font-semibold text-nk-text">{s.label}</p>
            <div className="flex flex-1 flex-col rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10">
              <div className="flex items-center gap-3">
                <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", s.iconTint)}>
                  <s.icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-2xl font-semibold tracking-tight text-nk-text tabular-nums">
                    {s.value}
                  </p>
                  <p className="truncate text-[11px] text-nk-text-muted">{s.sub}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-nk-border bg-nk-section/50 p-1">
          <button
            type="button"
            onClick={() => setSelectedCity("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              selectedCity === "all"
                ? "bg-nk-surface text-nk-text shadow-sm font-semibold"
                : "text-nk-text-muted hover:text-nk-text"
            )}
          >
            <span>Semua Kota</span>
            <span className="rounded-full bg-nk-border px-1.5 py-0.5 text-[10px] font-semibold text-nk-text-muted">
              {counts.total}
            </span>
          </button>
          {cities.map((city) => {
            const countInCity = favoriteProperties.filter((p) => p.city === city).length;
            return (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  selectedCity === city
                    ? "bg-nk-surface text-nk-text shadow-sm font-semibold"
                    : "text-nk-text-muted hover:text-nk-text"
                )}
              >
                <span>{city}</span>
                <span className="rounded-full bg-nk-border px-1.5 py-0.5 text-[10px] font-semibold text-nk-text-muted">
                  {countInCity}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-nk-text-muted" />
          <input
            type="text"
            placeholder="Cari kos atau daerah..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-nk-border bg-nk-surface pl-9 pr-3 text-xs text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent"
          />
        </div>
      </div>

      {/* Grid Container */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-nk-border bg-nk-surface/50 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#FBF3DC] text-[#8A6A1F]">
            <Heart className="size-7" />
          </div>
          <h3 className="mt-4 text-base font-medium text-nk-text">Belum ada kos favorit</h3>
          <p className="mt-1.5 max-w-sm text-xs text-nk-text-muted">
            {search
              ? "Tidak ditemukan kos yang cocok dengan pencarian Anda."
              : "Simpan kos favorit Anda dengan mengklik ikon hati pada kos yang Anda sukai."}
          </p>
          <Link
            href="/kost"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-nk-accent px-5 py-2.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            <span>Jelajahi Kos Pilihan</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => {
            const totalAvailable = property.roomTypes.reduce((s, r) => s + r.available, 0);
            return (
              <article
                key={property.slug}
                className="group flex flex-col overflow-hidden rounded-xl border border-nk-border bg-nk-surface transition-all hover:border-nk-accent/40 hover:shadow-sm"
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-nk-section">
                  <Image
                    src={getKosImage(property.slug || property.imageSeed, "main")}
                    alt={property.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(property.slug)}
                    title="Hapus dari favorit"
                    className="absolute right-2.5 top-2.5 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur-xs transition-colors hover:bg-white hover:text-red-600"
                  >
                    <Heart className="size-4 fill-red-500 text-red-500" />
                  </button>
                  {/* Distance badge */}
                  <span className="absolute bottom-2 right-2 rounded bg-nk-dark/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                    {formatDistance(property.distanceToCampusM)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                  {/* Gender and Availability */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded border border-nk-border bg-nk-section px-2 py-0.5 font-medium capitalize text-nk-text">
                      {property.gender === "male"
                        ? "Putra"
                        : property.gender === "female"
                          ? "Putri"
                          : "Campur"}
                    </span>
                    <span className="text-nk-text-muted">
                      {totalAvailable > 0 ? (
                        <span className="font-medium text-emerald-700">
                          {totalAvailable} kamar tersedia
                        </span>
                      ) : (
                        <span className="text-red-600">Penuh</span>
                      )}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-2 text-base font-semibold tracking-tight text-nk-text">
                    <Link
                      href={`/kost/${property.slug}`}
                      className="hover:text-nk-accent transition-colors"
                    >
                      {property.name}
                    </Link>
                  </h3>

                  {/* Location */}
                  <p className="mt-1 flex items-center gap-1 text-xs text-nk-text-muted">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>
                      {property.district}, {property.city}
                    </span>
                  </p>

                  {/* Rating */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-nk-text-muted">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-nk-text">
                      {property.rating.toFixed(1)}
                    </span>
                    <span>({property.reviewCount} ulasan)</span>
                  </div>

                  {/* Footer Price & CTA */}
                  <div className="mt-4 flex items-center justify-between border-t border-nk-border pt-3">
                    <div>
                      <p className="text-base font-semibold tabular-nums text-nk-text">
                        {formatIDR(property.minPrice)}
                      </p>
                      <p className="text-[10px] text-nk-text-muted">per bulan</p>
                    </div>

                    <Link
                      href={`/kost/${property.slug}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-nk-accent px-3 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
                    >
                      <span>Lihat Kos</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

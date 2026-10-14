"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { StatusBadge } from "@/components/StatusBadge";
import { subscriptionState } from "@/lib/data/entities";
import CreatePropertyDialog from "@/components/owner/CreatePropertyDialog";
import type { Property } from "@/lib/data/types";
import { getKosImage } from "@/lib/kosImages";
import { useSession } from "@/components/SessionProvider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  X,
  Building2,
  SearchX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  type PropertyFormDraft,
  getSavedPropertyDraft,
  deleteSavedPropertyDraft,
  getDraftThumbnail,
} from "@/lib/propertyDraft";

export default function OwnerPropertiesPage() {
  const t = useTranslations("owner.properties");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useSession();
  const [props, setProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Search & Draft state
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState<PropertyFormDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<"draft" | Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleResubmitVerification = async (idOrSlug: string) => {
    try {
      const res = await fetch(`/api/properties/${idOrSlug}/submit-verification`, {
        method: "POST",
      });
      if (res.ok) {
        setProps((prev) =>
          prev.map((item) =>
            item.slug === idOrSlug || ("id" in item && item.id === idOrSlug)
              ? { ...item, verificationStatus: "pending" }
              : item
          )
        );
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Load draft from localStorage
    const savedDraft = getSavedPropertyDraft();
    if (savedDraft) {
      setDraft(savedDraft);
    }

    async function loadMine() {
      try {
        const res = await fetch("/api/properties?mine=true");
        if (!res.ok) {
          if (!cancelled) setProps([]);
          return;
        }
        const json = await res.json();
        if (Array.isArray(json.data) && !cancelled) {
          const mapped: Property[] = json.data.map((dto: any) => ({
            id: dto.id,
            slug: dto.slug,
            name: dto.name,
            tagline: dto.tagline ?? "",
            description: dto.description,
            city: dto.city,
            district: dto.district,
            address: dto.address,
            gender: dto.gender ? dto.gender.toLowerCase() : "mixed",
            verified: dto.status === "VERIFIED",
            active: dto.status === "VERIFIED",
            rating: dto.rating ?? 0,
            reviewCount: dto.reviewCount ?? 0,
            imageSeed: dto.slug,
            facilities: (dto.facilities || []).map((f: any) => f.key || f),
            minPrice: dto.minPrice ?? 0,
            distanceToCampusM: dto.distanceToCampusM ?? 0,
            depositInfo: dto.depositAmount ? `DP Rp ${dto.depositAmount.toLocaleString("id-ID")}` : "Tanpa deposit",
            depositAmount: dto.depositAmount,
            verificationStatus: dto.status === "VERIFIED" ? "verified" : dto.status === "REJECTED" ? "rejected" : "pending",
            verificationNote: dto.rejectionNote ?? undefined,
            roomTypes: (dto.roomTypes || []).map((rt: any) => ({
              id: rt.id,
              name: rt.name,
              pricePerMonth: rt.pricePerMonth,
              available: rt.available ?? 0,
              total: rt.total ?? 0,
              sizeM2: rt.sizeM2 ?? 12,
            })),
          }));
          setProps(mapped);
        } else if (!cancelled) {
          setProps([]);
        }
      } catch {
        if (!cancelled) setProps([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMine();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOwnerUnlimited = user?.email?.toLowerCase() === "owner@ngekost.id";
  const isTrial = !isOwnerUnlimited && subscriptionState.status === "trial";
  const LIMIT = isTrial ? 5 : Infinity;
  const atLimit = !isOwnerUnlimited && props.filter((p) => p.verificationStatus === "verified").length >= LIMIT;

  // Filtered properties based on search query
  const filteredProps = useMemo(() => {
    if (!searchQuery.trim()) return props;
    const q = searchQuery.toLowerCase().trim();
    return props.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(q);
      const matchCity = p.city?.toLowerCase().includes(q);
      const matchDistrict = p.district?.toLowerCase().includes(q);
      const matchAddress = p.address?.toLowerCase().includes(q);
      const matchStatus = p.verificationStatus?.toLowerCase().includes(q);
      const matchGender = p.gender?.toLowerCase().includes(q);
      const matchRooms = p.roomTypes?.some((rt) => rt.name.toLowerCase().includes(q));
      return matchName || matchCity || matchDistrict || matchAddress || matchStatus || matchGender || matchRooms;
    });
  }, [props, searchQuery]);

  // Draft search match
  const draftMatchesSearch = useMemo(() => {
    if (!draft) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = draft.namaKos?.toLowerCase().includes(q);
    const matchCity = draft.kabupatenKota?.toLowerCase().includes(q);
    const matchDistrict = draft.kecamatan?.toLowerCase().includes(q);
    const matchAddress = (draft.alamatSearch || draft.detailLokasi)?.toLowerCase().includes(q);
    const matchType = draft.tipeKamar?.toLowerCase().includes(q);
    const matchKeyword = "draft".includes(q) || "draf".includes(q);
    return Boolean(matchName || matchCity || matchDistrict || matchAddress || matchType || matchKeyword);
  }, [draft, searchQuery]);

  const draftThumbnail = useMemo(() => getDraftThumbnail(draft), [draft]);

  const handleDeleteDraft = () => {
    deleteSavedPropertyDraft();
    setDraft(null);
    setDeleteTarget(null);
  };

  const handleDeleteProperty = async (property: Property) => {
    setIsDeleting(true);
    try {
      const idOrSlug = ("id" in property && property.id) || property.slug;
      const res = await fetch(`/api/properties/${idOrSlug}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setProps((prev) =>
          prev.filter((item) =>
            "id" in item && item.id ? item.id !== property.id : item.slug !== property.slug
          )
        );
      }
    } catch (err) {
      console.error("Failed to delete property:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getStepName = (step: number) => {
    try {
      const key = String(step) as "1" | "2" | "3" | "4";
      return t(`stepNames.${key}`);
    } catch {
      return `Step ${step}`;
    }
  };

  const formatSavedTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const now = Date.now();
    const diffSecs = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (diffSecs < 60) {
      return t("draftSavedJustNow");
    }
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return t("draftSavedMinutesAgo", { minutes: diffMins });
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return t("draftSavedHoursAgo", { hours: diffHours });
    }
    const date = new Date(timestamp);
    return t("draftSavedDate", {
      date: date.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  };

  if (loading) {
    return (
      <DashboardShell role="owner">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <Skeleton className="mb-6 h-10 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-nk-border bg-nk-surface">
              <Skeleton className="h-44 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </DashboardShell>
    );
  }

  // If owner has 0 properties and no draft at all, show pristine empty state
  if (props.length === 0 && !draft) {
    return (
      <DashboardShell role="owner">
        <div className="flex flex-col items-center rounded-lg border border-dashed border-nk-border px-6 py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-nk-text-muted" aria-hidden="true">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
          </svg>
          <h2 className="text-lg font-medium text-nk-text">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-nk-text-muted">{t("emptyBody")}</p>
          <button
            type="button"
            onClick={() => router.push("/owner/properties/new")}
            className="mt-6 rounded-lg bg-nk-accent px-6 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] cursor-pointer"
          >
            {t("emptyCta")}
          </button>
        </div>
        <CreatePropertyDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={(newProp) => {
            if (newProp) {
              setProps((prev) => [
                {
                  id: newProp.id,
                  slug: newProp.slug,
                  name: newProp.name,
                  tagline: newProp.tagline ?? "",
                  description: newProp.description,
                  city: newProp.city,
                  district: newProp.district,
                  address: newProp.address,
                  gender: newProp.gender ? newProp.gender.toLowerCase() : "mixed",
                  verified: newProp.status === "VERIFIED",
                  active: newProp.status === "VERIFIED",
                  rating: 0,
                  reviewCount: 0,
                  imageSeed: newProp.slug,
                  facilities: (newProp.facilities || []).map((f: any) => f.key || f),
                  minPrice: newProp.minPrice ?? 0,
                  distanceToCampusM: 0,
                  depositInfo: newProp.depositAmount ? `DP Rp ${newProp.depositAmount.toLocaleString("id-ID")}` : "Tanpa deposit",
                  depositAmount: newProp.depositAmount,
                  verificationStatus: "pending",
                  roomTypes: [],
                },
                ...prev,
              ]);
            }
          }}
        />
      </DashboardShell>
    );
  }

  const showDraftCard = Boolean(draft && draftMatchesSearch);
  const totalItemsCount = filteredProps.length + (showDraftCard ? 1 : 0);

  return (
    <DashboardShell role="owner">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
          <p className="text-xs text-nk-text-muted mt-0.5">
            {t("showingResults", { count: props.length + (draft ? 1 : 0) })}
          </p>
        </div>
        <div className="group relative w-fit">
          <button
            type="button"
            disabled={atLimit}
            onClick={() => router.push("/owner/properties/new")}
            aria-describedby={atLimit ? "limit-tooltip" : undefined}
            className="inline-flex items-center gap-2 rounded-lg bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-nk-section disabled:text-nk-text-muted cursor-pointer"
          >
            {atLimit && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            )}
            {t("add")}
          </button>
          {atLimit && (
            <span
              id="limit-tooltip"
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-md border border-nk-border bg-nk-surface p-3 text-xs text-nk-text shadow-xl group-hover:block"
            >
              {t("addLocked")}
            </span>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-nk-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-nk-border bg-nk-surface pl-10 pr-10 text-sm text-nk-text placeholder:text-nk-text-muted focus:border-nk-accent focus:outline-none focus:ring-1 focus:ring-nk-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-nk-text-muted hover:text-nk-text cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {searchQuery.trim() && (
          <div className="mt-2 flex items-center justify-between text-xs text-nk-text-muted">
            <span>
              {t("showingResults", {
                count: totalItemsCount,
              })}
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="font-medium text-nk-accent hover:underline cursor-pointer"
            >
              {t("clearSearch")}
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {searchQuery.trim() && totalItemsCount === 0 ? (
        /* Empty Search Results */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-nk-border bg-nk-surface px-6 py-14 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-nk-warm text-nk-text-muted">
            <SearchX className="size-6" />
          </div>
          <h3 className="text-base font-medium text-nk-text">{t("searchEmptyTitle")}</h3>
          <p className="mt-1 max-w-sm text-sm text-nk-text-muted">
            {t("searchEmptyDesc", { query: searchQuery })}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-4 rounded-lg border border-nk-border bg-nk-surface px-4 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99] cursor-pointer"
          >
            {t("clearSearch")}
          </button>
        </div>
      ) : (
        /* Unified Grid of Properties & Draft */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* 1. DRAFT CARD (Styled exactly like other property cards, with red draft badge & notice) */}
          {showDraftCard && draft && (
            <article className="flex flex-col overflow-hidden rounded-lg border border-nk-border bg-nk-surface">
              <div className="relative">
                {draftThumbnail ? (
                  <img
                    src={draftThumbnail}
                    alt={draft.namaKos || "Draft"}
                    className="aspect-[16/9] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-nk-warm text-nk-text-muted">
                    <Building2 className="size-10 opacity-40" />
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <StatusBadge color="red">{t("draftBadge")}</StatusBadge>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h2 className="truncate text-base font-medium text-nk-text">
                    {draft.namaKos?.trim() || t("draftUntitled")}
                  </h2>
                  <p className="text-sm text-nk-text-muted truncate">
                    {[draft.kecamatan, draft.kabupatenKota].filter(Boolean).join(", ") ||
                      draft.alamatSearch ||
                      t("draftNoLocation")}
                  </p>

                  {/* Informational Box: Lengkapi data kos / belum tampil di pencarian */}
                  <div className="mt-3 rounded-md border border-[#EBC4C0] bg-[#FAEAE8] p-3">
                    <p className="text-xs font-semibold text-[#9C3B32]">
                      {t("draftActionRequired")}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9C3B32]">
                      {t("draftSearchNotice")}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-nk-text-muted">
                    <span>
                      {t("draftStepProgress", {
                        step: draft.step || 1,
                        stepName: getStepName(draft.step || 1),
                      })}
                    </span>
                    {draft.savedAt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{formatSavedTime(draft.savedAt)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Hapus Kos (Kiri) & Manage (Kanan) */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget("draft")}
                    className="flex-1 rounded-lg border border-nk-border px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:border-rose-200 active:scale-[0.99] cursor-pointer text-center"
                  >
                    {t("deleteProperty")}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/owner/properties/new")}
                    className="flex-1 rounded-lg border border-nk-border px-3 py-2.5 text-sm font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99] cursor-pointer text-center"
                  >
                    {t("manage")}
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* 2. REGULAR PROPERTIES CARDS */}
          {filteredProps.map((p) => {
            const totalRooms = p.roomTypes.reduce((acc, rt) => acc + rt.total, 0);
            const filledRooms = p.roomTypes.reduce(
              (acc, rt) => acc + (rt.total - rt.available),
              0
            );
            return (
              <article key={p.slug} className="flex flex-col overflow-hidden rounded-lg border border-nk-border bg-nk-surface">
                <div className="relative">
                  <img
                    src={getKosImage(p.slug || p.imageSeed, "main")}
                    alt={p.name}
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <div className="absolute right-2 top-2">
                    {p.verificationStatus === "verified" && (
                      <StatusBadge color="green">{t("verified")}</StatusBadge>
                    )}
                    {p.verificationStatus === "pending" && (
                      <StatusBadge color="yellow">{t("pending")}</StatusBadge>
                    )}
                    {p.verificationStatus === "rejected" && (
                      <StatusBadge color="red">{t("rejected")}</StatusBadge>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h2 className="truncate text-base font-medium text-nk-text">{p.name}</h2>
                    <p className="text-sm text-nk-text-muted truncate">
                      {p.district}, {p.city}
                    </p>

                    {p.verificationStatus === "rejected" && p.verificationNote && (
                      <div className="mt-3 rounded-md border border-[#EBC4C0] bg-[#FAEAE8] p-3">
                        <p className="text-xs text-[#9C3B32]">
                          {t("rejectionReason", { reason: p.verificationNote })}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleResubmitVerification(("id" in p ? p.id : "") || p.slug)}
                          className="mt-2 text-xs font-medium text-[#9C3B32] underline underline-offset-4 hover:opacity-80 cursor-pointer"
                        >
                          {t("resubmit")}
                        </button>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-nk-text-muted">
                      <span>{t("rooms", { count: totalRooms })}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t("occupancy", { count: filledRooms, total: totalRooms })}</span>
                    </div>
                  </div>

                  {/* Bottom Actions: Hapus Kos (Kiri) & Manage (Kanan) */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="flex-1 rounded-lg border border-nk-border px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:border-rose-200 active:scale-[0.99] cursor-pointer text-center"
                    >
                      {t("deleteProperty")}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/owner/properties/${p.slug}`)}
                      className="flex-1 rounded-lg border border-nk-border px-3 py-2.5 text-sm font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99] cursor-pointer text-center"
                    >
                      {t("manage")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog Before Deleting Kost (Draft or Live Property) */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deleteTarget === "draft"
                ? t("deleteDraftTitle")
                : t("deletePropertyTitle", { name: deleteTarget?.name ?? "" })}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm text-nk-text-muted">
              {deleteTarget === "draft"
                ? t("deleteDraftDesc")
                : t("deletePropertyDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-nk-border px-4 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm cursor-pointer disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                if (deleteTarget === "draft") {
                  handleDeleteDraft();
                } else if (deleteTarget) {
                  handleDeleteProperty(deleteTarget);
                }
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? t("deleting") : t("confirmDelete")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <CreatePropertyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(newProp) => {
          if (newProp) {
            setProps((prev) => [
              {
                id: newProp.id,
                slug: newProp.slug,
                name: newProp.name,
                tagline: newProp.tagline ?? "",
                description: newProp.description,
                city: newProp.city,
                district: newProp.district,
                address: newProp.address,
                gender: newProp.gender ? newProp.gender.toLowerCase() : "mixed",
                verified: newProp.status === "VERIFIED",
                active: newProp.status === "VERIFIED",
                rating: 0,
                reviewCount: 0,
                imageSeed: newProp.slug,
                facilities: (newProp.facilities || []).map((f: any) => f.key || f),
                minPrice: newProp.minPrice ?? 0,
                distanceToCampusM: 0,
                depositInfo: newProp.depositAmount ? `DP Rp ${newProp.depositAmount.toLocaleString("id-ID")}` : "Tanpa deposit",
                depositAmount: newProp.depositAmount,
                verificationStatus: "pending",
                roomTypes: [],
              },
              ...prev,
            ]);
          }
        }}
      />
    </DashboardShell>
  );
}

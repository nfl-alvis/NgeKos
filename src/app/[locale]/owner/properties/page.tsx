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
  FileEdit,
  Trash2,
  ArrowRight,
  Clock,
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
  const [deleteDraftConfirmOpen, setDeleteDraftConfirmOpen] = useState(false);

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
    setDeleteDraftConfirmOpen(false);
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
            className="mt-6 rounded-lg bg-nk-accent px-6 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
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

  return (
    <DashboardShell role="owner">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
          <p className="text-xs text-nk-text-muted mt-0.5">
            {t("showingResults", { count: props.length })}
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
                count: filteredProps.length + (draftMatchesSearch ? 1 : 0),
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

      {/* Saved Draft Banner / Card */}
      {draft && draftMatchesSearch && (
        <div className="mb-6 overflow-hidden rounded-xl border border-amber-300/80 bg-amber-50/50 p-4 transition-all hover:border-amber-400 dark:border-amber-700/60 dark:bg-amber-950/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                {t("draftSectionTitle")}
              </h2>
            </div>
            {draft.savedAt && (
              <span className="flex items-center gap-1 text-[11px] text-nk-text-muted">
                <Clock className="size-3" />
                {formatSavedTime(draft.savedAt)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-amber-200 bg-amber-100/60 dark:border-amber-800 dark:bg-amber-900/40">
                {draftThumbnail ? (
                  <img
                    src={draftThumbnail}
                    alt={draft.namaKos || "Draf"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-amber-700 dark:text-amber-300">
                    <Building2 className="size-8 opacity-70" />
                  </div>
                )}
                <span className="absolute bottom-1 left-1 rounded bg-amber-700/90 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase shadow-sm">
                  {t("draftBadge")}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium text-nk-text">
                  {draft.namaKos?.trim() || t("draftUntitled")}
                </h3>
                <p className="text-xs text-nk-text-muted">
                  {[draft.kecamatan, draft.kabupatenKota].filter(Boolean).join(", ") ||
                    draft.alamatSearch ||
                    t("draftNoLocation")}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                    <FileEdit className="size-3" />
                    {t("draftStepProgress", {
                      step: draft.step || 1,
                      stepName: getStepName(draft.step || 1),
                    })}
                  </span>
                  <div className="hidden sm:flex h-1.5 w-24 overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-800/80">
                    <div
                      className="h-full bg-amber-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(25, (draft.step || 1) * 25))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setDeleteDraftConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-nk-border bg-white px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 active:scale-[0.99] dark:bg-nk-surface dark:hover:bg-rose-950/30 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>{t("draftDiscard")}</span>
              </button>
              <button
                type="button"
                onClick={() => router.push("/owner/properties/new")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nk-accent px-4 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] cursor-pointer"
              >
                <span>{t("draftContinue")}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Draft Confirmation Dialog */}
      <Dialog open={deleteDraftConfirmOpen} onOpenChange={setDeleteDraftConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("draftDiscardTitle")}</DialogTitle>
            <DialogDescription className="pt-2 text-sm text-nk-text-muted">
              {t("draftDiscardDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setDeleteDraftConfirmOpen(false)}
              className="rounded-lg border border-nk-border px-4 py-2 text-xs font-medium text-nk-text transition-colors hover:bg-nk-warm cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleDeleteDraft}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
            >
              {t("confirmDiscard")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      {searchQuery.trim() && filteredProps.length === 0 && !draftMatchesSearch ? (
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
      ) : props.length === 0 && draft ? (
        /* Has Draft but No Published Properties Yet */
        <div className="rounded-xl border border-nk-border bg-nk-surface p-8 text-center text-sm text-nk-text-muted">
          <p>{t("noPublishedYet")}</p>
          <p className="mt-1 text-xs text-nk-text-muted">{t("emptyBody")}</p>
        </div>
      ) : filteredProps.length === 0 ? (
        /* Empty after filtering (when draft exists and matches, but no properties match) */
        null
      ) : (
        /* Grid of Properties */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProps.map((p) => {
            const totalRooms = p.roomTypes.reduce((acc, rt) => acc + rt.total, 0);
            const filledRooms = p.roomTypes.reduce(
              (acc, rt) => acc + (rt.total - rt.available),
              0
            );
            return (
              <article key={p.slug} className="overflow-hidden rounded-lg border border-nk-border bg-nk-surface">
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
                <div className="p-4">
                  <h2 className="truncate text-base font-medium text-nk-text">{p.name}</h2>
                  <p className="text-sm text-nk-text-muted">
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

                  <button
                    type="button"
                    onClick={() => router.push(`/owner/properties/${p.slug}`)}
                    className="mt-4 w-full rounded-lg border border-nk-border px-4 py-2.5 text-sm font-medium text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99] cursor-pointer"
                  >
                    {t("manage")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

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

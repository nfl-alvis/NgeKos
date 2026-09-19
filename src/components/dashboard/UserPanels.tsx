"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Check, Heart, Star } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { bookings } from "@/lib/data/entities";
import { getPropertyBySlug, properties } from "@/lib/data/properties";
import { DEMO_USER_NAME, reviewableSlugs, tenantRoomInfo, type UserReview } from "@/lib/data/userData";
import { markPaymentPaid, saveReview, toggleFavorite, useUserOps } from "@/lib/userOpsStore";
import { cn, formatIDR } from "@/lib/utils";
import { DashSection } from "@/components/dashboard/DashSection";

/** tanggal jatuh tempo bayar = createdAt + payDeadlineMin (dibaca dari booking) */
function payDeadline(b: (typeof bookings)[number]) {
  const start = new Date(b.createdAt).getTime();
  return new Date(start + b.payDeadlineMin * 60_000);
}

/* ===== 1. Booking aktif - panel paling penting di /dashboard ===== */

export function ActiveBookingPanel({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("userDash.booking");
  const locale = useLocale();
  const router = useRouter();
  const ops = useUserOps();

  const open = bookings
    .filter((b) => b.status === "pending" || b.status === "approved-awaiting-payment")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const list = compact ? open.slice(0, 2) : open;

  if (list.length === 0) {
    return (
      <DashSection title={t("title")} bodyClass="p-6">
        <p className="text-sm text-nk-text-muted">{t("empty")}</p>
        <Link
          href="/kost"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-nk-accent hover:underline"
        >
          {t("explore")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </DashSection>
    );
  }

  return (
    <DashSection
      title={t("title")}
      right={
        <Link href="/dashboard/bookings" className="text-xs font-medium text-nk-accent hover:underline">
          {t("seeAll")}
        </Link>
      }
      bodyClass="divide-y divide-nk-border"
    >
      {list.map((b) => {
        const payment = ops.payments.find((p) => p.bookingId === b.id);
        const awaitingOwner = b.status === "approved-awaiting-payment" && payment?.status === "paid";
        const deadline = payDeadline(b);
        const fmt = (d: Date) =>
          d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        return (
          <article key={b.id} className="flex flex-col gap-4 p-4">
            <div className="flex items-start gap-3">
              <Image
                src={`https://picsum.photos/seed/${b.propertySlug}/96/96`}
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-nk-text">{b.propertyName}</h3>
                <p className="truncate text-xs text-nk-text-muted">
                  {b.roomType} · {t("room", { room: b.roomNumber })}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-nk-text">
                  {formatIDR(b.monthlyPrice)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs text-nk-text-muted">{b.id}</span>
            </div>

            {/* dua status berdampingan: proses booking + proses bayar */}
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-nk-border bg-nk-bg p-3">
                <dt className="text-xs text-nk-text-muted">{t("bookingStatus")}</dt>
                <dd className="mt-1.5">
                  <StatusBadge color={b.status === "pending" ? "yellow" : awaitingOwner ? "blue" : "blue"}>
                    {b.status === "pending" ? t("statusPendingBooking") : t("statusAwaitOwner")}
                  </StatusBadge>
                </dd>
              </div>
              <div className="rounded-lg border border-nk-border bg-nk-bg p-3">
                <dt className="text-xs text-nk-text-muted">{t("paymentStatus")}</dt>
                <dd className="mt-1.5">
                  {payment?.status === "paid" ? (
                    <StatusBadge color="green">{t("statusPaid")}</StatusBadge>
                  ) : payment?.status === "refunding" ? (
                    <StatusBadge color="red">{t("statusRefunding")}</StatusBadge>
                  ) : (
                    <StatusBadge color="yellow">{t("statusUnpaid")}</StatusBadge>
                  )}
                </dd>
              </div>
            </dl>

            {b.status === "approved-awaiting-payment" && payment?.status !== "paid" && (
              <p className="text-xs text-nk-text-muted">
                {t("payBefore")}{" "}
                <span className="font-medium text-[#9C3B32]">
                  {fmt(deadline)}, {deadline.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {b.status === "approved-awaiting-payment" && payment?.status !== "paid" && (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/bookings/${b.id}/pay`)}
                  className="inline-flex items-center justify-center bg-nk-accent px-4 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent active:scale-[0.99]"
                >
                  {t("payNow")}
                </button>
              )}
              <Link
                href="/dashboard/bookings"
                className="inline-flex items-center justify-center border border-nk-border bg-nk-surface px-4 py-2 text-sm text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent active:scale-[0.99]"
              >
                {t("detail")}
              </Link>
            </div>
          </article>
        );
      })}
    </DashSection>
  );
}

/* ===== 2. Status pembayaran ===== */

const PAY_COLOR = {
  pending: "yellow",
  paid: "green",
  failed: "red",
  refunding: "red",
  refunded: "gray",
} as const;

export function PaymentsPanel({ limit }: { limit?: number }) {
  const t = useTranslations("userDash.payments");
  const locale = useLocale();
  const ops = useUserOps();

  const rows = limit ? ops.payments.slice(0, limit) : ops.payments;
  const pending = ops.payments.find((p) => p.status === "pending");

  return (
    <DashSection
      title={t("title")}
      right={
        <Link href="/dashboard/payments" className="text-xs font-medium text-nk-accent hover:underline">
          {t("seeAll")}
        </Link>
      }
      bodyClass="divide-y divide-nk-border"
    >
      {rows.map((p) => (
        <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-nk-text">{p.propertyName}</p>
            <p className="truncate text-xs text-nk-text-muted">
              {p.bookingId} ·{" "}
              {new Date(p.at).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
            {p.status === "refunding" && (
              <p className="mt-1 text-xs text-[#9C3B32]">{t("refundingNote")}</p>
            )}
            {p.status === "paid" && (
              <p className="mt-1 text-xs text-nk-text-muted">{t("awaitOwnerNote")}</p>
            )}
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-nk-text">{formatIDR(p.amount)}</p>
          <div className="flex shrink-0 items-center gap-2 sm:w-40 sm:justify-end">
            <StatusBadge color={PAY_COLOR[p.status]}>{t(`status.${p.status}`)}</StatusBadge>
            {p.status === "pending" && (
              <button
                type="button"
                onClick={() => markPaymentPaid(p.id, p.propertyName)}
                className="text-xs font-medium text-nk-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("payNow")}
              </button>
            )}
          </div>
        </div>
      ))}
      {!limit && rows.length === 0 && <p className="p-6 text-sm text-nk-text-muted">{t("empty")}</p>}
      {limit && pending === undefined && (
        <p className="p-4 text-xs text-nk-text-muted">{t("allSet")}</p>
      )}
    </DashSection>
  );
}

/* ===== 3. Favorit ===== */

export function FavoritesPanel({ limit, full = false }: { limit?: number; full?: boolean }) {
  const t = useTranslations("userDash.favorites");
  const ops = useUserOps();

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

  const slugs = limit ? ops.favorites.slice(0, limit) : ops.favorites;
  const items = slugs
    .map((s) => getPropertyBySlug(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (items.length === 0) {
    return (
      <DashSection title={t("title")} bodyClass="p-6">
        <p className="text-sm text-nk-text-muted">{t("empty")}</p>
        <Link href="/kost" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-nk-accent hover:underline">
          {t("explore")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </DashSection>
    );
  }

  return (
    <DashSection
      title={t("title")}
      right={
        !full ? (
          <Link href="/dashboard/favorites" className="text-xs font-medium text-nk-accent hover:underline">
            {t("seeAll")}
          </Link>
        ) : undefined
      }
      bodyClass={full ? "p-4" : "divide-y divide-nk-border"}
    >
      {full ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article key={p.slug} className="flex flex-col overflow-hidden rounded-lg border border-nk-border bg-nk-surface">
              <Link href={`/kost/${p.slug}`} className="relative block aspect-[16/9] bg-nk-section">
                <Image src={`https://picsum.photos/seed/${p.imageSeed}/640/360`} alt={p.name} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="truncate text-sm font-medium text-nk-text">{p.name}</p>
                <p className="text-xs tabular-nums text-nk-text-muted">
                  {formatIDR(p.minPrice)} {t("perMonth")}
                </p>
                <p className="flex items-center gap-1 text-xs">
                  <Star className="size-3.5 fill-nk-star text-nk-star" aria-hidden="true" />
                  <span className="font-medium text-nk-star">{p.rating.toFixed(1)}</span>
                </p>
                <button
                  type="button"
                  onClick={() => handleRemove(p.slug)}
                  className="mt-2 inline-flex items-center justify-center gap-1.5 border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  <Heart className="size-3.5 fill-nk-accent text-nk-accent" aria-hidden="true" />
                  {t("remove")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        items.map((p) => (
          <div key={p.slug} className="flex items-center gap-3 p-4">
            <Image
              src={`https://picsum.photos/seed/${p.imageSeed}/96/96`}
              alt=""
              width={44}
              height={44}
              className="size-11 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <Link href={`/kost/${p.slug}`} className="block truncate text-sm font-medium text-nk-text hover:text-nk-accent">
                {p.name}
              </Link>
              <p className="truncate text-xs text-nk-text-muted">
                {formatIDR(p.minPrice)} {t("perMonth")}
              </p>
            </div>
            <p className="flex shrink-0 items-center gap-1 text-xs">
              <Star className="size-3.5 fill-nk-star text-nk-star" aria-hidden="true" />
              <span className="font-medium text-nk-star tabular-nums">{p.rating.toFixed(1)}</span>
            </p>
            <button
              type="button"
              onClick={() => handleRemove(p.slug)}
              aria-label={t("remove")}
              className="shrink-0 rounded-md p-1.5 text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-[#9C3B32] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
            >
              <Heart className="size-4 fill-current" aria-hidden="true" />
            </button>
          </div>
        ))
      )}
    </DashSection>
  );
}

/* ===== 4. Kos aktif - shortcut ke dashboard tenant ===== */

export function ActiveKostCard() {
  const t = useTranslations("userDash.activeKost");
  const property = getPropertyBySlug("kost-griya-cemara-dago")!;

  return (
    <section className="flex flex-col gap-1 overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-[#E9F4EC]">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <h2 className="text-sm font-semibold text-nk-text">{t("title")}</h2>
        <StatusBadge color="green">{t("status")}</StatusBadge>
      </div>
      <div className="flex flex-1 flex-col gap-4 rounded-lg bg-nk-surface p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center">
        <Image
          src={`https://picsum.photos/seed/${property.imageSeed}/160/160`}
          alt=""
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-nk-text">{property.name}</p>
          <p className="mt-0.5 text-xs text-nk-text-muted">
            {t("room", { room: tenantRoomInfo.roomNumber })} · {tenantRoomInfo.type}
          </p>
          <p className="mt-1 text-xs text-nk-text-muted">{property.address}</p>
        </div>
        <Link
          href="/tenant/dashboard"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
        >
          {t("cta")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* ===== 5. Review saya ===== */

export function ReviewsPanel({ limit }: { limit?: number }) {
  const t = useTranslations("userDash.reviews");
  const locale = useLocale();
  const ops = useUserOps();
  const mine = ops.reviews.filter((r) => r.mine);
  const shown = limit ? mine.slice(0, limit) : mine;
  const [editing, setEditing] = useState<UserReview | null>(null);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          json.data.forEach((r: any) => {
            saveReview({
              id: r.id,
              propertySlug: r.property?.slug || "",
              propertyName: r.property?.name || "Kost",
              authorName: r.author?.fullName || "Saya",
              mine: true,
              rating: r.rating,
              at: typeof r.createdAt === "string" ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
              editable: true,
              bodyId: r.body,
              bodyEn: r.body,
            });
          });
        }
      })
      .catch(() => {});
  }, []);

  const openEdit = (r: UserReview) => {
    setEditing(r);
    setBody(locale === "id" ? r.bodyId : r.bodyEn);
    setRating(r.rating);
  };

  const commit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = editing.id.startsWith("ur-new-") || !editing.id;
      const url = isNew ? "/api/reviews" : `/api/reviews/${editing.id}`;
      const method = isNew ? "POST" : "PATCH";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          body: body.trim().length >= 10 ? body.trim() : `${body.trim()} (Ulasan properti sangat direkomendasikan)`,
          propertySlug: editing.propertySlug,
        }),
      });
    } catch {
      // fallback
    } finally {
      setSaving(false);
    }
    saveReview({ ...editing, rating, bodyId: body, bodyEn: body, at: new Date().toISOString().slice(0, 10) });
    setEditing(null);
    setToast(t("saved"));
    window.setTimeout(() => setToast(null), 5000);
  };

  return (
    <DashSection
      title={t("title")}
      right={
        <Link href="/dashboard/reviews" className="text-xs font-medium text-nk-accent hover:underline">
          {t("seeAll")}
        </Link>
      }
      bodyClass="divide-y divide-nk-border"
    >
      {shown.length === 0 && <p className="p-6 text-sm text-nk-text-muted">{t("empty")}</p>}
      {shown.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-nk-text">{r.propertyName}</p>
              <p className="flex items-center gap-1 text-xs text-nk-text-muted">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn("size-3", i < r.rating ? "fill-nk-star text-nk-star" : "text-nk-border")}
                    aria-hidden="true"
                  />
                ))}
              </p>
            </div>
            {r.editable ? (
              <button
                type="button"
                onClick={() => openEdit(r)}
                className="shrink-0 border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("edit")}
              </button>
            ) : (
              <StatusBadge color="gray">{t("closed")}</StatusBadge>
            )}
          </div>
          <p className="line-clamp-2 text-sm text-nk-text-muted">{locale === "id" ? r.bodyId : r.bodyEn}</p>
        </div>
      ))}

      {/* kos yang bisa direview tapi belum ada ulasannya */}
      {reviewableSlugs
        .filter((slug) => !mine.some((r) => r.propertySlug === slug))
        .map((slug) => {
          const p = getPropertyBySlug(slug);
          if (!p) return null;
          return (
            <div key={slug} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-nk-text">{p.name}</p>
                <p className="text-xs text-nk-text-muted">{t("writePrompt")}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditing({
                    id: `ur-new-${slug}`,
                    propertySlug: slug,
                    propertyName: p.name,
                    authorName: DEMO_USER_NAME,
                    mine: true,
                    rating: 5,
                    at: "2026-09-03",
                    editable: true,
                    bodyId: "",
                    bodyEn: "",
                  });
                  setBody("");
                  setRating(5);
                }}
                className="shrink-0 bg-nk-accent px-3 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
              >
                {t("write")}
              </button>
            </div>
          );
        })}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <h2 className="pr-8 text-lg font-medium text-nk-text">{t("dialogTitle")}</h2>
          <p className="mt-1 text-sm text-nk-text-muted">{editing?.propertyName}</p>
          <div className="mt-5">
            <Label className="text-sm text-nk-text">{t("ratingLabel")}</Label>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i + 1)}
                  aria-label={`${i + 1}`}
                  className="rounded-md p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  <Star className={cn("size-6", i < rating ? "fill-nk-star text-nk-star" : "text-nk-border")} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="review-body" className="text-sm text-nk-text">
              {t("bodyLabel")}
            </Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-2"
              placeholder={t("bodyPlaceholder")}
            />
          </div>
          <button
            type="button"
            onClick={commit}
            disabled={body.trim().length < 8}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-nk-accent px-5 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="size-4" aria-hidden="true" />
            {t("submit")}
          </button>
        </DialogContent>
      </Dialog>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-lg border border-nk-border bg-nk-surface px-4 py-2.5 text-sm text-nk-text shadow-lg">
          {toast}
        </div>
      )}
    </DashSection>
  );
}

/* ===== 6. Rekomendasi kos ===== */

export function RecommendationsPanel() {
  const t = useTranslations("userDash.recommend");
  const ops = useUserOps();
  const bookedSlugs = bookings.map((b) => b.propertySlug);

  const items = ops.favorites
    .map((s) => getPropertyBySlug(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const city = items[0]?.city ?? "Bandung";

  const list = recommendFor(city, ops.favorites, bookedSlugs);

  return (
    <DashSection
      title={t("title")}
      right={<span className="text-xs text-nk-text-muted">{t("forCity", { city })}</span>}
      bodyClass="divide-y divide-nk-border"
    >
      {list.length === 0 && <p className="p-6 text-sm text-nk-text-muted">{t("empty")}</p>}
      {list.map((p) => (
        <div key={p.slug} className="flex items-center gap-3 p-4">
          <Image
            src={`https://picsum.photos/seed/${p.imageSeed}/96/96`}
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <Link href={`/kost/${p.slug}`} className="block truncate text-sm font-medium text-nk-text hover:text-nk-accent">
              {p.name}
            </Link>
            <p className="truncate text-xs text-nk-text-muted">
              {p.district}, {p.city} · {formatIDR(p.minPrice)} {t("perMonth")}
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-1 text-xs">
            <Star className="size-3.5 fill-nk-star text-nk-star" aria-hidden="true" />
            <span className="font-medium text-nk-star tabular-nums">{p.rating.toFixed(1)}</span>
          </p>
          <button
            type="button"
            onClick={() => toggleFavorite(p.slug)}
            aria-label={t("save")}
            className={cn(
              "shrink-0 rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent",
              ops.favorites.includes(p.slug) ? "text-nk-accent" : "text-nk-text-muted hover:bg-nk-warm hover:text-nk-accent"
            )}
          >
            <Heart className={cn("size-4", ops.favorites.includes(p.slug) && "fill-current")} aria-hidden="true" />
          </button>
        </div>
      ))}
    </DashSection>
  );
}

function recommendFor(city: string, favorites: string[], booked: string[]) {
  return properties
    .filter((p) => p.verified && p.active && !favorites.includes(p.slug) && !booked.includes(p.slug))
    .sort(
      (a, b) =>
        Number(b.city === city) - Number(a.city === city) || b.rating - a.rating
    )
    .slice(0, 4);
}

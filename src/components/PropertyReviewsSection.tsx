"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { seedUserReviews } from "@/lib/data/userData";

interface ReviewItem {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
}

interface PropertyReviewsSectionProps {
  propertyId?: string;
  propertySlug: string;
  propertyName: string;
  initialRating: number;
  initialReviewCount: number;
}

export default function PropertyReviewsSection({
  propertyId,
  propertySlug,
  propertyName,
  initialRating,
  initialReviewCount,
}: PropertyReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setLoading(true);
      try {
        const queryParam = propertyId ? `propertyId=${propertyId}` : `propertySlug=${propertySlug}`;
        const res = await fetch(`/api/reviews?${queryParam}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0 && !cancelled) {
            const mapped: ReviewItem[] = json.data.map((r: any) => ({
              id: r.id,
              authorName: r.author?.fullName || "Penyewa",
              rating: r.rating || 5,
              body: r.body || "",
              createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
            }));
            setReviews(mapped);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fallback to seed reviews
      }

      if (!cancelled) {
        const seedMatches = seedUserReviews.filter((r) => r.propertySlug === propertySlug);
        const fallbackList = seedMatches.length > 0
          ? seedMatches.map((r) => ({
              id: r.id,
              authorName: r.authorName,
              rating: r.rating,
              body: r.bodyId,
              createdAt: `${r.at}T10:00:00Z`,
            }))
          : [
              {
                id: `rev-default-1-${propertySlug}`,
                authorName: "Rian Pratama",
                rating: 5,
                body: "Kamar sangat bersih dan pencahayaan matahari bagus. Pemilik kos ramah dan tanggap saat ada kendala.",
                createdAt: "2026-08-15T09:30:00Z",
              },
              {
                id: `rev-default-2-${propertySlug}`,
                authorName: "Dewi Lestari",
                rating: 4,
                body: "Lokasi sangat strategis dekat jalan raya dan warung makan. WiFi stabil untuk kebutuhan kerja atau kuliah.",
                createdAt: "2026-07-22T14:15:00Z",
              },
            ];
        setReviews(fallbackList);
        setLoading(false);
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [propertyId, propertySlug]);

  const ratingSummary = useMemo(() => {
    if (reviews.length === 0) {
      return {
        avg: initialRating || 5,
        count: initialReviewCount || 0,
        breakdown: [0, 0, 0, 0, 0],
      };
    }

    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Number((sum / total).toFixed(1));

    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      counts[idx] += 1;
    });

    const breakdown = counts.map((c) => Math.round((c / total) * 100));

    return { avg, count: total, breakdown };
  }, [reviews, initialRating, initialReviewCount]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header with Title */}
      <div className="border-b border-nk-border pb-4">
        <h2 className="text-xl font-medium tracking-tight text-nk-text">
          Ulasan & Penilaian Penghuni
        </h2>
        <p className="text-xs text-nk-text-muted mt-0.5">
          Pengalaman nyata dari penyewa yang pernah tinggal di {propertyName}.
        </p>
      </div>

      {/* Rating Summary Card using Shadcn Card & Progress - strictly 0 border radius */}
      <Card
        style={{ borderRadius: 0 }}
        className="!rounded-none border-nk-border bg-nk-surface shadow-none [&_*]:!rounded-none"
      >
        <CardContent className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3">
          {/* Left: Score */}
          <div className="flex flex-col items-center justify-center border-b border-nk-border pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 text-center">
            <span className="text-4xl font-bold tracking-tight text-nk-text">
              {ratingSummary.avg.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-nk-text mt-1">
              Skor {ratingSummary.avg.toFixed(1)} / 5
            </span>
            <span className="text-xs text-nk-text-muted mt-0.5">
              Berdasarkan {ratingSummary.count} ulasan
            </span>
          </div>

          {/* Right: Breakdown Bars using Shadcn Progress - ordered 1, 2, 3, 4, 5 without stars or radius */}
          <div className="sm:col-span-2 space-y-2 flex flex-col justify-center">
            {[1, 2, 3, 4, 5].map((stars) => {
              const pct = ratingSummary.breakdown[stars - 1] || 0;
              return (
                <div key={stars} className="flex items-center gap-2.5 text-xs text-nk-text-muted">
                  <span className="w-4 shrink-0 text-right font-medium text-nk-text">{stars}</span>
                  <Progress
                    value={pct}
                    style={{ borderRadius: 0 }}
                    className="h-2 !rounded-none bg-nk-section [&>div]:bg-amber-400 [&>div]:!rounded-none [&_*]:!rounded-none"
                  />
                  <span className="w-8 text-right tabular-nums text-xs">{pct}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Review List using Shadcn Card, Avatar, and Empty - strictly 0 border radius */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-xs text-nk-text-muted">
            <Loader2 className="size-4 animate-spin mr-2" />
            <span>Memuat ulasan...</span>
          </div>
        ) : reviews.length === 0 ? (
          <Empty
            style={{ borderRadius: 0 }}
            className="!rounded-none border border-dashed border-nk-border bg-nk-surface/50 p-8 text-center [&_*]:!rounded-none"
          >
            <EmptyHeader>
              <EmptyTitle className="text-sm font-medium text-nk-text">Belum ada ulasan</EmptyTitle>
              <EmptyDescription className="text-xs text-nk-text-muted">
                Belum ada ulasan untuk kos ini.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          reviews.map((r) => (
            <Card
              key={r.id}
              style={{ borderRadius: 0 }}
              className="!rounded-none border-nk-border bg-nk-surface shadow-none [&_*]:!rounded-none"
            >
              <CardContent className="p-4 sm:p-5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      style={{ borderRadius: 0 }}
                      className="size-8 !rounded-none border border-nk-border [&_*]:!rounded-none"
                    >
                      <AvatarFallback
                        style={{ borderRadius: 0 }}
                        className="!rounded-none bg-nk-warm text-xs font-medium text-nk-accent"
                      >
                        {r.authorName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-nk-text">{r.authorName}</p>
                      <p className="text-[11px] text-nk-text-muted">
                        {new Date(r.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{ borderRadius: 0 }}
                    className="inline-flex items-center border border-nk-border bg-nk-section px-2 py-0.5 text-xs font-semibold text-nk-text !rounded-none"
                  >
                    {r.rating} / 5
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-nk-text pl-10">
                  {r.body}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

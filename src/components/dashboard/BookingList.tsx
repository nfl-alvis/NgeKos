"use client";

/* ===== daftar booking user - dipakai /bookings (standalone) & /dashboard/bookings =====
   Dialog & logika kartu dipindah dari halaman lama supaya kedua halaman identik
   (aturan konsistensi lintas halaman sejenis). */

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { bookings } from "@/lib/data/entities";
import type { Booking, BookingStatus } from "@/lib/data/types";
import { formatIDR } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ACTIVE: BookingStatus[] = ["pending", "approved-awaiting-payment", "active"];
const DONE: BookingStatus[] = ["rejected", "expired", "cancelled"];

function useCountdown(deadlineMin: number) {
  const [left, setLeft] = useState(deadlineMin * 60);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function BookingCard({
  booking,
  onDetail,
}: {
  booking: Booking;
  onDetail: (b: Booking) => void;
}) {
  const t = useTranslations("myBookings");
  const router = useRouter();
  const countdown = useCountdown(booking.status === "approved-awaiting-payment" ? 1472 : 1080);

  const statusEl = () => {
    switch (booking.status) {
      case "pending":
        return (
          <div className="flex flex-col items-end gap-1">
            <StatusBadge color="yellow">{t("statusPending")}</StatusBadge>
            <span className="text-xs text-nk-text-muted">
              {t("statusPendingNote", { time: "18 jam" })}
            </span>
          </div>
        );
      case "approved-awaiting-payment":
        return (
          <div className="flex flex-col items-end gap-1">
            <StatusBadge color="blue">{t("statusAwaitPay")}</StatusBadge>
            <span className="font-mono text-xs text-nk-text-muted">
              {t("statusAwaitPayNote", { time: countdown })}
            </span>
          </div>
        );
      case "active":
        return <StatusBadge color="green">{t("statusActive")}</StatusBadge>;
      case "rejected":
        return <StatusBadge color="red">{t("statusRejected")}</StatusBadge>;
      case "expired":
        return <StatusBadge color="red">{t("statusExpired")}</StatusBadge>;
      default:
        return <StatusBadge color="gray">{t("statusCancelled")}</StatusBadge>;
    }
  };

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-nk-border bg-nk-surface p-4 sm:flex-row sm:items-center">
      <img
        src={`https://picsum.photos/seed/${booking.propertySlug}/96/96`}
        alt={booking.propertyName}
        className="size-14 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-medium text-nk-text">{booking.propertyName}</h3>
        <p className="text-sm text-nk-text-muted">
          {booking.roomType} · Kamar {booking.roomNumber} · {formatIDR(booking.monthlyPrice)}/bln
        </p>
        {booking.statusNote && (
          <p className="mt-1 text-xs text-nk-text-muted">{booking.statusNote}</p>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        {statusEl()}
        {booking.status === "approved-awaiting-payment" ? (
          <button
            type="button"
            onClick={() => router.push(`/dashboard/bookings/${booking.id}/pay`)}
            className="rounded-lg bg-nk-accent px-4 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            {t("payNow")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDetail(booking)}
            className="rounded-lg border border-nk-border px-4 py-2 text-sm text-nk-text transition-colors hover:bg-nk-warm active:scale-[0.99]"
          >
            {t("viewDetail")}
          </button>
        )}
      </div>
    </article>
  );
}

function mapDbBooking(b: any): Booking {
  const statusMap: Record<string, BookingStatus> = {
    PENDING: "pending",
    APPROVED_AWAITING_PAYMENT: "approved-awaiting-payment",
    ACTIVE: "active",
    REJECTED: "rejected",
    EXPIRED: "expired",
    CANCELLED: "cancelled",
    COMPLETED: "active",
  };

  const timeline: { at: string; stage: "diajukan" | "disetujui" | "menunggu-bayar" | "lunas" }[] = [];
  if (b.createdAt) timeline.push({ at: b.createdAt, stage: "diajukan" });
  if (b.approvedAt) {
    timeline.push({ at: b.approvedAt, stage: "disetujui" });
    timeline.push({ at: b.approvedAt, stage: "menunggu-bayar" });
  }
  if (b.status === "ACTIVE" || b.status === "COMPLETED") {
    timeline.push({ at: b.updatedAt || b.createdAt, stage: "lunas" });
  }

  return {
    id: b.id,
    propertySlug: b.property?.slug || b.propertyId || "",
    propertyName: b.property?.name || "Kost",
    city: b.property?.city || "",
    roomType: b.roomType?.name || "Kamar",
    roomId: b.roomUnitId || b.roomTypeId || "",
    roomNumber: b.roomUnit?.number || "-",
    startDate: typeof b.startDate === "string" ? b.startDate.slice(0, 10) : new Date(b.startDate).toISOString().slice(0, 10),
    note: b.note || undefined,
    status: statusMap[b.status] || "pending",
    statusNote: b.statusNote || undefined,
    applicantName: b.applicant?.fullName || "Saya",
    applicantPhone: b.applicant?.phone || "-",
    applicantEmail: b.applicant?.email || "-",
    createdAt: b.createdAt,
    payDeadlineMin: 1440,
    usesDp: Boolean(b.depositSnapshot),
    monthlyPrice: b.monthlyPriceSnapshot || 0,
    timeline: timeline.length > 0 ? timeline : [{ at: b.createdAt, stage: "diajukan" }],
    payments: [],
  };
}

export default function BookingList() {
  const t = useTranslations("myBookings");
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "active" | "done">("all");
  const [detail, setDetail] = useState<Booking | null>(null);
  const [items, setItems] = useState<Booking[]>(bookings);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          setItems(json.data.map(mapDbBooking));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (tab === "active") return items.filter((b) => ACTIVE.includes(b.status));
    if (tab === "done") return items.filter((b) => DONE.includes(b.status));
    return items;
  }, [tab, items]);

  const tabs = [
    { id: "all" as const, label: t("tabAll") },
    { id: "active" as const, label: t("tabActive") },
    { id: "done" as const, label: t("tabDone") },
  ];

  const stages = ["diajukan", "disetujui", "menunggu-bayar", "lunas"] as const;
  const stageLabels = {
    diajukan: t("stageDiajukan"),
    disetujui: t("stageDisetujui"),
    "menunggu-bayar": t("stageMenungguBayar"),
    lunas: t("stageLunas"),
  };

  return (
    <>
      {/* tab filter */}
      <div className="mb-6 flex gap-1 rounded-lg border border-nk-border bg-nk-surface p-1 sm:w-fit">
        {tabs.map((tab2) => (
          <button
            key={tab2.id}
            type="button"
            onClick={() => setTab(tab2.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-4 py-2 text-sm transition-colors sm:flex-none ${
              tab === tab2.id
                ? "bg-nk-accent font-medium text-nk-text-inverse"
                : "text-nk-text-muted hover:text-nk-text"
            }`}
          >
            {tab2.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-nk-border px-6 py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-nk-text-muted" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
          </svg>
          <h2 className="text-lg font-medium text-nk-text">{t("emptyTitle")}</h2>
          <p className="mt-1 max-w-sm text-sm text-nk-text-muted">{t("emptyBody")}</p>
          <button
            type="button"
            onClick={() => router.push("/kost")}
            className="mt-6 rounded-lg bg-nk-accent px-6 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
          >
            {t("emptyCta")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} onDetail={setDetail} />
          ))}
        </div>
      )}

      {/* modal detail + timeline */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <h2 className="pr-8 text-lg font-medium text-nk-text">{t("detailTitle")}</h2>
              <p className="mt-1 font-mono text-xs text-nk-text-muted">{detail.id}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-nk-text-muted">{t("applicant")}</dt>
                <dd className="text-right font-medium text-nk-text">{detail.applicantName}</dd>
                <dt className="text-nk-text-muted">{t("room")}</dt>
                <dd className="text-right font-medium text-nk-text">{detail.roomNumber}</dd>
                <dt className="text-nk-text-muted">{t("startDate")}</dt>
                <dd className="text-right font-medium text-nk-text">{detail.startDate}</dd>
              </dl>
              <h3 className="mb-3 mt-6 text-sm font-medium text-nk-text">{t("timeline")}</h3>
              <ol className="flex flex-col gap-0">
                {stages.map((stage) => {
                  const hit = detail.timeline.find((tl) => tl.stage === stage);
                  return (
                    <li key={stage} className="flex items-center gap-3">
                      <span
                        className={`size-2 shrink-0 rounded-full ${hit ? "bg-nk-accent" : "bg-nk-border"}`}
                        aria-hidden="true"
                      />
                      <span className={hit ? "text-sm text-nk-text" : "text-sm text-nk-text-muted/50"}>
                        {stageLabels[stage]}
                        {hit && (
                          <span className="ml-2 text-xs text-nk-text-muted">
                            {new Date(hit.at).toLocaleString()}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** riwayat booking versi ringkas (halaman /dashboard - preview booking terbaru) */
export function BookingPreviewRow({ booking }: { booking: Booking }) {
  const t = useTranslations("myBookings");
  const locale = useLocale();
  return (
    <div className="flex items-center gap-3 border-b border-nk-border py-3 last:border-b-0">
      <img
        src={`https://picsum.photos/seed/${booking.propertySlug}/96/96`}
        alt=""
        className="size-10 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-nk-text">{booking.propertyName}</p>
        <p className="truncate text-xs text-nk-text-muted">
          {booking.roomType} · {booking.roomNumber} ·{" "}
          {new Date(`${booking.startDate}T00:00:00Z`).toLocaleDateString(
            locale === "id" ? "id-ID" : "en-GB",
            { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
          )}
        </p>
      </div>
      <Link
        href="/dashboard/bookings"
        className="shrink-0 text-xs font-medium text-nk-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
      >
        {t("viewDetail")}
      </Link>
    </div>
  );
}

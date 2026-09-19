"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ExternalLink, Hourglass } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import FacilityIcon from "@/components/FacilityIcon";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getPropertyBySlug } from "@/lib/data/properties";
import { FACILITY_META } from "@/lib/data/facilities";
import type { AdminReviewEntry } from "@/lib/data/types";
import { ageInDays, formatReviewDate } from "@/lib/adminReviewStore";
import { formatDistance, formatIDR } from "@/lib/utils";

const GENDER_KEYS = {
  mixed: "genderMixed",
  male: "genderMale",
  female: "genderFemale",
} as const;

/**
 * Modal detail verifikasi - dipakai halaman antrian (mode "review", lengkap
 * dengan aksi approve/reject + alasan wajib) dan riwayat (mode "detail",
 * baca-saja + hasil keputusan). Sumber data: entri antrian/riwayat +
 * snapshot properti asli (properties.ts) agar admin menilai dari data penuh.
 */
export default function VerificationDetailDialog({
  entry,
  mode,
  onOpenChange,
  onDecide,
}: {
  entry: AdminReviewEntry | null;
  mode: "review" | "detail";
  onOpenChange: (open: boolean) => void;
  onDecide?: (decision: "approved" | "rejected", reason?: string) => void;
}) {
  const t = useTranslations("admin.queue");
  const th = useTranslations("admin.history");
  const tl = useTranslations("list");
  const locale = useLocale();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState(false);

  const property = entry ? getPropertyBySlug(entry.propertySlug) : undefined;
  const waiting = entry ? ageInDays(entry.submittedAt) : 0;

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-lg overflow-y-auto max-h-[88vh]">
        {entry && (
          <>
            <div>
              <h2 className="pr-8 text-lg font-medium text-nk-text">
                {mode === "review" ? t("detailTitle") : th("detailTitle")}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-nk-text-muted">{entry.id}</p>
            </div>

            {/* snapshot properti: gambar + identitas */}
            <div className="flex items-start gap-4">
              <Image
                src={`https://picsum.photos/seed/${entry.propertySlug}/160/120`}
                alt={entry.propertyName}
                width={160}
                height={120}
                className="h-16 w-24 shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-nk-text">
                  {entry.propertyName}
                </p>
                <p className="truncate text-sm text-nk-text-muted">{entry.city}</p>
                {mode === "review" ? (
                  <p className="mt-1.5">
                    <StatusBadge color={waiting >= 5 ? "red" : "yellow"}>
                      <Hourglass className="mr-1 size-3" aria-hidden="true" />
                      {t("daysWaiting", { count: waiting })}
                    </StatusBadge>
                  </p>
                ) : (
                  entry.decision && (
                    <p className="mt-1.5">
                      <StatusBadge color={entry.decision === "approved" ? "green" : "red"}>
                        {entry.decision === "approved"
                          ? th("statusApproved")
                          : th("statusRejected")}
                      </StatusBadge>
                    </p>
                  )
                )}
              </div>
            </div>

            {/* data properti lengkap dari properties.ts */}
            {property && (
              <section className="rounded-lg border border-nk-border bg-nk-surface p-4">
                <h3 className="text-sm font-medium text-nk-text">{t("propertyData")}</h3>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-nk-text-muted">{t("address")}</dt>
                  <dd className="text-right text-nk-text">{property.address}</dd>
                  <dt className="text-nk-text-muted">{tl("gender")}</dt>
                  <dd className="text-right text-nk-text">{tl(GENDER_KEYS[property.gender])}</dd>
                  <dt className="text-nk-text-muted">{t("priceFrom")}</dt>
                  <dd className="text-right tabular-nums text-nk-text">
                    {formatIDR(property.minPrice)} · {t("perMonth")}
                  </dd>
                  <dt className="text-nk-text-muted">{t("toCampus")}</dt>
                  <dd className="text-right text-nk-text">
                    {formatDistance(property.distanceToCampusM)}
                  </dd>
                  <dt className="text-nk-text-muted">{t("roomTypes")}</dt>
                  <dd className="text-right text-nk-text">
                    {property.roomTypes
                      .map((r) => `${r.name} (${r.available}/${r.total})`)
                      .join(" · ")}
                  </dd>
                  <dt className="text-nk-text-muted">{t("deposit")}</dt>
                  <dd className="text-right text-nk-text">{property.depositInfo}</dd>
                </dl>
                <p className="mt-4 text-xs font-medium text-nk-text-muted">
                  {t("facilities")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {property.facilities.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 border border-nk-border px-2 py-1 text-xs text-nk-text"
                    >
                      <FacilityIcon facility={f} />
                      {locale === "id"
                        ? FACILITY_META[f]?.labelId
                        : FACILITY_META[f]?.labelEn}
                    </span>
                  ))}
                </div>
                {property.verified && (
                  <a
                    href={`/${locale}/kost/${property.slug}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-nk-accent underline underline-offset-4 hover:text-nk-accent-dark"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    {t("viewListing")}
                  </a>
                )}
              </section>
            )}

            {/* data owner */}
            <section>
              <h3 className="mb-2 text-sm font-medium text-nk-text">{t("ownerData")}</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-nk-text-muted">{t("colOwner")}</dt>
                <dd className="text-right font-medium text-nk-text">{entry.ownerName}</dd>
                <dt className="text-nk-text-muted">Email</dt>
                <dd className="truncate text-right text-nk-text">{entry.ownerEmail}</dd>
                <dt className="text-nk-text-muted">{t("ownerJoined")}</dt>
                <dd className="text-right text-nk-text">
                  {formatReviewDate(entry.ownerJoinedAt, locale)}
                </dd>
                <dt className="text-nk-text-muted">{t("colDate")}</dt>
                <dd className="text-right text-nk-text">
                  {formatReviewDate(entry.submittedAt, locale)}
                </dd>
              </dl>
            </section>

            {/* hasil keputusan (mode detail/riwayat) */}
            {mode === "detail" && entry.decidedAt && (
              <section className="rounded-lg border border-nk-border bg-nk-section p-4">
                <h3 className="text-sm font-medium text-nk-text">{t("decisionResult")}</h3>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-nk-text-muted">{th("colDecided")}</dt>
                  <dd className="text-right text-nk-text">
                    {formatReviewDate(entry.decidedAt, locale)}
                  </dd>
                  <dt className="text-nk-text-muted">{th("colBy")}</dt>
                  <dd className="text-right text-nk-text">{entry.decidedBy ?? "-"}</dd>
                  {entry.decision === "rejected" && entry.rejectionReason && (
                    <div className="col-span-2 mt-1 rounded-md border border-[#EBC4C0] bg-[#FAEAE8] p-3">
                      <p className="text-xs font-medium text-[#9C3B32]">
                        {th("rejectionReason")}
                      </p>
                      <p className="mt-1 text-sm text-nk-text">{entry.rejectionReason}</p>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* alur keputusan (mode review) */}
            {mode === "review" && !rejectOpen && !approveConfirm && (
              <div className="mt-2 flex gap-3">
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={() => setApproveConfirm(true)}
                >
                  {t("approve")}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setRejectOpen(true)}
                >
                  {t("reject")}
                </Button>
              </div>
            )}

            {mode === "review" && approveConfirm && (
              <div className="mt-2 rounded-lg border border-[#BFDCC5] bg-[#E9F4EC] p-4">
                <p className="text-sm font-medium text-[#2F6B3C]">{t("approveConfirmTitle")}</p>
                <p className="mt-1 text-xs text-[#2F6B3C]/80">{t("approveConfirmBody")}</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onDecide?.("approved")}
                  >
                    {t("approveConfirmCta")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setApproveConfirm(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            )}

            {mode === "review" && rejectOpen && (
              <div className="mt-2 rounded-lg border border-[#EBC4C0] bg-[#FAEAE8] p-4">
                <p className="text-sm font-medium text-[#9C3B32]">{t("rejectTitle")}</p>
                <label
                  htmlFor="admin-reject-reason"
                  className="mt-3 block text-xs font-medium text-[#9C3B32]"
                >
                  {t("rejectReason")}
                </label>
                <Textarea
                  id="admin-reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setReasonError(false);
                  }}
                  aria-invalid={reasonError || undefined}
                  className="mt-1.5 bg-nk-surface"
                />
                {reasonError && (
                  <p className="mt-1.5 text-xs font-medium text-[#9C3B32]" role="alert">
                    {t("rejectReasonRequired")}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="bg-[#9C3B32] text-white hover:opacity-90"
                    onClick={() => {
                      if (!rejectReason.trim()) {
                        setReasonError(true);
                        return;
                      }
                      onDecide?.("rejected", rejectReason.trim());
                    }}
                  >
                    {t("rejectConfirm")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectOpen(false);
                      setReasonError(false);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

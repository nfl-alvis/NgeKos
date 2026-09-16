"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tenants } from "@/lib/data/entities";
import { getPropertyBySlug } from "@/lib/data/properties";
import { tenantRoomInfo, type Complaint, type ComplaintCategory } from "@/lib/data/userData";
import { COMPLAINT_COLOR, addComplaint, useTenantComplaints } from "@/lib/tenantOpsStore";
import { cn } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";

const CATEGORIES: ComplaintCategory[] = [
  "fasilitas",
  "air",
  "listrik",
  "internet",
  "kebersihan",
  "keamanan",
  "pembayaran",
  "lainnya",
];

const FLOW = ["open", "acknowledged", "in_progress", "resolved", "closed"] as const;

const DEMO_TENANT = tenants.find((tn) => tn.id === "t-1")!;
const PROPERTY = getPropertyBySlug(DEMO_TENANT.propertySlug)!;
const DEMO_TODAY = new Date("2026-09-03");

/** Pengaduan penyewa — daftar + dialog buat baru + stepper status. */
export default function TenantComplaintsPage() {
  const t = useTranslations("tenantPages.complaints");
  const locale = useLocale();
  const items = useTenantComplaints();

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Complaint | null>(null);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<ComplaintCategory>("fasilitas");
  const [desc, setDesc] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const submit = () => {
    addComplaint({
      title: title.trim(),
      category: cat,
      room: tenantRoomInfo.roomNumber,
      reporter: DEMO_TENANT.name,
      propertySlug: PROPERTY.slug,
      propertyName: PROPERTY.name,
      at: DEMO_TODAY.toISOString().slice(0, 10),
    });
    setOpen(false);
    setTitle("");
    setDesc("");
    setCat("fasilitas");
    setToast(t("created"));
    window.setTimeout(() => setToast(null), 5000);
  };

  return (
    <UserDashboardShell
      role="tenant"
      title={t("title")}
      actions={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 bg-nk-accent px-4 py-2 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("create")}
        </button>
      }
    >
      <DashSection
        title={t("listTitle")}
        right={
          <span className="text-xs text-nk-text-muted tabular-nums">
            {t("count", { count: items.filter((c) => c.status !== "closed" && c.status !== "resolved").length })}
          </span>
        }
        bodyClass="divide-y divide-nk-border"
      >
        {items.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setDetail(c)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nk-accent"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-nk-text">{c.title}</p>
              <p className="truncate text-xs text-nk-text-muted">
                {t(`cat.${c.category}`)} · {t("room", { room: c.room })} · {c.id}
              </p>
            </div>
            <span className="hidden shrink-0 text-xs tabular-nums text-nk-text-muted sm:block">{fmt(c.at)}</span>
            <span className="w-28 shrink-0 text-right">
              <StatusBadge color={COMPLAINT_COLOR[c.status]}>{t(`status.${c.status}`)}</StatusBadge>
            </span>
          </button>
        ))}
      </DashSection>

      {/* dialog buat pengaduan */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <h2 className="pr-8 text-lg font-medium text-nk-text">{t("dialogTitle")}</h2>
          <p className="mt-1 text-sm text-nk-text-muted">{t("dialogSub", { property: PROPERTY.name })}</p>
          <div className="mt-5 flex flex-col gap-4">
            <div>
              <Label htmlFor="cp-title" className="text-sm text-nk-text">
                {t("fTitle")}
              </Label>
              <Input
                id="cp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("fTitlePlaceholder")}
                className="mt-1.5 h-11 md:h-9"
              />
            </div>
            <div>
              <Label className="text-sm text-nk-text">{t("fCategory")}</Label>
              <Select value={cat} onValueChange={(v) => setCat(v as ComplaintCategory)}>
                <SelectTrigger className="mt-1.5 h-11 w-full md:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`cat.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cp-desc" className="text-sm text-nk-text">
                {t("fDesc")}
              </Label>
              <Textarea
                id="cp-desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                placeholder={t("fDescPlaceholder")}
                className="mt-1.5"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={title.trim().length < 4 || desc.trim().length < 8}
            className="mt-6 w-full bg-nk-accent px-5 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("submit")}
          </button>
        </DialogContent>
      </Dialog>

      {/* detail + stepper alur status */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <h2 className="pr-8 text-lg font-medium text-nk-text">{detail.title}</h2>
              <p className="mt-1 font-mono text-xs text-nk-text-muted">{detail.id}</p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-nk-text-muted">{t("dProperty")}</dt>
                <dd className="text-right font-medium text-nk-text">{detail.propertyName}</dd>
                <dt className="text-nk-text-muted">{t("dRoom")}</dt>
                <dd className="text-right font-medium text-nk-text">{detail.room}</dd>
                <dt className="text-nk-text-muted">{t("dCategory")}</dt>
                <dd className="text-right font-medium text-nk-text">{t(`cat.${detail.category}`)}</dd>
                <dt className="text-nk-text-muted">{t("dCreated")}</dt>
                <dd className="text-right font-medium text-nk-text">{fmt(detail.at)}</dd>
                <dt className="text-nk-text-muted">{t("dUpdated")}</dt>
                <dd className="text-right font-medium text-nk-text">{fmt(detail.updatedAt)}</dd>
              </dl>
              <h3 className="mb-3 mt-6 text-sm font-medium text-nk-text">{t("dFlow")}</h3>
              <ol className="flex flex-col gap-0">
                {FLOW.map((stage) => {
                  const reached = FLOW.indexOf(detail.status) >= FLOW.indexOf(stage);
                  return (
                    <li key={stage} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          reached ? "bg-nk-accent" : "bg-nk-border"
                        )}
                        aria-hidden="true"
                      />
                      <span className={reached ? "text-sm text-nk-text" : "text-sm text-nk-text-muted/50"}>
                        {t(`status.${stage}`)}
                        {stage === detail.status && (
                          <StatusBadge color={COMPLAINT_COLOR[detail.status]} className="ml-2">
                            {t("dCurrent")}
                          </StatusBadge>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 rounded-lg border border-nk-border bg-nk-bg p-3">
                <p className="text-xs font-medium text-nk-text-muted">{t("dOwnerNote")}</p>
                <p className="mt-1 text-sm text-nk-text">
                  {locale === "id" ? detail.noteId : detail.noteEn}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-lg border border-nk-border bg-nk-surface px-4 py-2.5 text-sm text-nk-text shadow-lg"
        >
          {toast}
        </div>
      )}
    </UserDashboardShell>
  );
}

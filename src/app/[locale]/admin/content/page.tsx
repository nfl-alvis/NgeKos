"use client";

import { useLocale, useTranslations } from "next-intl";
import { Ban, CalendarDays, Eye, EyeOff, FileText, HelpCircle, Image as ImageIcon, MapPin } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminPageShell, { AdminSection } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatReviewDate } from "@/lib/adminReviewStore";
import {
  contentBanners,
  faqGroups,
  popularCities,
  policyDocs,
} from "@/lib/data/adminData";

/** Kelola banner, FAQ, kebijakan, dan kota populer. */
export default function AdminContentPage() {
  const t = useTranslations("admin.content");
  const locale = useLocale();
  const bannerColor: Record<string, "green" | "yellow" | "gray"> = {
    tayang: "green",
    jadwal: "yellow",
    habis: "gray",
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* banner */}
        <AdminSection title={t("bannerTitle")} bodyClass="overflow-hidden">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("bannerColTitle")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("bannerColPosition")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("bannerColPeriod")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contentBanners.map((b) => (
                <TableRow key={b.id} className="border-b border-nk-border last:border-b-0">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <ImageIcon className="mt-0.5 size-4 shrink-0 text-nk-text-muted" aria-hidden="true" />
                      <p className="min-w-0 text-nk-text">{locale === "id" ? b.titleId : b.titleEn}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-nk-text-muted">{b.position === "hero" ? t("posHero") : t("posList")}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-xs text-nk-text-muted tabular-nums">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {formatReviewDate(b.from, locale)} – {formatReviewDate(b.to, locale)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge color={bannerColor[b.status]}>{t(`st${b.status.charAt(0).toUpperCase()}${b.status.slice(1)}`)}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminSection>

        {/* kota populer */}
        <AdminSection title={t("cityTitle")} bodyClass="overflow-hidden">
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="border-b border-nk-border text-left text-xs text-nk-text-muted">
                <TableHead className="px-4 py-3 font-medium">{t("cityColName")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("cityColProperties")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("cityColSeekers")}</TableHead>
                <TableHead className="px-4 py-3 font-medium">{t("colStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popularCities.map((c) => (
                <TableRow key={c.name} className="border-b border-nk-border last:border-b-0">
                  <TableCell className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-nk-text">
                      <MapPin className="size-3.5 text-nk-text-muted" aria-hidden="true" />
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 tabular-nums text-nk-text">{c.propertyCount}</TableCell>
                  <TableCell className="px-4 py-3 tabular-nums text-nk-text">{c.seekerCount.toLocaleString(locale === "id" ? "id-ID" : "en-GB")}</TableCell>
                  <TableCell className="px-4 py-3">
                    {c.status === "tayang" ? (
                      <StatusBadge color="green"><span className="flex items-center gap-1"><Eye className="size-3" aria-hidden="true" />{t("cityShown")}</span></StatusBadge>
                    ) : (
                      <StatusBadge color="gray"><span className="flex items-center gap-1"><EyeOff className="size-3" aria-hidden="true" />{t("cityHidden")}</span></StatusBadge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminSection>

        {/* FAQ */}
        <AdminSection title={t("faqTitle")} bodyClass="p-0">
          {faqGroups.map((g, i) => (
            <div
              key={g.key}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i < faqGroups.length - 1 ? "border-b border-nk-border" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="size-4 shrink-0 text-nk-text-muted" aria-hidden="true" />
                <p className="text-sm font-medium text-nk-text">{t(`faqGroup.${g.key}`)}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-nk-text-muted tabular-nums">
                <span>{t("faqCount", { count: g.itemCount })}</span>
                <span>{formatReviewDate(g.updatedAt, locale)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-nk-border p-4">
            <Link
              href="/faq"
              className="inline-flex h-11 items-center rounded-md border border-nk-border px-4 text-sm text-nk-text transition-colors hover:bg-nk-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent md:h-9"
            >
              {t("faqOpen")}
            </Link>
          </div>
        </AdminSection>

        {/* kebijakan */}
        <AdminSection title={t("policyTitle")} bodyClass="p-0">
          {policyDocs.map((d, i) => (
            <div
              key={d.slug}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i < policyDocs.length - 1 ? "border-b border-nk-border" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-nk-text-muted" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-nk-text">{t(`policyName.${d.slug}`)}</p>
                  <p className="font-mono text-[10px] text-nk-text-muted">{d.version} · {formatReviewDate(d.updatedAt, locale)}</p>
                </div>
              </div>
              {d.status === "tayang" ? (
                <StatusBadge color="green">{t("stTayang")}</StatusBadge>
              ) : (
                <StatusBadge color="yellow">{t("stDraft")}</StatusBadge>
              )}
            </div>
          ))}
          <div className="border-t border-nk-border p-4">
            <p className="flex items-center gap-2 text-xs text-nk-text-muted">
              <Ban className="size-3.5" aria-hidden="true" />
              {t("policyHint")}
            </p>
          </div>
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}

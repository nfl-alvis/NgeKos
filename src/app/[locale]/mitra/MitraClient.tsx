"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Step = { title: string; body: string };

export default function MitraClient({ steps, why }: { steps: Step[]; why: Step[] }) {
  const t = useTranslations("mitra");

  const stats = [
    { label: t("statsListing"), value: t("statsListingValue") },
    { label: t("statsVerify"), value: t("statsVerifyValue") },
    { label: t("statsPayout"), value: t("statsPayoutValue") },
  ];

  return (
    <div>
      {/* hero split — konten kiri, mock dashboard kanan */}
      <section className="border-b border-nk-border bg-nk-warm">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
          <div>
            <Badge variant="secondary" className="mb-5">{t("badge")}</Badge>
            <h1 className="text-4xl font-light leading-[1.08] tracking-tight text-nk-text lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-[58ch] text-base leading-relaxed text-nk-text-muted">
              {t("subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/register/owner">{t("cta")}</Button>
              <Button href="/owner" variant="outline">{t("ctaSecondary")}</Button>
            </div>
          </div>

          {/* mock stat strip: angka monospace, tanpa kartu bertumpuk */}
          <div className="grid gap-px overflow-hidden rounded-lg border border-nk-border bg-nk-border sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-nk-surface p-6">
                <p className="font-mono text-2xl font-semibold tracking-tight text-nk-text">
                  {s.value}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-nk-text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cara kerja: 3 langkah timeline horizontal */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-20" aria-label={t("steps")}>
        <h2 className="text-2xl font-light tracking-tight text-nk-text lg:text-3xl">{t("steps")}</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={i} className="border-t-2 border-nk-accent pt-5">
              <span className="font-mono text-sm text-nk-accent">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-medium tracking-tight text-nk-text">{s.title}</h3>
              <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-nk-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* kenapa ngekost: zig-zag 2 kolom (bukan 3 kartu) */}
      <section className="border-t border-nk-border bg-nk-warm">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
          <h2 className="text-2xl font-light tracking-tight text-nk-text lg:text-3xl">{t("why")}</h2>
          <div className="mt-10 grid gap-x-16 gap-y-10 sm:grid-cols-2">
            {why.map((w, i) => (
              <div key={i} className={i % 2 === 1 ? "sm:mt-12" : ""}>
                <h3 className="text-lg font-medium tracking-tight text-nk-text">{w.title}</h3>
                <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-nk-text-muted">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA penutup */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-col items-start gap-5 rounded-lg border border-nk-border bg-nk-surface p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
          <div>
            <h2 className="text-2xl font-light tracking-tight text-nk-text">{t("title")}</h2>
            <p className="mt-1.5 text-sm text-nk-text-muted">
              {t("statsListing")}: <span className="font-mono">{t("statsListingValue")}</span>
            </p>
          </div>
          <Button href="/register/owner" size="lg">{t("cta")}</Button>
        </div>
      </section>
    </div>
  );
}

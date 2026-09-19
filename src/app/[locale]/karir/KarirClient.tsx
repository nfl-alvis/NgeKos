"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Opening = { title: string; type: string; location: string; team: string };

const EMAIL = "halo@ngekost.id";

export default function KarirClient({
  openings,
  steps,
}: {
  openings: Opening[];
  steps: string[];
}) {
  const t = useTranslations("karir");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-10 lg:py-20">
      {/* split header: kiri judul, kanan deskripsi - bukan centered */}
      <header className="mb-14 grid gap-8 lg:grid-cols-2 lg:gap-16">
        <h1 className="text-4xl font-light leading-[1.05] tracking-tight text-nk-text lg:text-6xl">
          {t("title")}
        </h1>
        <p className="max-w-[60ch] self-end text-base leading-relaxed text-nk-text-muted">
          {t("subtitle")}
        </p>
      </header>

      {/* lowongan: daftar divide-y tanpa kartu */}
      <section aria-label={t("openings")}>
        <h2 className="text-sm font-medium uppercase-none tracking-wide text-nk-text-muted">
          {t("openings")}
        </h2>
        <ul className="mt-4 divide-y divide-nk-border border-y border-nk-border">
          {openings.map((o) => (
            <li key={o.title} className="group">
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(`[Lamaran] ${o.title}`)}`}
                className="flex flex-col gap-2 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-medium tracking-tight text-nk-text transition-colors group-hover:text-nk-accent">
                    {o.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-nk-text-muted">
                    {o.team} · {o.location}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:shrink-0">
                  <Badge variant="outline">{o.type}</Badge>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-nk-text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-nk-accent"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14m-6-6 6 6-6 6" />
                  </svg>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* proses rekrutmen: timeline nomor */}
      <section className="mt-16" aria-label={t("process")}>
        <h2 className="text-sm font-medium tracking-wide text-nk-text-muted">{t("process")}</h2>
        <ol className="mt-6 grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-4 sm:flex-col sm:gap-3">
              <span className="font-mono text-sm text-nk-accent">0{i + 1}</span>
              <p className="max-w-[38ch] text-sm leading-relaxed text-nk-text">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <Separator className="my-14" />

      {/* CTA kirim CV */}
      <section className="flex flex-col items-start gap-4">
        <p className="max-w-[55ch] text-base text-nk-text">{t("noMatch")}</p>
        <a
          href={`mailto:${EMAIL}?subject=${encodeURIComponent("[Lamaran] Umum")}`}
          className="text-sm font-medium text-nk-accent underline underline-offset-4 transition-opacity hover:opacity-80"
        >
          {t("sendCv")} {EMAIL}
        </a>
      </section>
    </div>
  );
}

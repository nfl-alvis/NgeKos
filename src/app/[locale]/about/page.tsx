import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "About NgeKost" : "Tentang NgeKost",
    description:
      locale === "en"
        ? "NgeKost is Indonesia's trusted platform for verified boarding houses with transparent pricing and real owner verification."
        : "NgeKost adalah platform terpercaya untuk kost terverifikasi di Indonesia dengan harga transparan dan verifikasi pemilik resmi.",
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const values = t.raw("values") as { title: string; body: string }[];
  const process = t.raw("process") as { title: string; body: string }[];

  const en = locale === "en";

  const stats = [
    { value: "120+", label: en ? "verified kosts" : "kost terverifikasi" },
    { value: "6", label: en ? "cities" : "kota" },
    { value: "8.4rb", label: en ? "active renters" : "penyewa aktif" },
  ];

  const cities = ["Jakarta", "Bandung", "Yogyakarta", "Malang", "Surabaya", "Semarang"];

  return (
    <div className="bg-nk-bg">
      {/* ===== Hero — full-bleed photo, editorial layout ===== */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] items-end overflow-hidden">
        <Image
          src="/images/about-hero-wide.jpg"
          alt={t("imageAlt")}
          fill
          sizes="100vw"
          className="absolute inset-0 -z-10 object-cover"
          priority
        />

        {/* cream veil, heavier at the bottom where the copy sits */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F7] via-[#FAF9F7]/60 to-[#FAF9F7]/30" />

        <div className="mx-auto w-full max-w-7xl px-6 pb-20 pt-32 lg:px-10 lg:pb-28">
          <p className="flex items-center gap-2.5 text-sm font-medium tracking-[0.08em] text-nk-accent">
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full bg-nk-accent"
            />
            {t("eyebrow")}
          </p>

          <h1 className="mt-5 max-w-3xl text-5xl leading-[1.03] font-semibold tracking-tighter text-balance text-nk-text md:text-[4.25rem] lg:text-[4.75rem]">
            {t("title")}
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-nk-text-muted md:text-xl">
            {t("subtitle")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button size="lg" href="/kost" className="group">
              {t("ctaButton")}
              <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline" href="/mitra">
              {t("heroSecondary")}
            </Button>
          </div>
        </div>
      </section>

      {/* ===== Mission + Values — sticky title, hairline editorial list ===== */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-16">
          <div className="self-start lg:sticky lg:top-24 lg:col-span-5">
            <p className="flex items-center gap-2.5 text-sm font-medium tracking-[0.08em] text-nk-accent">
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-nk-accent"
              />
              {t("missionLabel")}
            </p>
            <h2 className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-nk-text md:text-5xl">
              {t("missionTitle")}
            </h2>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-pretty text-nk-text-muted">
              {t("missionBody")}
            </p>
          </div>

          <div className="lg:col-span-7">
            <h3 className="mb-10 text-3xl font-semibold tracking-tight text-nk-text">
              {t("valuesTitle")}
            </h3>

            <ol className="border-t border-nk-border">
              {values.map((v, i) => (
                <li
                  key={v.title}
                  className="group border-b border-nk-border border-l-2 border-l-transparent transition-[border-color,background-color] duration-200 hover:border-l-nk-accent hover:bg-nk-warm/60"
                >
                  <div className="flex items-start gap-6 px-2 py-8 lg:px-5">
                    <span className="mt-1.5 text-sm font-medium text-nk-accent tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h4 className="text-xl font-medium tracking-tight text-nk-text lg:text-2xl">
                        {v.title}
                      </h4>
                      <p className="mt-3 max-w-xl leading-relaxed text-pretty text-nk-text-muted">
                        {v.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ===== Verification process — numbered timeline with rail ===== */}
      <section className="bg-nk-warm">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
          <p className="flex items-center gap-2.5 text-sm font-medium tracking-[0.08em] text-nk-accent">
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full bg-nk-accent"
            />
            {t("processLabel")}
          </p>

          <h2 className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-nk-text md:text-5xl">
            {t("processTitle")}
          </h2>

          <ol className="mt-20 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <li key={p.title} className="relative flex flex-col">
                {/* connector rail, desktop only */}
                {i < process.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-3.5 left-8 hidden h-px w-[calc(100%-2rem)] bg-nk-border lg:block"
                  />
                )}
                <span className="relative z-10 flex size-7 items-center justify-center rounded-full bg-nk-accent text-xs font-medium text-nk-text-inverse tabular-nums">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-xl font-medium tracking-tight text-nk-text">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-[38ch] leading-relaxed text-pretty text-nk-text-muted">
                  {p.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== Closing CTA — photo panel in brand brown + stats ledger ===== */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-foreground/10">
          <Image
            src="/images/about-hero.jpg"
            alt={t("imageAlt")}
            fill
            sizes="(min-width: 1024px) 1240px, 100vw"
            className="absolute inset-0 -z-10 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-nk-accent/85 via-nk-accent/78 to-nk-accent-dark/92" />

          <div className="relative px-6 py-16 text-nk-text-inverse md:px-12 md:py-20">
            <p className="flex items-center gap-2.5 text-sm font-medium tracking-[0.08em] text-white/85">
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-white/85"
              />
              {t("statsLabel")}
            </p>

            <div className="mt-10 grid gap-14 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-7">
                <h2 className="max-w-xl text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
                  {t("ctaTitle")}
                </h2>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-pretty text-white/90">
                  {t("ctaBody")}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button size="lg" variant="light" href="/kost">
                    {t("ctaButton")}
                  </Button>
                  <Link
                    href="/kost"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {en ? "See all cities" : "Lihat semua kota"}
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>

                <nav aria-label={t("ctaCities")} className="mt-10">
                  <ul className="flex flex-wrap gap-2">
                    {cities.map((c) => (
                      <li key={c}>
                        <Link
                          href={`/kost?kota=${c}`}
                          className="inline-flex rounded-lg border border-white/20 px-3.5 py-1.5 text-sm text-white/90 transition-colors duration-200 hover:border-white/60 hover:bg-white/15 hover:text-white"
                        >
                          {c}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>

              <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-white/25 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">
                {stats.map((s) => (
                  <div key={s.label} className="bg-nk-accent/85 px-5 py-5">
                    <dd className="text-3xl font-medium tracking-tight tabular-nums">
                      {s.value}
                    </dd>
                    <dt className="mt-1 text-sm text-white/85">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

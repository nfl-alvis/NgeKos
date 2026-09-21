import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title"), description: t("subtitle") };
}

/* ---- Mamikos-style art, re-inked to the NgeKost palette ---- */

function CurveHero({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-x-clip bg-nk-accent">
      {/* green-curve.svg equivalent: bottom wave, cream */}
      <svg
        aria-hidden
        viewBox="0 0 1366 647"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 -bottom-px -z-10 h-[38%] w-full"
      >
        <path
          d="M0 0h1366v530.677C838.24 684.783 537.15 686.763 0 530.677z"
          fill="#FDFCF9"
        />
      </svg>
      {/* bg-silhouete-building.svg equivalent: skyline peeking from the fold */}
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-[37.5%] -z-10 hidden h-[120px] opacity-[0.16] md:block"
      >
        <path
          fill="#FDFCF9"
          d="M0 120V70h26v50zm30 0V44h8v76zm12 0V58h30v62zm36 0V26h3v94zm8 0V50h22v70zm26 0V14h5v106zm11 0V42h26v78zm30 0V24h5v96zm11 0V56h22v64zm26 0V4h3v116zm8 0V38h22v82zm26 0V58h26v62zm30 0V18h6v102zm14 0V66h26v54zm30 0V32h4v88zm10 0V52h22v68zm26 0V12h6v108zm14 0V62h26v58zm30 0V28h4v92zm10 0V48h22v72zm26 0V8h5v112zm13 0V60h26v60zm30 0V22h5v98zm15 0V50h22v70zm26 0V6h3v114zm8 0V40h22v80zm26 0V56h26v64zm30 0V18h5v102zm15 0V64h26v56zm30 0V34h4v86zm10 0V48h22v72zm26 0V10h6v110zm14 0V58h26v62zm30 0V24h5v96zm15 0V44h22v76zm26 0V2h3v118zm8 0V38h22v82zm26 0V56h26v64zm30 0V16h5v104zm15 0V62h26v58zm30 0V30h4v90zm10 0V50h22v70zm26 0V10h6v110zm14 0V60h26v60zm30 0V24h5v96zm15 0V46h22v74zm26 0V4h4v116zm9 0V40h22v80zm26 0V56h26v64zm30 0V18h5v102zm15 0V64h26v56zm30 0V34h4v86zm10 0V50h22v70zm26 0V10h6v110zm14 0V60h26v60zm30 0V26h5v94zm15 0V46h22v74zm26 0V4h3v116zm8 0V40h22v80zm26 0V56h26v64zm30 0V18h5v102zm15 0V62h26v58zm30 0V30h4v90zm10 0V50h22v70zm26 0V10h6v110zm14 0V60h26v60zm30 0V24h5v96zm15 0V46h22v74zm26 0V2h4v118zm9 0V40h22v80zm26 0V58h26v62z"
        />
      </svg>
      {children}
    </section>
  );
}

function PhoneMock({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 500"
      className={className}
      role="img"
      aria-label="Aplikasi NgeKost di ponsel"
    >
      <rect x="10" y="10" width="260" height="480" rx="40" fill="#FDFCF9" />
      <rect
        x="10"
        y="10"
        width="260"
        height="480"
        rx="40"
        fill="none"
        stroke="#E5E4DE"
        strokeWidth="2"
      />
      <rect x="104" y="26" width="72" height="10" rx="5" fill="#E5E4DE" />
      <rect x="26" y="56" width="228" height="42" rx="10" fill="#F4F3EF" />
      <circle cx="44" cy="77" r="7" fill="none" stroke="#3A2618" strokeWidth="2" />
      <line x1="49" y1="82" x2="54" y2="87" stroke="#3A2618" strokeWidth="2" strokeLinecap="round" />
      <rect x="64" y="72" width="92" height="10" rx="5" fill="#DDD9D0" />
      <rect x="26" y="112" width="109" height="118" rx="12" fill="#F4F3EF" />
      <rect x="145" y="112" width="109" height="118" rx="12" fill="#F4F3EF" />
      <rect x="36" y="124" width="89" height="58" rx="8" fill="#3A2618" />
      <rect x="155" y="124" width="89" height="58" rx="8" fill="#8A6A1F" />
      <rect x="36" y="192" width="60" height="8" rx="4" fill="#3A2618" />
      <rect x="36" y="206" width="44" height="7" rx="3.5" fill="#B8B0A3" />
      <rect x="155" y="192" width="60" height="8" rx="4" fill="#3A2618" />
      <rect x="155" y="206" width="44" height="7" rx="3.5" fill="#B8B0A3" />
      <rect x="26" y="244" width="228" height="88" rx="12" fill="#F4F3EF" />
      <rect x="38" y="258" width="58" height="60" rx="8" fill="#2F6B3C" />
      <rect x="108" y="258" width="110" height="9" rx="4.5" fill="#3A2618" />
      <rect x="108" y="274" width="72" height="8" rx="4" fill="#B8B0A3" />
      <rect x="108" y="290" width="92" height="8" rx="4" fill="#DDD9D0" />
      <rect x="108" y="306" width="48" height="10" rx="5" fill="#3A2618" />
      <rect x="26" y="346" width="228" height="88" rx="12" fill="#F4F3EF" />
      <rect x="38" y="360" width="58" height="60" rx="8" fill="#33517C" />
      <rect x="108" y="360" width="110" height="9" rx="4.5" fill="#3A2618" />
      <rect x="108" y="376" width="72" height="8" rx="4" fill="#B8B0A3" />
      <rect x="108" y="392" width="92" height="8" rx="4" fill="#DDD9D0" />
      <rect x="108" y="408" width="48" height="10" rx="5" fill="#3A2618" />
      <rect x="120" y="452" width="40" height="5" rx="2.5" fill="#E5E4DE" />
    </svg>
  );
}

/* feature glyphs - stroke 1.6, currentColor (konvensi ikon proyek) */
function IconList() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth="2.4" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 14a4.5 4.5 0 0 0 6.8.5l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" />
      <path d="M14 10a4.5 4.5 0 0 0-6.8-.5l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-6.5-5.4-6.5-10.5A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.5C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.2" r="2.3" />
    </svg>
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  const features = [
    { icon: <IconList />, title: t("f1Title"), body: t("f1Body") },
    { icon: <IconLink />, title: t("f2Title"), body: t("f2Body") },
    { icon: <IconMap />, title: t("f3Title"), body: t("f3Body") },
  ];

  return (
    <>
      {/* ===== HERO - full-bleed ink, curve fold, phone overlapping into next section ===== */}
      <CurveHero>
        <div className="mx-auto flex min-h-[560px] w-full max-w-6xl flex-col items-center gap-10 px-6 pt-32 pb-36 md:min-h-[85vh] md:flex-row md:justify-between md:pt-40 md:pb-32 lg:gap-16">
          <div className="max-w-xl text-center md:text-left">
            <h1 className="text-4xl leading-[1.25] font-bold tracking-tight text-balance text-nk-text-inverse md:text-5xl">
              {t("heroLine1")}
              <br className="hidden md:block" />{" "}
              {t("heroLine2")}
            </h1>
            <p className="mx-auto mt-6 max-w-md text-base leading-[2] text-nk-text-inverse/75 md:mx-0 md:text-lg">
              {t("subtitle")}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 md:justify-start">
              <Link
                href="/kost"
                className="inline-flex h-12 items-center rounded-lg bg-nk-text-inverse px-7 text-sm font-semibold text-nk-accent transition-colors duration-200 hover:bg-[#FFFFFF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-text-inverse active:translate-y-px"
              >
                {t("ctaButton")}
              </Link>
              <Link
                href="/mitra"
                className="inline-flex h-12 items-center rounded-lg border border-nk-text-inverse/30 px-7 text-sm font-semibold text-nk-text-inverse transition-colors duration-200 hover:border-nk-text-inverse/60 hover:bg-nk-text-inverse/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-text-inverse active:translate-y-px"
              >
                {t("heroSecondary")}
              </Link>
            </div>
          </div>
          <div className="relative z-10 shrink-0 translate-y-[22%] md:translate-y-[38%]">
            <PhoneMock className="w-[240px] drop-shadow-[0_24px_48px_rgba(10,7,4,0.5)] md:w-[300px]" />
          </div>
        </div>
      </CurveHero>

      {/* ===== FEATURES - Mamikos pull: overlap -10rem, glyph + title + body, centered stack ===== */}
      <section className="bg-nk-bg">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-x-14 gap-y-16 pt-40 pb-24 md:grid-cols-3 md:gap-y-10 md:pt-32">
            {features.map((f, i) => (
              <article key={f.title} className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-nk-accent-subtle text-nk-accent ring-1 ring-nk-border">
                  {f.icon}
                </span>
                <h2 className="mt-5 text-lg font-semibold tracking-tight [font-variant-numeric:tabular-nums]">
                  {String(i + 1).padStart(2, "0")}
                  <span className="mx-2 text-nk-border">·</span>
                  {f.title}
                </h2>
                <p className="mt-3 max-w-xs text-[15px] leading-[1.9] text-nk-text-muted">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ZIGZAG - image + copy pairs, reverse order per row (Mamikos about-us-info) ===== */}
      <section className="border-t border-nk-border bg-nk-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-24 md:gap-28">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div className="md:order-2">
              <Image
                src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=920&q=80"
                alt={t("z1Alt")}
                width={920}
                height={640}
                className="aspect-[23/16] w-full rounded-2xl object-cover ring-1 ring-nk-border"
                sizes="(min-width: 768px) 440px, 100vw"
              />
            </div>
            <div className="md:order-1">
              <h2 className="text-2xl leading-[1.4] font-bold tracking-tight text-balance md:text-[28px]">
                {t("z1Title")}
              </h2>
              <p className="mt-4 max-w-[38rem] text-base leading-[2] text-nk-text-muted">
                {t("z1Body")}
              </p>
            </div>
          </div>

          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <Image
                src="https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=920&q=80"
                alt={t("z2Alt")}
                width={920}
                height={640}
                className="aspect-[23/16] w-full rounded-2xl object-cover ring-1 ring-nk-border"
                sizes="(min-width: 768px) 440px, 100vw"
              />
            </div>
            <div>
              <h2 className="text-2xl leading-[1.4] font-bold tracking-tight text-balance md:text-[28px]">
                {t("z2Title")}
              </h2>
              <p className="mt-4 max-w-[38rem] text-base leading-[2] text-nk-text-muted">
                {t("z2Body")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA band (in-house, sits before the curved footer) ===== */}
      <section className="border-t border-nk-border bg-nk-bg">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-20 text-center">
          <h2 className="max-w-2xl text-3xl leading-tight font-bold tracking-tight text-balance md:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="max-w-xl text-lg leading-[1.9] text-pretty text-nk-text-muted">
            {t("ctaBody")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/kost"
              className="inline-flex h-12 items-center rounded-lg bg-nk-accent px-7 text-sm font-semibold text-nk-text-inverse transition-all duration-200 hover:bg-nk-accent-dark hover:shadow-lg hover:shadow-nk-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent active:translate-y-px"
            >
              {t("ctaButton")}
            </Link>
            <nav aria-label={t("ctaCities")}>
              <ul className="flex flex-wrap items-center justify-center gap-2">
                {(["Jakarta", "Bandung", "Yogyakarta", "Malang", "Surabaya", "Semarang"] as const).map((city) => (
                  <li key={city}>
                    <Link
                      href={{ pathname: "/kost", query: { kota: city } }}
                      className="inline-flex h-9 items-center rounded-lg border border-nk-border bg-nk-surface px-3.5 text-sm text-nk-text-muted transition-colors duration-200 hover:border-nk-accent/40 hover:text-nk-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                    >
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>
    </>
  );
}

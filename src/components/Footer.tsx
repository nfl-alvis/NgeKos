import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";

export default function Footer() {
  const t = useTranslations("footer");

  const exploreLinks = [
    { href: "/kost", label: t("exploreAll") },
    { href: "/kost?kota=Jakarta", label: t("jakarta") },
    { href: "/kost?kota=Bandung", label: t("bandung") },
    { href: "/kost?kota=Yogyakarta", label: t("yogyakarta") },
    { href: "/kost?kota=Malang", label: t("malang") },
  ];

  const companyLinks: { href: string; label: string }[] = [
    { href: "/about", label: t("about") },
    { href: "/blog", label: t("blog") },
    { href: "/karir", label: t("jobs") },
    { href: "/mitra", label: t("partners") },
  ];

  const supportLinks = [
    { href: "/bantuan", label: t("help") },
    { href: "/faq", label: t("faq") },
    { href: "/legal/syarat-ketentuan", label: t("terms") },
    { href: "/legal/privasi", label: t("privacy") },
  ];

  return (
    <footer className="bg-nk-dark text-nk-text-inverse">
      {/* Top strip */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-end md:justify-between lg:px-10">
          <div>
            <Logo className="mb-4 h-8 w-auto" variant="white" />
            <p className="max-w-md text-sm font-light leading-relaxed text-nk-dark-border">
              {t("tagline")}
            </p>
          </div>
          <p className="text-xs text-nk-dark-border">
            {t("verifiedBadge")}
          </p>
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <p className="mb-2 text-xs font-semibold text-nk-dark-border">
              {t("explore")}
            </p>
            {exploreLinks.map((l) => (
              <Link
                key={l.label + l.href}
                href={l.href as `${string}/${string}`}
                className="text-sm font-light text-nk-text-inverse transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <p className="mb-2 text-xs font-semibold text-nk-dark-border">
              {t("company")}
            </p>
            {companyLinks.map((l) =>
              l.href.startsWith("/") ? (
                <Link
                  key={l.label}
                  href={l.href as `/${string}`}
                  className="text-sm font-light text-nk-text-inverse transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm font-light text-nk-text-inverse transition-colors hover:text-white"
                >
                  {l.label}
                </a>
              )
            )}
          </div>

          <div className="flex flex-col gap-4">
            <p className="mb-2 text-xs font-semibold text-nk-dark-border">
              {t("support")}
            </p>
            {supportLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-light text-nk-text-inverse transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <p className="mb-2 text-xs font-semibold text-nk-dark-border">
              {t("contact")}
            </p>
            <a href="tel:+6281122334455" className="text-sm font-light text-nk-text-inverse transition-colors hover:text-white">
              +62 811 2233 4455
            </a>
            <a href="mailto:halo@ngekost.id" className="text-sm font-light text-nk-text-inverse transition-colors hover:text-white">
              halo@ngekost.id
            </a>
            <span className="text-sm font-light text-nk-dark-border">
              6 Kota di Indonesia
            </span>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t border-white/10 pt-8 text-xs font-light text-nk-dark-border md:flex-row">
          <span>© 2026 NgeKost. {t("rights")}</span>
          <div className="mt-4 flex items-center gap-4 md:mt-0">
            <a href="https://icons8.com/license" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">{t("iconsCredit")}</a>
            <span>·</span>
            <Link href="/legal/privasi" className="transition-colors hover:text-white">{t("privacy")}</Link>
            <span>·</span>
            <Link href="/legal/syarat-ketentuan" className="transition-colors hover:text-white">{t("terms")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
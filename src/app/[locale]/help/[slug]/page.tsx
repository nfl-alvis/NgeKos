import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ChevronRight, HelpCircle, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { slugify } from "@/lib/utils";
import HelpArticleFeedback from "./HelpArticleFeedback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const readable = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    title: `${readable} - Pusat Bantuan Ngekost`,
    description: `Panduan lengkap mengenai ${readable} di aplikasi Ngekost.`,
  };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "bantuan" });
  const cats = t.raw("cats") as Record<string, string>;
  const topics = t.raw("topics") as Record<string, string[]>;

  // Find matching category & exact topic title
  let foundCategory = "booking";
  let matchedTitle = "";

  for (const [cat, items] of Object.entries(topics)) {
    for (const item of items) {
      if (slugify(item) === slug) {
        foundCategory = cat;
        matchedTitle = item;
        break;
      }
    }
    if (matchedTitle) break;
  }

  if (!matchedTitle) {
    matchedTitle = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const categoryName = cats[foundCategory] || "Umum";
  const relatedTopics = (topics[foundCategory] || []).filter((item) => slugify(item) !== slug).slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-10 lg:py-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-nk-text-muted">
        <Link href="/help" className="hover:text-nk-text">
          {t("title")}
        </Link>
        <ChevronRight className="size-3 text-nk-border" />
        <span>{categoryName}</span>
        <ChevronRight className="size-3 text-nk-border" />
        <span className="truncate max-w-[200px] text-nk-text font-medium">{matchedTitle}</span>
      </nav>

      <Link
        href="/help"
        className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-nk-text-muted hover:text-nk-text transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Kembali ke Pusat Bantuan
      </Link>

      <header className="mb-8">
        <span className="inline-block rounded-full bg-nk-warm px-3 py-1 text-xs font-medium text-nk-accent mb-3">
          {categoryName}
        </span>
        <h1 className="text-3xl font-medium tracking-tight text-nk-text lg:text-4xl">{matchedTitle}</h1>
        <p className="mt-2 text-xs text-nk-text-muted">Diperbarui beberapa hari yang lalu · 3 menit baca</p>
      </header>

      <article className="prose prose-sm max-w-none text-nk-text">
        <div className="rounded-lg border border-nk-border bg-nk-surface p-5 mb-8">
          <h2 className="text-base font-semibold text-nk-text mb-2">Ringkasan</h2>
          <p className="text-sm leading-relaxed text-nk-text-muted">
            Panduan ini menjelaskan prosedur dan solusi praktis untuk pertanyaan &ldquo;{matchedTitle}&rdquo; di platform
            Ngekost. Tim kami berkomitmen memberikan proses yang transparan, aman, dan tanpa biaya tersembunyi.
          </p>
        </div>

        <h3 className="text-lg font-medium text-nk-text mt-8 mb-3">Langkah-langkah Penyelesaian</h3>
        <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed text-nk-text-muted">
          <li>
            <strong className="text-nk-text">Pastikan Anda telah masuk (login):</strong> Masuk ke akun Ngekost Anda menggunakan email atau Google untuk mengakses data booking dan profil.
          </li>
          <li>
            <strong className="text-nk-text">Buka menu yang relevan:</strong> Kunjungi menu Dashboard, Booking Saya, atau Tagihan sesuai dengan aktivitas yang ingin Anda kelola.
          </li>
          <li>
            <strong className="text-nk-text">Ikuti panduan pada layar:</strong> Periksa detail kamar, batas waktu pembayaran, serta catatan dari pemilik kos sebelum melakukan konfirmasi.
          </li>
          <li>
            <strong className="text-nk-text">Simpan bukti atau konfirmasi:</strong> Setiap aksi tersimpan secara otomatis dan dapat Anda lihat riwayatnya di status booking atau bukti transaksi.
          </li>
        </ol>

        <div className="mt-8 rounded-lg border border-amber-200/80 bg-amber-50/50 p-4">
          <h4 className="text-sm font-semibold text-amber-900 mb-1">Catatan Penting</h4>
          <p className="text-xs leading-relaxed text-amber-800">
            Pastikan seluruh transaksi sewa dan pembayaran uang muka (DP) hanya dilakukan melalui rekening resmi atau sesuai petunjuk platform Ngekost untuk menghindari penipuan di luar aplikasi.
          </p>
        </div>
      </article>

      {/* Interactive feedback */}
      <HelpArticleFeedback />

      {/* Related articles */}
      {relatedTopics.length > 0 && (
        <section className="my-10">
          <h3 className="text-sm font-medium text-nk-text mb-3">Artikel Terkait dalam {categoryName}</h3>
          <div className="flex flex-col divide-y divide-nk-border rounded-lg border border-nk-border bg-nk-surface">
            {relatedTopics.map((topic) => (
              <Link
                key={topic}
                href={`/help/${slugify(topic)}`}
                className="flex items-center justify-between p-3.5 text-sm text-nk-text-muted hover:text-nk-text hover:bg-nk-warm transition-colors"
              >
                <span>{topic}</span>
                <ChevronRight className="size-4 text-nk-text-muted/60" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <Separator className="my-10" />

      {/* Contact Section */}
      <section aria-label={t("stillStuck")} className="flex flex-col items-start gap-4">
        <h2 className="text-lg font-medium tracking-tight text-nk-text">{t("stillStuck")}</h2>
        <p className="text-sm text-nk-text-muted">{t("hours")}</p>
        <div className="flex flex-wrap gap-3">
          <Button href="https://wa.me/6281122334455" renderAsLink={false} onClick={undefined}>
            {t("wa")}
          </Button>
          <Button href="mailto:halo@ngekost.id" variant="outline">
            {t("email")}
          </Button>
        </div>
      </section>
    </div>
  );
}

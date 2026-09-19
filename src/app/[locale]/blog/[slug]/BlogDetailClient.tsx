"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type PostMeta = { title: string; excerpt: string; author: string; date: string; category: string };

/** Paragraf dummy per slug - digenerate deterministik supaya tiap artikel beda. */
function useBody(slug: string) {
  const t = useTranslations("blog");
  const posts = t.raw("posts") as Record<string, PostMeta>;
  const meta = posts[slug];
  const paras = [
    `Mencari tempat tinggal baru jarang sesederhana kata "cari, lihat, pindah". Ada jeda antara niat dan kunci di tangan: jadwal kunjungan yang bertabrakan dengan kuliah, harga yang berubah tanpa pemberitahuan, dan perjanjian yang ditulis setengah hati. Artikel ini menata urutannya.`,
    `Mulai dari data, bukan keinginan. Tandai batas biaya bulanan termasuk listrik dan internet, bukan hanya sewa. Lingkungan yang tampak tenang jam 2 siang bisa berisik setelah kantor dan sekolah bubar - mampirlah di jam yang sama dengan jadwalmu nanti.`,
    `Datang dengan daftar pertanyaan, bukan hanya kamera. Tanya tentang aturan tamu, batas jam malam, dan siapa yang menanggapi kalau AC mati tengah malam. Jawaban pemilik di titik ini lebih jujur daripada setelah tanda tangan.`,
    `Perjanjian sewa adalah dokumen kerja, bukan formalitas. Baca ketentuan denda keterlambatan, syarat pengembalian deposit, dan masa pemberitahuan sebelum keluar. Foto kondisi kamar saat serah terima dengan tanggal yang jelas; itu bukti paling murah saat deposit diperdebatkan nanti.`,
    `Terakhir, percaya pola kecil. Pemilik yang merinci biaya tanpa diminta biasanya konsisten dalam hal lain. Calon penyewa yang membaca perjanjian sampai halaman kedua biasanya juga merawat kamar dengan baik. Kedua sisi saling mengenali dari kebiasaan, bukan janji.`,
  ];
  return { meta, paras };
}

export default function BlogDetailClient({ slug }: { slug: string }) {
  const t = useTranslations("blog");
  const { meta, paras } = useBody(slug);

  if (!meta) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="text-sm text-nk-text-muted">404</p>
        <Link href="/blog" className="mt-3 inline-block text-sm text-nk-text underline underline-offset-4">
          {t("backToBlog")}
        </Link>
      </div>
    );
  }

  const posts = t.raw("posts") as Record<string, PostMeta>;
  const related = Object.entries(posts).filter(([s]) => s !== slug).slice(0, 2);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 lg:py-16">
      <Link href="/blog" className="text-sm text-nk-text-muted transition-colors hover:text-nk-text">
        ← {t("backToBlog")}
      </Link>

      <article className="mt-8">
        <header>
          <div className="flex flex-wrap items-center gap-3 text-xs text-nk-text-muted">
            <Badge variant="secondary">{meta.category}</Badge>
            <span>{meta.date}</span>
            <span aria-hidden="true">·</span>
            <span>5 {t("minRead")}</span>
          </div>
          <h1 className="mt-4 text-3xl font-light leading-tight tracking-tight text-nk-text lg:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-3 text-sm text-nk-text-muted">{meta.author}</p>
        </header>

        <div className="mt-8 overflow-hidden rounded-lg">
          <img
            src={`https://picsum.photos/seed/blog-${slug}/1200/675`}
            alt=""
            className="aspect-video w-full object-cover"
          />
        </div>

        <div className="mt-10 flex flex-col gap-6">
          {paras.map((para, i) => (
            <p key={i} className="text-base leading-relaxed text-nk-text/90 first:text-lg first:leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      </article>

      <Separator className="my-12" />

      <section aria-label={t("related")}>
        <h2 className="text-xl font-medium tracking-tight text-nk-text">{t("related")}</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {related.map(([s, p]) => (
            <Link key={s} href={`/blog/${s}`} className="group block">
              <div className="overflow-hidden rounded-lg">
                <img
                  src={`https://picsum.photos/seed/blog-${s}/640/400`}
                  alt=""
                  className="aspect-[8/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <h3 className="mt-3 text-base font-medium leading-snug text-nk-text transition-colors group-hover:text-nk-accent">
                {p.title}
              </h3>
              <p className="mt-1 text-xs text-nk-text-muted">{p.date}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

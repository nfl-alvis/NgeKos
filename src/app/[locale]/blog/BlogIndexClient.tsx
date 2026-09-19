"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

type PostMeta = {
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
};

export default function BlogIndexClient() {
  const t = useTranslations("blog");
  const posts = useMemo(() => Object.entries(t.raw("posts") as Record<string, PostMeta>), [t]);
  const [cat, setCat] = useState<string>("all");

  const cats = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(([, p]) => set.add(p.category));
    return ["all", ...Array.from(set)];
  }, [posts]);

  const filtered = cat === "all" ? posts : posts.filter(([, p]) => p.category === cat);
  const featuredSlug = filtered[0];
  const featured = featuredSlug ?? null;

  const catLabel = (c: string) => (c === "all" ? t("featured") : c);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 lg:px-10 lg:py-16">
      {/* header editorial */}
      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-light tracking-tight text-nk-text lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-base leading-relaxed text-nk-text-muted">{t("subtitle")}</p>
      </header>

      {/* filter kategori */}
      <nav aria-label="Categories" className="mb-10 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              cat === c
                ? "border-nk-accent bg-nk-accent font-medium text-nk-text-inverse"
                : "border-nk-border bg-nk-surface text-nk-text-muted hover:text-nk-text"
            }`}
          >
            {catLabel(c)}
          </button>
        ))}
      </nav>

      {/* featured */}
      {featured && (
        <article className="mb-12 grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-center">
          <Link href={`/blog/${featured[0]}`} className="group block overflow-hidden rounded-lg">
            <img
              src={`https://picsum.photos/seed/blog-${featured[0]}/960/540`}
              alt=""
              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </Link>
          <div>
            <div className="flex items-center gap-3 text-xs text-nk-text-muted">
              <Badge variant="secondary">{featured[1].category}</Badge>
              <span>{featured[1].date}</span>
            </div>
            <h2 className="mt-3 text-2xl font-medium tracking-tight text-nk-text lg:text-3xl">
              <Link href={`/blog/${featured[0]}`} className="transition-colors hover:text-nk-accent">
                {featured[1].title}
              </Link>
            </h2>
            <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-nk-text-muted">
              {featured[1].excerpt}
            </p>
            <p className="mt-4 text-xs text-nk-text-muted">
              {featured[1].author} · 6 {t("minRead")}
            </p>
          </div>
        </article>
      )}

      {/* grid sisa post - 2 kolom zig-zag, bukan 3 kartu seragam */}
      <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
        {filtered.slice(1).map(([slug, p], i) => (
          <article key={slug} className={i % 2 === 1 ? "sm:mt-10" : ""}>
            <Link href={`/blog/${slug}`} className="group block">
              <div className="overflow-hidden rounded-lg">
                <img
                  src={`https://picsum.photos/seed/blog-${slug}/640/400`}
                  alt=""
                  className="aspect-[8/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-nk-text-muted">
                <Badge variant="secondary">{p.category}</Badge>
                <span>{p.date}</span>
              </div>
              <h3 className="mt-2 text-lg font-medium leading-snug tracking-tight text-nk-text">
                <span className="transition-colors group-hover:text-nk-accent">{p.title}</span>
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-nk-text-muted">{p.excerpt}</p>
              <p className="mt-3 text-xs text-nk-text-muted">
                {p.author} · 5 {t("minRead")}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

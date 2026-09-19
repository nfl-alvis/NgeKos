import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ locale: string; category: string }> };

type PostMeta = { title: string; excerpt: string; author: string; date: string; category: string };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  return { title: decodeURIComponent(category) };
}

export default async function BlogCategoryPage({ params }: Props) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "blog" });

  const cat = decodeURIComponent(category);
  const posts = Object.entries(t.raw("posts") as Record<string, PostMeta>).filter(
    ([, p]) => p.category === cat
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10">
        <Link href="/blog" className="text-sm text-nk-text-muted transition-colors hover:text-nk-text">
          ← {t("title")}
        </Link>
        <h1 className="mt-4 text-3xl font-light tracking-tight text-nk-text lg:text-4xl">{cat}</h1>
        <p className="mt-2 text-sm text-nk-text-muted">
          {posts.length} {posts.length === 1 ? "artikel" : "artikel"}
        </p>
      </header>

      <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
        {posts.map(([slug, p], i) => (
          <article key={slug} className={i % 2 === 1 ? "sm:mt-10" : ""}>
            <Link href={`/blog/${slug}`} className="group block overflow-hidden rounded-lg">
              <img
                src={`https://picsum.photos/seed/blog-${slug}/640/360`}
                alt=""
                className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className="border-nk-border font-normal text-nk-text-muted">
                {p.category}
              </Badge>
              <span className="text-xs text-nk-text-muted">·</span>
              <time className="text-xs text-nk-text-muted">{p.date}</time>
            </div>
            <h2 className="mt-2 text-lg font-medium leading-snug tracking-tight text-nk-text">
              <Link href={`/blog/${slug}`} className="transition-colors hover:text-nk-accent">
                {p.title}
              </Link>
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-nk-text-muted">{p.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { slugify } from "@/lib/utils";

type Cats = Record<string, string>;

export default function BantuanClient({ cats, topics }: { cats: Cats; topics: Record<string, string[]> }) {
  const t = useTranslations("bantuan");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    const out: Record<string, string[]> = {};
    for (const [cat, items] of Object.entries(topics)) {
      const hit = items.filter((item) => item.toLowerCase().includes(q));
      if (hit.length > 0 || cat.toLowerCase().includes(q)) out[cat] = hit.length > 0 ? hit : items;
    }
    return out;
  }, [query, topics]);

  const totalHits = Object.values(filtered).reduce((n, items) => n + items.length, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-light tracking-tight text-nk-text lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-base leading-relaxed text-nk-text-muted">{t("subtitle")}</p>
      </header>

      {/* pencarian */}
      <div className="relative mb-10">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-nk-text-muted"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-12 w-full rounded-lg border border-nk-border bg-nk-surface pl-11 pr-4 text-sm text-nk-text outline-none placeholder:text-nk-text-muted/60 focus:border-nk-accent"
        />
        {query.trim() && (
          <p className="mt-2 text-xs text-nk-text-muted" role="status">
            {totalHits} {totalHits === 1 ? "hasil" : "hasil"}
          </p>
        )}
      </div>

      {/* accordion per kategori — teks rata kiri */}
      <div className="rounded-lg border border-nk-border bg-nk-surface px-6">
        {Object.entries(filtered).map(([cat, items]) => (
          <Accordion key={cat} className="py-2">
            <AccordionItem>
              <AccordionTrigger className="text-base font-medium">
                {cats[cat] ?? cat}
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col divide-y divide-nk-border/60">
                  {items.map((item) => (
                    <li key={item}>
                      <Link
                        href={`/bantuan/${slugify(item)}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm text-nk-text-muted transition-colors hover:text-nk-text"
                      >
                        {item}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14m-6-6 6 6-6 6" />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
        {Object.keys(filtered).length === 0 && (
          <p className="py-8 text-center text-sm text-nk-text-muted">—</p>
        )}
      </div>

      <Separator className="my-12" />

      {/* kontak */}
      <section aria-label={t("stillStuck")} className="flex flex-col items-start gap-4">
        <h2 className="text-lg font-medium tracking-tight text-nk-text">{t("stillStuck")}</h2>
        <p className="text-sm text-nk-text-muted">{t("hours")}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            href="https://wa.me/6281122334455"
            renderAsLink={false}
            onClick={undefined}
          >
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

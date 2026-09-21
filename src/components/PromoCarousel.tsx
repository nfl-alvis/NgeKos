"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const PROMO_KEYS = ["1", "2", "3", "4"] as const;

export default function PromoCarousel() {
  const t = useTranslations("promo");
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % PROMO_KEYS.length);
  }, []);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + PROMO_KEYS.length) % PROMO_KEYS.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const key = PROMO_KEYS[index];

  return (
    <section className="mx-auto w-full max-w-7xl px-6 lg:px-10">
      <div className="relative overflow-hidden rounded-xl bg-nk-dark text-white">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-nk-accent/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 size-72 rounded-full bg-nk-accent/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-6 p-10 md:p-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-lg space-y-4">
            <span className="inline-flex w-fit items-center rounded-full bg-nk-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-nk-accent">
              {t(`items.${key}.tag`)}
            </span>
            <h2 className="font-sans text-3xl font-medium tracking-tight md:text-4xl">
              {t(`items.${key}.title`)}
            </h2>
            <p className="text-sm leading-relaxed text-nk-dark-border">
              {t(`items.${key}.body`)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/kost"
              className="inline-flex h-11 items-center rounded-md bg-gradient-to-b from-nk-accent to-nk-accent-dark px-6 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md"
            >
              {t("viewAll")}
            </Link>
            <div className="flex gap-2">
              <button
                onClick={prev}
                className="grid size-10 place-items-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-white/40 hover:text-white"
                aria-label="Previous promo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button
                onClick={next}
                className="grid size-10 place-items-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-white/40 hover:text-white"
                aria-label="Next promo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

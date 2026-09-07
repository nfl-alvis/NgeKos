"use client";

import { NextIntlClientProvider, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Messages = Record<string, unknown>;

function NotFoundInner() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-[70dvh] items-center bg-nk-bg">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-7">
          <p className="font-mono text-sm tracking-[0.125em] text-nk-text-muted">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tighter text-nk-text md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-nk-text-muted">
            {t("body")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" href="/kost">
              {t("ctaPrimary")}
            </Button>
            <Button size="lg" variant="outline" href="/">
              {t("ctaBack")}
            </Button>
          </div>
        </div>

        <div className="hidden select-none lg:col-span-5 lg:block">
          <p
            aria-hidden="true"
            className="text-right text-[10rem] leading-none font-semibold tracking-tighter text-nk-section"
          >
            404
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NotFoundContent({ messages }: { messages: Messages }) {
  return (
    <NextIntlClientProvider messages={messages} locale="id">
      <NotFoundInner />
    </NextIntlClientProvider>
  );
}

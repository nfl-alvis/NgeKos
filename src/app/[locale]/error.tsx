"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function LocaleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex min-h-[70dvh] items-center bg-nk-bg">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 lg:px-10">
        <p className="font-mono text-sm tracking-[0.125em] text-nk-text-muted">
          {t("error")}
        </p>
        <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tighter text-nk-text md:text-4xl">
          {t("errorHint")}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-nk-text-muted">
          {pathname}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Button onClick={reset}>{t("retry")}</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            {t("backHome")}
          </Button>
        </div>
      </div>
    </div>
  );
}

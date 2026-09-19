"use client";

import { useTranslations } from "next-intl";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

/**
 * items key: q1..q8 pasangan qN/aN. q4 = pertanyaan metode bayar, q4a = jawabannya.
 */
export default function FaqClient({
  groups,
  items,
}: {
  groups: Record<string, string>;
  items: Record<string, string>;
}) {
  const t = useTranslations("faq");
  const bantuanT = useTranslations("bantuan");

  // normalisasi: setiap pasangan (question, answer)
  const pairs: { q: string; a: string; group: keyof typeof GROUP_MAP }[] = [];
  const GROUP_MAP = {
    booking: [0, 1, 2],
    payment: [3, 4],
    owner: [5, 6, 7],
  } as const;

  const raw: { q: string; a: string }[] = [
    { q: items.q1, a: items.a1 },
    { q: items.q2, a: items.a2 },
    { q: items.q3, a: items.a3 },
    { q: items.q4, a: items.q4a },
    { q: items.q5, a: items.a5 },
    { q: items.q6, a: items.a6 },
    { q: items.q7, a: items.a7 },
    { q: items.q8, a: items.a8 },
  ];

  raw.forEach((pair, i) => {
    const group = (Object.keys(GROUP_MAP) as (keyof typeof GROUP_MAP)[]).find((g) =>
      GROUP_MAP[g].includes(i as never)
    );
    if (group) pairs.push({ ...pair, group });
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-light tracking-tight text-nk-text lg:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-base leading-relaxed text-nk-text-muted">{t("subtitle")}</p>
      </header>

      <div className="flex flex-col gap-10">
        {(Object.keys(GROUP_MAP) as (keyof typeof GROUP_MAP)[]).map((g) => (
          <section key={g} aria-label={groups[g]}>
            <h2 className="mb-2 text-sm font-medium tracking-wide text-nk-text-muted">{groups[g]}</h2>
            <div className="rounded-lg border border-nk-border bg-nk-surface px-6">
              <Accordion className="py-2">
                {pairs
                  .filter((p) => p.group === g)
                  .map((p) => (
                    <AccordionItem key={p.q}>
                      <AccordionTrigger className="text-base font-medium">{p.q}</AccordionTrigger>
                      <AccordionContent>{p.a}</AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-start gap-3 rounded-lg border border-nk-border bg-nk-warm p-6">
        <p className="text-sm text-nk-text">{bantuanT("stillStuck")}</p>
        <Button href="/help" variant="outline" size="sm">
          {bantuanT("title")}
        </Button>
      </div>
    </div>
  );
}

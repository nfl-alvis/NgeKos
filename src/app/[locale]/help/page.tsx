import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import BantuanClient from "../bantuan/BantuanClient";

export const metadata: Metadata = { title: "Help Center" };

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "bantuan" });
  const cats = t.raw("cats") as Record<string, string>;
  const topics = t.raw("topics") as Record<string, string[]>;
  return <BantuanClient cats={cats} topics={topics} />;
}

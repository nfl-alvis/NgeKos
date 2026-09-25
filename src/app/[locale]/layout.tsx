import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import "@/app/globals.css";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalFooter from "@/components/ConditionalFooter";
import { SessionProvider } from "@/components/SessionProvider";

const sans = localFont({
  src: "../../fonts/Inter-VariableFont.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "NgeKos - Cari Kost Terverifikasi",
    template: "%s - NgeKos",
  },
  description:
    "Platform kost terverifikasi untuk anak kos Indonesia. Harga transparan, fasilitas lengkap.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${sans.variable}`}>
      <body className={`${sans.className} ${sans.variable} grain min-h-dvh flex flex-col bg-nk-bg text-nk-text antialiased selection:bg-nk-accent selection:text-white`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[99] focus:rounded-md focus:bg-nk-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white">
          {(messages as unknown as { common?: { skip?: string } })?.common?.skip || "Skip to content"}
        </a>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <ConditionalNavbar />
            <main id="main-content" className="flex-1">{children}</main>
            <ConditionalFooter />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

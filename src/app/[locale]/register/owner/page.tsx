import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import RegisterClient from "../RegisterClient";

export const metadata: Metadata = { title: "Daftar Pemilik Kos" };

export default async function RegisterOwnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <RegisterClient defaultRole="owner" />
    </Suspense>
  );
}

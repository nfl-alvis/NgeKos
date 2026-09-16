import { redirect } from "@/i18n/navigation";

/**
 * Route lama /tenant → pindah ke /tenant/dashboard (pemisahan dashboard
 * user biasa vs tenant). Tetap tersedia supaya bookmark/link lama tidak 404.
 */
export default async function TenantIndexRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/tenant/dashboard", locale });
}

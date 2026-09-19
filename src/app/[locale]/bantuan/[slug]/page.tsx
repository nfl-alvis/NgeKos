import { redirect } from "@/i18n/navigation";

export default async function BantuanSlugRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  redirect({ href: `/help/${slug}`, locale });
}

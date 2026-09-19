import { redirect } from "@/i18n/navigation";

export default async function BantuanRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/help", locale });
}

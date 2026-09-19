import { redirect } from "@/i18n/navigation";

export default async function KarirRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/careers", locale });
}

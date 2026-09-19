import { redirect } from "@/i18n/navigation";

export default async function BlogKategoriRedirectPage({
  params,
}: {
  params: Promise<{ locale: string; kategori: string }>;
}) {
  const { locale, kategori } = await params;
  redirect({ href: `/blog/category/${kategori}`, locale });
}

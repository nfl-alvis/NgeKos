import { redirect } from "@/i18n/navigation";

export default async function BookingsPayRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect({ href: `/dashboard/bookings/${id}/pay`, locale });
}

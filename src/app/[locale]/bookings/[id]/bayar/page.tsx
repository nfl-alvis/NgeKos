import { redirect } from "@/i18n/navigation";

export default async function BookingsBayarRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect({ href: `/dashboard/bookings/${id}/pay`, locale });
}

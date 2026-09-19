import { redirect } from "@/i18n/navigation";

export default async function MyBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/dashboard/bookings", locale });
}


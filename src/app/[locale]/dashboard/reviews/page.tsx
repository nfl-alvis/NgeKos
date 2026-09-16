"use client";

import { useTranslations } from "next-intl";
import { ReviewsPanel } from "@/components/dashboard/UserPanels";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";

/** Ulasan yang pernah dibuat + kos yang bisa direview. */
export default function DashboardReviewsPage() {
  const t = useTranslations("userDash");
  return (
    <UserDashboardShell title={t("reviewsTitle")}>
      <ReviewsPanel />
    </UserDashboardShell>
  );
}

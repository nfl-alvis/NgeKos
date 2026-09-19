"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter as useI18nRouter } from "@/i18n/navigation";

export default function RedirectToPayPage() {
  const params = useParams<{ id: string }>();
  const router = useI18nRouter();

  useEffect(() => {
    if (params.id) {
      router.replace(`/bookings/${params.id}/pay`);
    }
  }, [params.id, router]);

  return null;
}

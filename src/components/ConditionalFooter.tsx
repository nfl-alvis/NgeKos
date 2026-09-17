"use client";

import { usePathname } from "@/i18n/navigation";
import Footer from "@/components/Footer";

/**
 * Footer hanya untuk halaman publik. Semua area yang memakai DashboardShell
 * mengisi tinggi viewport sendiri dan tidak boleh bertumpuk dengan footer global.
 */
export default function ConditionalFooter() {
  const pathname = usePathname();
  const isDashboardRoute = ["/owner", "/admin", "/dashboard", "/tenant"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isDashboardRoute) return null;
  return <Footer />;
}

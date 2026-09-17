"use client";

import { usePathname } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

/**
 * Navbar hanya untuk halaman publik. Semua area yang memakai DashboardShell
 * sudah memiliki header sendiri dan tidak boleh ditumpuk dengan navbar global.
 */
export default function ConditionalNavbar() {
  const pathname = usePathname();
  const isDashboardRoute = ["/owner", "/admin", "/dashboard", "/tenant"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isDashboardRoute) return null;
  return <Navbar />;
}

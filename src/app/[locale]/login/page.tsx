"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const nav = useTranslations("nav");
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "owner" ? "owner" : "seeker";

  return (
    <div className="grain flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-nk-bg px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label={nav("home")} className="inline-block">
            <Logo className="h-9 w-auto text-nk-accent" />
          </Link>
        </div>

        <div className="rounded-lg border border-nk-border bg-nk-surface p-8 shadow-sm">
          <LoginForm role={role} />
        </div>
      </div>
    </div>
  );
}

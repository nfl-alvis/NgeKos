"use client";

import Image from "next/image";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";

function LoginFallback() {
  return <div className="min-h-dvh bg-nk-bg" aria-busy="true" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");
  
  let initialError: string | null = null;
  let isAlertInfo = false;

  if (errorCode === "login_required") {
    initialError = "Silakan masuk ke akun Anda terlebih dahulu untuk melanjutkan pengajuan sewa kos.";
    isAlertInfo = true;
  } else if (errorCode === "role_mismatch") {
    initialError = t("roleMismatch");
  } else if (errorCode) {
    initialError = t("oauthError");
  }

  return (
    <div className="min-h-dvh bg-nk-bg p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-[1500px] overflow-hidden lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden rounded-lg bg-nk-warm lg:block" aria-label="NgeKost Hunian Nyaman">
          <Image
            src="/images/about-hero-wide.jpg"
            alt="Suasana hunian kost NgeKost"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 52vw, 0px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <p className="max-w-lg text-3xl font-light leading-tight tracking-tight">
              Cari kost idamanmu atau kelola properti kos dengan praktis di NgeKost.
            </p>
          </div>
        </section>

        <section className="flex min-h-[calc(100dvh-2rem)] items-center justify-center px-5 py-10 sm:px-10 lg:min-h-0 lg:px-14 xl:px-20">
          <div className="w-full max-w-md">
            <Logo className="mb-10 inline-flex h-9 w-auto text-nk-accent" />
            <LoginForm initialError={initialError} isAlertInfo={isAlertInfo} />
          </div>
        </section>
      </div>
    </div>
  );
}

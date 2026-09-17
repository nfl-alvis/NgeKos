"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import GoogleButton from "@/components/GoogleButton";
import { useSession } from "@/components/SessionProvider";

export default function AdminLoginPage() {
  const t = useTranslations("admin.login");
  const { loginWithGoogle } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signIn = async () => {
    setPending(true);
    setError(null);
    try {
      await loginWithGoogle("seeker");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error"));
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-lg border border-nk-border bg-nk-surface p-8">
        <div className="text-center">
          <span className="inline-block rounded-full border border-nk-border bg-nk-warm px-3 py-1 text-xs font-medium text-nk-text-muted">
            {t("badge")}
          </span>
          <h1 className="mt-4 text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
        </div>

        <GoogleButton label={t("google")} onClick={() => void signIn()} disabled={pending} className="mt-8" />

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-[#EBC4C0] bg-[#FAEAE8] p-3 text-center text-xs text-[#9C3B32]">
            {error}
          </p>
        )}
        <p className="mt-6 text-center text-xs text-nk-text-muted">{t("demo")}</p>
      </div>
    </div>
  );
}

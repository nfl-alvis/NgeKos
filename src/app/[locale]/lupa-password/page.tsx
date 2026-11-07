"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Mail } from "lucide-react";

const fieldClass =
  "h-11 w-full rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none";
const primaryCta =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale: "id" }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || "Gagal mengirim tautan. Silakan coba lagi.");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim tautan. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-nk-bg p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-lg border border-nk-border bg-nk-surface p-6 sm:p-8">
          <Logo className="mb-8 inline-flex h-9 w-auto text-nk-accent" />

          {sent ? (
            <div className="flex flex-col items-start gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-nk-warm">
                <Mail className="size-5 text-nk-accent" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-nk-text">{t("sentTitle")}</h1>
              <p className="text-sm leading-relaxed text-nk-text-muted">{t("sentBody", { email: email.trim() })}</p>
              <p className="text-xs leading-relaxed text-nk-text-muted">{t("spam")}</p>
              <Link
                href={`/reset-password?email=${encodeURIComponent(email.trim())}`}
                className="mt-2 text-sm font-medium text-nk-accent underline-offset-4 hover:underline"
              >
                {t("toReset")}
              </Link>
              <Link href="/login" className="text-sm text-nk-text-muted transition-colors hover:text-nk-accent">
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-nk-text">{t("title")}</h1>
              <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">{t("subtitle")}</p>

              {error && (
                <Alert variant="destructive" className="mt-5">
                  <AlertTitle className="font-semibold">Gagal</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
                </Alert>
              )}

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-nk-text">{t("email")}</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className={fieldClass}
                  />
                </label>

                <button type="submit" disabled={pending || !email.trim()} className={primaryCta}>
                  {pending ? t("submitting") : t("submit")}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <CheckCircle className="mr-1 inline size-3.5 text-nk-accent" />
                <Link href="/login" className="text-nk-text-muted transition-colors hover:text-nk-accent">
                  {t("backToLogin")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

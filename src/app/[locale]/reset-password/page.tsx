"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { CheckCircle, Loader2, ShieldAlert } from "lucide-react";

const fieldClass =
  "h-11 w-full rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none";
const primaryCta =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-nk-bg" aria-busy="true" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const t = useTranslations("resetPassword");
  const searchParams = useSearchParams();
  // Bila diarahkan dari halaman lupa password (?email=...), tampilkan mode OTP:
  // kode 8 digit dari email + kata sandi baru. Tanpa query, alur lama berlaku
  // (sesi dari tautan reset di email).
  const otpEmail = searchParams.get("email")?.toLowerCase().trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmitWithSession(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json();
      if (res.status === 401) {
        setInvalidLink(true);
        return;
      }
      if (!res.ok) {
        throw new Error(body?.error?.message || "Gagal memperbarui kata sandi.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui kata sandi.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmitWithOtp(event: React.FormEvent) {
    event.preventDefault();
    if (pending || otp.length !== 8) return;
    if (password !== confirm) {
      setError(t("mismatch"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail, token: otp.trim(), password }),
      });
      const body = await res.json();
      if (res.status === 400) {
        setInvalidCode(true);
        return;
      }
      if (!res.ok) {
        throw new Error(body?.error?.message || "Gagal memperbarui kata sandi.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui kata sandi.");
    } finally {
      setPending(false);
    }
  }

  const isOtpMode = Boolean(otpEmail);

  return (
    <div className="min-h-dvh bg-nk-bg p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-lg border border-nk-border bg-nk-surface p-6 sm:p-8">
          <Logo className="mb-8 inline-flex h-9 w-auto text-nk-accent" />

          {success ? (
            <div className="flex flex-col items-start gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-nk-warm">
                <CheckCircle className="size-5 text-nk-accent" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-nk-text">{t("successTitle")}</h1>
              <p className="text-sm leading-relaxed text-nk-text-muted">{t("successBody")}</p>
              <Link href="/login" className="mt-2 text-sm font-medium text-nk-accent underline-offset-4 hover:underline">
                {t("toLogin")}
              </Link>
            </div>
          ) : isOtpMode && invalidCode ? (
            <div className="flex flex-col items-start gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-nk-warm">
                <ShieldAlert className="size-5 text-nk-accent" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-nk-text">{t("invalidCodeTitle")}</h1>
              <p className="text-sm leading-relaxed text-nk-text-muted">{t("invalidCodeBody")}</p>
              <Link href="/lupa-password" className="mt-2 text-sm font-medium text-nk-accent underline-offset-4 hover:underline">
                {t("requestNew")}
              </Link>
              <Link href="/login" className="text-sm text-nk-text-muted transition-colors hover:text-nk-accent">
                {t("toLogin")}
              </Link>
            </div>
          ) : !isOtpMode && invalidLink ? (
            <div className="flex flex-col items-start gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-nk-warm">
                <ShieldAlert className="size-5 text-nk-accent" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-nk-text">{t("invalidLinkTitle")}</h1>
              <p className="text-sm leading-relaxed text-nk-text-muted">{t("invalidLinkBody")}</p>
              <Link href="/lupa-password" className="mt-2 text-sm font-medium text-nk-accent underline-offset-4 hover:underline">
                {t("requestNew")}
              </Link>
              <Link href="/login" className="text-sm text-nk-text-muted transition-colors hover:text-nk-accent">
                {t("toLogin")}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-nk-text">
                {isOtpMode ? t("otpTitle") : t("title")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">
                {isOtpMode ? t("otpSubtitle", { email: otpEmail }) : t("subtitle")}
              </p>

              {error && (
                <Alert variant="destructive" className="mt-5">
                  <AlertTitle className="font-semibold">Gagal</AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
                </Alert>
              )}

              {isOtpMode ? (
                <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmitWithOtp}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">{t("otpLabel")}</span>
                    <div className="flex justify-center py-1">
                      <InputOTP maxLength={8} value={otp} onChange={(val) => setOtp(val)} disabled={pending}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="size-9 sm:size-11" />
                          <InputOTPSlot index={1} className="size-9 sm:size-11" />
                          <InputOTPSlot index={2} className="size-9 sm:size-11" />
                          <InputOTPSlot index={3} className="size-9 sm:size-11" />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={4} className="size-9 sm:size-11" />
                          <InputOTPSlot index={5} className="size-9 sm:size-11" />
                          <InputOTPSlot index={6} className="size-9 sm:size-11" />
                          <InputOTPSlot index={7} className="size-9 sm:size-11" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">{t("newPassword")}</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t("newPasswordPlaceholder")}
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">{t("confirmPassword")}</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      className={fieldClass}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={pending || otp.length !== 8 || password.length < 8 || confirm.length < 8}
                    className={primaryCta}
                  >
                    {pending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        {t("otpSubmitting")}
                      </span>
                    ) : (
                      t("otpSubmit")
                    )}
                  </button>
                </form>
              ) : (
                <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmitWithSession}>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">{t("newPassword")}</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t("newPasswordPlaceholder")}
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">{t("confirmPassword")}</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      className={fieldClass}
                    />
                  </label>

                  <button type="submit" disabled={pending || password.length < 8 || confirm.length < 8} className={primaryCta}>
                    {pending ? t("submitting") : t("submit")}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

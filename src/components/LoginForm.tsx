"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Info } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter as useI18nRouter } from "@/i18n/navigation";
import GoogleButton from "@/components/GoogleButton";
import { useSession } from "@/components/SessionProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginForm({
  role,
  onBack,
  onDone,
  redirectAfter = true,
  initialError,
  isAlertInfo = false,
}: {
  role?: "seeker" | "owner";
  onBack?: () => void;
  onDone?: () => void;
  redirectAfter?: boolean;
  initialError?: string | null;
  isAlertInfo?: boolean;
}) {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isInfoAlert, setIsInfoAlert] = useState<boolean>(isAlertInfo);
  const { login, loginWithGoogle } = useSession();
  const i18nRouter = useI18nRouter();

  const [prevInitialError, setPrevInitialError] = useState(initialError);
  if (initialError !== prevInitialError) {
    setPrevInitialError(initialError);
    setError(initialError ?? null);
    setIsInfoAlert(isAlertInfo);
  }

  const finishLogin = (signedInRole: "seeker" | "owner" | "admin") => {
    onDone?.();
    if (!redirectAfter) return;
    const nextUrl = searchParams?.get("next");
    if (nextUrl && nextUrl.startsWith("/")) {
      i18nRouter.push(nextUrl);
      return;
    }
    i18nRouter.push(signedInRole === "owner" ? "/owner" : signedInRole === "admin" ? "/admin" : "/dashboard");
  };

  const attemptLogin = async () => {
    setPending(true);
    setError(null);
    setIsInfoAlert(false);
    try {
      const signedIn = await login(email, password, role);
      finishLogin(signedIn.role);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("genericError"));
    } finally {
      setPending(false);
    }
  };

  const attemptGoogleLogin = async () => {
    setPending(true);
    setError(null);
    setIsInfoAlert(false);
    try {
      await loginWithGoogle(role, "login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("oauthError"));
      setPending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("cancel")}
            className="-ml-1 flex size-8 items-center justify-center rounded-full text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        {role && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-nk-accent/10 px-3 py-1 text-xs font-medium text-nk-accent">
            {role === "seeker" ? t("roleSeeker") : t("roleOwner")}
          </span>
        )}
      </div>

      <h1 className="mt-4 text-3xl font-light tracking-tight text-nk-text">
        {role ? (role === "seeker" ? t("titleSeeker") : t("titleOwner")) : t("title")}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">{t("subtitle")}</p>

      {error && (
        <Alert variant={isInfoAlert ? "default" : "destructive"} className="mt-5 border-nk-accent/30">
          {isInfoAlert ? <Info className="size-4 text-nk-accent" /> : <AlertCircle className="size-4" />}
          <AlertTitle className="font-semibold">{isInfoAlert ? "Perhatian" : "Gagal Masuk"}</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-5 rounded-lg border border-nk-accent/20 bg-nk-warm p-3.5 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-nk-accent">Akun Demo Siap Pakai</span>
          <span className="text-[10px] text-nk-text-muted">Klik untuk isi form</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEmail("owner@ngekost.id");
              setPassword("Password123!");
            }}
            className="rounded border border-nk-border bg-nk-surface px-2.5 py-1 text-xs font-medium text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
          >
            Demo Pemilik (owner@ngekost.id)
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail("admin@ngekost.id");
              setPassword("Password123!");
            }}
            className="rounded border border-nk-border bg-nk-surface px-2.5 py-1 text-xs font-medium text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
          >
            Demo Admin (admin@ngekost.id)
          </button>
        </div>
      </div>

      <div className="mt-6">
        <GoogleButton label={t("google")} onClick={() => void attemptGoogleLogin()} disabled={pending} />
      </div>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-nk-border" />
        <span className="text-xs text-nk-text-muted">{t("or")}</span>
        <span className="h-px flex-1 bg-nk-border" />
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (email && password && !pending) void attemptLogin();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-nk-text">{t("email")}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            className="h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-nk-text">{t("password")}</span>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="h-11 w-full rounded-lg border border-nk-border bg-nk-bg px-4 pr-12 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? t("hidePassword") : t("showPassword")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nk-text-muted transition-colors hover:text-nk-text"
            >
              {show ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
                  <path d="m2 2 20 20" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <div className="flex justify-end">
          <Link href="/login" className="text-xs text-nk-text-muted transition-colors hover:text-nk-accent">
            {t("forgot")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={pending || !email || !password}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("processing") : t("submit")}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-nk-text-muted">
        <div>
          {t("noAccount")}{" "}
          <Link
            href="/register"
            onClick={onDone}
            className="font-medium text-nk-accent transition-colors hover:opacity-80"
          >
            {t("register")}
          </Link>
        </div>
        <div className="text-xs">
          Pemilik kos?{" "}
          <Link
            href="/register/owner"
            onClick={onDone}
            className="font-medium text-nk-accent transition-colors hover:opacity-80"
          >
            Daftar sebagai Pemilik Kos
          </Link>
        </div>
      </div>
    </>
  );
}

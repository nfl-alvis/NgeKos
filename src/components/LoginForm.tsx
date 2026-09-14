"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter as useI18nRouter } from "@/i18n/navigation";
import { useSession } from "@/components/SessionProvider";
import { SEEKER_DEMO_ACCOUNT } from "@/lib/data/entities";

/**
 * Form masuk (email + password + akun demo) — diekstrak dari halaman /login
 * agar bisa dipakai di dua tempat: halaman penuh dan popup di navbar.
 * Perilaku identik: login → role tersimpan → diarahkan ke /owner atau /bookings.
 */
export default function LoginForm({
  role,
  onBack,
  onDone,
}: {
  role: "seeker" | "owner";
  onBack?: () => void;
  onDone?: () => void;
}) {
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const { login } = useSession();
  const i18nRouter = useI18nRouter();

  const attemptLogin = (mail: string) => {
    const name =
      mail === SEEKER_DEMO_ACCOUNT.email
        ? SEEKER_DEMO_ACCOUNT.name
        : mail.split("@")[0].replace(/[._-]+/g, " ").trim() || "Tamu";
    login({
      role: role === "owner" ? "owner" : "seeker",
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      email: mail,
    });
    onDone?.();
    i18nRouter.push(role === "owner" ? "/owner" : "/bookings");
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
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-nk-accent/10 px-3 py-1 text-xs font-medium text-nk-accent">
          {role === "seeker" ? t("roleSeeker") : t("roleOwner")}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-light tracking-tight text-nk-text">
        {role === "seeker" ? t("titleSeeker") : t("titleOwner")}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-nk-text-muted">{t("subtitle")}</p>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (email && password) attemptLogin(email);
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-nk-text">{t("email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className="h-11 w-full rounded-lg border border-nk-border bg-nk-bg px-4 pr-12 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide" : "Show"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nk-text-muted hover:text-nk-text"
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
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {t("submit")}
        </button>

        <button
          type="button"
          onClick={() => {
            setEmail(SEEKER_DEMO_ACCOUNT.email);
            setPassword(SEEKER_DEMO_ACCOUNT.password);
          }}
          className="text-center text-xs text-nk-text-muted underline-offset-4 transition-colors hover:text-nk-accent hover:underline"
        >
          {t("useDemo")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-nk-text-muted">
        {t("noAccount")}{" "}
        <Link
          href="/daftar"
          onClick={onDone}
          className="font-medium text-nk-accent transition-colors hover:opacity-80"
        >
          {t("register")}
        </Link>
      </p>
    </>
  );
}

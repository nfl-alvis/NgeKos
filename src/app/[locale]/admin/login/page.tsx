"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import GoogleButton from "@/components/GoogleButton";
import { useSession } from "@/components/SessionProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const t = useTranslations("admin.login");
  const lt = useTranslations("login");
  const router = useRouter();
  const { login, loginWithGoogle } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handlePasswordLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password || pending) return;

    setPending(true);
    setError(null);
    try {
      await login(email, password, "admin");
      router.push("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error"));
      setPending(false);
    }
  };

  const handleUseDemo = async () => {
    setEmail("admin@ngekost.id");
    setPassword("Password123!");
    setPending(true);
    setError(null);
    try {
      await login("admin@ngekost.id", "Password123!", "admin");
      router.push("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error"));
      setPending(false);
    }
  };

  const signInWithGoogle = async () => {
    setPending(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("error"));
      setPending(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-lg border border-nk-border bg-nk-surface p-8">
        <div className="text-center">
          <span className="inline-block rounded-full border border-nk-border bg-nk-warm px-3 py-1 text-xs font-medium text-nk-text-muted">
            {t("badge")}
          </span>
          <h1 className="mt-4 text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Demo Quick Login Card */}
        <div className="mt-6 rounded-lg border border-nk-accent/20 bg-nk-warm p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-nk-accent uppercase tracking-wider">Akun Demo Admin</span>
            <span className="text-[10px] text-nk-text-muted">Siap Pakai</span>
          </div>
          <p className="mt-1 text-xs text-nk-text">
            Email: <code className="font-mono font-bold">admin@ngekost.id</code>
            <br />
            Password: <code className="font-mono font-bold">Password123!</code>
          </p>
          <button
            type="button"
            onClick={handleUseDemo}
            disabled={pending}
            className="mt-3 w-full rounded-md bg-nk-accent px-3 py-2 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Memproses..." : "Masuk dengan Akun Demo Admin"}
          </button>
        </div>

        <form onSubmit={handlePasswordLogin} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-medium text-nk-text">{lt("email")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ngekost.id"
              className="h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-medium text-nk-text">{lt("password")}</span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-nk-border bg-nk-bg px-4 pr-12 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? lt("hidePassword") : lt("showPassword")}
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

          <button
            type="submit"
            disabled={pending || !email || !password}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? lt("processing") : lt("submit")}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-nk-border" />
          <span className="text-xs text-nk-text-muted">{lt("or")}</span>
          <span className="h-px flex-1 bg-nk-border" />
        </div>

        <GoogleButton label={t("google")} onClick={() => void signInWithGoogle()} disabled={pending} />
      </div>
    </div>
  );
}

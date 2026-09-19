"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import GoogleButton from "@/components/GoogleButton";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Isi popup login ala Mamikos (tombol Google + email/password + kotak akun
 * demo). Dipakai oleh SeekerAuthModal di halaman /book dan popup "Masuk"
 * di Navbar - satu tampilan, satu perilaku; header/konteks tiap pemanggil
 * berbeda, jadi tidak ikut dibungkus di sini.
 */
export default function AuthPopupForm({
  role,
  onSuccess,
  onClose,
}: {
  role: "seeker" | "owner";
  onSuccess: () => void;
  /** tutup popup tanpa login (dipakai link Daftar agar tidak ikut redirect) */
  onClose?: () => void;
}) {
  const t = useTranslations("booking");
  const lt = useTranslations("login");
  const dt = useTranslations("daftar");
  const { login, loginWithGoogle } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setPending(true);
    setError(null);
    try {
      await login(email, password, role);
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login gagal");
    } finally {
      setPending(false);
    }
  };

  const inputCls =
    "h-11 w-full rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none";

  return (
    <>
      <div>
        <GoogleButton
          label={t("gateGoogle")}
          onClick={() => void loginWithGoogle(role).catch((reason) => setError(reason instanceof Error ? reason.message : "Login Google gagal"))}
          disabled={pending}
        />
      </div>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-nk-border" />
        <span className="text-xs text-nk-text-muted">{dt("or")}</span>
        <span className="h-px flex-1 bg-nk-border" />
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (email && password && !pending) void signIn();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-nk-text">{t("gateEmail")}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={lt("emailPlaceholder")}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-nk-text">{t("gatePassword")}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={lt("passwordPlaceholder")}
            className={inputCls}
          />
        </label>
        {error && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <button
          type="submit"
          disabled={pending || !email || !password}
          className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("gateSignIn")}
        </button>
      </form>

      <p className="text-center text-sm text-nk-text-muted">
        {lt("noAccount")}{" "}
        <Link
          href={`/register?role=${role}`}
          onClick={onClose ?? onSuccess}
          className="font-medium text-nk-accent transition-colors hover:opacity-80"
        >
          {lt("register")}
        </Link>
      </p>
    </>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/components/SessionProvider";
import GoogleButton from "@/components/GoogleButton";
import { SEEKER_DEMO_ACCOUNT } from "@/lib/data/entities";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Modal login pencari kos ala Mamikos: masuk dari dalam alur pengajuan
 * tanpa pindah halaman. Sosial login (Google) + email/password.
 * Tombol "Gunakan akun demo" mengisi kredensial tempmail yang tersedia.
 */
export default function SeekerAuthModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("booking");
  const lt = useTranslations("login");
  const dt = useTranslations("daftar");
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const signIn = (mail: string) => {
    setPending(true);
    // mode demo: tanpa backend — sesi langsung dibuat (persist di sessionStorage)
    window.setTimeout(() => {
      const name =
        mail === SEEKER_DEMO_ACCOUNT.email
          ? SEEKER_DEMO_ACCOUNT.name
          : mail.split("@")[0].replace(/[._-]+/g, " ").trim() || "Tamu";
      login({ role: "seeker", name: name.replace(/\b\w/g, (c) => c.toUpperCase()), email: mail });
      setPending(false);
      onSuccess();
    }, 500);
  };

  const inputCls =
    "h-11 w-full rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="text-center">
          <h2 className="text-lg font-medium tracking-tight text-nk-text">{t("gateTitle")}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-nk-text-muted">{t("gateBody")}</p>
        </div>

        <div className="mt-5">
          <GoogleButton
            label={t("gateGoogle")}
            onClick={() => signIn(SEEKER_DEMO_ACCOUNT.email)}
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
            if (email && password) signIn(email);
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
          <button
            type="submit"
            disabled={pending || !email || !password}
            className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("gateSignIn")}
          </button>
        </form>

        <div className="rounded-lg border border-dashed border-nk-border bg-nk-warm p-3">
          <button
            type="button"
            onClick={() => {
              setEmail(SEEKER_DEMO_ACCOUNT.email);
              setPassword(SEEKER_DEMO_ACCOUNT.password);
              signIn(SEEKER_DEMO_ACCOUNT.email);
            }}
            disabled={pending}
            className="w-full text-center text-sm font-medium text-nk-accent transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {t("gateDemo")}
          </button>
          <p className="mt-1 text-center text-xs leading-relaxed text-nk-text-muted">
            {SEEKER_DEMO_ACCOUNT.email} · {t("gateDemoHint")}
          </p>
        </div>

        <p className="text-center text-sm text-nk-text-muted">
          {lt("noAccount")}{" "}
          <Link
            href="/daftar?role=seeker"
            onClick={() => onOpenChange(false)}
            className="font-medium text-nk-accent transition-colors hover:opacity-80"
          >
            {lt("register")}
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}

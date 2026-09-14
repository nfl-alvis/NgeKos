"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter as useI18nRouter } from "@/i18n/navigation";
import GoogleButton from "@/components/GoogleButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/components/SessionProvider";
import { ADMIN_PROFILE } from "@/lib/data/entities";

/** akun Google demo untuk picker (mirror konsep SeekerAuthModal) */
const DEMO_GOOGLE_ACCOUNTS = [
  {
    email: ADMIN_PROFILE.email,
    name: ADMIN_PROFILE.name,
    admin: true,
  },
  {
    email: "ratri.wulandari@gmail.com",
    name: "Ratri Wulandari",
    admin: false,
  },
] as const;

export default function AdminLoginPage() {
  const t = useTranslations("admin.login");
  const i18nRouter = useI18nRouter();
  const { login } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const attemptLogin = (account: (typeof DEMO_GOOGLE_ACCOUNTS)[number]) => {
    setPickerOpen(false);
    if (!account.admin) {
      setError(t("error"));
      return;
    }
    setError(null);
    login({ ...ADMIN_PROFILE, name: account.name, email: account.email });
    i18nRouter.push("/admin/verification");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-lg border border-nk-border bg-nk-surface p-8">
        <div className="text-center">
          <span className="inline-block rounded-full border border-nk-border bg-nk-warm px-3 py-1 text-xs font-medium text-nk-text-muted">
            {t("badge")}
          </span>
          <h1 className="mt-4 text-2xl font-medium tracking-tight text-nk-text">
            {t("title")}
          </h1>
        </div>

        <GoogleButton label={t("google")} onClick={() => setPickerOpen(true)} className="mt-8" />

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-[#EBC4C0] bg-[#FAEAE8] p-3 text-center text-xs text-[#9C3B32]"
          >
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-nk-text-muted">{t("demo")}</p>
      </div>

      {/* picker akun Google ala demo — akun non-admin memicu error state */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium text-nk-text">
              {t("pickerTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-nk-text-muted">
              {t("pickerSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {DEMO_GOOGLE_ACCOUNTS.map((acc) => (
              <Button
                key={acc.email}
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => attemptLogin(acc)}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-nk-accent text-sm font-medium text-nk-text-inverse">
                  {acc.name.trim().charAt(0)}
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-sm font-medium text-nk-text">
                    {acc.name}
                  </span>
                  <span className="block truncate text-xs font-normal text-nk-text-muted">
                    {acc.email}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { notificationPrefs } from "@/lib/data/userData";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";

/** Pengaturan akun user — preferensi notifikasi & keamanan (demo in-place). */
export default function DashboardSettingsPage() {
  const t = useTranslations("userDash.settings");
  const shellT = useTranslations("userDash");
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    bookingStatus: true,
    paymentReminder: true,
    newAnnouncements: true,
    priceDrops: false,
    tips: true,
  });
  const [saved, setSaved] = useState(false);

  return (
    <UserDashboardShell title={shellT("settingsTitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DashSection title={t("notifications")} bodyClass="divide-y divide-nk-border">
            {notificationPrefs.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-nk-text">{t(`prefs.${p.key}`)}</p>
                  <p className="text-xs text-nk-text-muted">{t(`channels.${p.channelKey}`)}</p>
                </div>
                <Switch
                  checked={prefs[p.key]}
                  onCheckedChange={(v) => setPrefs((prev) => ({ ...prev, [p.key]: v }))}
                  aria-label={t(`prefs.${p.key}`)}
                />
              </div>
            ))}
          </DashSection>

          <DashSection title={t("security")} bodyClass="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="st-pass" className="text-xs text-nk-text-muted">
                  {t("newPassword")}
                </Label>
                <Input id="st-pass" type="password" placeholder="••••••••" className="mt-1.5 h-11 md:h-9" />
              </div>
              <div>
                <Label htmlFor="st-pass2" className="text-xs text-nk-text-muted">
                  {t("confirmPassword")}
                </Label>
                <Input id="st-pass2" type="password" placeholder="••••••••" className="mt-1.5 h-11 md:h-9" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSaved(true);
                window.setTimeout(() => setSaved(false), 4000);
              }}
              className="mt-5 bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
            >
              {t("save")}
            </button>
            {saved && (
              <span role="status" className="ml-3 text-sm text-[#2F6B3C]">
                {t("saved")}
              </span>
            )}
          </DashSection>
        </div>

        <DashSection title={t("danger")} bodyClass="p-4">
          <p className="text-sm text-nk-text-muted">{t("dangerBody")}</p>
          <button
            type="button"
            className="mt-4 w-full border border-[#EBC4C0] px-4 py-2.5 text-sm text-[#9C3B32] transition-colors hover:bg-[#FAEAE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
          >
            {t("deleteAccount")}
          </button>
        </DashSection>
      </div>
    </UserDashboardShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/DashboardShell";
import { OWNER_PROFILE } from "@/lib/data/entities";

export default function OwnerSettingsPage() {
  const t = useTranslations("owner.settings");
  const [name, setName] = useState(OWNER_PROFILE.name);
  const [email, setEmail] = useState(OWNER_PROFILE.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [lang, setLang] = useState("id");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          if (json.data.fullName) setName(json.data.fullName);
          if (json.data.email) setEmail(json.data.email);
          if (json.data.avatarUrl) setAvatarUrl(json.data.avatarUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(id);
  }, [saved]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: lang as "id" | "en",
        }),
      });
      setSaved(true);
    } catch {
      // fallback
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell role="owner">
      <h1 className="mb-6 text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>

      <div className="max-w-xl rounded-lg border border-nk-border bg-nk-surface p-6">
        <p className="mb-5 text-xs text-nk-text-muted">{t("googleNote")}</p>

        <div className="flex flex-col gap-5">
          {/* foto */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="size-14 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-full bg-nk-accent text-lg font-medium text-nk-text-inverse">
                {name.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-medium text-nk-text">{t("photo")}</p>
              <p className="text-xs text-nk-text-muted">{t("googleNote")}</p>
            </div>
          </div>

          {/* nama (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner-name" className="text-sm font-medium text-nk-text">
              {t("name")}
            </label>
            <input
              id="owner-name"
              type="text"
              readOnly
              value={name}
              className="cursor-not-allowed rounded-lg border border-nk-border bg-nk-section px-4 py-2.5 text-sm text-nk-text-muted"
            />
          </div>

          {/* email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner-email" className="text-sm font-medium text-nk-text">
              {t("email")}
            </label>
            <input
              id="owner-email"
              type="email"
              readOnly
              value={email}
              className="cursor-not-allowed rounded-lg border border-nk-border bg-nk-section px-4 py-2.5 text-sm text-nk-text-muted"
            />
          </div>

          {/* bahasa (editable) */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="owner-lang" className="text-sm font-medium text-nk-text">
              {t("language")}
            </label>
            <select
              id="owner-lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-lg border border-nk-border bg-nk-bg px-4 py-2.5 text-sm text-nk-text outline-none focus:border-nk-accent"
            >
              <option value="id">{t("langId")}</option>
              <option value="en">{t("langEn")}</option>
            </select>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="w-fit rounded-lg bg-nk-accent px-6 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : t("save")}
          </button>
        </div>
      </div>

      {/* toast */}
      {saved && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-nk-text px-5 py-3 text-sm font-medium text-nk-bg shadow-lg"
        >
          {t("saved")}
        </div>
      )}
    </DashboardShell>
  );
}

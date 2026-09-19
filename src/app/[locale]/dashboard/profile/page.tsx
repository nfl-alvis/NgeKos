"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BadgeCheck, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { properties } from "@/lib/data/properties";
import { DEMO_TODAY, userProfile } from "@/lib/data/userData";
import { useUserOps } from "@/lib/userOpsStore";
import { useSession } from "@/components/SessionProvider";
import { formatIDR } from "@/lib/utils";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import ActivityList from "@/components/dashboard/ActivityList";

/** Profil akun user biasa - data diri, ringkasan akun, aktivitas penuh. */
export default function DashboardProfilePage() {
  const t = useTranslations("userDash.profile");
  const shellT = useTranslations("userDash");
  const ops = useUserOps();
  const { user, refresh } = useSession();

  const [name, setName] = useState(user?.name || userProfile.name);
  const [phone, setPhone] = useState(userProfile.phone);
  const [birthPlace, setBirthPlace] = useState(userProfile.birthPlaceId || "Bandung");
  const [occupation, setOccupation] = useState(userProfile.occupationId || "Mahasiswa");
  const [email, setEmail] = useState(user?.email || userProfile.email);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          if (json.data.fullName) setName(json.data.fullName);
          if (json.data.phone) setPhone(json.data.phone);
          if (json.data.birthPlace) setBirthPlace(json.data.birthPlace);
          if (json.data.occupation) setOccupation(json.data.occupation);
          if (json.data.email) setEmail(json.data.email);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const payload: Record<string, string> = {
        fullName: name.trim(),
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (birthPlace.trim()) payload.birthPlace = birthPlace.trim();
      if (occupation.trim()) payload.occupation = occupation.trim();

      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error?.message || json?.message || "Gagal menyimpan perubahan profil.");
        setSaving(false);
        return;
      }

      setSaved(true);
      await refresh?.();
      window.setTimeout(() => setSaved(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  const favoriteCount = ops.favorites.length;
  const city =
    properties.find((p) => p.slug === ops.favorites[0])?.city ?? userProfile.cityId;

  return (
    <UserDashboardShell title={shellT("profileTitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* identitas */}
          <DashSection title={t("identity")} bodyClass="p-4 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Image
                src={`https://picsum.photos/seed/${userProfile.avatarSeed}/128/128`}
                alt=""
                width={72}
                height={72}
                className="size-18 shrink-0 rounded-full ring-1 ring-foreground/10"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-lg font-semibold text-nk-text">
                  {name}
                  <BadgeCheck className="size-4 text-[#2F6B3C]" aria-label={t("verified")} />
                </p>
                <p className="text-sm text-nk-text-muted">{t("memberSince")}: 8 Nov 2024</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-nk-text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" aria-hidden="true" />
                    {email}
                  </span>
                  {phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5" aria-hidden="true" />
                      {phone}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {city}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-5">
                <AlertTitle>Pemberitahuan</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSave} className="mt-6 border-t border-nk-border pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pf-name" className="text-xs text-nk-text-muted">
                    {t("name")} *
                  </Label>
                  <Input
                    id="pf-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-phone" className="text-xs text-nk-text-muted">
                    {t("phone")}
                  </Label>
                  <Input
                    id="pf-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-birth" className="text-xs text-nk-text-muted">
                    {t("birth")}
                  </Label>
                  <Input
                    id="pf-birth"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    placeholder="Contoh: Bandung"
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-occupation" className="text-xs text-nk-text-muted">
                    {t("occupation")}
                  </Label>
                  <Input
                    id="pf-occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Contoh: Mahasiswa / Karyawan"
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : t("save")}
                </button>
                {saved && <span role="status" className="text-sm font-medium text-[#2F6B3C]">{t("saved")}</span>}
              </div>
            </form>
          </DashSection>

          {/* aktivitas lengkap */}
          <DashSection
            title={t("activityTitle")}
            right={
              <Link href="/dashboard" className="text-xs font-medium text-nk-accent hover:underline">
                {t("backToDashboard")}
              </Link>
            }
            bodyClass="px-4"
          >
            <ActivityList />
          </DashSection>
        </div>

        {/* ringkasan akun */}
        <aside className="flex flex-col gap-6">
          <DashSection title={t("summary")} bodyClass="divide-y divide-nk-border">
            <dl className="flex flex-col">
              {[
                { k: t("sumBookings"), v: "4" },
                { k: t("sumFavorites"), v: String(favoriteCount) },
                { k: t("sumReviews"), v: String(ops.reviews.filter((r) => r.mine).length) },
                { k: t("sumSpent"), v: formatIDR(780000) },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-sm text-nk-text-muted">{row.k}</dt>
                  <dd className="text-sm font-medium tabular-nums text-nk-text">{row.v}</dd>
                </div>
              ))}
            </dl>
          </DashSection>

          <DashSection title={t("tenancy")} bodyClass="p-4">
            <StatusBadge color="green">{t("tenancyActive")}</StatusBadge>
            <p className="mt-2 text-sm text-nk-text-muted">
              {t("tenancyNote", { date: DEMO_TODAY.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) })}
            </p>
            <Link
              href="/tenant/dashboard"
              className="mt-4 inline-flex items-center justify-center bg-nk-accent px-4 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90"
            >
              {t("tenancyCta")}
            </Link>
          </DashSection>
        </aside>
      </div>
    </UserDashboardShell>
  );
}

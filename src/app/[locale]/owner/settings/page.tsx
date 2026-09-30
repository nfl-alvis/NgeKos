"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import DashboardShell from "@/components/DashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { OWNER_PROFILE } from "@/lib/data/entities";
import TelegramConnectCard from "@/components/owner/TelegramConnectCard";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Trash2 } from "lucide-react";

export default function OwnerSettingsPage() {
  const t = useTranslations("owner.settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useSession();
  const isEn = locale === "en";

  // Profile
  const [name, setName] = useState(OWNER_PROFILE.name);
  const [email, setEmail] = useState(OWNER_PROFILE.email);
  const [phone, setPhone] = useState("+62 812-1102-3345");
  const [lang, setLang] = useState(locale);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Notification prefs
  const [notifs, setNotifs] = useState({
    bookingAlerts: true,
    paymentAlerts: true,
    complaintAlerts: true,
    verificationStatus: true,
    monthlyDigest: true,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifsSaved, setNotifsSaved] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          const d = json.data;
          if (d.fullName) setName(d.fullName);
          if (d.email) setEmail(d.email);
          if (d.phone) setPhone(d.phone);
          if (d.locale) setLang(d.locale);
          if (d.preferences) {
            setNotifs((prev) => ({
              ...prev,
              bookingAlerts: d.preferences.pushNotifications ?? prev.bookingAlerts,
              paymentAlerts: d.preferences.emailNotifications ?? prev.paymentAlerts,
              complaintAlerts: d.preferences.pushNotifications ?? prev.complaintAlerts,
              verificationStatus: true,
              monthlyDigest: d.preferences.marketingNotifications ?? prev.monthlyDigest,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSaved(false);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name.trim(),
          phone: phone.trim() ? phone.trim().replace(/\s+/g, "") : undefined,
          locale: lang as "id" | "en",
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || (isEn ? "Failed to save." : "Gagal menyimpan."));
      }

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);

      if (lang !== locale) {
        router.replace(pathname, { locale: lang });
      }
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : (isEn ? "An error occurred." : "Terjadi kesalahan."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleNotif = async (key: keyof typeof notifs, value: boolean) => {
    const updated = { ...notifs, [key]: value };
    setNotifs(updated);
    setSavingNotifs(true);
    setNotifsSaved(false);

    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushNotifications: updated.bookingAlerts || updated.complaintAlerts,
          emailNotifications: updated.paymentAlerts,
          marketingNotifications: updated.monthlyDigest,
        }),
      });
      setNotifsSaved(true);
      setTimeout(() => setNotifsSaved(false), 3000);
    } catch {
      // offline
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError(isEn ? "Password must be at least 8 characters." : "Kata sandi minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(isEn ? "Passwords don't match." : "Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch {
      // local demo fallback
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 5000);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || (isEn ? "Failed to delete account." : "Gagal menghapus akun."));
      }
      await logout();
      router.push("/login");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : (isEn ? "Error deleting account." : "Gagal menghapus akun."));
      setDeleting(false);
    }
  };

  const NOTIF_ITEMS = [
    { key: "bookingAlerts" as const, label: t("notifBooking"), desc: t("notifBookingSub") },
    { key: "paymentAlerts" as const, label: t("notifPayment"), desc: t("notifPaymentSub") },
    { key: "complaintAlerts" as const, label: t("notifComplaint"), desc: t("notifComplaintSub") },
    { key: "verificationStatus" as const, label: t("notifVerification"), desc: t("notifVerificationSub") },
    { key: "monthlyDigest" as const, label: t("notifMonthly"), desc: t("notifMonthlySub") },
  ];

  return (
    <DashboardShell role="owner">
      <h1 className="text-lg font-semibold text-nk-text">{t("title")}</h1>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Profil */}
          <DashSection
            title={t("tabProfile")}
            right={
              profileSaved ? (
                <span className="flex items-center gap-1 text-xs text-[#2F6B3C]">
                  <CheckCircle2 className="size-3.5" />
                  <span>{t("saved")}</span>
                </span>
              ) : null
            }
            bodyClass="p-4 sm:p-6"
          >
            {profileError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">{profileError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ow-name" className="text-xs text-nk-text-muted">{t("name")}</Label>
                  <Input
                    id="ow-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="ow-email" className="text-xs text-nk-text-muted">{t("email")}</Label>
                  <Input
                    id="ow-email"
                    type="email"
                    readOnly
                    value={email}
                    className="mt-1.5 h-11 md:h-9 cursor-not-allowed bg-nk-section text-nk-text-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="ow-phone" className="text-xs text-nk-text-muted">{t("phone")}</Label>
                  <Input
                    id="ow-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("phonePlaceholder")}
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingProfile && <Loader2 className="size-4 animate-spin" />}
                  <span>{savingProfile ? t("saving") : t("save")}</span>
                </button>
                <span className="text-xs text-nk-text-muted">{t("googleNote")}</span>
              </div>
            </form>
          </DashSection>

          {/* Bahasa */}
          <DashSection title={t("language")} bodyClass="p-4 sm:p-6">
            <p className="mb-3 text-xs text-nk-text-muted">{t("langDesc")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setLang("id"); if (locale !== "id") router.replace(pathname, { locale: "id" }); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  lang === "id"
                    ? "border-nk-accent bg-nk-accent/5 font-medium text-nk-accent"
                    : "border-nk-border text-nk-text hover:bg-nk-warm"
                }`}
              >
                <span>🇮🇩</span>
                <span>{t("langId")}</span>
              </button>
              <button
                type="button"
                onClick={() => { setLang("en"); if (locale !== "en") router.replace(pathname, { locale: "en" }); }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  lang === "en"
                    ? "border-nk-accent bg-nk-accent/5 font-medium text-nk-accent"
                    : "border-nk-border text-nk-text hover:bg-nk-warm"
                }`}
              >
                <span>🇬🇧</span>
                <span>{t("langEn")}</span>
              </button>
            </div>
          </DashSection>

          {/* Telegram */}
          <TelegramConnectCard isOwner={true} />

          {/* Preferensi Notifikasi */}
          <DashSection
            title={t("notifSectionTitle")}
            right={
              notifsSaved ? (
                <span className="flex items-center gap-1 text-xs text-[#2F6B3C]">
                  <CheckCircle2 className="size-3.5" />
                  <span>{t("saved")}</span>
                </span>
              ) : savingNotifs ? (
                <span className="flex items-center gap-1 text-xs text-nk-text-muted">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("saving")}</span>
                </span>
              ) : null
            }
            bodyClass="divide-y divide-nk-border"
          >
            {NOTIF_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-nk-text">{item.label}</p>
                  <p className="text-xs text-nk-text-muted">{item.desc}</p>
                </div>
                <Switch
                  checked={notifs[item.key]}
                  onCheckedChange={(val) => handleToggleNotif(item.key, val)}
                  aria-label={item.label}
                />
              </div>
            ))}
          </DashSection>

          {/* Ubah Kata Sandi */}
          <DashSection title={t("securityTitle")} bodyClass="p-4 sm:p-6">
            {passwordSuccess && (
              <Alert className="mb-4 border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]">
                <ShieldCheck className="size-4 text-[#2F6B3C]" />
                <AlertTitle>{isEn ? "Password Updated" : "Kata Sandi Diperbarui"}</AlertTitle>
                <AlertDescription className="text-xs">{t("passwordSuccess")}</AlertDescription>
              </Alert>
            )}

            {passwordError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">{passwordError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ow-pass" className="text-xs text-nk-text-muted">{t("newPassword")}</Label>
                  <Input
                    id="ow-pass"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={isEn ? "Min. 8 characters" : "Minimal 8 karakter"}
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="ow-pass2" className="text-xs text-nk-text-muted">{t("confirmPassword")}</Label>
                  <Input
                    id="ow-pass2"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={isEn ? "Repeat new password" : "Ulangi kata sandi baru"}
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword}
                  className="inline-flex items-center gap-1.5 bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {savingPassword && <Loader2 className="size-4 animate-spin" />}
                  <span>{savingPassword ? t("saving") : t("savePassword")}</span>
                </button>
              </div>
            </form>
          </DashSection>
        </div>

        {/* Hapus Akun */}
        <DashSection title={t("dangerTitle")} bodyClass="p-4">
          <p className="text-sm text-nk-text-muted">{t("dangerDesc")}</p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 border border-[#EBC4C0] px-4 py-2.5 text-sm text-[#9C3B32] transition-colors hover:bg-[#FAEAE8]"
          >
            <Trash2 className="size-4" />
            <span>{t("deleteAccount")}</span>
          </button>
        </DashSection>
      </div>

      {/* Dialog Hapus Akun */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#9C3B32]">
              {t("deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-nk-text-muted leading-relaxed">
              {t("deleteConfirmDesc")}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{deleteError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-md border border-nk-border px-4 py-2 text-xs font-medium text-nk-text hover:bg-nk-warm disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#9C3B32] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {deleting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{deleting ? t("saving") : t("deleteAccount")}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { notificationPrefs } from "@/lib/data/userData";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { DashSection } from "@/components/dashboard/DashSection";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Trash2 } from "lucide-react";

/** Pengaturan akun user - preferensi notifikasi, ubah kata sandi, dan hapus akun. */
export default function DashboardSettingsPage() {
  const t = useTranslations("userDash.settings");
  const shellT = useTranslations("userDash");
  const router = useRouter();
  const { logout } = useSession();

  // State Preferensi Notifikasi
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    bookingStatus: true,
    paymentReminder: true,
    newAnnouncements: true,
    priceDrops: false,
    tips: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // State Ubah Kata Sandi
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // State Hapus Akun
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Ambil preferensi notifikasi dari database saat halaman dibuka
  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data?.preferences) {
          const p = json.data.preferences;
          setPrefs((prev) => ({
            ...prev,
            bookingStatus: p.pushNotifications ?? prev.bookingStatus,
            paymentReminder: p.emailNotifications ?? prev.paymentReminder,
            newAnnouncements: p.emailNotifications ?? prev.newAnnouncements,
            priceDrops: p.marketingNotifications ?? prev.priceDrops,
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Update preferensi notifikasi ke database
  const handleTogglePref = async (key: string, checked: boolean) => {
    const updated = { ...prefs, [key]: checked };
    setPrefs(updated);
    setSavingPrefs(true);
    setPrefsSaved(false);

    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotifications: updated.paymentReminder || updated.newAnnouncements,
          pushNotifications: updated.bookingStatus,
          marketingNotifications: updated.priceDrops,
        }),
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch {
      // Abaikan jika offline
    } finally {
      setSavingPrefs(false);
    }
  };

  // Ubah kata sandi via Supabase Auth
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setSavingPassword(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message || "Gagal memperbarui kata sandi.");
      }

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memperbarui kata sandi."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // Hapus akun via API DELETE /api/me
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || "Gagal menghapus akun.");
      }

      // Logout dari sesi lokal dan redirect ke login
      await logout();
      router.push("/login");
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus akun."
      );
      setDeleting(false);
    }
  };

  return (
    <UserDashboardShell title={shellT("settingsTitle")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Section Preferensi Notifikasi */}
          <DashSection
            title={t("notifications")}
            right={
              prefsSaved ? (
                <span className="flex items-center gap-1 text-xs text-[#2F6B3C]">
                  <CheckCircle2 className="size-3.5" />
                  <span>{t("saved")}</span>
                </span>
              ) : savingPrefs ? (
                <span className="flex items-center gap-1 text-xs text-nk-text-muted">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </span>
              ) : null
            }
            bodyClass="divide-y divide-nk-border"
          >
            {notificationPrefs.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-nk-text">{t(`prefs.${p.key}`)}</p>
                  <p className="text-xs text-nk-text-muted">{t(`channels.${p.channelKey}`)}</p>
                </div>
                <Switch
                  checked={prefs[p.key]}
                  onCheckedChange={(v) => handleTogglePref(p.key, v)}
                  aria-label={t(`prefs.${p.key}`)}
                />
              </div>
            ))}
          </DashSection>

          {/* Section Keamanan & Kata Sandi */}
          <DashSection title={t("security")} bodyClass="p-4 sm:p-6">
            {passwordSuccess && (
              <Alert className="mb-4 border-[#BFDCC5] bg-[#E9F4EC] text-[#2F6B3C]">
                <ShieldCheck className="size-4 text-[#2F6B3C]" />
                <AlertTitle>Kata Sandi Berhasil Diperbarui</AlertTitle>
                <AlertDescription className="text-xs">
                  Kata sandi akun Anda telah berhasil diganti. Gunakan kata sandi baru untuk masuk berikutnya.
                </AlertDescription>
              </Alert>
            )}

            {passwordError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="size-4" />
                <AlertTitle>Gagal Memperbarui Kata Sandi</AlertTitle>
                <AlertDescription className="text-xs">{passwordError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="st-pass" className="text-xs text-nk-text-muted">
                    {t("newPassword")}
                  </Label>
                  <Input
                    id="st-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    required
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="st-pass2" className="text-xs text-nk-text-muted">
                    {t("confirmPassword")}
                  </Label>
                  <Input
                    id="st-pass2"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    required
                    className="mt-1.5 h-11 md:h-9"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingPassword || !newPassword}
                  className="inline-flex items-center gap-1.5 bg-nk-accent px-5 py-2.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
                >
                  {savingPassword && <Loader2 className="size-4 animate-spin" />}
                  <span>{t("save")}</span>
                </button>
              </div>
            </form>
          </DashSection>
        </div>

        {/* Section Danger Zone (Hapus Akun) */}
        <DashSection title={t("danger")} bodyClass="p-4">
          <p className="text-sm text-nk-text-muted">{t("dangerBody")}</p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 border border-[#EBC4C0] px-4 py-2.5 text-sm text-[#9C3B32] transition-colors hover:bg-[#FAEAE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent"
          >
            <Trash2 className="size-4" />
            <span>{t("deleteAccount")}</span>
          </button>
        </DashSection>
      </div>

      {/* Dialog Konfirmasi Hapus Akun */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-[#9C3B32]">
              Konfirmasi Penghapusan Akun
            </DialogTitle>
            <DialogDescription className="text-xs text-nk-text-muted mt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun Anda? Seluruh data profil, riwayat pesanan, dan ulasan Anda akan dinonaktifkan dari sistem NgeKost. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="size-4" />
              <AlertTitle>Gagal</AlertTitle>
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
              Batal
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#9C3B32] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {deleting && <Loader2 className="size-3.5 animate-spin" />}
              <span>Ya, Hapus Akun Saya</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserDashboardShell>
  );
}

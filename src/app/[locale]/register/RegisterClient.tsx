"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import GoogleButton from "@/components/GoogleButton";
import { useSession } from "@/components/SessionProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

const fieldClass =
  "h-11 rounded-lg border border-nk-border bg-nk-surface px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none transition-colors w-full";
const primaryCta =
  "mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

export default function RegisterClient({
  defaultRole,
}: {
  defaultRole?: "seeker" | "owner";
} = {}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-nk-bg" aria-busy="true" />}>
      <RegisterInner defaultRole={defaultRole} />
    </Suspense>
  );
}

function RegisterInner({
  defaultRole,
}: {
  defaultRole?: "seeker" | "owner";
}) {
  const t = useTranslations("daftar");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle, refresh } = useSession();

  const initialRole =
    defaultRole ?? (searchParams.get("role") === "owner" ? "owner" : "seeker");
  const [role, setRole] = useState<"seeker" | "owner">(initialRole);

  // Sync role if defaultRole or query param changes
  useEffect(() => {
    if (defaultRole) {
      setRole(defaultRole);
    } else {
      const q = searchParams.get("role");
      if (q === "owner") setRole("owner");
      else if (q === "seeker") setRole("seeker");
    }
  }, [defaultRole, searchParams]);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(true);

  // OTP State
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // UI state
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (step !== "otp") return;
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const phoneValid = /^(\+62|0)8\d{7,12}$/.test(phone.replace(/[\s-]/g, ""));
  const passwordMatch = password.length > 0 && password === confirmPassword;

  const canSubmitForm =
    fullName.trim().length >= 2 &&
    phoneValid &&
    /.+@.+\..+/.test(email.trim()) &&
    password.length >= 8 &&
    passwordMatch &&
    agree;

  // Handle Form Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitForm || pending) return;

    setPending(true);
    setFeedback(null);

    const formattedPhone = phone.replace(/[\s-]/g, "");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: formattedPhone,
          email: email.trim().toLowerCase(),
          password,
          role,
          locale,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message ?? "Pendaftaran gagal");
      }

      // If Supabase does not require confirmation (already active)
      if (!data.data?.requiresEmailConfirmation) {
        setFeedback({
          kind: "success",
          message: "Pendaftaran berhasil! Mengalihkan...",
        });
        try {
          await refresh();
        } catch {
          // ignore
        }
        setTimeout(() => {
          if (role === "owner") {
            router.push(`/${locale}/owner/properties/new`);
          } else {
            router.push(`/${locale}/dashboard`);
          }
        }, 800);
        return;
      }

      // Successful registration, advance to OTP verification
      setStep("otp");
      setResendTimer(60);
      setCanResend(false);
      setFeedback({
        kind: "success",
        message: "Kode OTP verifikasi telah dikirim ke email Anda.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat pendaftaran.";
      setFeedback({ kind: "error", message: msg });
    } finally {
      setPending(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 8 || pending) return;

    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
          role,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message ?? "Kode OTP tidak valid atau kedaluwarsa.");
      }

      // Refresh session in memory
      try {
        await refresh();
      } catch {
        // ignore refresh error
      }

      setFeedback({
        kind: "success",
        message: "Verifikasi berhasil! Mengalihkan...",
      });

      // Redirect according to role
      setTimeout(() => {
        if (role === "owner") {
          router.push(`/${locale}/owner/properties/new`);
        } else {
          router.push(`/${locale}/dashboard`);
        }
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verifikasi OTP gagal.";
      setFeedback({ kind: "error", message: msg });
    } finally {
      setPending(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || pending) return;

    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error?.message ?? "Gagal mengirim ulang kode OTP.");
      }

      setResendTimer(60);
      setCanResend(false);
      setFeedback({
        kind: "success",
        message: "Kode OTP baru telah dikirimkan ke email Anda.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim ulang kode OTP.";
      setFeedback({ kind: "error", message: msg });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-dvh bg-nk-bg p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-[1500px] overflow-hidden lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left Side Hero Banner - Matching Login */}
        <section
          className="relative hidden overflow-hidden rounded-lg bg-nk-warm lg:block"
          aria-label="NgeKost Hunian Nyaman"
        >
          <Image
            src="/images/about-hero-wide.jpg"
            alt="Suasana hunian kost NgeKost"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 52vw, 0px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
            <p className="max-w-lg text-3xl font-light leading-tight tracking-tight">
              {role === "owner"
                ? "Kelola properti kos Anda dengan praktis dan raih calon penyewa terbaik di NgeKost."
                : "Cari kost idamanmu atau kelola properti kos dengan praktis di NgeKost."}
            </p>
          </div>
        </section>

        {/* Right Side Form / Card */}
        <section className="flex min-h-[calc(100dvh-2rem)] items-center justify-center px-5 py-10 sm:px-10 lg:min-h-0 lg:px-14 xl:px-20">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between">
              <Logo className="inline-flex h-9 w-auto text-nk-accent" />
            </div>

            {step === "form" ? (
              <div>
                {/* Header Titles */}
                <h1 className="text-2xl font-semibold tracking-tight text-nk-text sm:text-3xl">
                  {role === "owner" ? "Daftar Pemilik Kos" : "Daftar Akun Baru"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">
                  {role === "owner"
                    ? "Daftarkan diri Anda untuk mulai menyewakan properti kos."
                    : "Lengkapi data diri Anda untuk mencari dan memesan kos idaman."}
                </p>

                {/* Role Switcher */}
                <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-nk-border bg-nk-warm p-1">
                  <button
                    type="button"
                    onClick={() => setRole("seeker")}
                    className={`rounded-md px-3 py-2 text-center text-sm font-medium transition-colors ${
                      role === "seeker"
                        ? "bg-nk-surface text-nk-text shadow-sm"
                        : "text-nk-text-muted hover:text-nk-text"
                    }`}
                  >
                    Pencari Kos
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("owner")}
                    className={`rounded-md px-3 py-2 text-center text-sm font-medium transition-colors ${
                      role === "owner"
                        ? "bg-nk-surface text-nk-text shadow-sm"
                        : "text-nk-text-muted hover:text-nk-text"
                    }`}
                  >
                    Pemilik Kos
                  </button>
                </div>

                {/* Google Button */}
                <div className="mt-5">
                  <GoogleButton
                    label="Daftar dengan Google"
                    onClick={() =>
                      void loginWithGoogle(role, "register").catch((err) =>
                        setFeedback({
                          kind: "error",
                          message: err instanceof Error ? err.message : "Login Google gagal",
                        })
                      )
                    }
                    disabled={pending}
                  />
                </div>

                <div className="my-5 flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-nk-border" />
                  <span className="text-xs uppercase tracking-wider text-nk-text-muted">
                    atau isi formulir
                  </span>
                  <span className="h-px flex-1 bg-nk-border" />
                </div>

                {/* Feedback Alerts */}
                {feedback && (
                  <Alert
                    variant={feedback.kind === "error" ? "destructive" : "default"}
                    className="mb-4 py-2.5"
                  >
                    {feedback.kind === "error" ? (
                      <AlertCircle className="size-4" />
                    ) : (
                      <CheckCircle className="size-4 text-emerald-600" />
                    )}
                    <AlertDescription>{feedback.message}</AlertDescription>
                  </Alert>
                )}

                {/* Registration Form */}
                <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">Nama Lengkap</span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nama lengkap sesuai KTP"
                      className={fieldClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">Nomor Handphone</span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className={fieldClass}
                    />
                    {phone.length > 3 && !phoneValid && (
                      <span className="text-xs text-rose-500">
                        Format nomor ponsel tidak valid (contoh: 08123456789)
                      </span>
                    )}
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">Email</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className={fieldClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">Password</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className={fieldClass}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-nk-text">Ulangi Password</span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi Anda"
                      className={fieldClass}
                    />
                    {confirmPassword.length > 0 && !passwordMatch && (
                      <span className="text-xs text-rose-500">
                        Kata sandi tidak cocok. Silakan periksa kembali.
                      </span>
                    )}
                  </label>

                  <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-xs text-nk-text-muted">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-0.5 size-4 accent-[#3A2618]"
                    />
                    <span>
                      Saya menyetujui{" "}
                      <Link
                        href="/legal/syarat-ketentuan"
                        className="text-nk-accent underline underline-offset-2"
                      >
                        Syarat &amp; Ketentuan
                      </Link>{" "}
                      serta{" "}
                      <Link
                        href="/legal/privasi"
                        className="text-nk-accent underline underline-offset-2"
                      >
                        Kebijakan Privasi
                      </Link>{" "}
                      NgeKost.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={!canSubmitForm || pending}
                    className={primaryCta}
                  >
                    {pending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Memproses Pendaftaran...
                      </span>
                    ) : (
                      "Daftar Sekarang"
                    )}
                  </button>
                </form>

                {/* Login Redirect Option */}
                <p className="mt-6 text-center text-sm text-nk-text-muted">
                  Sudah punya akun?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-nk-accent underline underline-offset-2 transition-colors hover:opacity-80"
                  >
                    Masuk di sini
                  </Link>
                </p>
              </div>
            ) : (
              /* Step 2: OTP Verification */
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setFeedback(null);
                  }}
                  className="-ml-2 mb-4 inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-nk-text-muted transition-colors hover:text-nk-text"
                >
                  <ArrowLeft className="size-3.5" />
                  Ubah data pendaftaran
                </button>

                <h1 className="text-2xl font-semibold tracking-tight text-nk-text sm:text-3xl">
                  Verifikasi Email Anda
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">
                  Kami telah mengirimkan 8 digit kode verifikasi OTP ke{" "}
                  <span className="font-semibold text-nk-text">{email}</span>. Silakan masukkan
                  kode di bawah ini.
                </p>

                {feedback && (
                  <Alert
                    variant={feedback.kind === "error" ? "destructive" : "default"}
                    className="mt-4 py-2.5"
                  >
                    {feedback.kind === "error" ? (
                      <AlertCircle className="size-4" />
                    ) : (
                      <CheckCircle className="size-4 text-emerald-600" />
                    )}
                    <AlertDescription>{feedback.message}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col items-center gap-6">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={8}
                      value={otp}
                      onChange={(val) => setOtp(val)}
                      disabled={pending}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="size-9 sm:size-11" />
                        <InputOTPSlot index={1} className="size-9 sm:size-11" />
                        <InputOTPSlot index={2} className="size-9 sm:size-11" />
                        <InputOTPSlot index={3} className="size-9 sm:size-11" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={4} className="size-9 sm:size-11" />
                        <InputOTPSlot index={5} className="size-9 sm:size-11" />
                        <InputOTPSlot index={6} className="size-9 sm:size-11" />
                        <InputOTPSlot index={7} className="size-9 sm:size-11" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <button
                    type="submit"
                    disabled={otp.length !== 8 || pending}
                    className={primaryCta}
                  >
                    {pending ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Memverifikasi Kode...
                      </span>
                    ) : (
                      "Verifikasi & Lanjutkan"
                    )}
                  </button>

                  <div className="text-center">
                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={pending}
                        className="text-xs font-medium text-nk-accent underline underline-offset-2 hover:opacity-80"
                      >
                        Kirim Ulang Kode OTP
                      </button>
                    ) : (
                      <span className="text-xs text-nk-text-muted">
                        Kirim ulang kode dalam {resendTimer} detik
                      </span>
                    )}
                  </div>
                </form>

                <p className="mt-8 text-center text-xs text-nk-text-muted">
                  Salah memasukkan alamat email?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setFeedback(null);
                    }}
                    className="font-medium text-nk-accent underline underline-offset-2"
                  >
                    Perbaiki Email
                  </button>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

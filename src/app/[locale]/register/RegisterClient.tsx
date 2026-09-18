"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import GoogleButton from "@/components/GoogleButton";
import { useSession } from "@/components/SessionProvider";

/* ============================================================
   Alur pendaftaran owner terinspirasi Mamikos: phone-first.
   Masuk nomor WhatsApp → OTP → data diri → kos pertama → done.
   Desain memakai design system NgeKost (warm cream, flat,
   accent #3A2618, Geist, rounded-lg) — bukan tiruan visual.
   ============================================================ */

type Gender = "campur" | "putra" | "putri";

const TOTAL_STEPS = 4; // 1: WhatsApp, 2: OTP, 3: Data diri, 4: Kos pertama

const fieldClass =
  "h-11 rounded-lg border border-nk-border bg-nk-bg px-4 text-sm text-nk-text placeholder:text-nk-text-muted/60 focus:border-nk-accent focus:outline-none";
const primaryCta =
  "mt-1 inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";
const backLink =
  "-ml-2 inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-nk-text-muted transition-colors hover:text-nk-text";

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={backLink}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}

export default function RegisterClient() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const t = useTranslations("daftar");
  const searchParams = useSearchParams();
  const role: "seeker" | "owner" = searchParams.get("role") === "owner" ? "owner" : "seeker";

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-nk-bg px-6 py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <div className="mb-8 flex justify-center">
          <Logo className="h-9 w-auto text-nk-accent" />
        </div>

        {role === "owner" ? <OwnerWizard /> : <SeekerForm />}

        <p className="mt-6 text-center text-sm text-nk-text-muted">
          {t("haveAccount")}{" "}
          <Link href={`/login?role=${role}`} className="font-medium text-nk-accent transition-colors hover:opacity-80">
            {t("login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ===== stepper ===== */

function StepIndicator({ current }: { current: number }) {
  const ot = useTranslations("daftar.owner");
  const labels = [ot("stepWa"), ot("stepOtp"), ot("stepProfile"), ot("stepProperty")];
  return (
    <div>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {labels.map((label, i) => {
          const idx = i + 1;
          const reached = idx <= current;
          return (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full transition-colors ${
                reached ? "bg-nk-accent" : "bg-nk-border"
              }`}
            />
          );
        })}
      </div>
      <p className="mt-3 text-xs font-medium text-nk-text-muted" aria-live="polite">
        {ot("stepOf", { current, total: TOTAL_STEPS })} — {labels[current - 1]}
      </p>
    </div>
  );
}

/* ===== wizard owner ===== */

function OwnerWizard() {
  const ot = useTranslations("daftar.owner");
  const [step, setStep] = useState(1);

  const [wa, setWa] = useState("");
  const [ownerName, setOwnerName] = useState("");

  const waNormalized = useMemo(() => wa.replace(/[\s-]/g, ""), [wa]);
  const waValid = /^(\+62|0)8\d{7,12}$/.test(waNormalized);
  const prettyPhone = waNormalized.startsWith("+62")
    ? waNormalized
    : `+62 ${waNormalized.replace(/^0/, "")}`;

  return (
    <div className="w-full max-w-md">
      <div className="rounded-lg border border-nk-border bg-nk-surface p-8 shadow-sm">
        <h1 className="text-2xl font-light tracking-tight text-nk-text">{ot("heroTitle")}</h1>
        <div className="mt-5">
          <StepIndicator current={Math.min(step, TOTAL_STEPS)} />
        </div>

        {step === 1 && (
          <WaStep wa={wa} waValid={waValid} onChange={setWa} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <OtpStep phone={prettyPhone} onBack={() => setStep(1)} onNext={() => setStep(3)} />
        )}
        {step === 3 && (
          <ProfileStep
            ownerName={ownerName}
            onBack={() => setStep(2)}
            onNext={(name) => {
              setOwnerName(name);
              setStep(4);
            }}
          />
        )}
        {step === 4 && <PropertyStep ownerName={ownerName} onDone={() => setStep(5)} />}
        {step >= 5 && <SuccessStep ownerName={ownerName} />}
      </div>
    </div>
  );
}

/* ===== step 1: WhatsApp ===== */

function WaStep({
  wa,
  waValid,
  onChange,
  onNext,
}: {
  wa: string;
  waValid: boolean;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const ot = useTranslations("daftar.owner");
  const t = useTranslations("daftar");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (waValid) onNext();
      }}
    >
      <h2 className="mt-4 text-lg font-medium text-nk-text">{ot("waTitle")}</h2>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-nk-text">{t("wa")}</span>
        <input
          type="tel"
          inputMode="tel"
          required
          autoFocus
          value={wa}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("waPlaceholder")}
          aria-describedby="owner-wa-helper"
          aria-invalid={wa.length > 0 && !waValid}
          className={fieldClass}
        />
        <span id="owner-wa-helper" className="text-xs text-nk-text-muted">
          {ot("waBody")}
        </span>
      </label>
      <button type="submit" disabled={!waValid} className={primaryCta}>
        {ot("waCta")}
      </button>
    </form>
  );
}

/* ===== step 2: OTP ===== */

function OtpStep({
  phone,
  onBack,
  onNext,
}: {
  phone: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const ot = useTranslations("daftar.owner");
  const LEN = 6;
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [seconds, setSeconds] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const complete = digits.every((d) => d !== "");

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      // paste / autofill
      const next = Array(LEN).fill("");
      clean.slice(0, LEN).split("").forEach((d, j) => (next[j] = d));
      setDigits(next);
      inputs.current[Math.min(clean.length, LEN - 1)]?.focus();
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < LEN - 1) inputs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete) onNext();
      }}
    >
      <div className="mt-4">
        <BackButton onClick={onBack} label={ot("back")} />
      </div>
      <h2 className="-mt-2 text-lg font-medium text-nk-text">{ot("otpTitle")}</h2>
      <p className="-mt-2 text-sm leading-relaxed text-nk-text-muted">{ot("otpSentTo", { phone })}</p>

      <div className="flex justify-between gap-2" role="group" aria-label={ot("otpTitle")}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={d}
            autoFocus={i === 0}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text").replace(/\D/g, "");
              if (text === "") return;
              const next = Array(LEN).fill("");
              text.slice(0, LEN).split("").forEach((c, j) => (next[j] = c));
              setDigits(next);
              inputs.current[Math.min(text.length, LEN - 1)]?.focus();
            }}
            aria-label={`Digit ${i + 1}`}
            className="h-12 w-full rounded-lg border border-nk-border bg-nk-bg text-center text-lg font-medium text-nk-text focus:border-nk-accent focus:outline-none"
          />
        ))}
      </div>

      <p className="text-xs text-nk-text-muted" aria-live="polite">
        {seconds > 0 ? ot("otpResendIn", { seconds }) : ot("otpResend")}
      </p>
      <p className="-mt-2 text-xs text-nk-text-muted/70">{ot("otpDemo")}</p>
      <button type="submit" disabled={!complete} className={primaryCta}>
        {ot("otpCta")}
      </button>
    </form>
  );
}

/* ===== step 3: data diri ===== */

function ProfileStep({
  ownerName,
  onBack,
  onNext,
}: {
  ownerName: string;
  onBack: () => void;
  onNext: (name: string) => void;
}) {
  const t = useTranslations("daftar");
  const ot = useTranslations("daftar.owner");
  const [name, setName] = useState(ownerName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const valid = name.trim() !== "" && /.+@.+\..+/.test(email) && password.length >= 8;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onNext(name);
      }}
    >
      <div className="mt-4">
        <BackButton onClick={onBack} label={ot("back")} />
      </div>
      <h2 className="-mt-2 text-lg font-medium text-nk-text">{ot("profileTitle")}</h2>
      <p className="-mt-2 text-sm leading-relaxed text-nk-text-muted">{ot("profileBody")}</p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-nk-text">{t("name")}</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-nk-text">{t("email")}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-nk-text">{t("password")}</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          aria-describedby="owner-pw-helper"
          className={fieldClass}
        />
        <span id="owner-pw-helper" className="text-xs text-nk-text-muted">
          {t("passwordHelper")}
        </span>
      </label>
      <button type="submit" disabled={!valid} className={primaryCta}>
        {ot("continue")}
      </button>
    </form>
  );
}

/* ===== step 4: kos pertama ===== */

function PropertyStep({
  ownerName,
  onDone,
}: {
  ownerName: string;
  onDone: () => void;
}) {
  const ot = useTranslations("daftar.owner");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [rooms, setRooms] = useState("");
  const [gender, setGender] = useState<Gender>("campur");

  const valid = name.trim() !== "" && city.trim() !== "" && /^\d{1,3}$/.test(rooms);
  const first = ownerName.trim() !== "" ? ownerName.split(" ")[0] : "";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onDone();
      }}
    >
      <h2 className="mt-4 text-lg font-medium text-nk-text">
        {first !== "" ? `${first}, ` : ""}
        {ot("propTitle")}
      </h2>
      <p className="-mt-2 text-sm leading-relaxed text-nk-text-muted">{ot("propBody")}</p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-nk-text">{ot("propName")}</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={ot("propNamePlaceholder")}
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-nk-text">{ot("propCity")}</span>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={ot("propCityPlaceholder")}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-nk-text">{ot("propRooms")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            required
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            placeholder={ot("propRoomsPlaceholder")}
            className={fieldClass}
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-nk-text">{ot("propGender")}</legend>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-nk-border bg-nk-warm p-1">
          {(["campur", "putra", "putri"] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={gender === g}
              onClick={() => setGender(g)}
              className={`rounded-md px-2 py-2 text-center text-sm transition-colors ${
                gender === g
                  ? "bg-nk-surface font-medium text-nk-text shadow-sm"
                  : "text-nk-text-muted hover:text-nk-text"
              }`}
            >
              {g === "campur" ? ot("genderMix") : g === "putra" ? ot("genderMale") : ot("genderFemale")}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={!valid} className={primaryCta}>
        {ot("propCta")}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-center text-sm font-medium text-nk-text-muted underline-offset-4 transition-colors hover:text-nk-text hover:underline"
      >
        {ot("propSkip")}
      </button>
    </form>
  );
}

/* ===== step 5: sukses ===== */

function SuccessStep({ ownerName }: { ownerName: string }) {
  const ot = useTranslations("daftar.owner");
  const items = [ot("successItem1"), ot("successItem2"), ot("successItem3")];
  const first = ownerName.trim() !== "" ? ownerName.split(" ")[0] : "";

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-nk-accent/10 text-nk-accent">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      <h2 className="mt-4 text-xl font-medium tracking-tight text-nk-text">
        {first !== "" ? `${first}, ` : ""}
        {ot("successTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">{ot("successBody")}</p>

      <ul className="mt-6 w-full space-y-3 text-left">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-nk-text">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-nk-accent"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {item}
          </li>
        ))}
      </ul>

      <Link href="/owner" className={`${primaryCta} mt-8`}>
        {ot("successCta")}
      </Link>
      <Link
        href="/mitra"
        className="mt-3 text-sm font-medium text-nk-text-muted underline-offset-4 transition-colors hover:text-nk-text hover:underline"
      >
        {ot("successSecondary")}
      </Link>
    </div>
  );
}

/* ===== form seeker (form lama) ===== */

function SeekerForm() {
  const t = useTranslations("daftar");
  const { loginWithGoogle } = useSession();
  const [form, setForm] = useState({ name: "", email: "", wa: "", password: "", agree: false });
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: k === "agree" ? e.target.checked : e.target.value }));

  const canSubmit =
    form.name.trim() !== "" &&
    /.+@.+\..+/.test(form.email) &&
    /^(\+62|0)8\d{7,12}$/.test(form.wa.replace(/[\s-]/g, "")) &&
    form.password.length >= 8 &&
    form.agree;

  const submit = async () => {
    setPending(true);
    setFeedback(null);
    try {
      const locale = location.pathname.split("/")[1] === "en" ? "en" : "id";
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, fullName: form.name, phone: form.wa.replace(/[\s-]/g, ""), role: "seeker", locale }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body?.error?.message ?? "Pendaftaran gagal");
      setFeedback({ kind: "success", message: body.data.requiresEmailConfirmation ? "Pendaftaran berhasil. Periksa email untuk konfirmasi akun." : "Pendaftaran berhasil." });
    } catch (reason) {
      setFeedback({ kind: "error", message: reason instanceof Error ? reason.message : "Pendaftaran gagal" });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-lg border border-nk-border bg-nk-surface p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-nk-accent/10 px-3 py-1 text-xs font-medium text-nk-accent">
            {t("roleSeeker")}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-light tracking-tight text-nk-text">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">{t("subtitle")}</p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-nk-border bg-nk-warm p-1">
          <Link
            href="/register?role=seeker"
            className="rounded-md bg-nk-surface px-3 py-2 text-center text-sm font-medium text-nk-text shadow-sm"
          >
            {t("roleSeeker")}
          </Link>
          <Link
            href="/register?role=owner"
            className="rounded-md px-3 py-2 text-center text-sm text-nk-text-muted transition-colors hover:text-nk-text"
          >
            {t("roleOwner")}
          </Link>
        </div>

        <div className="mt-6">
          <GoogleButton label={t("google")} onClick={() => void loginWithGoogle("seeker", "register").catch((reason) => setFeedback({ kind: "error", message: reason instanceof Error ? reason.message : "Login Google gagal" }))} disabled={pending} />
        </div>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-nk-border" />
          <span className="text-xs text-nk-text-muted">{t("or")}</span>
          <span className="h-px flex-1 bg-nk-border" />
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit && !pending) void submit();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-nk-text">{t("name")}</span>
            <input
              type="text"
              required
              value={form.name}
              onChange={set("name")}
              placeholder={t("namePlaceholder")}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-nk-text">{t("email")}</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={set("email")}
              placeholder={t("emailPlaceholder")}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-nk-text">{t("wa")}</span>
            <input
              type="tel"
              required
              value={form.wa}
              onChange={set("wa")}
              placeholder={t("waPlaceholder")}
              aria-describedby="wa-helper"
              className={fieldClass}
            />
            <span id="wa-helper" className="text-xs text-nk-text-muted">
              {t("waHelper")}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-nk-text">{t("password")}</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={set("password")}
              placeholder={t("passwordPlaceholder")}
              aria-describedby="pw-helper"
              className={fieldClass}
            />
            <span id="pw-helper" className="text-xs text-nk-text-muted">
              {t("passwordHelper")}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-nk-text">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={set("agree")}
              className="mt-0.5 size-4 accent-[#3A2618]"
            />
            <span>
              {t("agree")}{" "}
              <Link href="/legal/syarat-ketentuan" className="text-nk-accent underline underline-offset-2">
                {t("terms")}
              </Link>{" "}
              &amp;{" "}
              <Link href="/legal/privasi" className="text-nk-accent underline underline-offset-2">
                {t("privacy")}
              </Link>
            </span>
          </label>

          {feedback && (
            <p role="status" className={feedback.kind === "error" ? "text-sm text-red-700" : "text-sm text-green-700"}>
              {feedback.message}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || pending}
            className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

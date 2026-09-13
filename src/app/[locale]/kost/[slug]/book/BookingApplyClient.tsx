"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link, useRouter as useI18nRouter } from "@/i18n/navigation";
import { getPropertyBySlug } from "@/lib/data/properties";
import { formatIDR, cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import StartDateField from "@/components/StartDateField";

type Step = 0 | 1 | 2;
const STEPS = ["kamar", "data", "konfirmasi"] as const;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Stepper({ step, t }: { step: Step; t: ReturnType<typeof useTranslations> }) {
  return (
    <ol className="flex items-center gap-2" aria-label={t("stepsAria")}>
      {STEPS.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full items-center">
            <div className={cn("h-0.5 flex-1 rounded-full", i === 0 ? "bg-transparent" : i <= step ? "bg-nk-accent" : "bg-nk-border")} />
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors duration-200",
                i < step
                  ? "bg-nk-accent text-nk-text-inverse"
                  : i === step
                    ? "border-2 border-nk-accent bg-nk-bg text-nk-accent"
                    : "border-2 border-nk-border bg-nk-bg text-nk-text-muted"
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? <CheckIcon className="size-4" /> : i + 1}
            </span>
            <div className={cn("h-0.5 flex-1 rounded-full", i === STEPS.length - 1 ? "bg-transparent" : i < step ? "bg-nk-accent" : "bg-nk-border")} />
          </div>
          <span className={cn("text-xs", i === step ? "font-medium text-nk-text" : "text-nk-text-muted")}>
            {t(`step.${s}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function BookingApplyPage() {
  const t = useTranslations("booking");
  const params = useParams<{ locale: string; slug: string }>();
  const searchParams = useSearchParams();
  const i18nRouter = useI18nRouter();

  const slug = params.slug;
  const property = getPropertyBySlug(slug);
  const rooms = useMemo(() => (property ? property.roomTypes.filter((r) => r.available > 0) : []), [property]);

  const initialRoom = searchParams.get("kamar") ?? rooms[0]?.id ?? "";
  const prefillDate = searchParams.get("tanggal") ?? "";
  const prefillMonths = Number(searchParams.get("bulan"));
  const [step, setStep] = useState<Step>(
    prefillDate && [1, 3, 6, 12].includes(prefillMonths) ? 1 : 0
  );
  const [roomId, setRoomId] = useState(rooms.some((r) => r.id === initialRoom) ? initialRoom : rooms[0]?.id ?? "");
  const [months, setMonths] = useState(
    [1, 3, 6, 12].includes(prefillMonths) ? prefillMonths : 3
  );
  const [startDate, setStartDate] = useState(
    /^\d{4}-\d{2}-\d{2}$/.test(prefillDate) && prefillDate >= new Date().toISOString().slice(0, 10)
      ? prefillDate
      : ""
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!property || rooms.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:px-10">
        <p className="text-sm text-nk-text-muted">{t("notFound")}</p>
        <Link href="/kost" className="mt-3 inline-block text-sm text-nk-accent underline underline-offset-4">
          {t("backList")}
        </Link>
      </div>
    );
  }

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const dp = property.dpAmount ?? 0;
  const nice = (iso: string) =>
    iso
      ? new Date(iso + "T00:00:00").toLocaleDateString(
          params.locale === "id" ? "id-ID" : "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        )
      : "—";
  const stepOk = [
    Boolean(startDate),
    name.trim().length >= 3 && phone.replace(/\D/g, "").length >= 9,
    agree,
  ][step];
  const bookingCode = `BK-${startDate.replace(/-/g, "").slice(4)}${months}`;
  const waText = encodeURIComponent(
    t("waMessage", { name, property: property.name, room: room.name, code: bookingCode })
  );

  const rowCls =
    "w-full rounded-lg border border-nk-border bg-nk-surface px-4 py-3 text-sm text-nk-text outline-none transition-colors placeholder:text-nk-text-muted focus:border-nk-accent";
  const labelCls = "text-sm font-medium text-nk-text";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-nk-text-muted">
        <Link href={`/kost/${property.slug}`} className="transition-colors hover:text-nk-text">
          {property.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-nk-text">{t("title")}</span>
      </nav>

      {/* sticky room summary */}
      <section className="mb-8 flex items-center gap-4 rounded-lg border border-nk-border bg-nk-surface p-4">
        <img
          src={`https://picsum.photos/seed/${property.imageSeed}/160/120`}
          alt={property.name}
          className="h-16 w-24 shrink-0 rounded-md object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-nk-text">{property.name}</h2>
          <p className="truncate text-sm text-nk-text-muted">
            {property.district}, {property.city} · {formatIDR(room.pricePerMonth)} {t("perMonth")}
          </p>
        </div>
      </section>

      <h1 className="sr-only">{t("title")}</h1>
      <div className="mb-10">
        <Stepper step={step} t={t} />
      </div>

      {/* ===== STEP 1 — kamar + durasi + tanggal ===== */}
      {step === 0 && (
        <div className="flex flex-col gap-8">
          <fieldset>
            <legend className={cn(labelCls, "mb-3")}>{t("chooseRoom")}</legend>
            <div className="grid gap-3">
              {rooms.map((r) => (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 transition-colors duration-200",
                    roomId === r.id ? "border-nk-accent bg-nk-accent/5" : "border-nk-border bg-nk-surface hover:border-nk-accent/50"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="room"
                      value={r.id}
                      checked={roomId === r.id}
                      onChange={() => setRoomId(r.id)}
                      className="size-4 accent-[#3A2618]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-nk-text">{r.name}</span>
                      <span className="block text-xs text-nk-text-muted">
                        {r.sizeM2} m&sup2; · {t("roomsLeft", { count: r.available })}
                      </span>
                    </span>
                  </span>
                  <span className="text-sm font-medium text-nk-text">
                    {formatIDR(r.pricePerMonth)}
                    <span className="text-xs font-normal text-nk-text-muted"> {t("perMonth")}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <span className={cn(labelCls, "mb-3 block")}>{t("duration")}</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("duration")}>
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={months === m}
                  onClick={() => setMonths(m)}
                  className={cn(
                    "min-h-11 rounded-lg border px-5 text-sm transition-colors duration-200",
                    months === m
                      ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                      : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/50"
                  )}
                >
                  {t("monthsCount", { count: m })}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-nk-text-muted">{t("durationHint")}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label className={labelCls}>{t("startDate")}</Label>
            <StartDateField value={startDate} onChange={setStartDate} locale={params.locale} />
          </div>
        </div>
      )}

      {/* ===== STEP 2 — data penyewa ===== */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className={labelCls}>{t("fullName")}</label>
            <input id="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={cn(rowCls, "min-h-11")} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className={labelCls}>{t("phone")}</label>
            <input id="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} className={cn(rowCls, "min-h-11")} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelCls}>{t("email")}</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(rowCls, "min-h-11")} />
            <p className="text-xs text-nk-text-muted">{t("emailOptional")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="note" className={labelCls}>{t("note")}</label>
            <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} className={cn(rowCls, "resize-none")} />
          </div>
        </div>
      )}

      {/* ===== STEP 3 — konfirmasi biaya ===== */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-nk-border bg-nk-surface p-5">
            <h2 className="mb-4 text-sm font-medium text-nk-text">{t("costSummary")}</h2>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-nk-text-muted">{t("rent")}</dt>
                <dd className="text-nk-text">{formatIDR(room.pricePerMonth)} {t("perMonth")}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-nk-text-muted">{t("duration")}</dt>
                <dd className="text-nk-text">{t("monthsCount", { count: months })}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-nk-text-muted">{t("startDate")}</dt>
                <dd className="text-nk-text">{nice(startDate)}</dd>
              </div>
              {dp > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-nk-text-muted">{t("dpOnce")}</dt>
                  <dd className="text-nk-text">{formatIDR(dp)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-nk-text-muted">{t("totalPeriod", { count: months })}</dt>
                <dd className="text-nk-text">{formatIDR(room.pricePerMonth * months)}</dd>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-nk-border pt-3">
                <dt className="font-medium text-nk-text">{t("payFirst")}</dt>
                <dd className="font-medium text-nk-text">{formatIDR(room.pricePerMonth + dp)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-nk-text-muted">{t("payHow")}</p>
          </div>

          <div className="rounded-lg border border-nk-border bg-nk-section p-4 text-sm">
            <p className="font-medium text-nk-text">{name || t("yourData")}</p>
            <p className="mt-1 text-nk-text-muted">{phone} · {room.name}</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-nk-text">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#3A2618]" />
            <span>
              {t("agreePrefix")}{" "}
              <Link href="/legal/syarat-ketentuan" className="text-nk-accent underline underline-offset-2">{t("agreeTos")}</Link>{" "}
              {t("agreeSuffix")}
            </span>
          </label>
        </div>
      )}

      {/* ===== nav buttons ===== */}
      <div className="mt-10 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg border border-nk-border bg-nk-bg px-6 text-sm font-medium text-nk-text transition-colors duration-200 hover:border-nk-accent hover:text-nk-accent"
          >
            {t("back")}
          </button>
        )}
        <button
          type="button"
          disabled={!stepOk}
          onClick={() => {
            if (step < 2) setStep((s) => (s + 1) as Step);
            else setSubmitted(true);
          }}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step < 2 ? t("continue") : t("submit")}
        </button>
      </div>

      {/* ===== success ===== */}
      <Dialog open={submitted} onOpenChange={(o) => !o && setSubmitted(false)}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#E9F4EC] text-[#2F6B3C]">
            <CheckIcon className="size-6" />
          </div>
          <h2 className="text-lg font-medium text-nk-text">{t("successTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">
            {t("successBody", { code: bookingCode })}
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={`https://wa.me/6281122334455?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-nk-accent px-5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {t("successWa")}
            </a>
            <button
              type="button"
              onClick={() => i18nRouter.push("/bookings")}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-nk-border px-5 text-sm font-medium text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
            >
              {t("successCta")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

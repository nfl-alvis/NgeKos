"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useRouter as useI18nRouter } from "@/i18n/navigation";
import { bookings } from "@/lib/data/entities";
import { markPaymentPaid } from "@/lib/userOpsStore";
import { formatIDR } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function PaymentPage() {
  const t = useTranslations("payment");
  const params = useParams<{ id: string }>();
  const i18nRouter = useI18nRouter();

  const booking = bookings.find((b) => b.id === params.id);
  const [secondsLeft, setSecondsLeft] = useState(29 * 60 + 45);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (paid) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [paid]);

  if (!booking) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center text-sm text-nk-text-muted">
        {t("notFound")}
      </div>
    );
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const urgent = secondsLeft < 5 * 60;
  const amount = booking.usesDp
    ? Math.round(booking.monthlyPrice * 0.35)
    : booking.monthlyPrice;

  /** transaksi simulasi: id mengikuti booking supaya muncul di /dashboard/payments */
  const payId = `PAY-${booking.id.replace("BK-", "")}`;
  const recordPaid = () => markPaymentPaid(payId, booking.propertyName, amount);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 lg:px-10">
      {/* countdown */}
      <section
        className={`mb-8 rounded-lg border p-6 text-center ${
          urgent ? "border-[#EBC4C0] bg-[#FAEAE8]" : "border-nk-border bg-nk-surface"
        }`}
        aria-live="polite"
      >
        <p className="text-sm text-nk-text-muted">{t("countdown")}</p>
        <p
          className={`mt-1 font-mono text-4xl tabular-nums ${urgent ? "text-[#9C3B32]" : "text-nk-text"}`}
        >
          {mm}:{ss}
        </p>
      </section>

      {/* ringkasan tagihan */}
      <section className="rounded-lg border border-nk-border bg-nk-surface p-6">
        <h1 className="text-lg font-medium text-nk-text">{t("billing")}</h1>
        <p className="mt-1 text-sm text-nk-text-muted">
          {booking.propertyName} · {booking.roomType} · Kamar {booking.roomNumber}
        </p>

        <div className="mt-5 border-t border-nk-border pt-5">
          <p className="text-sm text-nk-text-muted">
            {booking.usesDp ? t("dpLabel") : t("fullLabel")}
          </p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-nk-text">
            {formatIDR(amount)}
          </p>
        </div>

        <div className="mt-5 border-t border-nk-border pt-5">
          <p className="text-sm text-nk-text-muted">{t("midtrans")}</p>
          <p className="mt-2 text-xs text-nk-text-muted">{t("methods")}</p>
          <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
            {["BCA", "Mandiri", "BNI", "GoPay", "OVO", "QRIS"].map((m) => (
              <span
                key={m}
                className="rounded-md border border-nk-border bg-nk-bg px-2.5 py-1 text-xs font-medium text-nk-text-muted"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          recordPaid();
          setPaid(true);
        }}
        className="mt-6 w-full rounded-lg bg-nk-accent px-6 py-4 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
      >
        {t("payNow")}
      </button>
      <p className="mt-3 text-center text-xs text-nk-text-muted">{t("warning")}</p>

      {/* modal simulasi sukses */}
      <Dialog open={paid} onOpenChange={(o) => !o && setPaid(false)}>
        <DialogContent className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#E9F4EC] text-[#2F6B3C]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-nk-text">{t("simTitle")}</h2>
        <p className="mt-2 text-sm text-nk-text-muted">{t("simBody")}</p>
        <button
          type="button"
          onClick={() => i18nRouter.push("/bookings")}
          className="mt-6 w-full rounded-lg bg-nk-accent px-5 py-3 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {t("backToBookings")}
        </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

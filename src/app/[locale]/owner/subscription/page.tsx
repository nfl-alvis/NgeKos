"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatIDR, cn } from "@/lib/utils";

interface Plan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  maxProperties: number;
  maxRooms: number;
  advancedAnalytics: boolean;
  recommended?: boolean;
}

interface SubscriptionInfo {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  status: "TRIAL" | "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "CANCELLED";
  trialDaysLeft: number;
  activeUntil: string;
}

export default function OwnerSubscriptionPage() {
  const t = useTranslations("owner.subscription");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function loadSubscription() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/owner/subscription");
      if (!res.ok) {
        throw new Error("Gagal memuat paket langganan.");
      }
      const json = await res.json();
      if (json.data) {
        setSubscription(json.data.subscription);
        setPlans(json.data.plans || []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  async function handleSelectPlan(planId: string) {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await fetch("/api/owner/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_plan", planId }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.message || "Gagal mengubah paket.");
      }
      const json = await res.json();
      if (json.data?.requiresPayment && json.data?.redirectUrl) {
        window.location.assign(json.data.redirectUrl);
        return;
      }
      await loadSubscription();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memproses langganan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await fetch("/api/owner/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.message || "Gagal membatalkan langganan.");
      }
      setCancelOpen(false);
      await loadSubscription();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membatalkan paket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusBadge = () => {
    if (!subscription) return null;
    switch (subscription.status) {
      case "TRIAL":
        return (
          <span className="rounded-full border border-[#EAD9A8] bg-[#FBF3DC] px-3 py-1 text-xs font-medium text-[#8A6A1F]">
            {t("statusTrial")}
          </span>
        );
      case "ACTIVE":
        return (
          <span className="rounded-full border border-[#BFDCC5] bg-[#E9F4EC] px-3 py-1 text-xs font-medium text-[#2F6B3C]">
            {t("statusActive")}
          </span>
        );
      case "GRACE_PERIOD":
        return (
          <span className="rounded-full border border-[#EBC4C0] bg-[#FAEAE8] px-3 py-1 text-xs font-medium text-[#9C3B32]">
            {t("statusGrace")}
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-nk-border bg-nk-section px-3 py-1 text-xs font-medium text-nk-text-muted">
            {t("statusExpired")}
          </span>
        );
    }
  };

  const endDate = !subscription
    ? ""
    : subscription.status === "TRIAL"
    ? t("trialLeft", { days: subscription.trialDaysLeft ?? 0 })
    : t("activeUntil", { date: subscription.activeUntil ?? "" });

  return (
    <DashboardShell role="owner">
      <h1 className="mb-2 text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>

      {/* Demo Mode Notice */}
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900" role="note" aria-label="Pemberitahuan mode demo">
        <div className="flex items-center gap-2 font-semibold text-amber-800">
          <ShieldAlert className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>DEMO MODE — Midtrans Sandbox</span>
        </div>
        <p className="mt-1 leading-relaxed text-amber-800/90">
          Pembayaran paket langganan diproses melalui <strong>Midtrans Sandbox</strong>.
          Gunakan kartu uji coba Midtrans atau bayar Virtual Account melalui{" "}
          <a
            href="https://simulator.sandbox.midtrans.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            Midtrans Simulator
          </a>
          . Tidak ada biaya sungguhan yang didebit.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-nk-text-muted">Memuat data langganan...</div>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-center gap-3">
            {statusBadge()}
            <span className="text-sm text-nk-text-muted">{endDate}</span>
          </div>

          {/* kartu paket */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent =
                subscription?.planId === plan.id || subscription?.planCode === plan.code;
              const highlighted = plan.recommended;
              return (
                <article
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-lg border bg-nk-surface p-6",
                    highlighted ? "border-nk-accent border-2" : "border-nk-border"
                  )}
                >
                  {highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-nk-accent px-3 py-0.5 text-xs font-medium text-nk-text-inverse">
                      {t("recommended")}
                    </span>
                  )}
                  <h2 className="text-lg font-medium text-nk-text">{plan.name}</h2>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight text-nk-text">
                      {formatIDR(plan.priceMonthly)}
                    </span>
                    <span className="text-sm text-nk-text-muted">/bln</span>
                  </p>

                  <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-sm text-nk-text">
                    <li className="flex items-start gap-2">
                      <Check />{" "}
                      <span>
                        {plan.maxProperties === 0
                          ? t("maxPropertiesUnlimited")
                          : t("maxProperties", { count: plan.maxProperties })}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check />{" "}
                      <span>
                        {plan.maxRooms === 0
                          ? t("maxRoomsUnlimited")
                          : t("maxRooms", { count: plan.maxRooms })}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check />{" "}
                      <span>
                        {t("analytics")}: {plan.advancedAnalytics ? t("yes") : t("no")}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check />{" "}
                      <span>
                        {t("autoMessages")}: {t("yes")}
                      </span>
                    </li>
                  </ul>

                  {isCurrent ? (
                    <div className="mt-6 rounded-lg border border-nk-border bg-nk-section px-4 py-2.5 text-center text-sm text-nk-text-muted">
                      {t("currentPlan")}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectPlan(plan.id)}
                      className={cn(
                        "mt-6 rounded-lg px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.99] disabled:opacity-50",
                        highlighted
                          ? "bg-nk-accent text-nk-text-inverse hover:opacity-90"
                          : "border border-nk-border text-nk-text hover:bg-nk-warm"
                      )}
                    >
                      {subscription?.status === "TRIAL" ? t("choose") : t("renew")}
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          {/* cancel subscription */}
          {subscription?.status === "ACTIVE" && (
            <div className="mt-10 border-t border-nk-border pt-6">
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="text-sm text-[#9C3B32] underline underline-offset-4 transition-opacity hover:opacity-80"
              >
                {t("cancelTitle")}
              </button>
            </div>
          )}

          <Dialog open={cancelOpen} onOpenChange={(o) => !o && setCancelOpen(false)}>
            <DialogContent className="max-w-sm">
              <h2 className="pr-8 text-lg font-medium text-nk-text">{t("cancelTitle")}</h2>
              <p className="mt-2 text-sm text-nk-text-muted">
                {t("cancelBody", { date: subscription?.activeUntil ?? "" })}
              </p>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCancel}
                className="mt-5 w-full rounded-lg bg-[#9C3B32] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? "Memproses..." : t("cancelConfirm")}
              </button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </DashboardShell>
  );
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-[#2F6B3C]"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

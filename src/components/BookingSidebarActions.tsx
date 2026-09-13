"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { formatIDR } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import BookingCta from "@/components/BookingCta";
import { useBookingFlow, type BookingRoom } from "@/components/BookingFlowProvider";

/**
 * Aksi booking di sidebar detail kost. Sebelum pengajuan dipilih:
 * tombol "Sewa Sekarang" (buka popup). Setelah Lanjut di popup: section
 * ini terupdate sendiri — tidak pindah halaman — menampilkan rincian
 * uang muka (DP) vs pembayaran penuh ala Mamikos + tombol Ubah/Lanjut.
 */
export default function BookingSidebarActions({
  propertyName,
  rooms,
  dpAmount,
}: {
  propertyName: string;
  rooms: BookingRoom[];
  dpAmount: number;
}) {
  const t = useTranslations("booking");
  const params = useParams<{ locale: string; slug: string }>();
  const { flow, setFlow } = useBookingFlow();

  if (!flow) {
    return (
      <div className="flex flex-col gap-3">
        <BookingCta
          propertyName={propertyName}
          dpAmount={dpAmount}
          rooms={rooms}
          className="inline-flex w-full items-center justify-center border border-nk-border bg-nk-accent px-6 py-3.5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          {t("detailBook")}
        </BookingCta>
        {dpAmount > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-nk-warm p-3 text-xs leading-relaxed text-nk-text-muted">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-nk-accent">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span>
              <span className="font-medium text-nk-text">{t("dpAvailableTitle")}</span>{" "}
              {t("dpAvailableBody")}
            </span>
          </div>
        )}
      </div>
    );
  }

  const fullFirst = flow.pricePerMonth + flow.dpAmount;
  const hasDp = flow.dpAmount > 0;

  return (
    <div className="flex flex-col gap-4 text-left">
      {/* pilihan saat ini */}
      <div className="rounded-lg bg-nk-warm p-4 text-sm">
        <p className="font-medium text-nk-text">{flow.roomName}</p>
        <p className="mt-1 text-nk-text-muted">
          {t("monthsCount", { count: flow.months })} ·{" "}
          {new Date(flow.date + "T00:00:00").toLocaleDateString(
            params.locale === "id" ? "id-ID" : "en-GB",
            { day: "numeric", month: "long", year: "numeric" }
          )}
        </p>
      </div>

      {hasDp ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-nk-text-muted">{t("ifDp")}</p>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-nk-text">{t("dpLabel2")}</span>
              <span className="text-nk-text">{formatIDR(flow.dpAmount)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-nk-text">{t("midLabel")}</span>
              <span className="text-nk-text">{formatIDR(flow.pricePerMonth)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-nk-text-muted">{t("ifFull")}</p>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-nk-text">{t("fullLabel2")}</span>
              <span className="text-nk-text">{formatIDR(fullFirst)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-nk-border pt-3 text-sm">
            <span className="font-medium text-nk-text">{t("firstTotal")}</span>
            <span className="font-semibold text-nk-text">{formatIDR(fullFirst)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-nk-border pt-3 text-sm">
          <span className="font-medium text-nk-text">{t("firstTotal")}</span>
          <span className="font-semibold text-nk-text">{formatIDR(fullFirst)}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Link
          href={`/kost/${params.slug}/book?kamar=${flow.roomId}&tanggal=${flow.date}&bulan=${flow.months}`}
          className="inline-flex min-h-11 items-center justify-center border border-nk-border bg-nk-accent px-5 text-sm font-medium text-nk-text-inverse transition-opacity hover:opacity-90"
        >
          {t("proceedWizard")}
        </Link>
        <button
          type="button"
          onClick={() => setFlow(null)}
          className="inline-flex min-h-11 items-center justify-center border border-nk-border bg-nk-bg px-5 text-sm text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
        >
          {t("change")}
        </button>
      </div>
    </div>
  );
}

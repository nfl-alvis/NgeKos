"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link, useRouter as useI18nRouter } from "@/i18n/navigation";
import { getPropertyBySlug } from "@/lib/data/properties";
import type { Property, RoomType } from "@/lib/data/types";
import { formatIDR, cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";

/**
 * Halaman "Ajukan Booking" bergaya Mamikos (/room/.../booking):
 *  - butuh akun (modal login di tempat, opsi akun demo tempmail);
 *  - form satu layar: data pemesan di kiri, Ringkasan Pengajuan di kanan
 *    (kartu sticky ala panel pengajuan Mamikos);
 *  - pembayaran TIDAK di sini - baru setelah pemilik menyetujui
 *    (halaman /bookings/[id]/pay).
 * Kamar/tanggal/durasi sudah dipilih di popup halaman detail; ubah lewat
 * tautan "Ubah pilihan" di ringkasan.
 */

function BackChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function BookingApplyPage({
  initialProperty,
}: {
  initialProperty?: Property | null;
}) {
  const t = useTranslations("booking");
  const lt = useTranslations("login");
  const params = useParams<{ locale: string; slug: string }>();
  const searchParams = useSearchParams();

  const { user, ready } = useSession();
  const [authOpen, setAuthOpen] = useState(false);

  const slug = params.slug;
  const property = initialProperty ?? getPropertyBySlug(slug);
  const rooms = useMemo(() => (property ? property.roomTypes.filter((r) => r.available > 0) : []), [property]);

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

  const router = useI18nRouter();

  useEffect(() => {
    if (ready && !user) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/kost/${slug}/book`;
      router.replace(`/login?next=${encodeURIComponent(currentPath)}&error=login_required`);
    }
  }, [ready, user, router, slug]);

  if (!ready || !user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl flex-col items-center justify-center px-6 py-24 text-center lg:px-10">
        <div className="size-8 animate-spin rounded-full border-2 border-nk-accent border-t-transparent mb-4" />
        <p className="text-sm text-nk-text-muted">Mengalihkan ke halaman masuk...</p>
      </div>
    );
  }

  return (
    <BookingForm
      property={property}
      rooms={rooms}
      search={searchParams}
      userName={user.name}
      userEmail={user.email}
    />
  );
}

/* ===== form pemesan + ringkasan (hanya ter-mount setelah login,
   jadi prefill data akun aman lewat initializer, bukan effect) ===== */

function BookingForm({
  property,
  rooms,
  search,
  userName,
  userEmail,
}: {
  property: Property;
  rooms: RoomType[];
  search: URLSearchParams;
  userName: string;
  userEmail: string;
}) {
  const t = useTranslations("booking");
  const params = useParams<{ locale: string; slug: string }>();
  const i18nRouter = useI18nRouter();

  const roomId = search.get("kamar") ?? rooms[0]?.id ?? "";
  const prefillDate = search.get("tanggal") ?? "";
  const monthsParam = Number(search.get("bulan"));
  const months = [1, 3, 6, 12].includes(monthsParam) ? monthsParam : 1;

  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualBookingCode, setActualBookingCode] = useState("");

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const dp = property.dpAmount ?? 0;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(prefillDate);
  const nice = (iso: string) =>
    iso
      ? new Date(iso + "T00:00:00").toLocaleDateString(
          params.locale === "id" ? "id-ID" : "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        )
      : "-";
  const totalPeriod = room.pricePerMonth * months;
  const firstPay = room.pricePerMonth + dp;
  const formOk = name.trim().length >= 3 && phone.replace(/\D/g, "").length >= 9 && validDate && agree;
  const fallbackBookingCode = `BK-${(prefillDate || "00000000").replace(/-/g, "").slice(4)}${months}`;
  const displayCode = actualBookingCode || fallbackBookingCode;
  const waText = encodeURIComponent(
    t("waMessage", { name, property: property.name, room: room.name, code: displayCode })
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOk || loading) return;
    setLoading(true);
    setError(null);

    try {
      let propId = property.id;
      let rId = room.id;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!propId || !uuidRegex.test(propId) || !uuidRegex.test(rId)) {
        const res = await fetch(`/api/properties/${property.slug}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            propId = json.data.id;
            const foundRoom = json.data.roomTypes?.find(
              (rt: { id: string; name: string }) => rt.name.toLowerCase() === room.name.toLowerCase()
            ) || json.data.roomTypes?.[0];
            if (foundRoom) rId = foundRoom.id;
          }
        }
      }

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: propId,
          roomTypeId: rId,
          startDate: prefillDate,
          durationMonths: months,
          note: note.trim() || undefined,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const msg = json?.error?.message || json?.message || "Gagal mengajukan sewa. Pastikan data terisi dengan benar.";
        setError(msg);
        setLoading(false);
        return;
      }

      if (json?.data?.code) {
        setActualBookingCode(json.data.code);
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi gangguan koneksi. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const rowCls =
    "w-full rounded-lg border border-nk-border bg-nk-surface px-4 py-3 text-sm text-nk-text outline-none transition-colors placeholder:text-nk-text-muted focus:border-nk-accent";
  const labelCls = "text-sm font-medium text-nk-text";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      {/* header */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-nk-text-muted">
        <Link href={`/kost/${property.slug}`} className="inline-flex items-center gap-1 transition-colors hover:text-nk-text">
          <BackChevron />
          {property.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-nk-text">{t("title")}</span>
      </nav>

      <h1 className="text-2xl font-light tracking-tight text-nk-text">{t("title")}</h1>
      <p className="mt-1.5 text-sm text-nk-text-muted">{t("loggedInAs", { name: userName })}</p>

      {/* ===== dua kolom ala Mamikos: form kiri, ringkasan kanan ===== */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------- form data pemesan: card putih berborder ala Mamikos ---------- */}
        <form
          className="flex flex-col gap-5 rounded-lg border border-nk-border bg-nk-surface p-5 sm:p-8"
          onSubmit={handleSubmit}
        >
          <h2 className="text-sm font-medium text-nk-text">{t("fillData")}</h2>
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

          <label className="flex cursor-pointer items-start gap-3 text-sm text-nk-text">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#3A2618]" />
            <span>
              {t("agreePrefix")}{" "}
              <Link href="/legal/syarat-ketentuan" className="text-nk-accent underline underline-offset-2">{t("agreeTos")}</Link>{" "}
              {t("agreeSuffix")}
            </span>
          </label>
          <p className="text-xs leading-relaxed text-nk-text-muted">{t("privacyNote")}</p>

          {error && (
            <Alert variant="destructive">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <div>
                  <AlertTitle>Pengajuan Belum Berhasil</AlertTitle>
                  <AlertDescription className="mt-1 text-xs">{error}</AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {!validDate && (
            <p className="rounded-lg border border-[#E7C9A8] bg-[#FBF3E6] p-3 text-xs leading-relaxed text-[#7A5A33]">
              {t("chooseOnDetail")}{" "}
              <Link href={`/kost/${property.slug}`} className="font-medium underline underline-offset-2">
                {t("goDetail")}
              </Link>
            </p>
          )}

          <button
            type="submit"
            disabled={!formOk || loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <svg className="size-4 animate-spin text-nk-text-inverse" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Mengirim...</span>
              </>
            ) : (
              t("submit")
            )}
          </button>
        </form>

        {/* ---------- ringkasan pengajuan (sticky) ---------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-nk-border bg-nk-surface">
            <div className="flex items-start gap-3 border-b border-nk-border p-4">
              <img
                src={`https://picsum.photos/seed/${property.imageSeed}/120/96`}
                alt={property.name}
                className="h-14 w-20 shrink-0 rounded-md object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-nk-text-muted">{t("summaryTitle")}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-nk-text">{property.name}</p>
                <p className="truncate text-xs text-nk-text-muted">{property.district}, {property.city}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-nk-text-muted">{t("chooseRoom")}</span>
                <span className="text-right font-medium text-nk-text">{room.name}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-nk-text-muted">{t("checkIn")}</span>
                <span className="text-right font-medium text-nk-text">{validDate ? nice(prefillDate) : "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-nk-text-muted">{t("durationLabel")}</span>
                <span className="font-medium text-nk-text">{t("monthsN", { count: months })}</span>
              </div>

              <div className="my-1 h-px bg-nk-border" aria-hidden="true" />

              <div className="flex items-center justify-between gap-3">
                <span className="text-nk-text-muted">{t("sewaBulan")}</span>
                <span className="text-nk-text">{formatIDR(room.pricePerMonth)}</span>
              </div>
              {dp > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-nk-text-muted">{t("dpLabel")}</span>
                  <span className="text-nk-text">{formatIDR(dp)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-nk-text-muted">{t("totalPeriod", { count: months })}</span>
                <span className="text-nk-text">{formatIDR(totalPeriod)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-nk-border pt-3">
                <span className="font-medium text-nk-text">{t("firstTotal")}</span>
                <span className="font-semibold text-nk-text">{formatIDR(firstPay)}</span>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-nk-warm p-3 text-xs leading-relaxed text-nk-text-muted">
                <InfoIcon className="mt-0.5 shrink-0 text-nk-accent" />
                <span>{t("payAfterApproval")}</span>
              </div>

              <Link
                href={`/kost/${property.slug}`}
                className="mt-1 inline-flex min-h-10 items-center justify-center rounded-lg border border-nk-border text-sm font-medium text-nk-text transition-colors hover:border-nk-accent hover:text-nk-accent"
              >
                {t("changeChoice")}
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== sukses ===== */}
      <Dialog open={submitted} onOpenChange={(o) => !o && setSubmitted(false)}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#E9F4EC] text-[#2F6B3C]">
            <CheckIcon className="size-6" />
          </div>
          <h2 className="text-lg font-medium text-nk-text">{t("successTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-nk-text-muted">
            {t("successBody", { code: displayCode })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-nk-text-muted">{t("payAfterApproval")}</p>
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
              onClick={() => i18nRouter.push("/dashboard/bookings")}
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

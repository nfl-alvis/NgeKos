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
import { getKosImage } from "@/lib/kosImages";
import StartDateField from "@/components/StartDateField";

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

  const initialRoomId = search.get("kamar") ?? rooms[0]?.id ?? "";
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const room = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0];

  const searchDate = search.get("tanggal") ?? "";
  const defaultDate = /^\d{4}-\d{2}-\d{2}$/.test(searchDate)
    ? searchDate
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })();
  const [startDate, setStartDate] = useState(defaultDate);

  const monthsParam = Number(search.get("bulan"));
  const [selectedMonths, setSelectedMonths] = useState<number>(
    [1, 3, 6, 12].includes(monthsParam) ? monthsParam : 1
  );

  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualBookingCode, setActualBookingCode] = useState("");

  const dp = property.dpAmount ?? 0;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const nice = (iso: string) =>
    iso
      ? new Date(iso + "T00:00:00").toLocaleDateString(
          params.locale === "id" ? "id-ID" : "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        )
      : "-";
  const totalPeriod = room.pricePerMonth * selectedMonths;
  const firstPay = room.pricePerMonth + dp;
  const formOk = name.trim().length >= 3 && phone.replace(/\D/g, "").length >= 9 && validDate && agree;
  const fallbackBookingCode = `BK-${(startDate || "00000000").replace(/-/g, "").slice(4)}${selectedMonths}`;
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
            const foundRoom =
              json.data.roomTypes?.find(
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
          startDate,
          durationMonths: selectedMonths,
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
          {/* Section 1: Pilihan Kamar & Durasi */}
          <div>
            <h2 className="text-sm font-medium text-nk-text">Detail Sewa</h2>
            <p className="mt-0.5 text-xs text-nk-text-muted">Tentukan tipe kamar, tanggal mulai masuk, dan durasi sewa.</p>
          </div>

          {rooms.length > 1 && (
            <div className="flex flex-col gap-2">
              <label htmlFor="room-select" className={labelCls}>Tipe Kamar</label>
              <select
                id="room-select"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className={cn(rowCls, "min-h-11 cursor-pointer")}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {formatIDR(r.pricePerMonth)}/bulan ({r.available} tersedia)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={labelCls}>{t("startDate")}</label>
              <StartDateField value={startDate} onChange={setStartDate} locale={params.locale} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelCls}>{t("duration")}</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonths(m)}
                    className={cn(
                      "flex min-h-11 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                      selectedMonths === m
                        ? "border-nk-accent bg-nk-accent text-nk-text-inverse"
                        : "border-nk-border bg-nk-surface text-nk-text hover:border-nk-accent/50"
                    )}
                  >
                    {m} Bln
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="my-1 h-px bg-nk-border" aria-hidden="true" />

          {/* Section 2: Data Pemesan */}
          <div>
            <h2 className="text-sm font-medium text-nk-text">{t("fillData")}</h2>
            <p className="mt-0.5 text-xs text-nk-text-muted">Data ini akan diteruskan ke pemilik kos untuk konfirmasi.</p>
          </div>

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
            <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 mt-0.5 shrink-0 text-red-600" />
                <div className="flex-1">
                  <AlertTitle className="font-semibold text-red-900">Pengajuan Belum Berhasil</AlertTitle>
                  <AlertDescription className="mt-1 text-xs text-red-800 leading-relaxed">{error}</AlertDescription>
                  {(error.toLowerCase().includes("aktif") ||
                    error.toLowerCase().includes("active") ||
                    error.toLowerCase().includes("booking") ||
                    error.toLowerCase().includes("menu booking")) && (
                    <div className="mt-3">
                      <Link
                        href="/dashboard/bookings"
                        className="inline-flex items-center gap-1.5 rounded-md bg-nk-accent px-3 py-1.5 text-xs font-medium text-nk-text-inverse transition-opacity hover:opacity-90"
                      >
                        Lihat Booking Saya di Dashboard
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
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
                src={getKosImage(property.slug || property.imageSeed, "main")}
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
                <span className="text-right font-medium text-nk-text">{validDate ? nice(startDate) : "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-nk-text-muted">{t("durationLabel")}</span>
                <span className="font-medium text-nk-text">{t("monthsN", { count: selectedMonths })}</span>
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
                <span className="text-nk-text-muted">{t("totalPeriod", { count: selectedMonths })}</span>
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

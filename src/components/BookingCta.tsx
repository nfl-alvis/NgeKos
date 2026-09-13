"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatIDR } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import StartDateField from "@/components/StartDateField";
import { useParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BookingRoom = {
  id: string;
  name: string;
  pricePerMonth: number;
  sizeM2: number;
  available: number;
};

const DURATION_VALUES = ["1", "3", "6", "12"] as const;

/**
 * Tombol ajukan sewa yang membuka popup (shadcn Dialog) di tempat —
 * tidak navigasi ke halaman baru dulu. Di dalam popup: pilih kamar,
 * tanggal masuk (shadcn Calendar di dalam Popover) dan durasi sewa
 * (shadcn Select, disampingnya), lalu Lanjut -> wizard data penyewa.
 */
export default function BookingCta({
  slug,
  propertyName,
  rooms,
  dpAmount,
  initialRoomId,
  className,
  children,
}: {
  slug: string;
  propertyName: string;
  rooms: BookingRoom[];
  dpAmount?: number;
  initialRoomId?: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("booking");
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState(initialRoomId ?? rooms[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [months, setMonths] = useState<string>("3");

  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const dp = dpAmount ?? 0;
  const durationLabels = t.raw("durationOptions") as string[];
  const monthCount = Number(months);

  const fieldBox =
    "flex min-h-11 items-center rounded-lg border border-nk-border bg-nk-surface px-3 text-sm transition-colors focus-within:border-nk-accent";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {/* modal={false}: Radix modal mengunci pointer-events body sehingga
          popup Select (portal Base UI) tidak bisa diklik saat dialog terbuka */}
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{propertyName}</DialogDescription>
          </DialogHeader>

          {rooms.length > 1 && (
            <div className="flex flex-col gap-2 text-left">
              <Label>{t("roomLabel")}</Label>
              <div className={fieldBox}>
                <Select
                  value={roomId || null}
                  onValueChange={(v) => setRoomId((v as string) ?? roomId)}
                  items={rooms.map((r) => ({ label: r.name, value: r.id }))}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} — {formatIDR(r.pricePerMonth)} {t("perMonth")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2 text-left">
              <Label>{t("startDate")}</Label>
              <StartDateField value={date} onChange={setDate} locale={params.locale} />
            </div>
            <div className="flex flex-col gap-2 text-left">
              <Label>{t("duration")}</Label>
              <div className={fieldBox}>
                <Select
                  value={months}
                  onValueChange={(v) => setMonths((v as string) ?? "3")}
                  items={DURATION_VALUES.map((m, i) => ({
                    label: durationLabels[i],
                    value: m,
                  }))}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {DURATION_VALUES.map((m, i) => (
                      <SelectItem key={m} value={m}>
                        {durationLabels[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {room && (
            <dl className="flex flex-col gap-2 rounded-lg bg-nk-section p-4 text-sm text-left">
              <div className="flex items-center justify-between">
                <dt className="text-nk-text-muted">{t("rent")}</dt>
                <dd className="text-nk-text">
                  {formatIDR(room.pricePerMonth)} {t("perMonth")}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-nk-text-muted">{t("totalPeriod", { count: monthCount })}</dt>
                <dd className="text-nk-text">{formatIDR(room.pricePerMonth * monthCount)}</dd>
              </div>
              {dp > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-nk-text-muted">{t("dpOnce")}</dt>
                  <dd className="text-nk-text">{formatIDR(dp)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-nk-border pt-2">
                <dt className="font-medium text-nk-text">{t("payFirst")}</dt>
                <dd className="font-medium text-nk-text">{formatIDR(room.pricePerMonth + dp)}</dd>
              </div>
            </dl>
          )}

          <button
            type="button"
            disabled={!date || !room}
            onClick={() => {
              setOpen(false);
              router.push(
                `/kost/${slug}/ajukan?kamar=${room.id}&tanggal=${date}&bulan=${months}`
              );
            }}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("continue")}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

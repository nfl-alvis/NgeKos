"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookingFlow, type BookingRoom } from "@/components/BookingFlowProvider";

const DURATION_VALUES = ["1", "3", "6", "12"] as const;

/**
 * Tombol ajukan sewa yang membuka popup (shadcn Dialog) di tempat -
 * tidak navigasi ke halaman baru dulu. Di dalam popup: pilih kamar,
 * tanggal masuk (shadcn Calendar dalam Popover) dan durasi sewa
 * (shadcn Select, di sampingnya). Setelah Lanjut, state tersimpan di
 * BookingFlowProvider dan panel ringkasan di sidebar ikut terupdate;
 * navigasi ke wizard hanya lewat tombol pada panel tersebut.
 */
export default function BookingCta({
  propertyName,
  rooms,
  dpAmount,
  initialRoomId,
  className,
  children,
}: {
  propertyName: string;
  rooms: BookingRoom[];
  dpAmount?: number;
  initialRoomId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const t = useTranslations("booking");
  const params = useParams<{ locale: string; slug: string }>();
  const { setFlow } = useBookingFlow();
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
          popup Select/Popover (portal Base UI) tidak bisa diklik saat
          dialog terbuka */}
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
                  <SelectTrigger className="w-full cursor-pointer border-none bg-transparent px-0 shadow-none">
                    <SelectValue className="truncate" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} - {formatIDR(r.pricePerMonth)} {t("perMonth")}
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
                  <SelectTrigger className="w-full cursor-pointer border-none bg-transparent px-0 shadow-none">
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

          <button
            type="button"
            disabled={!date || !room}
            onClick={() => {
              setFlow({
                slug: params.slug,
                roomId: room.id,
                roomName: room.name,
                pricePerMonth: room.pricePerMonth,
                dpAmount: dp,
                months: monthCount,
                date,
              });
              setOpen(false);
            }}
            className="inline-flex min-h-11 w-full items-center justify-center bg-nk-accent px-6 text-sm font-medium text-nk-text-inverse transition-opacity duration-200 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("continue")}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { id as idLocale, enGB } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * Field tanggal mulai pakai shadcn Calendar (react-day-picker) di dalam
 * shadcn Popover - pengganti input type="date". Nilai tetap string ISO
 * "YYYY-MM-DD" (sama seperti state booking sebelumnya). Tanggal sebelum
 * hari ini di-disable.
 */
export default function StartDateField({
  value,
  onChange,
  locale,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("booking");
  const btnId = useId();
  const [open, setOpen] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  const nice = selected
    ? selected.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={btnId}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-nk-border bg-nk-surface px-3 text-sm text-nk-text outline-none transition-colors hover:border-nk-accent/50 focus-visible:border-nk-accent data-[open]:border-nk-accent",
          !nice && "text-nk-text-muted",
          className
        )}
      >
        <span className={cn("truncate", !nice && "text-nk-text-muted")}>
          {nice ?? t("pickDate")}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-nk-text-muted"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toISO(d));
              setOpen(false);
            }
          }}
          month={selected ?? today}
          locale={locale === "id" ? idLocale : enGB}
          startMonth={new Date(today.getFullYear(), today.getMonth(), 1)}
          endMonth={new Date(today.getFullYear() + 2, today.getMonth(), 1)}
          disabled={{ before: today }}
        />
      </PopoverContent>
    </Popover>
  );
}

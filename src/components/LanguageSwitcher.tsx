"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";

const LANGUAGES = [
  { value: "id", label: "Bahasa Indonesia", badge: "ID" },
  { value: "en", label: "English", badge: "EN" },
] as const;

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function switchLocale(next: string) {
    if (next === locale) return;
    router.replace(
      // @ts-expect-error - dynamic pathname with locale
      { pathname, params },
      { locale: next }
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-9 items-center justify-center text-nk-text transition-colors hover:text-nk-accent focus:outline-none focus-visible:outline-none focus:ring-0 outline-none cursor-pointer"
        aria-label={locale === "id" ? "Ganti bahasa" : "Switch language"}
      >
        <Languages className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-48 rounded-lg border border-nk-border bg-nk-surface p-1 shadow-lg focus:outline-none focus-visible:outline-none focus:ring-0 outline-none"
        align="end"
      >
        <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-nk-text-muted">
          {locale === "id" ? "Pilih bahasa" : "Select language"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-nk-border" />
        <DropdownMenuRadioGroup value={locale} onValueChange={switchLocale}>
          {LANGUAGES.map((l) => (
            <DropdownMenuRadioItem
              key={l.value}
              value={l.value}
              className="cursor-pointer rounded-md py-2 pl-8 pr-3 text-sm text-nk-text transition-colors hover:bg-nk-warm focus:bg-nk-warm focus:text-nk-text outline-none"
            >
              <span className="flex items-center gap-2">
                <span className="rounded border border-nk-border bg-nk-warm px-1.5 py-0.5 text-[10px] font-bold text-nk-text">
                  {l.badge}
                </span>
                <span className="text-sm font-medium">{l.label}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

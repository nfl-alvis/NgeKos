"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, MoreHorizontal, Search, Send } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { conversations, messageTemplates } from "@/lib/data/entities";
import { cn } from "@/lib/utils";

const dayKey = (iso: string) => iso.slice(0, 10);

export default function OwnerMessagesPage() {
  const t = useTranslations("owner.messages");
  const locale = useLocale();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [threads, setThreads] = useState(conversations);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = threads.find((c) => c.id === activeId) ?? null;

  const filtered = threads.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.messages.some((m) => m.text.toLowerCase().includes(search.toLowerCase()))
  );

  // scroll ke bawah saat ganti percakapan / kirim pesan
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, threads]);

  const send = () => {
    if (!draft.trim() || !active) return;
    setThreads((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? {
              ...c,
              unread: 0,
              messages: [
                ...c.messages,
                {
                  id: `m-${c.id}-${c.messages.length + 1}`,
                  from: "owner" as const,
                  text: draft,
                  at: new Date().toISOString(),
                  channel: c.channel,
                },
              ],
            }
          : c
      )
    );
    setDraft("");
  };

  const removeChat = (id: string) => {
    setThreads((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const formatDay = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <DashboardShell role="owner">
      <div className="flex h-[calc(100vh-7.5rem)] min-h-96 gap-6">
        {/* section kiri: menyatu dengan canvas - title, search, list kontak */}
        <aside className={cn("flex w-full min-h-0 flex-col lg:w-80 lg:shrink-0", active && "hidden lg:flex")}>
          <h1 className="px-1 pb-3 text-2xl font-medium tracking-tight text-nk-text">{t("title")}</h1>
          <div className="relative pb-3">
            <Search
              className="pointer-events-none absolute left-3 top-[calc(50%-6px)] size-4 -translate-y-1/2 text-nk-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className="h-9 w-full rounded-md border border-nk-border bg-nk-surface pl-9 pr-3 text-sm text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="divide-y divide-nk-border">
              {filtered.map((c) => {
                const last = c.messages[c.messages.length - 1];
                return (
                  <li
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-1 transition-colors",
                      activeId === c.id ? "bg-nk-warm" : "hover:bg-nk-warm/50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(c.id);
                        setTemplatesOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 px-2 py-3.5 text-left"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nk-warm text-sm font-medium text-nk-text ring-1 ring-nk-border">
                        {c.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-nk-text">{c.name}</span>
                          <span className="shrink-0 text-[10px] text-nk-text-muted">
                            {last
                              ? new Date(last.at).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : ""}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className="truncate text-xs text-nk-text-muted">{last?.text}</span>
                          {c.unread > 0 && (
                            <span className="shrink-0 rounded-full bg-nk-accent px-1.5 py-0.5 text-[10px] font-medium text-nk-text-inverse">
                              {c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-nk-text-muted opacity-0 transition-opacity hover:bg-nk-surface hover:text-nk-text focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 aria-expanded:opacity-100"
                        aria-label={t("moreActions")}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() => removeChat(c.id)}
                        >
                          {t("deleteChat")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* section kanan: kartu inset rounded, full height */}
        {active ? (
          <section
            className={cn(
              "min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-nk-border bg-nk-surface",
              active ? "flex" : "hidden lg:flex"
            )}
          >
            {/* header chat */}
            <header className="flex items-center gap-3 border-b border-nk-border p-3.5">
              <button
                type="button"
                onClick={() => {
                  setActiveId(null);
                  setTemplatesOpen(false);
                }}
                aria-label={t("back")}
                className="rounded-md border border-nk-border p-2 text-nk-text transition-colors hover:bg-nk-warm lg:hidden"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-warm text-sm font-medium text-nk-text ring-1 ring-nk-border">
                {active.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-nk-text">{active.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-nk-text-muted">
                  {active.telegramConnected && (
                    <span className="size-1.5 rounded-full bg-[#2F6B3C]" aria-hidden="true" />
                  )}
                  {t(active.telegramConnected ? "telegram" : "noTelegram")}
                </span>
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md text-nk-text-muted transition-colors hover:bg-nk-warm hover:text-nk-text focus-visible:outline-none"
                  aria-label={t("moreActions")}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => removeChat(active.id)}
                  >
                    {t("deleteChat")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            {/* pesan - tanggal sebagai pemisah grup di atas bubble */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m, i) => {
                const prev = active.messages[i - 1];
                const showDate = !prev || dayKey(prev.at) !== dayKey(m.at);
                return (
                  <Fragment key={m.id}>
                    {showDate && (
                      <div className="flex justify-center py-1">
                        <span className="rounded-full bg-nk-warm px-3 py-1 text-[11px] text-nk-text-muted">
                          {formatDay(m.at)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", m.from === "owner" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                          m.from === "owner"
                            ? "rounded-br-md bg-nk-accent text-nk-text-inverse"
                            : "rounded-bl-md bg-nk-warm text-nk-text"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* composer */}
            <div className="border-t border-nk-border p-3">
              {templatesOpen && (
                <div className="mb-2 flex flex-col gap-0.5 rounded-lg border border-nk-border bg-nk-bg p-1.5">
                  {messageTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setDraft(tpl.body);
                        setTemplatesOpen(false);
                      }}
                      className="rounded-md px-2.5 py-2 text-left text-xs text-nk-text transition-colors hover:bg-nk-warm"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setTemplatesOpen((v) => !v)}
                  aria-label={t("useTemplate")}
                  className={cn(
                    "shrink-0 rounded-md border border-nk-border p-2.5 text-nk-text transition-colors hover:bg-nk-warm",
                    templatesOpen && "bg-nk-warm"
                  )}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </button>
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t("typeMessage")}
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-md border border-nk-border bg-nk-bg px-3 py-2.5 text-sm text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim()}
                  aria-label={t("send")}
                  className="flex size-[42px] shrink-0 items-center justify-center rounded-md bg-nk-accent text-nk-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="hidden min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-nk-border text-sm text-nk-text-muted lg:flex">
            {t("empty")}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

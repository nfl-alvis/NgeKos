"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, CheckCheck, Clock, MessageSquare, Send, BellRing, Sparkles, Building2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import UserDashboardShell from "@/components/dashboard/UserDashboardShell";
import { cn } from "@/lib/utils";

interface ConversationItem {
  id: string;
  name: string;
  channel: string;
  telegramConnected: boolean;
  unread: number;
  propertyName?: string;
  propertySlug?: string;
  messages: Array<{
    id: string;
    from: "owner" | "contact";
    isMe?: boolean;
    text: string;
    at: string;
    channel: string;
    status?: "sending" | "sent" | "delivered" | "read";
    readAt?: string | null;
  }>;
}

function getMessageStatus(
  m: {
    id: string;
    from: "owner" | "contact";
    at: string;
    status?: "sending" | "sent" | "delivered" | "read";
    readAt?: string | null;
  },
  allMessages: Array<{
    from: "owner" | "contact";
    at: string;
    status?: "sending" | "sent" | "delivered" | "read";
    readAt?: string | null;
  }>,
  telegramConnected?: boolean
): "sending" | "sent" | "delivered" | "read" {
  if (m.status === "sending") return "sending";
  if (m.readAt || m.status === "read") return "read";

  const hasReply = allMessages.some(
    (other) => other.from !== m.from && new Date(other.at).getTime() >= new Date(m.at).getTime()
  );
  if (hasReply) return "read";

  if (m.status === "delivered") return "delivered";
  if (telegramConnected) return "delivered";
  if (m.status === "sent") return "sent";

  return "sent";
}

function MessageStatusTick({ status }: { status: "sending" | "sent" | "delivered" | "read" }) {
  if (status === "sending") {
    return <Clock className="size-3 text-nk-text-inverse/70 animate-pulse shrink-0" aria-label="Mengirim..." />;
  }
  if (status === "sent") {
    return <Check className="size-3.5 text-nk-text-inverse/70 shrink-0" aria-label="Terkirim" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="size-3.5 text-nk-text-inverse/70 shrink-0" aria-label="Tersampaikan" />;
  }
  return <CheckCheck className="size-3.5 text-sky-400 shrink-0" aria-label="Dibaca" />;
}

const dayKey = (iso: string) => iso.slice(0, 10);

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "";
  }
};

const formatChatListTime = (iso: string, locale: string) => {
  try {
    const target = new Date(iso);
    if (isNaN(target.getTime())) return "";
    const now = new Date();
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.round((todayMidnight - targetMidnight) / (24 * 60 * 60 * 1000));

    if (diffDays <= 0) {
      const hours = target.getHours().toString().padStart(2, "0");
      const minutes = target.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    if (diffDays === 1) {
      return locale === "id" ? "Kemarin" : "Yesterday";
    }

    if (diffDays < 7) {
      return target.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        weekday: "long",
      });
    }

    return target.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
};

function UserMessagesContent() {
  const t = useTranslations("userDash");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const targetSlug = searchParams.get("slug");

  const [threads, setThreads] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{ connected: boolean; username: string | null }>({
    connected: false,
    username: null,
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data)) {
          setThreads(json.data);
          // Auto-select jika ada query param slug
          if (targetSlug && !activeId) {
            const matched = json.data.find((c: ConversationItem) => c.propertySlug === targetSlug);
            if (matched) {
              setActiveId(matched.id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Gagal memuat percakapan:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.telegram) {
          setTelegramStatus(json.data.telegram);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchConversations();
    fetchTelegramStatus();
    const interval = setInterval(fetchConversations, 8000);
    return () => clearInterval(interval);
  }, []);

  const active = threads.find((c) => c.id === activeId) ?? null;

  // Tandai pesan sudah dibaca saat membuka percakapan
  useEffect(() => {
    if (!activeId) return;
    fetch(`/api/conversations/${activeId}/read`, { method: "POST" }).catch(() => {});
    setThreads((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              unread: 0,
              messages: c.messages.map((m) =>
                m.from === "owner" ? { ...m, readAt: m.readAt || new Date().toISOString() } : m
              ),
            }
          : c
      )
    );
  }, [activeId]);

  // Auto scroll down saat pesan berubah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, threads]);

  const send = async () => {
    if (!draft.trim() || !active || sending) return;
    const currentDraft = draft.trim();
    setDraft("");
    setSending(true);

    const tempMsgId = `m-${Date.now()}`;
    const newMsg = {
      id: tempMsgId,
      from: "contact" as const,
      isMe: true,
      text: currentDraft,
      at: new Date().toISOString(),
      channel: active.channel,
      status: "sending" as const,
    };

    // Optimistic UI update dengan status 'sending' (ikon jam kecil)
    setThreads((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? {
              ...c,
              unread: 0,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );

    try {
      const res = await fetch(`/api/conversations/${active.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentDraft }),
      });
      if (res.ok) {
        const json = await res.json();
        const realId = json?.data?.id || tempMsgId;
        const isDelivered = Boolean(json?.data?.telegramSent || active.telegramConnected);
        const resolvedStatus = isDelivered ? "delivered" : "sent";

        setThreads((prev) =>
          prev.map((c) =>
            c.id === active.id
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempMsgId
                      ? {
                          ...m,
                          id: realId,
                          status: resolvedStatus,
                        }
                      : m
                  ),
                }
              : c
          )
        );

        if (isDelivered) {
          setTimeout(() => {
            setThreads((prev) =>
              prev.map((c) =>
                c.id === active.id
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === realId ? { ...m, status: "read" as const } : m
                      ),
                    }
                  : c
              )
            );
          }, 3000);
        }
      } else {
        const isDelivered = Boolean(active.telegramConnected);
        const resolvedStatus = isDelivered ? "delivered" : "sent";
        setThreads((prev) =>
          prev.map((c) =>
            c.id === active.id
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempMsgId ? { ...m, status: resolvedStatus } : m
                  ),
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
      const isDelivered = Boolean(active.telegramConnected);
      const resolvedStatus = isDelivered ? "delivered" : "sent";
      setThreads((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === tempMsgId ? { ...m, status: resolvedStatus } : m
                ),
              }
            : c
        )
      );
    } finally {
      setSending(false);
    }
  };

  const formatDay = (iso: string) => {
    try {
      const target = new Date(iso);
      if (isNaN(target.getTime())) return "";
      const now = new Date();
      const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const diffDays = Math.round((todayMidnight - targetMidnight) / (24 * 60 * 60 * 1000));

      if (diffDays <= 0) {
        return locale === "id" ? "Hari ini" : "Today";
      }

      if (diffDays === 1) {
        return locale === "id" ? "Kemarin" : "Yesterday";
      }

      if (diffDays < 7) {
        return target.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
          weekday: "long",
        });
      }

      return target.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <UserDashboardShell title="Pesan & Tanya Pemilik">
      {!telegramStatus.connected && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[#2AABEE]/30 bg-[#2AABEE]/5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#2AABEE]/20 text-[#2AABEE]">
              <BellRing className="size-3.5" />
            </div>
            <p className="text-xs text-nk-text">
              <span className="font-medium">Dapatkan notifikasi instan di Telegram!</span> Hubungkan akun Telegram Anda agar setiap balasan dari pemilik kost langsung masuk ke HP Anda.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-[#2AABEE] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:self-auto"
          >
            Hubungkan Sekarang
          </Link>
        </div>
      )}

      <div className="flex h-[calc(100vh-13rem)] min-h-[480px] gap-6">
        {/* List Percakapan */}
        <aside
          className={cn(
            "flex w-full min-h-0 flex-col rounded-xl border border-nk-border bg-nk-surface lg:w-80 lg:shrink-0",
            active && "hidden lg:flex"
          )}
        >
          <div className="border-b border-nk-border p-3.5">
            <h2 className="text-sm font-medium text-nk-text">Daftar Obrolan</h2>
            <p className="text-[11px] text-nk-text-muted">Percakapan Anda dengan pemilik kost</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs text-nk-text-muted">Memuat percakapan...</div>
            ) : threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="mb-2 size-8 text-nk-text-muted/60" />
                <p className="text-xs font-medium text-nk-text">Belum ada obrolan</p>
                <p className="mt-1 text-[11px] text-nk-text-muted">
                  Buka halaman kost yang Anda minati lalu klik <b>Chat Pemilik</b> untuk mulai bertanya.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-nk-border">
                {threads.map((c) => {
                  const last = c.messages[c.messages.length - 1];
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className={cn(
                          "flex w-full items-start gap-3 p-3.5 text-left transition-colors",
                          activeId === c.id ? "bg-nk-warm" : "hover:bg-nk-warm/50"
                        )}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-accent/10 text-xs font-semibold text-nk-accent ring-1 ring-nk-border">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-medium text-nk-text">{c.name}</span>
                            <span className="shrink-0 text-[10px] text-nk-text-muted">
                              {last ? formatChatListTime(last.at, locale) : ""}
                            </span>
                          </div>
                          {c.propertyName && (
                            <p className="flex items-center gap-1 truncate text-[11px] text-nk-text-muted">
                              <Building2 className="size-2.5 shrink-0" />
                              <span className="truncate">{c.propertyName}</span>
                            </p>
                          )}
                          <p className="mt-0.5 truncate text-[11px] text-nk-text-muted">
                            {last?.text || "Mulai obrolan..."}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Jendela Chat */}
        {active ? (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-nk-border bg-nk-surface">
            {/* Header Chat */}
            <header className="flex items-center gap-3 border-b border-nk-border p-3.5">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                aria-label="Kembali"
                className="rounded-md border border-nk-border p-2 text-nk-text transition-colors hover:bg-nk-warm lg:hidden"
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nk-accent/10 text-xs font-semibold text-nk-accent ring-1 ring-nk-border">
                {active.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-nk-text">{active.name}</span>
                  {active.telegramConnected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#2AABEE]/15 px-2 py-0.5 text-[10px] font-medium text-[#2AABEE]">
                      <span className="size-1 rounded-full bg-[#2AABEE]" />
                      Telegram Terhubung
                    </span>
                  )}
                </div>
                {active.propertyName && (
                  <p className="truncate text-xs text-nk-text-muted">
                    Kost: <span className="font-medium text-nk-text">{active.propertyName}</span>
                  </p>
                )}
              </div>
            </header>

            {/* Bubble Chat Area */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m, i) => {
                const prev = active.messages[i - 1];
                const showDate = !prev || dayKey(prev.at) !== dayKey(m.at);
                const isMyMessage = m.isMe ?? m.from === "contact";

                return (
                  <Fragment key={m.id}>
                    {showDate && (
                      <div className="flex justify-center py-1">
                        <span className="rounded-full bg-nk-warm px-3 py-1 text-[11px] font-medium text-nk-text-muted shadow-xs">
                          {formatDay(m.at)}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isMyMessage ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "relative min-w-[76px] max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 pt-2 pb-1.5 shadow-sm",
                          isMyMessage
                            ? "rounded-br-sm bg-nk-accent text-nk-text-inverse"
                            : "rounded-bl-sm bg-nk-warm text-nk-text"
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed break-words text-xs sm:text-sm pr-1">
                          {m.text}
                        </p>
                        <div
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 select-none text-[10px] leading-none",
                            isMyMessage ? "text-nk-text-inverse/70" : "text-nk-text-muted"
                          )}
                        >
                          <span>{formatTime(m.at)}</span>
                          {isMyMessage && (
                            <MessageStatusTick
                              status={getMessageStatus(
                                m,
                                active.messages,
                                active.telegramConnected
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-nk-border p-3">
              <div className="flex items-end gap-2">
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
                  placeholder="Ketik pesan Anda..."
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-md border border-nk-border bg-nk-bg px-3 py-2.5 text-xs text-nk-text outline-none placeholder:text-nk-text-muted focus:border-nk-accent sm:text-sm"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  aria-label="Kirim"
                  className="flex size-[42px] shrink-0 items-center justify-center rounded-md bg-nk-accent text-nk-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="hidden min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-nk-border text-center text-xs text-nk-text-muted lg:flex">
            <div>
              <MessageSquare className="mx-auto mb-2 size-8 text-nk-text-muted/50" />
              <p className="font-medium text-nk-text">Pilih salah satu percakapan</p>
              <p className="mt-1 text-[11px] text-nk-text-muted">Pesan Anda dengan pemilik kost akan ditampilkan di sini.</p>
            </div>
          </div>
        )}
      </div>
    </UserDashboardShell>
  );
}

export default function UserMessagesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-nk-text-muted">Memuat...</div>}>
      <UserMessagesContent />
    </Suspense>
  );
}

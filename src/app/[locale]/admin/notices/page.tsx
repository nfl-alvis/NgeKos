"use client";

import { useLocale, useTranslations } from "next-intl";
import { Megaphone, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import AdminPageShell, { AdminSection, useAdminToast } from "@/components/admin/AdminPageShell";
import { StatusBadge } from "@/components/StatusBadge";
import { formatReviewDate } from "@/lib/adminReviewStore";
import { useSession } from "@/components/SessionProvider";
import { broadcastDetail, recordOp, useBroadcasts } from "@/lib/adminOpsStore";
import { useState } from "react";

/** Kirim pemberitahuan ke user / owner + riwayat broadcast. */
export default function AdminNoticesPage() {
  const t = useTranslations("admin.notices");
  const locale = useLocale();
  const { show } = useAdminToast();
  const { user } = useSession();
  const broadcasts = useBroadcasts();

  const targetKey = (v: string) => (v === "semua" ? "targetAll" : `target${v.charAt(0).toUpperCase()}${v.slice(1)}`);

  const [target, setTarget] = useState<"owner" | "seeker" | "semua">("owner");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState(false);

  const recipients =
    target === "owner" ? 812 : target === "seeker" ? 12_440 : 13_252;

  const send = () => {
    if (title.trim().length < 4 || body.trim().length < 10) {
      setError(true);
      return;
    }
    recordOp(
      t("targetLabel", { target: t(targetKey(target)) }),
      "send",
      user?.email,
      broadcastDetail(target, title.trim(), body.trim(), recipients)
    );
    show(t("toastSent", { count: recipients }));
    setTitle("");
    setBody("");
    setError(false);
  };

  return (
    <AdminPageShell title={t("title")}>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* form composer */}
        <AdminSection title={t("composeTitle")} bodyClass="p-4 sm:p-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bc-target">{t("targetLabelFull")}</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
                <SelectTrigger id="bc-target" className="h-11 md:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t("targetOwner")}</SelectItem>
                  <SelectItem value="seeker">{t("targetSeeker")}</SelectItem>
                  <SelectItem value="semua">{t("targetAll")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="flex items-center gap-1.5 text-xs text-nk-text-muted">
                <Users className="size-3.5" aria-hidden="true" />
                {t("estimate", { count: recipients })}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bc-title">{t("titleLabel")}</Label>
              <Input
                id="bc-title"
                value={title}
                maxLength={80}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={t("titlePlaceholder")}
                aria-invalid={error}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bc-body">{t("bodyLabel")}</Label>
              <Textarea
                id="bc-body"
                rows={4}
                maxLength={280}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={t("bodyPlaceholder")}
                aria-invalid={error}
              />
            </div>
            {error && <p className="text-xs text-[#9C3B32]">{t("formError")}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-nk-text-muted">{t("sendHint")}</p>
              <Button
                onClick={send}
                className="h-11 bg-nk-accent px-5 text-sm text-nk-text-inverse hover:bg-nk-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nk-accent md:h-9"
              >
                <Send className="size-4" aria-hidden="true" />
                {t("send")}
              </Button>
            </div>
          </div>
        </AdminSection>

        {/* riwayat */}
        <AdminSection title={t("historyTitle")} bodyClass="p-0">
          {broadcasts.map((b, i) => (
            <div
              key={b.id}
              className={`flex items-start gap-3 px-4 py-3.5 ${i < broadcasts.length - 1 ? "border-b border-nk-border" : ""}`}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-nk-warm text-nk-text-muted">
                <Megaphone className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-nk-text">{b.title}</p>
                  <StatusBadge color={b.target === "owner" ? "blue" : b.target === "seeker" ? "green" : "gray"}>
                    {t(targetKey(b.target))}
                  </StatusBadge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-nk-text-muted">{b.body}</p>
                <p className="mt-1 text-xs text-nk-text-muted tabular-nums">
                  {t("sentTo", { count: b.recipients })} · {formatReviewDate(b.sentAt.slice(0, 10), locale)}
                </p>
              </div>
            </div>
          ))}
          {broadcasts.length === 0 && <p className="p-5 text-sm text-nk-text-muted">{t("empty")}</p>}
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}

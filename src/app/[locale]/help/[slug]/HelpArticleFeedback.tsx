"use client";

import { useState } from "react";
import { CheckCircle2, ThumbsDown, ThumbsUp } from "lucide-react";

export default function HelpArticleFeedback() {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  if (feedback !== null) {
    return (
      <div className="mt-8 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
        <span>Terima kasih atas feedback Anda! Ini membantu kami terus menyempurnakan informasi di NgeKos.</span>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-nk-border bg-nk-surface p-4">
      <span className="text-xs text-nk-text-muted">Apakah artikel ini menjawab pertanyaan Anda?</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFeedback("yes")}
          className="inline-flex items-center gap-1.5 rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm hover:border-nk-accent active:scale-95"
        >
          <ThumbsUp className="size-3.5 text-emerald-600" />
          <span>Ya, membantu</span>
        </button>
        <button
          type="button"
          onClick={() => setFeedback("no")}
          className="inline-flex items-center gap-1.5 rounded-md border border-nk-border px-3 py-1.5 text-xs text-nk-text transition-colors hover:bg-nk-warm active:scale-95"
        >
          <ThumbsDown className="size-3.5 text-nk-text-muted" />
          <span>Belum</span>
        </button>
      </div>
    </div>
  );
}

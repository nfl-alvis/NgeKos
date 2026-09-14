"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoginForm from "@/components/LoginForm";

/**
 * Popup masuk untuk alur pengajuan sewa (/kost/[slug]/book).
 * Kini memakai LoginForm yang sama dengan popup "Masuk" di navbar —
 * satu tampilan, satu perilaku (email/password + akun demo), seeker-only.
 */
export default function SeekerAuthModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const lt = useTranslations("login");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{lt("title")}</DialogTitle>
        </DialogHeader>
        <LoginForm role="seeker" onDone={onSuccess} redirectAfter={false} />
      </DialogContent>
    </Dialog>
  );
}

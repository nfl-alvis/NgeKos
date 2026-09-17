"use client";

import { useTranslations } from "next-intl";
import AuthPopupForm from "@/components/AuthPopupForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function SeekerAuthModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const t = useTranslations("booking");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="text-center">
          <h2 className="text-lg font-medium tracking-tight text-nk-text">{t("gateTitle")}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-nk-text-muted">{t("gateBody")}</p>
        </div>
        <AuthPopupForm
          role="seeker"
          onSuccess={onSuccess}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

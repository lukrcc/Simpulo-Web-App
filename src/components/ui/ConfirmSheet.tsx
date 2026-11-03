"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "./Sheet";
import { Button } from "./ActionButton";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** "Are you sure?" for actions that can't be undone in one tap (leave, close). */
export function ConfirmSheet({ open, title, description, confirmLabel, onConfirm, onClose }: ConfirmSheetProps) {
  const t = useTranslations("common");
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-small leading-relaxed text-muted">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onClose} className="w-full sm:w-auto">
          {t("cancel")}
        </Button>
        <Button variant="primary" size="lg" onClick={onConfirm} className="w-full sm:w-auto">
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "./Sheet";
import { buttonClass } from "./button";

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
      <p className="text-sm leading-relaxed text-neutral-600">{description}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={buttonClass("ghost", "lg", "w-full sm:w-auto")}>
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-red-600 px-6 text-base font-semibold text-white transition-colors hover:bg-red-700 sm:w-auto"
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/lib/store";
import type { Report, ReportReason } from "@/lib/types";
import { cn } from "@/lib/utils";

const REASONS: readonly ReportReason[] = ["spam", "harassment", "fake", "unsafe", "other"];

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  target: Report["target"];
  /** First name for the title ("Report Tom") – without it the title names what's reported */
  name?: string;
}

/** Report a person, House or message: one reason, an optional note. Mock: queued in `store.reports`. */
export function ReportSheet({ open, onClose, target, name }: ReportSheetProps) {
  const t = useTranslations("safety.reportSheet");
  const { report } = useStore();
  const showToast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [text, setText] = useState("");

  function close() {
    setReason(null);
    setText("");
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason) return;
    report(target, reason, text);
    showToast(t("sent"));
    close();
  }

  const title =
    target.kind === "user" && name
      ? t("titleUser", { name })
      : target.kind === "user"
        ? t("titleProfile")
        : target.kind === "stay"
          ? t("titleStay")
          : t("titleMessage");

  return (
    <Sheet open={open} onClose={close} title={title}>
      <form onSubmit={handleSubmit}>
        <p className="mb-3 text-sm text-neutral-600">{t("intro")}</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">{title}</legend>
          {REASONS.map((r) => (
            <label
              key={r}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
                reason === r ? "border-ink bg-page" : "border-neutral-200 hover:border-neutral-300",
              )}
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-4 shrink-0 accent-ink"
              />
              {t(`reasons.${r}`)}
            </label>
          ))}
        </fieldset>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">{t("detailsLabel")}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t("detailsPlaceholder")}
            className="w-full resize-none rounded-2xl border border-neutral-200 p-4 text-sm outline-none focus:border-ink"
          />
        </label>
        <button type="submit" disabled={!reason} className={buttonClass("dark", "lg", "mt-4 w-full")}>
          {t("send")}
        </button>
      </form>
    </Sheet>
  );
}

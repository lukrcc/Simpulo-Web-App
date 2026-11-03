"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormField, formTextarea } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Checkbox } from "@/components/ui/Checkbox";
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
        <p className="mb-3 text-small text-muted">{t("intro")}</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">{title}</legend>
          {REASONS.map((r) => (
            <label
              key={r}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-body transition-colors",
                reason === r ? "bg-(--select-bg) font-medium" : "bg-ink/5 hover:bg-ink/10",
              )}
            >
              <Checkbox radio name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {t(`reasons.${r}`)}
            </label>
          ))}
        </fieldset>
        <div className="mt-4">
          <FormField label={t("detailsLabel")}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t("detailsPlaceholder")}
              className={formTextarea}
            />
          </FormField>
        </div>
        <Button type="submit" size="lg" disabled={!reason} className="mt-4 w-full">
          {t("send")}
        </Button>
      </form>
    </Sheet>
  );
}

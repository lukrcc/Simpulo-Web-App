"use client";

// Report (CLAUDE.md "Melden und Moderation"): a person, a House, a message or an album photo – one tap from each. A reason (Harassment ·
// Safety · Scam · Inappropriate · Something else), an optional note, "Also block this person"; Safety adds the emergency line. Then the
// confirmation in the sheet: "Thanks – we'll look at this within 24 hours." The record keeps only what the admin may see (lib/store.tsx).
import { listItemStyles } from "@/components/ui/listSelection";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FormField, formTextarea } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { track } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import type { Report, ReportReason } from "@/lib/types";
import { cn } from "@/lib/utils";

export const REPORT_REASONS = ["harassment", "safety", "scam", "inappropriate", "other"] as const satisfies readonly ReportReason[];

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  target: Report["target"];
  /** First name for the title ("Report Tom") – without it the title names what's reported */
  name?: string;
  /** The person it is about – with it, "Also block this person" (never yourself) */
  subjectId?: string;
  /** A photo: its uploader, House and file (the admin sees only it) */
  extra?: Pick<Report, "subjectId" | "stayId" | "memorySrc">;
}

export function ReportSheet({ open, onClose, target, name, subjectId, extra }: ReportSheetProps) {
  const t = useTranslations("safety.reportSheet");
  const store = useStore();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [text, setText] = useState("");
  const [block, setBlock] = useState(false);
  const [sent, setSent] = useState<ReportReason | null>(null);
  const person = subjectId ?? extra?.subjectId ?? (target.kind === "user" ? target.id : undefined);
  const canBlock = Boolean(person && person !== store.currentUserId);

  function close() {
    setReason(null);
    setText("");
    setBlock(false);
    setSent(null);
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason) return;
    store.report(target, reason, { text, block: canBlock && block, extra: { ...extra, ...(person && { subjectId: person }) } });
    // A signal: what kind, which reason, blocked too – never the words.
    track("report_sent", { kind: target.kind, reason, blocked: canBlock && block });
    setSent(reason);
  }

  const title =
    target.kind === "user" && name
      ? t("titleUser", { name })
      : target.kind === "user"
        ? t("titleProfile")
        : target.kind === "stay"
          ? t("titleStay")
          : target.kind === "memory"
            ? t("titlePhoto")
            : t("titleMessage");

  if (sent) {
    return (
      <Sheet open={open} onClose={close} title={t("sentTitle")}>
        <p className="text-body text-ink">{t("sent")}</p>
        {sent === "safety" && <p className="mt-3 text-body font-semibold text-ink">{t("emergency")}</p>}
        {block && canBlock && <p className="mt-3 text-small text-muted">{t("blockedToo", { name: name ?? t("thisPerson") })}</p>}
        <ModalFooter className="mt-6">
          <Button size="md" onClick={close}>
            {t("done")}
          </Button>
        </ModalFooter>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={close} title={title}>
      <form onSubmit={handleSubmit}>
        <p className="mb-3 text-small text-muted">{t("intro")}</p>
        <fieldset className="space-y-2">
          <legend className="sr-only">{title}</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r} className={listItemStyles(reason === r, cn("flex cursor-pointer items-center gap-3 px-5 py-3 text-body", reason === r && "font-medium"))}>
              <Checkbox radio name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {t(`reasons.${r}`)}
            </label>
          ))}
        </fieldset>
        {/* Safety: the local emergency number first – Simpulo isn't an emergency service. */}
        {reason === "safety" && (
          <p role="note" className="mt-3 text-body font-semibold text-ink">
            {t("emergency")}
          </p>
        )}
        <div className="mt-4">
          <FormField label={t("detailsLabel")}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} placeholder={t("detailsPlaceholder")} className={formTextarea} />
          </FormField>
        </div>
        {canBlock && (
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3">
            <Checkbox checked={block} onChange={(e) => setBlock(e.target.checked)} />
            <span className="text-body text-ink">{t("alsoBlock")}</span>
          </label>
        )}
        <ModalFooter onCancel={close} className="mt-4">
          <Button type="submit" size="md" disabled={!reason}>
            {t("send")}
          </Button>
        </ModalFooter>
      </form>
    </Sheet>
  );
}

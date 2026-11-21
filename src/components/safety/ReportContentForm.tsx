"use client";

// /report-content (CLAUDE.md "Plattform-Pflichten"): anyone can report content they believe is illegal or against the rules – with or
// without an account. What (a link to a House, a profile or anything on Simpulo), why, an explanation, an email for the answer. It lands in
// Admin › Posteingang › Sicherheit; the person gets a confirmation now and the result once it's decided.
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, Textarea } from "@/components/ui/Input";
import { listItemStyles } from "@/components/ui/listSelection";
import { appendAdminLog } from "@/lib/admin/store";
import { track } from "@/lib/analytics";
import { CONTENT_REASONS, resolveContentLink } from "@/lib/contentReport";
import { notifyByEmail } from "@/lib/notify";
import { getCurrentUser, useStore } from "@/lib/store";
import { cn, makeId } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ReportContentForm({ initialLink = "" }: { initialLink?: string }) {
  const t = useTranslations("reportContent");
  const store = useStore();
  const me = getCurrentUser(store);
  const [link, setLink] = useState(initialLink);
  const [reason, setReason] = useState<(typeof CONTENT_REASONS)[number] | null>(null);
  const [text, setText] = useState("");
  const [mail, setMail] = useState(me?.email ?? "");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const valid = { link: link.trim().length > 0, reason: reason !== null, text: text.trim().length >= 10, mail: EMAIL.test(mail.trim()) };
  const ok = Object.values(valid).every(Boolean);

  function submit() {
    setTouched(true);
    if (!ok || !reason) return;
    const resolved = resolveContentLink(link, store.stays, store.users);
    const id = makeId("rep");
    store.reportContent({ id, reason, text: text.trim().slice(0, 4000), link: link.trim().slice(0, 500), reporterEmail: mail.trim(), createdAt: new Date().toISOString(), ...resolved });
    // The confirmation by email in any case (in-app too with an account – the store); the log keeps only that a report came in.
    notifyByEmail(me?.id ?? mail.trim(), "reportReceived");
    appendAdminLog("content_reported", `${resolved.target.kind} · ${reason}`, me?.id ?? "public", resolved.stayId);
    track("report_sent", { kind: resolved.target.kind, reason, source: "form" });
    setSent(mail.trim());
  }

  return (
    <Container page width="narrow">
      {sent ? (
        <section role="status" data-report-content="sent" className="flex flex-col gap-3 py-8">
          <h1 className="text-h1 text-ink">{t("sentTitle")}</h1>
          <p className="text-body-lg text-muted">{t("sentText", { email: sent })}</p>
        </section>
      ) : (
        <form
          noValidate
          data-report-content="form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-6 pb-16"
        >
          <header>
            <h1 className="text-h1 text-ink">{t("title")}</h1>
            <p className="mt-3 max-w-[60ch] text-body-lg text-muted">{t("intro")}</p>
            <p role="note" className="mt-3 text-body font-semibold text-ink">
              {t("emergency")}
            </p>
          </header>
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-semibold text-ink">{t("what")}</span>
            <Input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="https://simpulo.app/house/…" aria-invalid={touched && !valid.link} />
            <span className={cn("text-small", touched && !valid.link ? "text-danger" : "text-muted")}>{t("whatHint")}</span>
          </label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-small font-semibold text-ink">{t("why")}</legend>
            {CONTENT_REASONS.map((r) => (
              <label key={r} className={listItemStyles(reason === r, "flex cursor-pointer items-center gap-3 px-5 py-3 text-body")}>
                <Checkbox radio name="content-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                {t(`reasons.${r}`)}
              </label>
            ))}
            {touched && !valid.reason && <span className="text-small text-danger">{t("whyMissing")}</span>}
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-semibold text-ink">{t("explain")}</span>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={4000} aria-invalid={touched && !valid.text} />
            <span className={cn("text-small", touched && !valid.text ? "text-danger" : "text-muted")}>{t("explainHint")}</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-semibold text-ink">{t("email")}</span>
            <Input type="email" inputMode="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} aria-invalid={touched && !valid.mail} />
            <span className={cn("text-small", touched && !valid.mail ? "text-danger" : "text-muted")}>{t("emailHint")}</span>
          </label>
          <div className="flex justify-end">
            <Button type="submit">{t("send")}</Button>
          </div>
        </form>
      )}
    </Container>
  );
}

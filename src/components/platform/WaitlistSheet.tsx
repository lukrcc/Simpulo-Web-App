"use client";

// "Join the waitlist" (pre-launch and beta, CLAUDE.md "Warteliste"): one sheet, mounted once in AppShell, opened from anywhere
// (lib/waitlistSignup.ts openWaitlist) with what's known – the place, theme and month of a search. Email, optionally where / theme / when,
// and the required tick "Email me when Houses open here". Then the double opt-in: "Check your inbox".
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/ActionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ModalFooter, Sheet } from "@/components/ui/Sheet";
import { useFormat } from "@/i18n/format";
import { VIBES } from "@/lib/catalog";
import { firstTouch } from "@/lib/growth";
import { getCurrentUser, useStore } from "@/lib/store";
import type { Vibe } from "@/lib/types";
import { closeWaitlist, joinWaitlist, useWaitlistSheet, type WaitlistPrefill } from "@/lib/waitlistSignup";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The next 12 months as "YYYY-MM". */
function nextMonths(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)).toISOString().slice(0, 7));
}

export function WaitlistSheet() {
  const { open, prefill } = useWaitlistSheet();
  // A new form each time it opens (the prefill of that moment).
  return open ? <WaitlistForm key={JSON.stringify(prefill)} prefill={prefill} /> : null;
}

function WaitlistForm({ prefill }: { prefill: WaitlistPrefill }) {
  const t = useTranslations("platform.waitlist");
  const f = useFormat();
  const format = useFormatter();
  const store = useStore();
  const me = getCurrentUser(store);
  const [emailValue, setEmail] = useState(me?.email ?? "");
  const [where, setWhere] = useState(prefill.where ?? "");
  const [category, setCategory] = useState<Vibe | "">(prefill.category ?? "");
  const [month, setMonth] = useState(prefill.month ?? "");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const valid = EMAIL.test(emailValue.trim());
  const months = nextMonths();

  const submit = () => {
    setTouched(true);
    if (!valid || !consent) return;
    const touch = firstTouch();
    joinWaitlist({ email: emailValue, where: where.trim() || null, category: category || null, month: month || null, consent: true, userId: me?.id, source: touch.utmSource ?? null, referredBy: touch.refUserId ?? null });
    setSent(emailValue.trim());
  };

  return (
    <Sheet open onClose={closeWaitlist} title={sent ? t("sentTitle") : t("title")} subtitle={sent ? undefined : t("subtitle")}>
      {sent ? (
        <>
          <p className="text-body text-ink">{t("sentText", { email: sent })}</p>
          <ModalFooter className="mt-6">
            <Button onClick={closeWaitlist}>{t("done")}</Button>
          </ModalFooter>
        </>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-semibold text-ink">{t("email")}</span>
            <Input type="email" autoComplete="email" inputMode="email" value={emailValue} onChange={(e) => setEmail(e.target.value)} aria-invalid={touched && !valid} />
            {touched && !valid && <span className="text-small text-danger">{t("invalidEmail")}</span>}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-small font-semibold text-ink">
                {t("where")} <span className="font-normal text-muted">· {t("optional")}</span>
              </span>
              <Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder={t("whereHint")} maxLength={80} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-small font-semibold text-ink">
                {t("theme")} <span className="font-normal text-muted">· {t("optional")}</span>
              </span>
              <Select value={category} onChange={(e) => setCategory(e.target.value as Vibe | "")}>
                <option value="">{t("themeAny")}</option>
                {VIBES.map((v) => (
                  <option key={v.key} value={v.key}>
                    {f.vibe(v.key)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-small font-semibold text-ink">
                {t("when")} <span className="font-normal text-muted">· {t("optional")}</span>
              </span>
              <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">{t("whenAny")}</option>
                {[...new Set([...(prefill.month ? [prefill.month] : []), ...months])].map((m) => (
                  <option key={m} value={m}>
                    {format.dateTime(new Date(`${m}-01T00:00:00Z`), { month: "long", year: "numeric", timeZone: "UTC" })}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 pt-1">
            <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" aria-invalid={touched && !consent} />
            <span className="flex flex-col">
              <span className="text-body text-ink">{t("consent")}</span>
              <span className={touched && !consent ? "text-small text-danger" : "text-small text-muted"}>{t("consentHint")}</span>
            </span>
          </label>
          <ModalFooter onCancel={closeWaitlist} className="mt-2">
            <Button type="submit" disabled={!consent}>
              {t("send")}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Sheet>
  );
}

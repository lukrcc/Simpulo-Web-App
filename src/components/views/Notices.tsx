"use client";

// /notices – the statements of reasons (CLAUDE.md "Plattform-Pflichten"): every time Simpulo acted against you – a warning, out of a
// House, a House or photo taken down, the account suspended – what, when, why, the rule (a link), and "Appeal". The appeal goes to Admin ›
// Posteingang; the answer comes back here and as a notification. Only your own; nobody else sees them.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRequireAuth } from "@/components/auth/AuthProvider";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/ActionButton";
import { Textarea } from "@/components/ui/Input";
import { RULE_OF_REASON } from "@/config/moderation";
import { useFormat } from "@/i18n/format";
import { appendAdminLog } from "@/lib/admin/store";
import { useStore } from "@/lib/store";
import type { ModerationNotice } from "@/lib/types";

export function Notices() {
  const t = useTranslations("notices");
  const store = useStore();
  const requireAuth = useRequireAuth();
  const mine = store.notices.filter((n) => n.userId === store.currentUserId).toSorted((a, b) => b.at.localeCompare(a.at));
  return (
    <Container page width="narrow">
      <h1 className="text-h1 text-ink">{t("title")}</h1>
      <p className="mt-3 text-body-lg text-muted">{t("intro")}</p>
      {!store.currentUserId ? (
        store.sessionRestored && (
          <Button className="mt-8" onClick={() => requireAuth(undefined, { reason: "login" })}>
            {t("login")}
          </Button>
        )
      ) : mine.length === 0 ? (
        <p className="mt-8 text-body text-muted">{t("none")}</p>
      ) : (
        <ol className="mt-8 flex flex-col gap-10 pb-16">
          {mine.map((n) => (
            <NoticeItem key={n.id} notice={n} />
          ))}
        </ol>
      )}
    </Container>
  );
}

function NoticeItem({ notice }: { notice: ModerationNotice }) {
  const t = useTranslations("notices");
  const f = useFormat();
  const store = useStore();
  const [text, setText] = useState("");
  const stay = notice.stayId ? store.stays.find((s) => s.id === notice.stayId) : undefined;
  const rule = RULE_OF_REASON[notice.reason];
  const field = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-0.5 text-body text-ink">{value}</dd>
    </div>
  );
  return (
    <li id={notice.id} data-notice={notice.action} className="scroll-mt-[calc(var(--header-total)+24px)] border-t border-ink/8 pt-6">
      <h2 className="text-h3 text-ink">{t(`action.${notice.action}`, { title: stay?.title ?? "" })}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {field(t("when"), f.day(notice.at))}
        {field(t("why"), t(`reason.${notice.reason}`))}
        {field(
          t("rule"),
          <Link href={rule.href} className="font-semibold underline underline-offset-4 hover:no-underline">
            {t(`rules.${rule.key}` as "rules.respect")}
          </Link>,
        )}
        {stay && field(t("house"), stay.title)}
      </dl>
      <div className="mt-6">
        {notice.appeal?.decision ? (
          <p data-appeal="decided" className="text-body text-ink">
            {t(notice.appeal.decision.outcome === "reversed" ? "reversed" : "upheld", { date: f.day(notice.appeal.decision.at) })}
          </p>
        ) : notice.appeal ? (
          <p data-appeal="sent" className="text-body text-ink">
            {t("appealSent", { date: f.day(notice.appeal.at) })}
          </p>
        ) : (
          <form
            data-appeal="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim().length < 10) return;
              store.appeal(notice.id, text);
              appendAdminLog("appeal_received", `${notice.action} · ${notice.reason}`, notice.userId);
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor={`appeal-${notice.id}`} className="text-small font-semibold text-ink">
              {t("appealLabel")}
            </label>
            <Textarea id={`appeal-${notice.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={2000} />
            <p className="text-small text-muted">{t("appealHint")}</p>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" disabled={text.trim().length < 10}>
                {t("appealSend")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </li>
  );
}

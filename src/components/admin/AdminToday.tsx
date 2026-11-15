"use client";

// /admin/today – "Was ist heute zu tun?": ONE list from every source (lib/admin/tasks.ts adminTasks), safety first, then money, tax deadlines, Houses at
// risk, applications, host warnings, support – oldest first within each. Each row: ember dot, the kind, one sentence, the action that fits
// right in the row (Öffnen, Antworten, Hervorheben, Ja/Vielleicht/Nein, Erinnern), and "Erledigt" / "Später" (back tomorrow). Every action
// goes into the log (lib/admin/actions.ts). Empty: "✓ Alles erledigt" in sage. No cards – rows on the page, split by fine lines.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { useAdminActions } from "@/lib/admin/actions";
import { tomorrowOf, type AdminTask } from "@/lib/admin/tasks";
import { daysUntil } from "@/lib/admin/ledger";
import { deadlineLabel } from "@/lib/admin/exporters";
import { useAdminTasks } from "@/lib/admin/useAdminTasks";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { share } from "@/lib/i18n/adminFormat";
import { findUser, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AdminShell } from "./AdminShell";

export function AdminToday() {
  const t = useTranslations("admin.today");
  const tasks = useAdminTasks();
  return (
    <AdminShell title={t("title")} aside={tasks.length > 0 ? <span className="text-small text-muted">{t("count", { count: tasks.length })}</span> : undefined}>
      {tasks.length === 0 ? (
        <p className="text-h3 text-adm-good">{t("allDone")}</p>
      ) : (
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function TaskRow({ task }: { task: AdminTask }) {
  const t = useTranslations("admin.today");
  const tHouses = useTranslations("admin.houses");
  const tHosts = useTranslations("admin.hosts");
  const tApps = useTranslations("admin.applications");
  const tTaxes = useTranslations("admin.money.taxes");
  const f = useFormat();
  const store = useStore();
  const { today } = useAdminInputs();
  const actions = useAdminActions();
  const showToast = useToast();
  const [replying, setReplying] = useState(false);
  // The reply field starts with a suggestion. ⚠ MOCK: one fixed text; TODO: an AI draft from the ticket, its context and earlier answers.
  const [reply, setReply] = useState(() => t("suggestion"));

  const label = `${t(`kind.${task.kind}`)} · ${task.id}`;
  const done = () => {
    actions.completeTask(task.id, label);
    showToast(t("toast.done"));
  };
  const later = () => {
    actions.snoozeTask(task.id, label, tomorrowOf(today));
    showToast(t("toast.later"));
  };

  let sentence = "";
  let main: ReactNode = null;
  if (task.kind === "safety" || task.kind === "support") {
    sentence = task.ticket.message.split("\n")[0];
    main = (
      <>
        <Link href="/admin/support" className={buttonStyles("tertiary", "sm")}>
          {t("action.open")}
        </Link>
        <Button size="sm" variant="secondary" onClick={() => setReplying((open) => !open)} aria-expanded={replying}>
          {t("action.reply")}
        </Button>
      </>
    );
  } else if (task.kind === "money") {
    const guest = findUser(store, task.issue.userId);
    const title = task.stay?.title ?? task.issue.stayId;
    sentence = t("sentence.payment", { name: guest?.name ?? task.issue.userId, house: title, reason: t(`paymentReason.${task.issue.reason as "card_declined"}`) });
    main = (
      <>
        <Link href={`/h/${task.issue.stayId}/manage`} className={buttonStyles("tertiary", "sm")}>
          {t("action.open")}
        </Link>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            actions.remindGuest(guest?.name ?? task.issue.userId, title);
            showToast(t("toast.remindGuest", { name: guest?.name ?? "" }));
          }}
        >
          {t("action.remind")}
        </Button>
      </>
    );
  } else if (task.kind === "deadline") {
    const days = daysUntil(today, task.deadline.date);
    sentence = t("sentence.deadline", { label: deadlineLabel(task.deadline), when: tTaxes("deadlines.inDays", { days }) });
    main = (
      <Link href="/admin/money/taxes" className={buttonStyles("tertiary", "sm")}>
        {t("action.open")}
      </Link>
    );
  } else if (task.kind === "atRisk") {
    const { stay, reasons } = task;
    sentence = `${stay.title}: ${reasons
      .map((r) => (r.key === "deadline" ? tHouses("reason.deadline", { days: r.days, fill: share(r.fill) }) : r.key === "quiet" ? tHouses("reason.quiet", { days: r.days }) : tHouses("reason.unanswered", { hours: r.hours })))
      .join(" ")}`;
    const host = findUser(store, stay.hostId);
    main = (
      <>
        {reasons.some((r) => r.key !== "unanswered") && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              actions.highlightHouse(stay);
              showToast(tHouses("toast.highlight", { title: stay.title }));
            }}
          >
            {t("action.highlight")}
          </Button>
        )}
        {reasons.some((r) => r.key === "unanswered") && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              actions.remindHost(stay, host?.name ?? "");
              showToast(tHouses("toast.remind", { name: host?.name ?? "" }));
            }}
          >
            {t("action.remind")}
          </Button>
        )}
      </>
    );
  } else if (task.kind === "application") {
    const a = task.application;
    sentence = t("sentence.application", { name: a.name, hub: a.hub, topic: f.vibe(a.topic) });
    main = (
      <>
        <Button size="sm" variant="secondary" onClick={() => actions.decide(a, "yes")}>
          {tApps("yes")}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => actions.decide(a, "maybe")}>
          {tApps("maybe")}
        </Button>
        <Button size="sm" variant="tertiary" onClick={() => actions.decide(a, "no")}>
          {tApps("no")}
        </Button>
      </>
    );
  } else if (task.kind === "hostWarning") {
    const { host } = task;
    sentence = t("sentence.host", { name: host.user.name, warnings: host.warnings.filter((w) => w !== "safety").map((w) => tHosts(`warning.${w}`)).join(" · ") });
    main = (
      <>
        <Link href="/admin/hosts" className={buttonStyles("tertiary", "sm")}>
          {t("action.open")}
        </Link>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            actions.remindHost({ title: host.houses[0]?.title ?? "" }, host.user.name);
            showToast(t("toast.remindHost", { name: host.user.name }));
          }}
        >
          {t("action.remind")}
        </Button>
      </>
    );
  }

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", task.kind === "safety" ? "bg-danger" : "bg-adm-critical")} />
        <span className="w-32 shrink-0 text-small font-semibold text-ink">{t(`kind.${task.kind}`)}</span>
        <span className="min-w-0 flex-1 basis-64 text-body text-ink">
          <span className="line-clamp-2">{sentence}</span>
          <span className="text-small text-muted">{f.day(task.createdAt)}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {main}
          <Button size="sm" variant="tertiary" onClick={done}>
            {t("action.done")}
          </Button>
          <Button size="sm" variant="tertiary" onClick={later}>
            {t("action.later")}
          </Button>
        </span>
      </div>
      {replying && (task.kind === "safety" || task.kind === "support") && (
        <form
          className="mt-3 flex flex-col gap-2 pl-[calc(0.5rem+1rem+8rem+1rem)] max-md:pl-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            actions.reply(task.ticket, reply.trim());
            actions.completeTask(task.id, label);
            showToast(t("toast.replied"));
          }}
        >
          <label className="text-small text-muted" htmlFor={`reply-${task.id}`}>
            {t("suggestionLabel")}
          </label>
          <Textarea id={`reply-${task.id}`} value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-24" />
          <span className="flex gap-2">
            <Button size="sm" type="submit" disabled={!reply.trim()}>
              {t("action.send")}
            </Button>
            <Button size="sm" variant="tertiary" onClick={() => setReplying(false)}>
              {t("action.cancel")}
            </Button>
          </span>
        </form>
      )}
    </li>
  );
}

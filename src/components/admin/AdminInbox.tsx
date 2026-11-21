"use client";

// Admin › Posteingang (/admin/posteingang) – replaces "Heute" and "Support": ONE list of what needs you, from lib/admin/tasks.ts (safety,
// money, tax deadlines, Houses at risk, applications, host warnings) plus the support tickets, each element once. Tabs (with counts): Alle ·
// Sicherheit · Geld · Houses · Hosts · Fragen · Kaputt · Ideen; right: Offen/Erledigt and the search. "Alle" in the order safety, money,
// Houses, hosts, the rest – within each the oldest first. A row (AdminListDetail): dot · the sentence (one line) · the category · the date ·
// ✓; a click opens the detail right with every action (Antworten, Erinnern, Hervorheben, Später …) and the history. Ideen: the wishes by votes.
// Every action through lib/admin/actions.ts (and into the log).
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, buttonStyles } from "@/components/ui/ActionButton";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { useAdminActions } from "@/lib/admin/actions";
import { daysUntil } from "@/lib/admin/ledger";
import { deadlineLabel } from "@/lib/admin/exporters";
import { useAdminData } from "@/lib/admin/store";
import { tomorrowOf, type AdminTask } from "@/lib/admin/tasks";
import { useAdminTasks, useDoneAdminTasks } from "@/lib/admin/useAdminTasks";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { share } from "@/lib/i18n/adminFormat";
import { findUser, useStore } from "@/lib/store";
import { profileHref } from "@/lib/privacy";
import type { Report, ReportOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Img } from "@/components/ui/Img";
import { InfoTip } from "./AdminNumbers";
import { AdminShell } from "./AdminShell";
import { AdminListDetail, AdminSearch, AdminTabs, BackToList } from "./AdminLayout";
import { Ideas, TicketDetail } from "./AdminSupport";

export type InboxTab = "all" | "safety" | "money" | "houses" | "hosts" | "questions" | "broken" | "ideas";
const TABS: readonly InboxTab[] = ["all", "safety", "money", "houses", "hosts", "questions", "broken", "ideas"];

/** Which tab an element belongs to (besides "Alle"). */
export function tabOf(task: AdminTask): Exclude<InboxTab, "all"> {
  switch (task.kind) {
    case "report":
    case "safety":
      return "safety";
    case "money":
    case "deadline":
      return "money";
    case "atRisk":
      return "houses";
    case "application":
    case "hostWarning":
    case "partnerStep":
      return "hosts";
    case "support":
      return task.ticket.category === "idea" ? "ideas" : task.ticket.category === "bug" ? "broken" : "questions";
  }
}

/** One sentence per element (shortened to one line in the row by the layout). */
function useSentence() {
  const t = useTranslations("admin.today");
  const tReports = useTranslations("admin.reports");
  const tHouses = useTranslations("admin.houses");
  const tHosts = useTranslations("admin.hosts");
  const tTaxes = useTranslations("admin.money.taxes");
  const f = useFormat();
  const store = useStore();
  const { today } = useAdminInputs();
  return (task: AdminTask): string => {
    switch (task.kind) {
      case "report": {
        const subject = task.report.subjectId ? findUser(store, task.report.subjectId)?.name : undefined;
        const house = task.report.stayId ? store.stays.find((x) => x.id === task.report.stayId)?.title : undefined;
        return t("sentence.report", { reason: tReports(`reason.${task.report.reason}`), subject: subject ?? tReports("someone"), house: house ? ` · ${house}` : "" });
      }
      case "safety":
      case "support":
        return task.ticket.message.split("\n")[0];
      case "money": {
        const guest = findUser(store, task.issue.userId);
        return t("sentence.payment", { name: guest?.name ?? task.issue.userId, house: task.stay?.title ?? task.issue.stayId, reason: t(`paymentReason.${task.issue.reason as "card_declined"}`) });
      }
      case "deadline":
        return t("sentence.deadline", { label: deadlineLabel(task.deadline), when: tTaxes("deadlines.inDays", { days: daysUntil(today, task.deadline.date) }) });
      case "atRisk":
        return `${task.stay.title}: ${task.reasons
          .map((r) => (r.key === "deadline" ? tHouses("reason.deadline", { days: r.days, fill: share(r.fill) }) : r.key === "quiet" ? tHouses("reason.quiet", { days: r.days }) : tHouses("reason.unanswered", { hours: r.hours })))
          .join(" ")}`;
      case "application":
        return t("sentence.application", { name: task.application.name, hub: task.application.hub, topic: f.vibe(task.application.topic) });
      case "partnerStep":
        return t("sentence.partner", { name: task.partner.name, step: task.partner.nextStep?.text ?? "" });
      case "hostWarning":
        return t("sentence.host", { name: task.host.user.name, warnings: task.host.warnings.filter((w) => w !== "safety").map((w) => tHosts(`warning.${w}`)).join(" · ") });
    }
  };
}

export function AdminInbox() {
  const t = useTranslations("admin.inbox");
  const tToday = useTranslations("admin.today");
  const f = useFormat();
  const open = useAdminTasks();
  const done = useDoneAdminTasks();
  const sentence = useSentence();
  const actions = useAdminActions();
  const showToast = useToast();
  const [tab, setTab] = useState<InboxTab>("all");
  const [status, setStatus] = useState<"open" | "done">("open");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const source = status === "open" ? open : done;
  const q = query.trim().toLowerCase();
  const inTab = (task: AdminTask, key: InboxTab) => key === "all" || tabOf(task) === key;
  const shown = source.filter((task) => inTab(task, tab)).filter((task) => !q || sentence(task).toLowerCase().includes(q));
  const selected = shown.find((task) => task.id === selectedId) ?? null;
  const markDone = (task: AdminTask) => {
    actions.completeTask(task.id, `${tToday(`kind.${task.kind}`)} · ${task.id}`);
    showToast(tToday("toast.done"));
    if (selectedId === task.id) setSelectedId(null);
  };

  return (
    <AdminShell
      title={t("title")}
      tabs={<AdminTabs label={t("tabsLabel")} value={tab} onChange={(next) => (setTab(next), setSelectedId(null))} tabs={TABS.map((key) => ({ value: key, label: t(`tab.${key}`), count: source.filter((task) => inTab(task, key)).length }))} />}
      aside={
        <>
          <AdminTabs label={t("statusLabel")} value={status} onChange={(next) => (setStatus(next), setSelectedId(null))} tabs={[{ value: "open", label: t("status.open") }, { value: "done", label: t("status.done") }]} />
          <AdminSearch label={t("search")} value={query} onChange={setQuery} />
        </>
      }
    >
      {tab === "ideas" && status === "open" ? (
        <Ideas />
      ) : (
        <AdminListDetail
          label={t("title")}
          rows={shown.map((task) => ({
            id: task.id,
            status: status === "open" ? ("critical" as const) : null,
            title: sentence(task),
            meta: tToday(`kind.${task.kind}`),
            aside: f.day(task.createdAt),
            done: status === "done",
          }))}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onDone={status === "open" ? (id) => markDone(source.find((x) => x.id === id)!) : undefined}
          doneLabel={tToday("action.done")}
          empty={<p className="text-h3 text-adm-good">{status === "open" ? tToday("allDone") : t("noneDone")}</p>}
          detail={selected ? <InboxDetail key={selected.id} task={selected} sentence={sentence(selected)} isOpen={status === "open"} onBack={() => setSelectedId(null)} onDone={() => markDone(selected)} /> : <p className="py-2 text-body text-muted">{t("pick")}</p>}
        />
      )}
    </AdminShell>
  );
}

/**
 * A report (Posteingang › Sicherheit): what was reported, why, by whom, about whom; only the reported excerpt (the message ± 3 – never
 * the whole chat; opening it is logged); the person's earlier reports; Verwarnen · Aus dem House entfernen · Konto sperren · Unbegründet.
 * Harassment in a House: the person leaves it (Regel) – "Verwarnen" is not offered there.
 */
function ReportDetail({ report, isOpen }: { report: Report; isOpen: boolean }) {
  const t = useTranslations("admin.reports");
  const f = useFormat();
  const store = useStore();
  const actions = useAdminActions();
  const showToast = useToast();
  const reporter = findUser(store, report.reporterId);
  const subject = report.subjectId ? findUser(store, report.subjectId) : undefined;
  const stay = report.stayId ? store.stays.find((x) => x.id === report.stayId) : undefined;
  const detail = `${t(`reason.${report.reason}`)} · ${subject?.name ?? t("someone")}${stay ? ` · ${stay.title}` : ""}`;
  // Every opening of a report is in the log (who looked at what).
  useEffect(() => {
    actions.viewReport(report, detail);
    // Once per report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id]);
  const earlier = store.reports.filter((r) => r.id !== report.id && r.subjectId && r.subjectId === report.subjectId).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const inHouse = Boolean(stay && subject && subject.id !== stay.hostId && store.joinRequests.some((r) => r.stayId === stay.id && r.userId === subject.id && r.status === "accepted"));
  const harassment = report.reason === "harassment" && inHouse;
  const decide = (outcome: ReportOutcome) => {
    actions.moderate(report, outcome, detail);
    showToast(t("toast", { outcome: t(`outcome.${outcome}`) }));
  };
  const field = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-eyebrow uppercase text-(--adm-label)">{label}</dt>
      <dd className="mt-1 text-body text-ink">{value}</dd>
    </div>
  );
  return (
    <div className="mt-(--adm-inner) flex flex-col gap-(--adm-section)">
      <dl className="grid gap-4 sm:grid-cols-2">
        {field(t("labelReason"), t(`reason.${report.reason}`))}
        {field(t("labelWhat"), t(`target.${report.target.kind}`))}
        {field(t("labelBy"), reporter?.name ?? report.reporterId)}
        {field(
          t("labelSubject"),
          subject ? (
            <Link href={profileHref(subject.id)} className="hover:underline">
              {subject.name}
            </Link>
          ) : (
            t("someone")
          ),
        )}
        {stay && field(t("labelHouse"), <Link href={`/admin/houses?house=${stay.id}`} className="hover:underline">{stay.title}</Link>)}
        {report.text && field(t("labelText"), `„${report.text}“`)}
      </dl>
      {report.blocked && <p className="text-small text-muted">{t("blocked")}</p>}
      {report.excerpt && report.excerpt.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-eyebrow uppercase text-(--adm-label)">
            {t("context")}
            <InfoTip text={t("contextInfo")} />
          </h3>
          <ol className="mt-2 flex flex-col gap-2">
            {report.excerpt.map((m) => (
              <li key={m.id} data-excerpt-reported={m.reported || undefined} className={cn("rounded-xl px-3 py-2 text-body", m.reported ? "bg-(--adm-block) ring-1 ring-adm-critical" : "text-muted")}>
                <span className="text-small font-semibold text-ink">{findUser(store, m.senderId)?.name.split(" ")[0] ?? m.senderId}</span>
                <span className="ml-2 text-small text-muted">{f.day(m.at)}</span>
                {m.reported && <span className="ml-2 text-small text-adm-critical">{t("reported")}</span>}
                <p className={cn("mt-0.5", m.reported ? "text-ink" : "text-muted")}>{m.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
      {report.target.kind === "memory" && (
        <section>
          <h3 className="text-eyebrow uppercase text-(--adm-label)">{t("photo")}</h3>
          {report.memorySrc ? <Img src={report.memorySrc} alt="" width={240} height={240} className="mt-2 size-60 rounded-xl object-cover" /> : <p className="mt-2 text-small text-muted">{t("noFile")}</p>}
        </section>
      )}
      <section>
        <h3 className="text-eyebrow uppercase text-(--adm-label)">{t("history")}</h3>
        {subject?.suspendedAt && <p className="mt-2 text-small text-adm-critical">{t("suspended", { date: f.day(subject.suspendedAt) })}</p>}
        {earlier.length === 0 ? (
          <p className="mt-2 text-small text-muted">{t("historyNone")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink/8">
            {earlier.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-4 py-2 text-small">
                <span className="text-ink">
                  {t(`reason.${r.reason}`)} · {t(`target.${r.target.kind}`)}
                </span>
                <span className="text-muted">
                  {r.decision ? `${t(`outcome.${r.decision.outcome}`)} · ` : ""}
                  {f.day(r.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {report.decision ? (
        <p className="text-body font-semibold text-ink">{t("decided", { outcome: t(`outcome.${report.decision.outcome}`), date: f.day(report.decision.at) })}</p>
      ) : (
        isOpen && (
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {!harassment && (
                <Button size="sm" variant="secondary" onClick={() => decide("warned")}>
                  {t("actions.warned")}
                </Button>
              )}
              <Button size="sm" variant={harassment ? "primary" : "secondary"} disabled={!inHouse} onClick={() => decide("removed")}>
                {t("actions.removed")}
              </Button>
              <Button size="sm" variant="secondary" disabled={!subject} onClick={() => decide("suspended")}>
                {t("actions.suspended")}
              </Button>
              <Button size="sm" variant="tertiary" onClick={() => decide("unfounded")}>
                {t("actions.unfounded")}
              </Button>
            </div>
            {harassment && <p className="text-small text-muted">{t("harassmentRule")}</p>}
            {!inHouse && stay && <p className="text-small text-muted">{t("noRemove")}</p>}
            <p className="text-small text-muted">{t("messagesHint")}</p>
          </section>
        )
      )}
    </div>
  );
}

/** The detail: the element, every action that fits, "Später" and "Erledigt", then its history. Tickets: the full ticket (reply, status …). */
function InboxDetail({ task, sentence, isOpen, onBack, onDone }: { task: AdminTask; sentence: string; isOpen: boolean; onBack: () => void; onDone: () => void }) {
  const t = useTranslations("admin.today");
  const tInbox = useTranslations("admin.inbox");
  const tHouses = useTranslations("admin.houses");
  const tApps = useTranslations("admin.applications");
  const tLog = useTranslations("admin.log");
  const f = useFormat();
  const store = useStore();
  const { today } = useAdminInputs();
  const { tickets, log } = useAdminData();
  const actions = useAdminActions();
  const showToast = useToast();
  const [reply, setReply] = useState(() => t("suggestion"));
  const label = `${t(`kind.${task.kind}`)} · ${task.id}`;
  const later = () => {
    actions.snoozeTask(task.id, label, tomorrowOf(today));
    showToast(t("toast.later"));
    onBack();
  };

  const isTicket = task.kind === "safety" || task.kind === "support";
  // The history: the log lines about this element (its House, its person, its ticket).
  const subject =
    task.kind === "atRisk" ? task.stay.title : task.kind === "money" ? (task.stay?.title ?? "") : task.kind === "application" ? task.application.name : task.kind === "hostWarning" ? task.host.user.name : task.kind === "partnerStep" ? task.partner.name : isTicket ? task.ticket.id : task.id;
  const history = log.filter((entry) => subject && entry.target.includes(subject)).slice(0, 8);

  let actionsRow: React.ReactNode = null;
  if (task.kind === "money") {
    const guest = findUser(store, task.issue.userId);
    actionsRow = (
      <>
        <Link href={`/h/${task.issue.stayId}?tab=manage`} className={buttonStyles("secondary", "sm")}>
          {t("action.open")}
        </Link>
        <Button size="sm" variant="secondary" onClick={() => (actions.remindGuest(guest?.name ?? task.issue.userId, task.stay?.title ?? task.issue.stayId), showToast(t("toast.remindGuest", { name: guest?.name ?? "" })))}>
          {t("action.remind")}
        </Button>
      </>
    );
  } else if (task.kind === "deadline") {
    actionsRow = (
      <Link href="/admin/money/taxes" className={buttonStyles("secondary", "sm")}>
        {t("action.open")}
      </Link>
    );
  } else if (task.kind === "atRisk") {
    const host = findUser(store, task.stay.hostId);
    actionsRow = (
      <>
        <Link href={`/admin/houses?house=${task.stay.id}`} className={buttonStyles("secondary", "sm")}>
          {t("action.open")}
        </Link>
        <Button size="sm" variant="secondary" onClick={() => (actions.highlightHouse(task.stay), showToast(tHouses("toast.highlight", { title: task.stay.title })))}>
          {t("action.highlight")}
        </Button>
        {task.reasons.some((r) => r.key === "unanswered") && (
          <Button size="sm" variant="secondary" onClick={() => (actions.remindHost(task.stay, host?.name ?? ""), showToast(tHouses("toast.remind", { name: host?.name ?? "" })))}>
            {t("action.remind")}
          </Button>
        )}
      </>
    );
  } else if (task.kind === "application") {
    actionsRow = (
      <>
        <Button size="sm" variant="secondary" onClick={() => actions.decide(task.application, "yes")}>
          {tApps("yes")}
        </Button>
        {/* Rückfrage needs its text (the template) – in the application's detail. */}
        <Link href={`/admin/applications?app=${task.application.id}`} className={buttonStyles("secondary", "sm")}>
          {tApps("maybe")}
        </Link>
        <Button size="sm" variant="tertiary" onClick={() => actions.decide(task.application, "no")}>
          {tApps("no")}
        </Button>
      </>
    );
  } else if (task.kind === "partnerStep") {
    actionsRow = (
      <Link href={`/admin/marketing?tab=partners&partner=${task.partner.id}`} className={buttonStyles("secondary", "sm")}>
        {t("action.open")}
      </Link>
    );
  } else if (task.kind === "hostWarning") {
    actionsRow = (
      <>
        <Link href={`/admin/hosts?host=${task.host.user.id}`} className={buttonStyles("secondary", "sm")}>
          {t("action.open")}
        </Link>
        <Button size="sm" variant="secondary" onClick={() => (actions.remindHost({ title: task.host.houses[0]?.title ?? "" }, task.host.user.name), showToast(t("toast.remindHost", { name: task.host.user.name })))}>
          {t("action.remind")}
        </Button>
      </>
    );
  }

  if (task.kind === "report") {
    return (
      <article data-inbox-detail>
        <BackToList onBack={onBack} />
        <p className="text-eyebrow uppercase text-(--adm-label)">
          {t(`kind.${task.kind}`)} · {f.day(task.createdAt)}
        </p>
        <p className="mt-2 text-h3 text-ink">{sentence}</p>
        <ReportDetail report={task.report} isOpen={isOpen} />
      </article>
    );
  }

  return (
    <article data-inbox-detail>
      <BackToList onBack={onBack} />
      <p className="text-eyebrow uppercase text-(--adm-label)">
        {t(`kind.${task.kind}`)} · {f.day(task.createdAt)}
      </p>
      {!isTicket && <p className="mt-2 text-h3 text-ink">{sentence}</p>}
      {/* Every action here – never in the row. */}
      {isOpen && (
        <div className="mt-(--adm-inner) flex flex-wrap items-center gap-2">
          {actionsRow}
          <Button size="sm" variant="tertiary" onClick={later}>
            {t("action.later")}
          </Button>
          <Button size="sm" variant="tertiary" onClick={onDone}>
            {t("action.done")}
          </Button>
        </div>
      )}
      {isTicket && (
        <div className="mt-(--adm-inner)">
          {/* Safety: the reply field starts with a suggestion (⚠ MOCK one fixed text; TODO an AI draft). */}
          {isOpen && task.kind === "safety" && task.ticket.replies.length === 0 && (
            <form
              className="mb-(--adm-inner) flex flex-col gap-2"
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
              <span>
                <Button size="sm" type="submit" disabled={!reply.trim()}>
                  {t("action.send")}
                </Button>
              </span>
            </form>
          )}
          <TicketDetail ticket={task.ticket} tickets={tickets} onBack={onBack} />
        </div>
      )}
      {!isTicket && (
        <section className="mt-(--adm-section)">
          <h3 className="text-eyebrow uppercase text-(--adm-label)">{tInbox("history")}</h3>
          {history.length === 0 ? (
            <p className="mt-2 text-small text-muted">{tInbox("noHistory")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink/8">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-4 py-2 text-small">
                  <span className="min-w-0 truncate text-ink">{tLog(`action.${entry.action}`)}</span>
                  <span className="shrink-0 text-muted">{f.day(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </article>
  );
}

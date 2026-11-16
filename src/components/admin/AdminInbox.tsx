"use client";

// Admin › Posteingang (/admin/posteingang) – replaces "Heute" and "Support": ONE list of what needs you, from lib/admin/tasks.ts (safety,
// money, tax deadlines, Houses at risk, applications, host warnings) plus the support tickets, each element once. Tabs (with counts): Alle ·
// Sicherheit · Geld · Houses · Hosts · Fragen · Kaputt · Ideen; right: Offen/Erledigt and the search. "Alle" in the order safety, money,
// Houses, hosts, the rest – within each the oldest first. A row (AdminListDetail): dot · the sentence (one line) · the category · the date ·
// ✓; a click opens the detail right with every action (Antworten, Erinnern, Hervorheben, Später …) and the history. Ideen: the wishes by votes.
// Every action through lib/admin/actions.ts (and into the log).
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { AdminShell } from "./AdminShell";
import { AdminListDetail, AdminSearch, AdminTabs, BackToList } from "./AdminLayout";
import { Ideas, TicketDetail } from "./AdminSupport";

export type InboxTab = "all" | "safety" | "money" | "houses" | "hosts" | "questions" | "broken" | "ideas";
const TABS: readonly InboxTab[] = ["all", "safety", "money", "houses", "hosts", "questions", "broken", "ideas"];

/** Which tab an element belongs to (besides "Alle"). */
export function tabOf(task: AdminTask): Exclude<InboxTab, "all"> {
  switch (task.kind) {
    case "safety":
      return "safety";
    case "money":
    case "deadline":
      return "money";
    case "atRisk":
      return "houses";
    case "application":
    case "hostWarning":
      return "hosts";
    case "support":
      return task.ticket.category === "idea" ? "ideas" : task.ticket.category === "bug" ? "broken" : "questions";
  }
}

/** One sentence per element (shortened to one line in the row by the layout). */
function useSentence() {
  const t = useTranslations("admin.today");
  const tHouses = useTranslations("admin.houses");
  const tHosts = useTranslations("admin.hosts");
  const tTaxes = useTranslations("admin.money.taxes");
  const f = useFormat();
  const store = useStore();
  const { today } = useAdminInputs();
  return (task: AdminTask): string => {
    switch (task.kind) {
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
    task.kind === "atRisk" ? task.stay.title : task.kind === "money" ? (task.stay?.title ?? "") : task.kind === "application" ? task.application.name : task.kind === "hostWarning" ? task.host.user.name : isTicket ? task.ticket.id : task.id;
  const history = log.filter((entry) => subject && entry.target.includes(subject)).slice(0, 8);

  let actionsRow: React.ReactNode = null;
  if (task.kind === "money") {
    const guest = findUser(store, task.issue.userId);
    actionsRow = (
      <>
        <Link href={`/h/${task.issue.stayId}/manage`} className={buttonStyles("secondary", "sm")}>
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
        <Button size="sm" variant="secondary" onClick={() => actions.decide(task.application, "maybe")}>
          {tApps("maybe")}
        </Button>
        <Button size="sm" variant="tertiary" onClick={() => actions.decide(task.application, "no")}>
          {tApps("no")}
        </Button>
      </>
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

"use client";
import { AdminButton, adminButtonStyles } from "./AdminButton";

// Admin › Aufgaben (/admin/aufgaben; /admin/posteingang leitet hierher) – the ONE place where something needs doing (CLAUDE.md "Handeln nur
// über Aufgaben"). The exception to "Überblick zuerst": the list itself is the overview – no tile page before it. Tabs (with counts and a
// dot in the kind's colour): Alle · Houses · Hosts · Sicherheit · Geld · Fragen (?tab=); right: Offen/Erledigt and the search.
// Order (Offen): Sicherheit always on top (high priority first), then everything else by date, newest first; tasks put off ("Später") as
// their own collapsible section below. A row: the kind's coloured dot · the sentence why · a small label with the kind · the date · ✓.
// The first task opens on its own; after "Erledigt" (or an action that settles it) the next one opens.
// The detail: 1 head (kind in its colour · priority · date) · 2 "Was ist passiert" (large) · 3 "Wer und wo" (one compact row) · 4 the
// action – tickets a reply field prefilled with the suggestion and [Senden]; a House its recommended lever in one click; applications
// Annehmen · Ablehnen · Rückfrage; Anchor Bestätigen · Ablehnen; reports and appeals their own decisions – · 5 [Später] · [✓ Erledigt].
// Sicherheit: the reply gives immediate help; reports offer "Kontakt einschränken" and "Person sperren" (with a confirmation, logged).
// Every action through lib/admin/actions.ts (and into the log). Colours only from the tokens --adm-kind-*.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { useAdminActions } from "@/lib/admin/actions";
import { daysUntil } from "@/lib/admin/ledger";
import { deadlineLabel } from "@/lib/admin/exporters";
import { useAdminData } from "@/lib/admin/store";
import { TASK_AREAS, taskArea, tomorrowOf, type AdminTask, type TaskArea } from "@/lib/admin/tasks";
import { useAdminTasks, useDoneAdminTasks, useSnoozedAdminTasks } from "@/lib/admin/useAdminTasks";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { findUser, useStore } from "@/lib/store";
import { profileHref } from "@/lib/privacy";
import type { ModerationNotice, Report, ReportOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Img } from "@/components/ui/Img";
import { InfoTip } from "./AdminNumbers";
import { AdminShell } from "./AdminShell";
import { AdminListDetail, AdminSearch, AdminTabs, BackToList, DirectLink, type ListDetailRow } from "./AdminLayout";
import { stripeUrl } from "@/config/tools";
import { TicketDetail } from "./AdminSupport";
import { nudgeAudience } from "@/lib/houseHelp";
import { num } from "@/lib/i18n/adminFormat";

export type InboxTab = "all" | TaskArea;
const TABS: readonly InboxTab[] = ["all", ...TASK_AREAS];
const tabOf = taskArea;

/** Each kind's colour (tokens in styles/admin-tokens.css, light and dark). */
const KIND_TONE: Record<TaskArea, string> = {
  safety: "var(--adm-kind-safety)",
  money: "var(--adm-kind-money)",
  houses: "var(--adm-kind-houses)",
  hosts: "var(--adm-kind-hosts)",
  questions: "var(--adm-kind-questions)",
};
const KIND_SOFT: Record<TaskArea, string> = {
  safety: "var(--adm-kind-safety-soft)",
  money: "var(--adm-kind-money-soft)",
  houses: "var(--adm-kind-houses-soft)",
  hosts: "var(--adm-kind-hosts-soft)",
  questions: "var(--adm-kind-questions-soft)",
};

/** High: everything about safety, failed payments and tax deadlines; a ticket by its own priority; the rest normal. */
function priorityOf(task: AdminTask): "high" | "normal" {
  const area = taskArea(task);
  if (area === "safety" || area === "money") return "high";
  if (task.kind === "support") return task.ticket.priority;
  return "normal";
}

/** Offen: Sicherheit on top (high priority first, then newest), then everything else by date, newest first. */
function ordered(tasks: readonly AdminTask[]): AdminTask[] {
  const newest = (a: AdminTask, b: AdminTask) => b.createdAt.localeCompare(a.createdAt);
  const safety = tasks.filter((x) => taskArea(x) === "safety").toSorted((a, b) => Number(priorityOf(b) === "high") - Number(priorityOf(a) === "high") || newest(a, b));
  return [...safety, ...tasks.filter((x) => taskArea(x) !== "safety").toSorted(newest)];
}

/** The kind's dot. */
function KindDot({ area, className }: { area: TaskArea; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: KIND_TONE[area] }} />;
}

/** The kind as a small label: its colour on its soft surface. */
function KindLabel({ area, children }: { area: TaskArea; children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full px-2 text-small font-semibold leading-none" style={{ backgroundColor: KIND_SOFT[area], color: KIND_TONE[area] } as CSSProperties}>
      {children}
    </span>
  );
}

/** A button that asks once before it acts (Kontakt einschränken, Person sperren) – inline, no browser dialog. */
function ConfirmAction({ label, question, onConfirm }: { label: string; question: string; onConfirm: () => void }) {
  const t = useTranslations("admin.inboxNew");
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <AdminButton variant="secondary" onClick={() => setAsking(true)}>
        {label}
      </AdminButton>
    );
  return (
    <span data-confirm className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-adm-critical/40 px-3 py-1.5">
      <span className="text-small text-ink">{question}</span>
      <AdminButton variant="primary" onClick={() => (onConfirm(), setAsking(false))}>
        {t("confirmYes")}
      </AdminButton>
      <AdminButton variant="secondary" onClick={() => setAsking(false)}>
        {t("confirmNo")}
      </AdminButton>
    </span>
  );
}

/** One sentence per element (shortened to one line in the row by the layout). */
function useSentence() {
  const t = useTranslations("admin.today");
  const tReports = useTranslations("admin.reports");
  const tHouses = useTranslations("admin.houses");
  const tHosts = useTranslations("admin.hosts");
  const tTiers = useTranslations("admin.tiers");
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
      case "appeal":
        return tReports("appeal.sentence", { action: tReports(`outcome.${task.notice.action}`), name: findUser(store, task.notice.userId)?.name ?? tReports("someone") });
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
        return t("sentence.house", {
          title: task.stay.title,
          reasons: task.reasons.map((r) => (r.key === "deadline" ? tHouses("reason.deadline", { days: r.days, missing: Math.max(0, task.stay.spotsTotal - task.stay.spotsFilled) }) : r.key === "quiet" ? tHouses("reason.quiet", { days: r.days }) : tHouses("reason.unanswered", { hours: r.hours }))).join(" "),
          lever: t(`lever.${task.lever}`),
        });
      case "anchor":
        return t("sentence.anchor", { name: task.host.user.name, followers: num(task.host.followers), tier: task.host.user.hostTier ? tTiers(task.host.user.hostTier) : tTiers("unset") });
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
  const tNew = useTranslations("admin.inboxNew");
  const tToday = useTranslations("admin.today");
  const f = useFormat();
  const open = useAdminTasks();
  const snoozed = useSnoozedAdminTasks();
  const done = useDoneAdminTasks();
  const sentence = useSentence();
  const actions = useAdminActions();
  const showToast = useToast();
  const { today } = useAdminInputs();
  // The list is the overview: "Alle" by default; ?tab=houses|hosts|… (the overview's tiles, the hints on Houses and Hosts) opens that tab.
  const [tab, setTab] = useState<InboxTab>(() => {
    const wanted = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return (TABS as readonly string[]).includes(wanted ?? "") ? (wanted as InboxTab) : "all";
  });
  const [status, setStatus] = useState<"open" | "done">("open");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLater, setShowLater] = useState(false);

  const q = query.trim().toLowerCase();
  const inTab = (task: AdminTask, key: InboxTab) => key === "all" || tabOf(task) === key;
  const filter = (list: readonly AdminTask[]) => list.filter((task) => inTab(task, tab)).filter((task) => !q || sentence(task).toLowerCase().includes(q));
  const main = status === "open" ? ordered(filter(open)) : filter(done).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  const later = status === "open" ? ordered(filter(snoozed)) : [];
  // What can be opened, in the order shown: the list, then the "Später" section when it's open.
  const visible = [...main, ...(showLater ? later : [])];
  // The first task opens on its own – never "pick one on the left".
  const selected = visible.find((task) => task.id === selectedId) ?? visible[0] ?? null;
  /** The one after this (or before it, at the end) – where the view goes once this one is settled. */
  const nextAfter = (task: AdminTask) => {
    const i = visible.findIndex((x) => x.id === task.id);
    return visible[i + 1]?.id ?? visible[i - 1]?.id ?? null;
  };
  const goNext = (task: AdminTask) => setSelectedId(nextAfter(task));
  const labelOf = (task: AdminTask) => `${tToday(`kind.${task.kind}`)} · ${task.id}`;
  const markDone = (task: AdminTask) => {
    goNext(task);
    actions.completeTask(task.id, labelOf(task));
    showToast(tToday("toast.done"));
  };
  const putOff = (task: AdminTask) => {
    goNext(task);
    actions.snoozeTask(task.id, labelOf(task), tomorrowOf(today));
    showToast(tToday("toast.later"));
  };

  const row = (task: AdminTask, extra: Partial<ListDetailRow> = {}): ListDetailRow => {
    const area = taskArea(task);
    return {
      id: task.id,
      media: <KindDot area={area} />,
      title: sentence(task),
      meta: <KindLabel area={area}>{tToday(`kind.${task.kind}`)}</KindLabel>,
      aside: f.day(task.createdAt),
      done: status === "done",
      ...extra,
    };
  };
  const toggle = (
    <button type="button" onClick={() => setShowLater((v) => !v)} aria-expanded={showLater} data-later-toggle className="inline-flex items-center gap-1.5 text-small font-semibold text-muted hover:text-ink">
      <span aria-hidden className={cn("inline-block transition-transform duration-150", showLater && "rotate-90")}>
        ›
      </span>
      {tNew("laterSection", { count: num(later.length) })}
    </button>
  );
  const rows: ListDetailRow[] = [
    ...main.map((task) => row(task)),
    ...(later.length === 0
      ? []
      : showLater
        ? later.map((task, i) => row(task, { section: i === 0 ? toggle : undefined, aside: f.day(task.createdAt) }))
        : [{ id: "later-section", title: "", section: toggle, sectionOnly: true }]),
  ];
  const counts = status === "open" ? [...open, ...snoozed] : done;

  return (
    <AdminShell
      title={t("title")}
      tabs={
        <AdminTabs<InboxTab>
          label={t("tabsLabel")}
          value={tab}
          onChange={(next) => (setTab(next), setSelectedId(null))}
          tabs={TABS.map((key) => ({ value: key, label: t(`tab.${key}`), count: counts.filter((task) => inTab(task, key)).length, tone: key === "all" ? undefined : KIND_TONE[key] }))}
        />
      }
      aside={
        <>
          <AdminTabs label={t("statusLabel")} value={status} onChange={(next) => (setStatus(next), setSelectedId(null))} tabs={[{ value: "open", label: t("status.open") }, { value: "done", label: t("status.done") }]} />
          <AdminSearch label={t("search")} value={query} onChange={setQuery} />
        </>
      }
    >
      <AdminListDetail
        label={t("title")}
        rows={rows}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
        onDone={status === "open" ? (id) => markDone(visible.find((x) => x.id === id)!) : undefined}
        doneLabel={tToday("action.done")}
        empty={<p className="text-h3 text-adm-good">{status === "open" ? tNew("allDone") : tNew("noneDone")}</p>}
        detail={
          selected ? (
            <InboxDetail
              key={selected.id}
              task={selected}
              sentence={sentence(selected)}
              isOpen={status === "open"}
              isLater={later.some((x) => x.id === selected.id)}
              onBack={() => setSelectedId(null)}
              onDone={() => markDone(selected)}
              onLater={() => putOff(selected)}
              onSettled={() => goNext(selected)}
            />
          ) : main.length === 0 && later.length > 0 ? (
            <p className="py-2 text-body text-muted">{tNew("allDone")}</p>
          ) : null
        }
      />
    </AdminShell>
  );
}

/** "Wer und wo": one compact row of small facts (label · value), whatever the task knows. */
function WhoWhere({ facts }: { facts: readonly { key: string; label: string; value: ReactNode }[] }) {
  const t = useTranslations("admin.inboxNew");
  const shown = facts.filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== "");
  if (shown.length === 0) return null;
  return (
    <section aria-label={t("who")} data-who-where className="mt-(--adm-inner)">
      <h3 className="text-eyebrow uppercase text-(--adm-label)">{t("who")}</h3>
      <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5 text-small">
        {shown.map((fact) => (
          <div key={fact.key} className="flex min-w-0 items-baseline gap-1.5">
            <dt className="text-muted">{fact.label}</dt>
            <dd className="min-w-0 truncate text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const profileLink = (id: string, name: string) => (
  <Link href={profileHref(id)} className="font-semibold text-ink hover:underline">
    {name}
  </Link>
);
const houseLink = (id: string, title: string) => (
  <Link href={`/admin/houses?house=${id}`} className="font-semibold text-ink hover:underline">
    {title}
  </Link>
);

/**
 * The detail, in this order: 1 head (kind in its colour · priority · date) · 2 "Was ist passiert" (large) · 3 "Wer und wo" · 4 the action
 * (reply field, lever, decision …) · 5 [Später] (secondary) · [✓ Erledigt] (primary) and "Details →". Reports and appeals keep their own
 * decision blocks. The history and a ticket's extras (status, tags, note, merge) folded underneath.
 */
function InboxDetail({ task, sentence, isOpen, isLater, onBack, onDone, onLater, onSettled }: { task: AdminTask; sentence: string; isOpen: boolean; isLater: boolean; onBack: () => void; onDone: () => void; onLater: () => void; onSettled: () => void }) {
  const t = useTranslations("admin.today");
  const tNew = useTranslations("admin.inboxNew");
  const tHouses = useTranslations("admin.houses");
  const tApps = useTranslations("admin.applications");
  const tLog = useTranslations("admin.log");
  const f = useFormat();
  const store = useStore();
  const { today } = useAdminInputs();
  const adminData = useAdminData();
  const { tickets, log } = adminData;
  const actions = useAdminActions();
  const showToast = useToast();
  const area = taskArea(task);
  const isTicket = task.kind === "safety" || task.kind === "support";
  const label = `${t(`kind.${task.kind}`)} · ${task.id}`;
  // Sicherheit: a reply that helps right away; every other ticket: the usual suggestion (⚠ MOCK one fixed text; TODO an AI draft).
  const [reply, setReply] = useState(() => (task.kind === "safety" ? tNew("safetySuggestion") : t("suggestion")));
  const settle = () => onSettled();

  // The history: the log lines about this element (its House, its person, its ticket).
  const subject =
    task.kind === "atRisk" ? task.stay.title : task.kind === "money" ? (task.stay?.title ?? "") : task.kind === "application" ? task.application.name : task.kind === "anchor" ? task.host.user.name : task.kind === "hostWarning" ? task.host.user.name : task.kind === "partnerStep" ? task.partner.name : isTicket ? task.ticket.id : task.id;
  const history = log.filter((entry) => subject && entry.target.includes(subject)).slice(0, 8);

  // 2 · Was ist passiert, 3 · Wer und wo – by kind.
  let what: ReactNode = sentence;
  let facts: { key: string; label: string; value: ReactNode }[] = [];
  // 4 · the action this task asks for.
  let action: ReactNode = null;
  let details: string | null = null;
  if (isTicket) {
    const ticket = task.ticket;
    const user = ticket.userId ? findUser(store, ticket.userId) : undefined;
    const house = ticket.context.houseId ? store.stays.find((s) => s.id === ticket.context.houseId) : undefined;
    what = <span className="whitespace-pre-wrap">{ticket.message}</span>;
    facts = [
      { key: "person", label: tNew("field.person"), value: user ? profileLink(user.id, user.name) : null },
      { key: "email", label: tNew("field.email"), value: ticket.email },
      { key: "device", label: tNew("field.device"), value: ticket.context.device },
      { key: "page", label: tNew("field.page"), value: ticket.context.page },
      { key: "phase", label: tNew("field.phase"), value: ticket.context.phase },
      { key: "house", label: tNew("field.house"), value: house ? houseLink(house.id, house.title) : null },
    ];
    action =
      isOpen && !ticket.mergedInto ? (
        <form
          data-reply
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            settle();
            actions.reply(ticket, reply.trim());
            actions.completeTask(task.id, label);
            showToast(tNew("sent"));
          }}
        >
          <label className="text-eyebrow uppercase text-(--adm-label)" htmlFor={`reply-${task.id}`}>
            {tNew("answer")}
          </label>
          <Textarea id={`reply-${task.id}`} value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-28" />
          <span>
            <AdminButton type="submit" variant="primary" disabled={!reply.trim()}>
              {tNew("send")}
            </AdminButton>
          </span>
        </form>
      ) : null;
  } else if (task.kind === "money") {
    const guest = findUser(store, task.issue.userId);
    facts = [
      { key: "guest", label: tNew("field.guest"), value: guest ? profileLink(guest.id, guest.name) : task.issue.userId },
      { key: "email", label: tNew("field.email"), value: guest?.email ?? null },
      { key: "house", label: tNew("field.house"), value: task.stay ? houseLink(task.stay.id, task.stay.title) : task.issue.stayId },
    ];
    action = (
      <span className="flex flex-wrap items-center gap-2">
        <AdminButton variant="primary" onClick={() => (actions.remindGuest(guest?.name ?? task.issue.userId, task.stay?.title ?? task.issue.stayId), showToast(t("toast.remindGuest", { name: guest?.name ?? "" })))}>
          {t("action.remind")}
        </AdminButton>
        <DirectLink href={stripeUrl("payment", task.issue.stripePaymentIntentId)}>{t("action.openStripe")}</DirectLink>
      </span>
    );
    details = `/h/${task.issue.stayId}?tab=manage`;
  } else if (task.kind === "deadline") {
    facts = [{ key: "due", label: tNew("field.due"), value: f.day(task.deadline.date) }];
    details = "/admin/money?tab=taxes";
  } else if (task.kind === "atRisk") {
    const stay = task.stay;
    const host = findUser(store, stay.hostId);
    facts = [
      { key: "house", label: tNew("field.house"), value: houseLink(stay.id, stay.title) },
      { key: "host", label: tNew("field.host"), value: host ? profileLink(host.id, host.name) : null },
      { key: "hub", label: tNew("field.hub"), value: f.placeName(stay) },
      { key: "due", label: tNew("field.due"), value: f.stayDates(stay) },
    ];
    const lever = t(`lever.${task.lever}`);
    const applied = () => {
      settle();
      actions.markHouseDone(stay);
      showToast(t("toast.lever", { lever }));
    };
    // The recommended lever in one click (visibility, demand); the host's suggestions and an alternative need their text – their window opens in Houses.
    action = (
      <span className="flex flex-wrap items-center gap-2">
        {task.lever === "visibility" ? (
          <AdminButton variant="primary" onClick={() => (actions.highlightHouse(stay), applied())}>
            {lever}
          </AdminButton>
        ) : task.lever === "demand" ? (
          <AdminButton
            variant="primary"
            onClick={() => {
              const involved = new Set(store.joinRequests.filter((r) => r.stayId === stay.id && r.status !== "declined" && r.status !== "expired").map((r) => r.userId));
              const nudgedToday = new Set(Object.entries(adminData.nudged ?? {}).filter(([, d]) => d === today).map(([k]) => k));
              actions.nudgeHouse(stay, nudgeAudience(stay, { users: store.users, waitlist: adminData.waitlist, inFor: store.inFor, involved, nudgedToday, today }), today);
              applied();
            }}
          >
            {lever}
          </AdminButton>
        ) : (
          <Link href={`/admin/houses?house=${stay.id}&lever=${task.lever}`} className={adminButtonStyles("primary")}>
            {lever}
          </Link>
        )}
        {task.reasons.some((r) => r.key === "unanswered") && (
          <AdminButton variant="secondary" onClick={() => (actions.remindHost(stay, host?.name ?? ""), showToast(tHouses("toast.remind", { name: host?.name ?? "" })))}>
            {t("action.remind")}
          </AdminButton>
        )}
      </span>
    );
    details = `/admin/houses?house=${stay.id}`;
  } else if (task.kind === "application") {
    const app = task.application;
    facts = [
      { key: "person", label: tNew("field.person"), value: app.userId ? profileLink(app.userId, app.name) : app.name },
      { key: "email", label: tNew("field.email"), value: app.email },
      { key: "hub", label: tNew("field.hub"), value: app.hub },
      { key: "topic", label: tNew("field.topic"), value: f.vibe(app.topic) },
      { key: "followers", label: tNew("field.followers"), value: app.audienceSize ? num(app.audienceSize) : null },
    ];
    action = (
      <span className="flex flex-wrap items-center gap-2">
        <AdminButton variant="primary" onClick={() => (settle(), actions.decide(app, "yes"))}>
          {tApps("yes")}
        </AdminButton>
        <AdminButton variant="secondary" onClick={() => (settle(), actions.decide(app, "no"))}>
          {tApps("no")}
        </AdminButton>
        {/* Rückfrage needs its text (the template) – in the application's detail. */}
        <Link href={`/admin/hosts?tab=applications&app=${app.id}`} className={adminButtonStyles("secondary")}>
          {tApps("maybe")}
        </Link>
      </span>
    );
    details = `/admin/hosts?tab=applications&app=${app.id}`;
  } else if (task.kind === "anchor" || task.kind === "hostWarning") {
    const user = task.host.user;
    facts = [
      { key: "host", label: tNew("field.host"), value: profileLink(user.id, user.name) },
      { key: "email", label: tNew("field.email"), value: user.email ?? null },
      { key: "followers", label: tNew("field.followers"), value: task.kind === "anchor" ? num(task.host.followers) : null },
      { key: "houses", label: tNew("field.houses"), value: num(task.host.houses.length) },
    ];
    action =
      task.kind === "anchor" ? (
        <span className="flex flex-wrap items-center gap-2">
          <AdminButton variant="primary" onClick={() => (settle(), actions.setHostTier(user, "anchor"), actions.completeTask(task.id, label), showToast(t("toast.anchor", { name: user.name })))}>
            {t("action.confirmAnchor")}
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => (settle(), actions.completeTask(task.id, label), showToast(t("toast.declined")))}>
            {t("action.decline")}
          </AdminButton>
        </span>
      ) : (
        <AdminButton variant="primary" onClick={() => (actions.remindHost({ title: task.host.houses[0]?.title ?? "" }, user.name), showToast(t("toast.remindHost", { name: user.name })))}>
          {t("action.remind")}
        </AdminButton>
      );
    details = `/admin/hosts?host=${user.id}`;
  } else if (task.kind === "partnerStep") {
    facts = [
      { key: "partner", label: tNew("field.partner"), value: task.partner.name },
      { key: "due", label: tNew("field.due"), value: task.partner.nextStep?.due ? f.day(task.partner.nextStep.due) : null },
    ];
    details = `/admin/marketing?tab=partners&partner=${task.partner.id}`;
  } else if (task.kind === "appeal") {
    const person = findUser(store, task.notice.userId);
    facts = [{ key: "person", label: tNew("field.person"), value: person ? profileLink(person.id, person.name) : null }];
  }

  const head = (
    <div data-inbox-head className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
      <KindLabel area={area}>{tNew(`area.${area}`)}</KindLabel>
      <span className={cn("font-semibold", priorityOf(task) === "high" ? "text-ink" : "text-muted")}>{tNew(`priority.${priorityOf(task)}`)}</span>
      <span className="text-muted">
        {t(`kind.${task.kind}`) !== tNew(`area.${area}`) && `${t(`kind.${task.kind}`)} · `}
        {f.day(task.createdAt)}
      </span>
    </div>
  );
  const bottom = isOpen && (
    <div data-inbox-bottom className="mt-(--adm-section) flex flex-wrap items-center gap-2 border-t border-ink/8 pt-(--adm-inner)">
      {!isLater && (
        <AdminButton variant="secondary" onClick={onLater}>
          {t("action.later")}
        </AdminButton>
      )}
      <AdminButton variant="primary" onClick={onDone}>
        ✓ {t("action.done")}
      </AdminButton>
      {details && (
        <Link href={details} className="ml-auto text-small font-semibold text-ink hover:underline">
          {tNew("details")} →
        </Link>
      )}
    </div>
  );
  const folded = (
    <>
      {isTicket && (
        <details className="mt-(--adm-inner) text-small" data-ticket-extras>
          <summary className="cursor-pointer font-semibold text-muted hover:text-ink">{tNew("extras")}</summary>
          <div className="mt-2">
            <TicketDetail ticket={task.ticket} tickets={tickets} onBack={onBack} extrasOnly />
          </div>
        </details>
      )}
      {!isTicket && (
        <details className="mt-(--adm-inner) text-small" data-history>
          <summary className="cursor-pointer font-semibold text-muted hover:text-ink">
            {tNew("history")} · {history.length}
          </summary>
          {history.length === 0 ? (
            <p className="mt-2 text-small text-muted">{tNew("noHistory")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink/8">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-4 py-2 text-small">
                  <span className="min-w-0 truncate text-ink">{tLog.has(`action.${entry.action}` as Parameters<typeof tLog>[0]) ? tLog(`action.${entry.action}` as Parameters<typeof tLog>[0]) : entry.action}</span>
                  <span className="shrink-0 text-muted">{f.day(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
    </>
  );

  return (
    <article data-inbox-detail data-kind={task.kind}>
      <BackToList onBack={onBack} />
      {head}
      <section aria-label={tNew("what")} className="mt-(--adm-inner)">
        <h3 className="text-eyebrow uppercase text-(--adm-label)">{tNew("what")}</h3>
        <p data-what className="mt-1.5 text-h3 text-ink">
          {what}
        </p>
      </section>
      {task.kind === "report" ? (
        <ReportDetail report={task.report} isOpen={isOpen} />
      ) : task.kind === "appeal" ? (
        <>
          <WhoWhere facts={facts} />
          <AppealDetail notice={task.notice} sentence={sentence} />
        </>
      ) : (
        <>
          <WhoWhere facts={facts} />
          {action && isOpen && <div className="mt-(--adm-section)">{action}</div>}
        </>
      )}
      {bottom}
      {folded}
    </article>
  );
}

/**
 * A report (Posteingang › Sicherheit): what was reported, why, by whom, about whom; only the reported excerpt (the message ± 3 – never
 * the whole chat; opening it is logged); the person's earlier reports; Verwarnen · Aus dem House entfernen · Konto sperren · Unbegründet.
 * Harassment in a House: the person leaves it (Regel) – "Verwarnen" is not offered there.
 */
function ReportDetail({ report, isOpen }: { report: Report; isOpen: boolean }) {
  const t = useTranslations("admin.reports");
  const tNew = useTranslations("admin.inboxNew");
  const f = useFormat();
  const store = useStore();
  const actions = useAdminActions();
  const showToast = useToast();
  const reporter = report.reporterId ? findUser(store, report.reporterId) : undefined;
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
        {field(t("labelBy"), reporter?.name ?? report.reporterId ?? t("noAccount"))}
        {field(t("labelSource"), t(`source.${report.source ?? "app"}`))}
        {report.reporterEmail && field(t("labelEmail"), report.reporterEmail)}
        {report.link && field(t("labelLink"), <span className="break-all">{report.link}</span>)}
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
                <AdminButton variant="secondary" onClick={() => decide("warned")}>
                  {t("actions.warned")}
                </AdminButton>
              )}
              <AdminButton variant={harassment ? "primary" : "secondary"} disabled={!inHouse} onClick={() => decide("removed")}>
                {t("actions.removed")}
              </AdminButton>
              {/* Sicherheit (CLAUDE.md "Aufgaben"): limit the person's contact right away; block them – both with a confirmation, both logged. */}
              {subject && (
                <ConfirmAction
                  label={tNew("restrict")}
                  question={tNew("restrictConfirm", { name: subject.name, other: reporter?.name ?? tNew("someone") })}
                  onConfirm={() => {
                    actions.restrictContact(subject.name, reporter?.name ?? report.reporterEmail ?? "–", report.stayId);
                    showToast(tNew("restricted", { name: subject.name }));
                  }}
                />
              )}
              {subject && (
                <ConfirmAction
                  label={tNew("suspend")}
                  question={tNew("suspendConfirm", { name: subject.name })}
                  onConfirm={() => {
                    decide("suspended");
                    showToast(tNew("suspended", { name: subject.name }));
                  }}
                />
              )}
              {report.target.kind === "stay" && stay && (
                <AdminButton variant="secondary" onClick={() => decide("houseRemoved")}>
                  {t("actions.houseRemoved")}
                </AdminButton>
              )}
              {report.target.kind === "memory" && (
                <AdminButton variant="secondary" onClick={() => decide("photoRemoved")}>
                  {t("actions.photoRemoved")}
                </AdminButton>
              )}
              <AdminButton variant="secondary" onClick={() => decide("unfounded")}>
                {t("actions.unfounded")}
              </AdminButton>
            </div>
            {harassment && <p className="text-small text-muted">{t("harassmentRule")}</p>}
            {!inHouse && stay && <p className="text-small text-muted">{t("noRemove")}</p>}
            <p className="text-small text-muted">{t("messagesHint")}</p>
            <p className="text-small text-muted">{t("noticeHint")}</p>
          </section>
        )
      )}
    </div>
  );
}

/** A widerspruch: what was done and why, the original report, the person's words – it stands or it's granted. */
function AppealDetail({ notice, sentence }: { notice: ModerationNotice; sentence: string }) {
  const t = useTranslations("admin.reports");
  const f = useFormat();
  const store = useStore();
  const actions = useAdminActions();
  const showToast = useToast();
  const report = store.reports.find((r) => r.id === notice.reportId);
  const person = findUser(store, notice.userId);
  const stay = notice.stayId ? store.stays.find((x) => x.id === notice.stayId) : undefined;
  const decide = (outcome: "upheld" | "reversed") => {
    actions.decideAppeal(notice.id, outcome, sentence);
    showToast(t("appeal.toast", { outcome: t(`appeal.outcome.${outcome}`) }));
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
        {field(t("appeal.labelAction"), t(`outcome.${notice.action}`))}
        {field(t("labelReason"), t(`reason.${notice.reason}`))}
        {field(t("labelSubject"), person ? <Link href={profileHref(person.id)} className="hover:underline">{person.name}</Link> : t("someone"))}
        {stay && field(t("labelHouse"), <Link href={`/admin/houses?house=${stay.id}`} className="hover:underline">{stay.title}</Link>)}
        {field(t("appeal.labelWhen"), f.day(notice.at))}
        {report?.text && field(t("appeal.labelOriginal"), `„${report.text}“`)}
      </dl>
      {notice.appeal && (
        <section>
          <h3 className="text-eyebrow uppercase text-(--adm-label)">{t("appeal.labelAppeal")}</h3>
          <p className="mt-2 whitespace-pre-line text-body text-ink">{notice.appeal.text}</p>
        </section>
      )}
      {notice.appeal?.decision ? (
        <p className="text-body font-semibold text-ink">{t("appeal.decided", { outcome: t(`appeal.outcome.${notice.appeal.decision.outcome}`), date: f.day(notice.appeal.decision.at) })}</p>
      ) : (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" onClick={() => decide("upheld")}>
              {t("appeal.upheld")}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => decide("reversed")}>
              {t("appeal.reversed")}
            </AdminButton>
          </div>
          <p className="text-small text-muted">{t("appeal.reversedNoUndo")}</p>
        </section>
      )}
    </div>
  );
}


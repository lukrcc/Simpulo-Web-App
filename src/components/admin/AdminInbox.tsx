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
import { Copy } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
import { useAdminTab } from "@/lib/admin/urlState";
import { findUser, useStore } from "@/lib/store";
import { profileHref } from "@/lib/privacy";
import type { ModerationNotice, Report, ReportOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Img } from "@/components/ui/Img";
import { InfoTip } from "./AdminNumbers";
import { AdminShell } from "./AdminShell";
import { AdminListDetail, AdminSearch, AdminSort, AdminTabs, BackToList, DirectLink, type ListDetailRow } from "./AdminLayout";
import { detectSafetySubtype, SAFETY_ACTIONS, SAFETY_SUBTYPES, type SafetySubtype } from "@/config/support-templates";
import { tEn } from "@/lib/i18n/translate";
import { stripeUrl } from "@/config/tools";
import { TicketDetail } from "./AdminSupport";
import { nudgeAudience } from "@/lib/houseHelp";
import { monthYear, num } from "@/lib/i18n/adminFormat";

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
export function KindDot({ area, className }: { area: TaskArea; className?: string }) {
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
/** A task in one sentence (the list's row; also the admin search, AdminCommandSearch). */
export function useSentence() {
  const t = useTranslations("admin.today");
  const tReports = useTranslations("admin.reports");
  const tHouses = useTranslations("admin.houses");
  const tHosts = useTranslations("admin.hosts");
  const tTiers = useTranslations("admin.tiers");
  const tTaxes = useTranslations("admin.money.taxes");
  const tValue = useTranslations("admin.analysis.value");
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
      case "valueWarning":
        return tValue("warning");
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
  // The capsule in ?tab= (pushed – back works; the overview's tiles and the hints on Houses and Hosts link here).
  const inboxUrl = useAdminTab<InboxTab>(TABS, "all");
  const tab = inboxUrl.tab;
  const setTab = (next: InboxTab) => inboxUrl.open(next);
  const [status, setStatus] = useState<"open" | "done">("open");
  const [query, setQuery] = useState("");
  // ?task= (the admin search, ⌘K) opens one task.
  const [selectedId, setSelectedId] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("task")));
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
        listScroll
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
              onFilter={(q) => (setStatus("open"), setQuery(q))}
            />
          ) : main.length === 0 && later.length > 0 ? (
            <p className="py-2 text-body text-muted">{tNew("allDone")}</p>
          ) : null
        }
      />
    </AdminShell>
  );
}

const profileLink = (id: string, name: string) => (
  <Link href={profileHref(id)} target="_blank" className="font-semibold text-ink hover:underline">
    {name} ↗
  </Link>
);
const houseLink = (id: string, title: string) => (
  <Link href={`/admin/houses?house=${id}`} className="font-semibold text-ink hover:underline">
    {title} ↗
  </Link>
);

/**
 * The detail, in this order: 1 head (kind in its colour · priority · date) · 2 "Was ist passiert" (large) · 3 "Wer und wo" · 4 the action
 * (reply field, lever, decision …) · 5 [Später] (secondary) · [✓ Erledigt] (primary) and "Details →". Reports and appeals keep their own
 * decision blocks. The history and a ticket's extras (status, tags, note, merge) folded underneath.
 */
function InboxDetail({ task, sentence, isOpen, isLater, onBack, onDone, onLater, onSettled, onFilter }: { task: AdminTask; sentence: string; isOpen: boolean; isLater: boolean; onBack: () => void; onDone: () => void; onLater: () => void; onSettled: () => void; /** Filter the list (search) by a name – "Frühere Meldungen" */ onFilter: (query: string) => void }) {
  const t = useTranslations("admin.today");
  const tNew = useTranslations("admin.inboxNew");
  const tHouses = useTranslations("admin.houses");
  const tApps = useTranslations("admin.applications");
  const tLog = useTranslations("admin.log");
  const tValueCheck = useTranslations("admin.analysis.value");
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
  // Sicherheit has kinds (config/support-templates.ts): recognised from the report's reason or the ticket's words, changeable by hand.
  const isSafety = task.kind === "safety" || task.kind === "report";
  const subtype: SafetySubtype | null = !isSafety
    ? null
    : (adminData.safetySubtypes?.[task.id] ?? detectSafetySubtype(task.kind === "report" ? { reason: task.report.reason, text: task.report.text } : { text: task.ticket.message }));
  const template = (kind: SafetySubtype | null) => (kind ? tEn(`supportTemplates.safety.${kind}`) : t("suggestion"));
  // Sicherheit: the kind's template, which helps right away; every other ticket: the usual suggestion (⚠ MOCK one fixed text; TODO an AI draft).
  const [reply, setReply] = useState(() => template(subtype));
  // A changed kind brings its own template (the field was the old template – nothing typed is lost unless it was the template).
  const lastKind = useRef(subtype);
  useEffect(() => {
    if (lastKind.current === subtype) return;
    const before = template(lastKind.current);
    lastKind.current = subtype;
    setReply((current) => (current === before ? template(subtype) : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtype]);
  const [showMore, setShowMore] = useState(false);
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
          className="flex min-h-0 flex-1 flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            settle();
            actions.reply(ticket, reply.trim());
            actions.completeTask(task.id, label);
            showToast(tNew("sent"));
          }}
        >
          <label className="sr-only" htmlFor={`reply-${task.id}`}>
            {tNew("answer")}
          </label>
          <Textarea id={`reply-${task.id}`} value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-24 flex-1 resize-none" />
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
  } else if (task.kind === "valueWarning") {
    facts = [
      { key: "month", label: tNew("field.month"), value: monthYear(task.month) },
      { key: "checks", label: tNew("field.checks"), value: task.checks.map((k) => tValueCheck(`check.${k}.title`)).join(" · ") },
    ];
    action = (
      <Link href="/admin/topics?tab=value" className={adminButtonStyles("primary")}>
        {tValueCheck("open")}
      </Link>
    );
    details = "/admin/topics?tab=value";
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
    action = (
      <span className="flex flex-wrap items-center gap-2">
        <AdminButton variant="primary" onClick={() => (settle(), actions.completeTask(task.id, label), showToast(tNew("partnerStepDone")))}>
          {tNew("partnerStepDone")}
        </AdminButton>
        <Link href={`/admin/marketing?tab=partners&partner=${task.partner.id}`} className={adminButtonStyles("secondary")}>
          {tNew("partnerOpen")}
        </Link>
      </span>
    );
    details = `/admin/marketing?tab=partners&partner=${task.partner.id}`;
  } else if (task.kind === "report") {
    const report = task.report;
    const reporter = report.reporterId ? findUser(store, report.reporterId) : undefined;
    const subjectUser = report.subjectId ? findUser(store, report.subjectId) : undefined;
    const house = report.stayId ? store.stays.find((x) => x.id === report.stayId) : undefined;
    what = report.text ? `„${report.text}“` : sentence;
    facts = [
      { key: "reporter", label: tNew("field.reporter"), value: reporter ? profileLink(reporter.id, reporter.name) : (report.reporterEmail ?? null) },
      { key: "subject", label: tNew("field.subject"), value: subjectUser ? profileLink(subjectUser.id, subjectUser.name) : null },
      { key: "email", label: tNew("field.email"), value: reporter?.email ?? report.reporterEmail ?? null },
      { key: "house", label: tNew("field.house"), value: house ? houseLink(house.id, house.title) : null },
    ];
    action =
      isOpen && (reporter || report.reporterEmail) ? (
        <form
          data-reply
          className="flex min-h-0 flex-1 flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            actions.replyToReporter(report, reply.trim(), label);
            showToast(tNew("sent"));
          }}
        >
          <label className="sr-only" htmlFor={`reply-${task.id}`}>
            {tNew("answer")}
          </label>
          <Textarea id={`reply-${task.id}`} value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-24 flex-1 resize-none" />
          <span>
            <AdminButton type="submit" variant="primary" disabled={!reply.trim()}>
              {tNew("send")}
            </AdminButton>
          </span>
        </form>
      ) : null;
  } else if (task.kind === "appeal") {
    const person = findUser(store, task.notice.userId);
    facts = [{ key: "person", label: tNew("field.person"), value: person ? profileLink(person.id, person.name) : null }];
  }

  // Sicherheit's extra actions for its kind (config/support-templates.ts SAFETY_ACTIONS) – each asks once, each into the log.
  const safetyPeople = (() => {
    if (task.kind === "report") {
      const r = task.report;
      return { subject: r.subjectId ? findUser(store, r.subjectId) : undefined, other: r.reporterId ? findUser(store, r.reporterId)?.name : r.reporterEmail, stay: r.stayId ? store.stays.find((x) => x.id === r.stayId) : undefined };
    }
    if (task.kind === "safety") {
      const c = task.ticket.context;
      return { subject: undefined, other: task.ticket.userId ? findUser(store, task.ticket.userId)?.name : task.ticket.email, stay: c.houseId ? store.stays.find((x) => x.id === c.houseId) : undefined };
    }
    return null;
  })();
  const hostOfStay = safetyPeople?.stay ? findUser(store, safetyPeople.stay.hostId) : undefined;
  const extras =
    subtype && safetyPeople && isOpen ? (
      <div data-safety-actions className="flex flex-wrap items-center gap-2">
        {SAFETY_ACTIONS[subtype].map((kind) => {
          const { subject, other, stay } = safetyPeople;
          if (kind === "restrict")
            return subject ? (
              <ConfirmAction key={kind} label={tNew("restrict")} question={tNew("restrictConfirm", { name: subject.name, other: other ?? tNew("someone") })} onConfirm={() => (actions.restrictContact(subject.name, other ?? "–", stay?.id), showToast(tNew("restricted", { name: subject.name })))} />
            ) : null;
          if (kind === "suspend")
            return subject && task.kind === "report" ? (
              <ConfirmAction key={kind} label={tNew("suspend")} question={tNew("suspendConfirm", { name: subject.name })} onConfirm={() => (actions.moderate(task.report, "suspended", label), showToast(tNew("suspended", { name: subject.name })))} />
            ) : null;
          if (kind === "warnHost")
            return stay && hostOfStay ? (
              <ConfirmAction key={kind} label={tNew("warnHost")} question={tNew("warnHostConfirm", { name: hostOfStay.name })} onConfirm={() => (actions.warnHost(hostOfStay, tNew("warnHostText", { name: hostOfStay.name.split(" ")[0], house: stay.title }), stay.id), showToast(tNew("hostWarned", { name: hostOfStay.name })))} />
            ) : null;
          return stay ? (
            <ConfirmAction key={kind} label={tNew("pauseHouse")} question={tNew("pauseHouseConfirm", { house: stay.title })} onConfirm={() => (actions.pauseHouse(stay), showToast(tNew("housePaused", { house: stay.title })))} />
          ) : null;
        })}
        {subtype === "harassment" && !safetyPeople.subject && <p className="w-full text-small text-muted">{tNew("noPerson")}</p>}
        {subtype === "payment" && !safetyPeople.stay && <p className="w-full text-small text-muted">{tNew("noHouse")}</p>}
      </div>
    ) : null;

  // The "Anfrage" card's head: kind (its colour) · priority · date – and for Sicherheit its kind, changeable here.
  const head = (
    <div data-inbox-head className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
      <KindLabel area={area}>{tNew(`area.${area}`)}</KindLabel>
      <span className={cn("font-semibold", priorityOf(task) === "high" ? "text-ink" : "text-muted")}>{tNew(`priority.${priorityOf(task)}`)}</span>
      <span className="text-muted">
        {t(`kind.${task.kind}`) !== tNew(`area.${area}`) && `${t(`kind.${task.kind}`)} · `}
        {f.day(task.createdAt)}
      </span>
      {subtype && (
        <span data-safety-subtype={subtype} className="ml-auto">
          <AdminSort
            label={tNew("subtype.label")}
            value={subtype}
            onChange={(next) => next !== subtype && actions.setSafetySubtype(task.id, next, `${label} · ${tNew(`subtype.${next}`)}`)}
            options={SAFETY_SUBTYPES.map((value) => ({ value, label: tNew(`subtype.${value}`) }))}
          />
        </span>
      )}
    </div>
  );
  // Folded at the bottom right: a ticket's extras (status, tags, note, merge), else the history.
  const more = isTicket ? (
    <div data-ticket-extras className="text-small">
      <TicketDetail ticket={task.ticket} tickets={tickets} onBack={onBack} extrasOnly />
    </div>
  ) : history.length === 0 ? (
    <p data-history className="text-small text-muted">{tNew("noHistory")}</p>
  ) : (
    <ul data-history className="divide-y divide-ink/8">
      {history.map((entry) => (
        <li key={entry.id} className="flex items-baseline justify-between gap-4 py-1.5 text-small">
          <span className="min-w-0 truncate text-ink">{tLog.has(`action.${entry.action}` as Parameters<typeof tLog>[0]) ? tLog(`action.${entry.action}` as Parameters<typeof tLog>[0]) : entry.action}</span>
          <span className="shrink-0 text-muted">{f.day(entry.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
  const tone = KIND_TONE[area];
  // Exactly the room from the detail's top to the window's bottom (16px air) – followed while the page scrolls (the column is sticky).
  const articleRef = useRef<HTMLElement>(null);
  const [fillH, setFillH] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = articleRef.current;
      if (!el || window.innerWidth < 1024) return setFillH(null);
      // The page keeps its bottom padding (--adm-section, 40px) – so nothing scrolls.
      const next = Math.max(420, Math.floor(window.innerHeight - el.getBoundingClientRect().top - 40));
      setFillH((now) => (now === next ? now : next));
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);
  // Box B: the person behind the task (their bookings, earlier reports about them – a click filters the list by their name).
  const person = (() => {
    if (isTicket) return task.ticket.userId ? findUser(store, task.ticket.userId) : undefined;
    if (task.kind === "report") return task.report.subjectId ? findUser(store, task.report.subjectId) : undefined;
    if (task.kind === "money") return findUser(store, task.issue.userId);
    if (task.kind === "appeal") return findUser(store, task.notice.userId);
    if (task.kind === "anchor" || task.kind === "hostWarning") return task.host.user;
    if (task.kind === "atRisk") return findUser(store, task.stay.hostId);
    return undefined;
  })();
  const bookings = person ? store.payments.filter((p) => p.userId === person.id && p.status === "paid").length : null;
  const earlier = person ? store.reports.filter((r) => r.subjectId === person.id && !(task.kind === "report" && r.id === task.report.id)).length : null;
  const context = [
    ...facts,
    ...(bookings !== null && bookings > 0 ? [{ key: "bookings", label: tNew("field.bookings"), value: num(bookings) }] : []),
    ...(earlier !== null && earlier > 0 && person
      ? [{ key: "earlier", label: tNew("field.earlier"), value: (
            <button type="button" onClick={() => onFilter(person.name)} data-tooltip-info={tNew("filterBy", { name: person.name })} className="font-semibold text-ink underline-offset-2 hover:underline">
              {num(earlier)}
            </button>
          ) }]
      : []),
  ];

  return (
    // Three boxes, 16px apart, together the column's height (the detail column is the window's height under the bar).
    <article ref={articleRef} data-inbox-detail data-kind={task.kind} className="flex min-h-0 flex-col gap-(--adm-detail-gap)" style={fillH ? { height: fillH } : undefined}>
      <BackToList onBack={onBack} />
      {/* A · Anfrage (from outside): the kind's tint, a stripe in its colour; the head, the message large. */}
      <section
        aria-label={tNew("request")}
        data-card="request"
        className="relative shrink-0 overflow-hidden rounded-xl p-(--adm-detail-pad) pl-[calc(var(--adm-detail-pad)+var(--adm-detail-stripe))]"
        style={{ backgroundColor: `color-mix(in srgb, ${tone} var(--adm-box-request-tint), var(--bg))` } as CSSProperties}
      >
        <span aria-hidden className="absolute inset-y-0 left-0 w-(--adm-detail-stripe)" style={{ backgroundColor: tone }} />
        {head}
        <p data-what className="adm-message mt-3 line-clamp-5 text-ink">
          {what}
        </p>
        {task.kind === "report" ? <ReportDetail report={task.report} isOpen={isOpen} part="facts" /> : task.kind === "appeal" ? <AppealDetail notice={task.notice} sentence={sentence} part="facts" /> : null}
      </section>
      {/* B · Person & Kontext: neutral; a grid of four, the label small over its value; empty fields left out. */}
      {context.some((c) => c.value !== null && c.value !== undefined && c.value !== "") && (
        <section aria-label={tNew("who")} data-card="context" className="shrink-0 rounded-xl bg-(--adm-box-context) p-(--adm-detail-pad)">
          <ContextGrid facts={context} />
        </section>
      )}
      {/* C · Deine Reaktion: lighter; the answer fills what's left (or the kind's actions), then Später · ✓ Erledigt and the extras. */}
      <section aria-label={tNew("reaction")} data-card="reaction" className="flex min-h-0 flex-1 flex-col rounded-xl border border-(--adm-box-edge) bg-(--adm-box-reaction) p-(--adm-detail-pad)">
        <h3 className="mb-2 shrink-0 text-eyebrow uppercase text-(--adm-label)">{tNew("reaction")}</h3>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {isOpen && action}
          {extras}
          {task.kind === "report" && <ReportDetail report={task.report} isOpen={isOpen} part="decision" suspendHere={subtype !== "harassment"} />}
          {task.kind === "appeal" && <AppealDetail notice={task.notice} sentence={sentence} part="decision" />}
          {showMore && <div className="mt-1">{more}</div>}
        </div>
        <div data-inbox-bottom className="mt-3 flex shrink-0 flex-wrap items-center gap-2 border-t border-(--adm-box-edge) pt-3">
          {isOpen && !isLater && (
            <AdminButton variant="secondary" onClick={onLater}>
              {t("action.later")}
            </AdminButton>
          )}
          {isOpen && (
            <AdminButton variant="primary" onClick={onDone}>
              ✓ {t("action.done")}
            </AdminButton>
          )}
          <span className="ml-auto flex items-center gap-4">
            {details && (
              <Link href={details} className="text-small font-semibold text-ink hover:underline">
                {tNew("details")} →
              </Link>
            )}
            <button type="button" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)} className="adm-press rounded-full px-2 py-1 text-small font-semibold text-muted hover:text-ink">
              {showMore ? "▾" : "▸"} {isTicket ? tNew("extras") : `${tNew("history")} · ${history.length}`}
            </button>
          </span>
        </div>
      </section>
    </article>
  );
}

/** Box B: the facts in a grid of four, the label small over the value; e-mail with a copy button; empty ones left out. */
function ContextGrid({ facts }: { facts: readonly { key: string; label: string; value: ReactNode }[] }) {
  const t = useTranslations("admin.inboxNew");
  const showToast = useToast();
  const shown = facts.filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== "");
  return (
    <dl data-who-where className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
      {shown.map((fact) => (
        <div key={fact.key} className="min-w-0">
          <dt className="text-eyebrow uppercase text-(--adm-label)">{fact.label}</dt>
          <dd className="mt-0.5 flex min-w-0 items-center gap-1 text-small text-ink">
            <span className="min-w-0 truncate">{fact.value}</span>
            {fact.key === "email" && typeof fact.value === "string" && (
              <button
                type="button"
                aria-label={t("copyEmail")}
                onClick={() => {
                  void navigator.clipboard?.writeText(fact.value as string);
                  showToast(t("copied"));
                }}
                className="adm-press flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/6 hover:text-ink"
              >
                <Copy aria-hidden className="size-3.5" />
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A report (Posteingang › Sicherheit): what was reported, why, by whom, about whom; only the reported excerpt (the message ± 3 – never
 * the whole chat; opening it is logged); the person's earlier reports; Verwarnen · Aus dem House entfernen · Konto sperren · Unbegründet.
 * Harassment in a House: the person leaves it (Regel) – "Verwarnen" is not offered there.
 */
function ReportDetail({ report, isOpen, part, suspendHere = false }: { report: Report; isOpen: boolean; /** "facts" in the Anfrage card, "decision" in Deine Reaktion */ part: "facts" | "decision"; /** Konto sperren among the decisions (harassment has it as an extra action) */ suspendHere?: boolean }) {
  const t = useTranslations("admin.reports");
  const tNew = useTranslations("admin.inboxNew");
  const f = useFormat();
  const store = useStore();
  const actions = useAdminActions();
  const showToast = useToast();
  const subject = report.subjectId ? findUser(store, report.subjectId) : undefined;
  const stay = report.stayId ? store.stays.find((x) => x.id === report.stayId) : undefined;
  const detail = `${t(`reason.${report.reason}`)} · ${subject?.name ?? t("someone")}${stay ? ` · ${stay.title}` : ""}`;
  // Every opening of a report is in the log (who looked at what) – once, from the facts.
  useEffect(() => {
    if (part === "facts") actions.viewReport(report, detail);
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

  if (part === "facts")
    return (
      <div className="mt-3 flex flex-col gap-2 text-small">
        <p className="text-muted">
          {t(`reason.${report.reason}`)} · {t(`target.${report.target.kind}`)} · {t(`source.${report.source ?? "app"}`)}
          {report.blocked && ` · ${t("blocked")}`}
        </p>
        {report.link && <p className="truncate text-muted">{report.link}</p>}
        {/* Only the reported excerpt, one line per message (never the whole chat). */}
        {report.excerpt && report.excerpt.length > 0 && (
          <section aria-label={t("context")}>
            <h4 className="flex items-center gap-2 text-eyebrow uppercase text-(--adm-label)">
              {t("context")}
              <InfoTip text={t("contextInfo")} />
            </h4>
            <ol className="mt-1 flex flex-col gap-0.5">
              {report.excerpt.map((m) => (
                <li key={m.id} data-excerpt-reported={m.reported || undefined} className={cn("truncate rounded-md px-2 py-0.5", m.reported ? "bg-(--adm-block) font-semibold text-ink ring-1 ring-adm-critical" : "text-muted")}>
                  <span className="text-ink">{findUser(store, m.senderId)?.name.split(" ")[0] ?? m.senderId}:</span> {m.text}
                </li>
              ))}
            </ol>
          </section>
        )}
        {report.target.kind === "memory" && (report.memorySrc ? <Img src={report.memorySrc} alt="" width={120} height={120} className="size-28 rounded-xl object-cover" /> : <p className="text-muted">{t("noFile")}</p>)}
        {/* The person's earlier reports, in one line. */}
        <p className="text-muted">
          <span className="font-semibold text-ink">{t("history")}:</span>{" "}
          {subject?.suspendedAt && <span className="text-adm-critical">{t("suspended", { date: f.day(subject.suspendedAt) })} · </span>}
          {earlier.length === 0 ? t("historyNone") : earlier.slice(0, 3).map((r) => `${t(`reason.${r.reason}`)}${r.decision ? ` (${t(`outcome.${r.decision.outcome}`)})` : ""} · ${f.day(r.createdAt)}`).join(" – ")}
        </p>
      </div>
    );

  if (report.decision) return <p className="text-body font-semibold text-ink">{t("decided", { outcome: t(`outcome.${report.decision.outcome}`), date: f.day(report.decision.at) })}</p>;
  if (!isOpen) return null;
  return (
    <section data-report-decision className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        {!harassment && (
          <AdminButton variant="secondary" onClick={() => decide("warned")}>
            {t("actions.warned")}
          </AdminButton>
        )}
        <AdminButton variant={harassment ? "primary" : "secondary"} disabled={!inHouse} onClick={() => decide("removed")}>
          {t("actions.removed")}
        </AdminButton>
        {suspendHere && subject && <ConfirmAction label={tNew("suspend")} question={tNew("suspendConfirm", { name: subject.name })} onConfirm={() => (decide("suspended"), showToast(tNew("suspended", { name: subject.name })))} />}
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
      <p className="text-small text-muted">
        {harassment ? `${t("harassmentRule")} ` : ""}
        {!inHouse && stay ? `${t("noRemove")} ` : ""}
        {t("noticeHint")}
      </p>
    </section>
  );
}

/** A widerspruch: what was done and why, the original report, the person's words – it stands or it's granted. */
function AppealDetail({ notice, sentence, part }: { notice: ModerationNotice; sentence: string; part: "facts" | "decision" }) {
  const t = useTranslations("admin.reports");
  const f = useFormat();
  const store = useStore();
  const actions = useAdminActions();
  const showToast = useToast();
  const report = store.reports.find((r) => r.id === notice.reportId);
  const decide = (outcome: "upheld" | "reversed") => {
    actions.decideAppeal(notice.id, outcome, sentence);
    showToast(t("appeal.toast", { outcome: t(`appeal.outcome.${outcome}`) }));
  };
  if (part === "facts")
    return (
      <div className="mt-3 flex flex-col gap-2 text-small">
        <p className="text-muted">
          {t("appeal.labelAction")}: <span className="text-ink">{t(`outcome.${notice.action}`)}</span> · {t("labelReason")}: <span className="text-ink">{t(`reason.${notice.reason}`)}</span> · {f.day(notice.at)}
        </p>
        {report?.text && <p className="text-muted">{t("appeal.labelOriginal")}: „{report.text}“</p>}
        {notice.appeal && (
          <p className="line-clamp-3 whitespace-pre-line text-body text-ink">
            <span className="text-small font-semibold text-muted">{t("appeal.labelAppeal")}: </span>
            {notice.appeal.text}
          </p>
        )}
      </div>
    );
  if (notice.appeal?.decision) return <p className="text-body font-semibold text-ink">{t("appeal.decided", { outcome: t(`appeal.outcome.${notice.appeal.decision.outcome}`), date: f.day(notice.appeal.decision.at) })}</p>;
  return (
    <section className="flex flex-col gap-1.5">
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
  );
}


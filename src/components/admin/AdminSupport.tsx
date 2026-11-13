"use client";

// Admin › Support – "What do users need?": the tickets from "Help & feedback" (and the House's "Something went wrong"). Inbox: the list left
// (open safety always first, with the orange signal dot), the ticket right – message, context, links, the conversation and the answer (sent
// through lib/notify), status, tags, an internal note, Merge for duplicate wishes. Ideas: the wishes by votes, planned / done. Every change
// goes through lib/admin/actions.ts (and into the log). Free text here is never read by a model (config/data-points.ts).
import { ArrowLeft, Paperclip, Search, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { FormField } from "@/components/form/FormLayout";
import { Button } from "@/components/ui/ActionButton";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input, Textarea } from "@/components/ui/Input";
import { listItemStyles } from "@/components/ui/listSelection";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { useAdminActions } from "@/lib/admin/actions";
import { isOpenTicket, sortTickets, supportMetrics } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { findUser, useStore } from "@/lib/store";
import { TICKET_CATEGORIES, type SupportTicket, type TicketCategory, type TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdminShell } from "./AdminShell";

const BASE_STATUSES: readonly TicketStatus[] = ["new", "open", "answered", "closed"];
const IDEA_STATUSES: readonly TicketStatus[] = ["new", "open", "planned", "done", "closed"];
const ALL_STATUSES: readonly TicketStatus[] = ["new", "open", "answered", "planned", "done", "closed"];
const statusesOf = (t: SupportTicket) => (t.category === "idea" ? IDEA_STATUSES : BASE_STATUSES);

export function AdminSupport() {
  const t = useTranslations("admin.support");
  const tAdmin = useTranslations("admin");
  const [view, setView] = useState<"inbox" | "ideas">("inbox");
  return (
    <AdminShell
      title={tAdmin("supportTitle")}
      aside={<CapsuleGroup label={t("views.inbox")} value={view} onChange={setView} options={(["inbox", "ideas"] as const).map((value) => ({ value, content: t(`views.${value}`) }))} />}
    >
      {view === "inbox" ? <Inbox /> : <Ideas />}
    </AdminShell>
  );
}

// ── Inbox ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Inbox() {
  const t = useTranslations("admin.support");
  const { tickets } = useAdminData();
  const m = supportMetrics(tickets);
  const [category, setCategory] = useState<"all" | TicketCategory>("all");
  const [status, setStatus] = useState<"" | TicketStatus>("");
  const [tag, setTag] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set(tickets.flatMap((x) => x.tags))].toSorted(), [tickets]);
  const q = query.trim().toLowerCase();
  const shown = sortTickets(
    tickets.filter(
      (x) =>
        (category === "all" || x.category === category) &&
        (status === "" || x.status === status) &&
        (tag === "" || x.tags.includes(tag)) &&
        (q === "" || [x.message, x.email, x.id, ...x.tags].some((s) => s.toLowerCase().includes(q))),
    ),
  );
  const selected = tickets.find((x) => x.id === selectedId) ?? null;

  return (
    <>
      {/* The counters per category are the category filter; open safety carries the orange signal dot. */}
      <ScrollRow label={t("categoryFilter")} className="max-w-full">
        <CapsuleGroup
          label={t("categoryFilter")}
          value={category}
          onChange={setCategory}
          options={(["all", ...TICKET_CATEGORIES] as const).map((value) => ({
            value,
            content: (
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                {value === "all" ? t("all") : t(`category.${value}`)}
                <span className="tabular-nums text-muted">{value === "all" ? tickets.filter((x) => !x.mergedInto).length : m.perCategory[value]}</span>
                {value === "safety" && m.openSafety > 0 && <span aria-hidden className="size-2 rounded-full bg-signal" />}
              </span>
            ),
          }))}
        />
      </ScrollRow>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="relative block">
          <span className="sr-only">{t("search")}</span>
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="pl-10" />
        </label>
        <Select aria-label={t("statusFilter")} value={status} onChange={(e) => setStatus(e.target.value as "" | TicketStatus)}>
          <option value="">
            {t("statusFilter")}: {t("all")}
          </option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("tagFilter")} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">{t("allTags")}</option>
          {tags.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>
      </div>
      <p className="mb-3 mt-6 text-small text-muted">
        {t("count", { count: shown.length })} · {t("openCount", { count: m.open })}
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        {/* The list – on phones gone while a ticket is open. */}
        <ul className={cn("flex flex-col gap-1", selected && "max-lg:hidden")}>
          {shown.length === 0 && <li className="py-6 text-body text-muted">{t("none")}</li>}
          {shown.map((x) => (
            <li key={x.id}>
              <TicketRow ticket={x} selected={x.id === selectedId} onSelect={() => setSelectedId(x.id)} />
            </li>
          ))}
        </ul>
        <div className={cn("min-w-0 lg:sticky lg:top-[calc(var(--header-h)+24px)]", !selected && "max-lg:hidden")}>
          {selected ? <TicketDetail key={selected.id} ticket={selected} tickets={tickets} onBack={() => setSelectedId(null)} /> : <p className="py-6 text-body text-muted">{t("pick")}</p>}
        </div>
      </div>
    </>
  );
}

/** One ticket in the list: the orange signal dot for open safety, what it's about, two lines of the message, who · when · status. */
function TicketRow({ ticket, selected, onSelect }: { ticket: SupportTicket; selected: boolean; onSelect: () => void }) {
  const t = useTranslations("admin.support");
  const f = useFormat();
  const store = useStore();
  const who = ticket.userId ? (findUser(store, ticket.userId)?.name ?? ticket.email) : ticket.email;
  const urgent = ticket.category === "safety" && isOpenTicket(ticket);
  return (
    <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined} className={cn(listItemStyles(selected), "block w-full rounded-[20px] px-4 py-3 text-left")}>
      <span className="flex items-center gap-2 text-small">
        {urgent && <span aria-hidden className="size-2 shrink-0 rounded-full bg-signal" />}
        <span className={cn("font-semibold", urgent ? "text-ink" : "text-muted")}>{t(`category.${ticket.category}`)}</span>
        {ticket.category === "idea" && <span className="text-muted">· {t("votes", { count: ticket.votes })}</span>}
        <span className="ml-auto shrink-0 text-muted">{t(`status.${ticket.status}`)}</span>
      </span>
      <span className={cn("mt-1 line-clamp-2 text-body", isOpenTicket(ticket) ? "font-semibold text-ink" : "text-ink/80")}>{ticket.message}</span>
      <span className="mt-1 block truncate text-small text-muted">
        {who} · {f.day(ticket.createdAt)}
        {ticket.mergedInto && ` · ${t("mergedInto", { id: ticket.mergedInto })}`}
      </span>
    </button>
  );
}

function TicketDetail({ ticket, tickets, onBack }: { ticket: SupportTicket; tickets: readonly SupportTicket[]; onBack: () => void }) {
  const t = useTranslations("admin.support");
  const f = useFormat();
  const store = useStore();
  const showToast = useToast();
  const actions = useAdminActions();
  const user = ticket.userId ? findUser(store, ticket.userId) : undefined;
  const house = ticket.context.houseId ? store.stays.find((s) => s.id === ticket.context.houseId) : undefined;
  const [reply, setReply] = useState("");
  const [note, setNote] = useState(ticket.adminNotes);
  const [newTag, setNewTag] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const mergeable = ticket.category === "idea" && !ticket.mergedInto ? tickets.filter((x) => x.category === "idea" && x.id !== ticket.id && !x.mergedInto) : [];

  function addTag() {
    const tag = newTag.trim().toLowerCase();
    if (tag && !ticket.tags.includes(tag)) actions.setTicketTags(ticket, [...ticket.tags, tag]);
    setNewTag("");
  }

  return (
    <article>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-body text-ink lg:hidden">
        <ArrowLeft aria-hidden className="size-4" />
        {t("back")}
      </button>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
        <span className="font-semibold text-ink">{t(`category.${ticket.category}`)}</span>
        {ticket.priority === "high" && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <span aria-hidden className="size-2 rounded-full bg-signal" />
            {t("high")}
          </span>
        )}
        {ticket.category === "idea" && <span>{t("votes", { count: ticket.votes })}</span>}
        <span>
          {ticket.id} · {f.day(ticket.createdAt)} · {f.time(ticket.createdAt)}
        </span>
        {ticket.mergedInto && <span>{t("mergedInto", { id: ticket.mergedInto })}</span>}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-body-lg text-ink">{ticket.message}</p>
      {ticket.attachments.map((a) => (
        <p key={a.name} className="mt-3 inline-flex items-center gap-2 text-small text-muted">
          <Paperclip aria-hidden className="size-4" />
          {t("attachments")}: {a.name} · {Math.round(a.size / 1000)} KB
        </p>
      ))}

      {/* Who and where – the context sent along. */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-ink/8 py-4 text-body sm:grid-cols-3">
        <Fact
          label={t("guest")}
          value={
            user ? (
              <Link href={`/u/${user.id}`} className="font-semibold text-ink hover:underline">
                {user.name} · {t("profile")}
              </Link>
            ) : (
              "–"
            )
          }
        />
        <Fact label="Email" value={ticket.email} />
        <Fact label={t("page")} value={ticket.context.page} />
        {house && (
          <Fact
            label={t("house")}
            value={
              <Link href={`/h/${house.id}`} className="font-semibold text-ink hover:underline">
                {house.title} · {t("openHouse")}
              </Link>
            }
          />
        )}
        <Fact label={t("device")} value={ticket.context.device} />
        <Fact label={t("screen")} value={`${ticket.context.screenWidth}px`} />
        <Fact label={t("phase")} value={ticket.context.phase} />
      </dl>

      {ticket.replies.length > 0 && (
        <section className="mt-6">
          <h3 className="text-eyebrow uppercase text-muted">{t("conversation")}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {ticket.replies.map((r) => (
              <li key={r.id} className={cn("max-w-[85%] rounded-[18px] px-4 py-2.5 text-body", r.from === "admin" ? "bubble-own ml-auto bg-bubble-own text-ink" : "bg-bubble-other text-ink")}>
                <p className="text-small text-muted">
                  {r.from === "admin" ? t("you") : t("them")} · {f.day(r.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!ticket.mergedInto && (
        <section className="mt-6">
          <FormField label={t("reply")}>
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("replyPlaceholder")} className="min-h-28" />
          </FormField>
          <div className="mt-3 flex justify-end">
            <Button
              disabled={!reply.trim()}
              onClick={() => {
                actions.reply(ticket, reply.trim());
                setReply("");
                showToast(t("sent"));
              }}
            >
              {t("send")}
            </Button>
          </div>
        </section>
      )}

      <section className="mt-8 flex flex-col gap-6">
        <div>
          <p className="mb-2 text-small text-muted">{t("statusLabel")}</p>
          <ScrollRow label={t("statusLabel")} className="max-w-full">
            <CapsuleGroup size="sm" label={t("statusLabel")} value={ticket.status} onChange={(s) => actions.setTicketStatus(ticket, s)} options={statusesOf(ticket).map((value) => ({ value, content: t(`status.${value}`) }))} />
          </ScrollRow>
        </div>

        <div>
          <p className="mb-2 text-small text-muted">{t("tags")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {ticket.tags.map((tag) => (
              <span key={tag} className="inline-flex h-8 items-center gap-1 rounded-full border border-ink/12 pl-3 pr-1 text-small text-ink">
                {tag}
                <button
                  type="button"
                  aria-label={`${tag} ×`}
                  onClick={() => actions.setTicketTags(ticket, ticket.tags.filter((x) => x !== tag))}
                  className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTag();
              }}
            >
              <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder={t("addTag")} className="h-8 w-36 rounded-full px-3" aria-label={t("addTag")} />
            </form>
          </div>
        </div>

        <FormField label={t("note")}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => actions.setTicketNote(ticket, note.trim())} placeholder={t("notePlaceholder")} className="min-h-20" />
        </FormField>

        {mergeable.length > 0 && (
          <div>
            <p className="mb-2 text-small text-muted">{t("mergeHint")}</p>
            <div className="flex flex-wrap gap-3">
              <Select aria-label={t("merge")} value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className="min-w-0 flex-1">
                <option value="">{t("merge")}</option>
                {mergeable.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.id} · {x.message.slice(0, 60)} ({x.votes})
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                disabled={!mergeTarget}
                onClick={() => {
                  const into = tickets.find((x) => x.id === mergeTarget);
                  if (into) actions.merge(ticket, into);
                }}
              >
                {t("mergeButton")}
              </Button>
            </div>
          </div>
        )}
      </section>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-0.5 min-w-0 truncate text-ink">{value}</dd>
    </div>
  );
}

// ── Ideas ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The wishes by votes (merged duplicates count for the one they went into); each one's state open · planned · done. */
function Ideas() {
  const t = useTranslations("admin.support");
  const { tickets } = useAdminData();
  const { ideas } = supportMetrics(tickets);
  const actions = useAdminActions();
  return (
    <>
      <p className="mb-4 text-small text-muted">{t("ideasHint")}</p>
      <ul className="divide-y divide-ink/8 border-y border-ink/8">
        {ideas.map((idea) => (
          <li key={idea.id} className="grid gap-x-6 gap-y-3 py-4 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
            <p className="text-h2 tabular-nums text-ink">
              {idea.votes}
              <span className="sr-only"> {t("votes", { count: idea.votes })}</span>
            </p>
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink">{idea.message}</p>
              <p className="mt-1 text-small text-muted">
                {idea.id}
                {idea.tags.length > 0 && ` · ${idea.tags.join(", ")}`}
              </p>
            </div>
            <CapsuleGroup
              size="sm"
              label={t("statusLabel")}
              value={idea.status === "planned" || idea.status === "done" ? idea.status : "open"}
              onChange={(s) => actions.setTicketStatus(idea, s)}
              options={(["open", "planned", "done"] as const).map((value) => ({ value, content: t(`status.${value}`) }))}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

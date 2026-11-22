"use client";
import { AdminButton } from "./AdminButton";

// The support tickets' pieces for the Posteingang (components/admin/AdminInbox): a ticket's detail – message, context, links, the
// conversation and the answer (sent through lib/notify), status, tags, an internal note, Merge for duplicate wishes – and the ideas by votes,
// planned / done. Every change goes through lib/admin/actions.ts (and into the log). Free text here is never read by a model
// (config/data-points.ts).
import { profileHref } from "@/lib/privacy";
import { ArrowLeft, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { FormField } from "@/components/form/FormLayout";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input, Textarea } from "@/components/ui/Input";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useFormat } from "@/i18n/format";
import { useAdminActions } from "@/lib/admin/actions";
import { supportMetrics } from "@/lib/admin/metrics";
import { useAdminData } from "@/lib/admin/store";
import { findUser, useStore } from "@/lib/store";
import type { SupportTicket, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const BASE_STATUSES: readonly TicketStatus[] = ["new", "open", "answered", "closed"];
const IDEA_STATUSES: readonly TicketStatus[] = ["new", "open", "planned", "done", "closed"];
const statusesOf = (t: SupportTicket) => (t.category === "idea" ? IDEA_STATUSES : BASE_STATUSES);

export function TicketDetail({ ticket, tickets, onBack, extrasOnly = false }: { ticket: SupportTicket; tickets: readonly SupportTicket[]; onBack: () => void; /** Aufgaben: only the conversation and the extras (status, tags, note, merge) – head, message, context and reply are its own */ extrasOnly?: boolean }) {
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
      {!extrasOnly && (
      <>
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
      <dl className="mt-(--adm-inner) grid grid-cols-2 gap-x-6 gap-y-3 border-y border-ink/8 py-4 text-body sm:grid-cols-3">
        <Fact
          label={t("guest")}
          value={
            user ? (
              <Link href={profileHref(user.id)} className="font-semibold text-ink hover:underline">
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
      </>
      )}

      {ticket.replies.length > 0 && (
        <section className="mt-(--adm-inner)">
          <h3 className="text-eyebrow uppercase text-(--adm-label)">{t("conversation")}</h3>
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

      {!ticket.mergedInto && !extrasOnly && (
        <section className="mt-(--adm-inner)">
          <FormField label={t("reply")}>
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t("replyPlaceholder")} className="min-h-28" />
          </FormField>
          <div className="mt-3 flex justify-end">
            <AdminButton
              disabled={!reply.trim()}
              onClick={() => {
                actions.reply(ticket, reply.trim());
                setReply("");
                showToast(t("sent"));
              }}
            >
              {t("send")}
            </AdminButton>
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
              <AdminButton
                variant="secondary"
                disabled={!mergeTarget}
                onClick={() => {
                  const into = tickets.find((x) => x.id === mergeTarget);
                  if (into) actions.merge(ticket, into);
                }}
              >
                {t("mergeButton")}
              </AdminButton>
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
export function Ideas() {
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

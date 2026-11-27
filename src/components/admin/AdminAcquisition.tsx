"use client";

// Admin › Marketing › Akquise (CLAUDE.md „Marketing › Akquise“): winning the first 100 Founding Hosts. The head (progress to 100 by stage,
// „Heute“: DMs, calls, due steps), then three capsules – Liste · Vorlagen · Launch-Tag. Data from the admin data (lib/acquisition.ts model,
// Firestore later), every change through useAdminActions (status changes logged and in the contact's history). Simpulo talks to nobody here:
// profile, WhatsApp (wa.me) and the House draft are links that open in a new tab.
import { Check, Copy, ExternalLink, FileText, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ACQUISITION_TEMPLATE_IDS, ACQUISITION_TEMPLATES, DM_DAILY_TARGET, FOUNDING_GOAL, type AcquisitionTemplateId } from "@/config/acquisition";
import {
  ACQUISITION_CHAIN,
  ACQUISITION_PLATFORMS,
  ACQUISITION_STATUSES,
  ACQUISITION_TYPES,
  acquisitionNumbers,
  callsBetween,
  isDue,
  isFounding,
  isOverdue,
  waLink,
  type AcquisitionContact,
  type AcquisitionPlatform,
  type AcquisitionStatus,
  type AcquisitionType,
} from "@/lib/acquisition";
import { useAdminActions } from "@/lib/admin/actions";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { setAdminSearch, useAdminSearch } from "@/lib/admin/urlState";
import { copyText } from "@/lib/clipboard";
import { day, num } from "@/lib/i18n/adminFormat";
import { cn } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { AdminButton } from "./AdminButton";
import { AdminSearch, AdminSort, AdminSubTabs, AdminTabs } from "./AdminLayout";
import { AdminShell } from "./AdminShell";
import { TopicHeader } from "./AdminTopics";

type View = "list" | "templates" | "launch";
const VIEWS: readonly View[] = ["list", "templates", "launch"];

/** The page colour, lighter for the stages before „Bestätigt“ (they don't count yet). */
const SOLID = "var(--adm-page-color)";
const LIGHT = "color-mix(in oklab, var(--adm-page-color) 38%, transparent)";

export function useAcquisitionContacts(): AcquisitionContact[] {
  return useAdminData().acquisitionContacts ?? [];
}

export function AdminAcquisition() {
  const t = useTranslations("admin.marketing.acquisition");
  const tm = useTranslations("admin.marketing");
  const raw = useAdminSearch().get("view");
  const view: View = VIEWS.includes(raw as View) ? (raw as View) : "list";
  const contacts = useAcquisitionContacts();
  const { today } = useAdminInputs();
  const actions = useAdminActions();
  // Liste: the filters (status capsules, type, platform, search, „fällig“ from the head) and the open contact (a side sheet).
  const [status, setStatus] = useState<AcquisitionStatus | "all">("all");
  const [type, setType] = useState<AcquisitionType | "all">("all");
  const [platform, setPlatform] = useState<AcquisitionPlatform | "all">("all");
  const [query, setQuery] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = contacts.find((c) => c.id === openId) ?? null;

  const add = () => {
    const added = actions.addAcquisitionContact({
      name: t("newName"),
      platform: "instagram",
      profileUrl: "",
      type: "nomad",
      followers: 0,
      status: "contacted",
      nextStep: "",
      dueAt: null,
      whatsapp: null,
      draftUrl: null,
      note: "",
      history: [{ status: "contacted", at: today }],
      launch: { kit: false, story: false, bio: false },
    });
    setAdminSearch({ view: null }, { replace: true });
    setOpenId(added.id);
  };

  const aside =
    view === "list" ? (
      <div className="flex flex-wrap items-center gap-2">
        <AdminSort label={t("filter.type")} options={[{ value: "all" as const, label: t("filter.all") }, ...ACQUISITION_TYPES.map((v) => ({ value: v, label: t(`types.${v}`) }))]} value={type} onChange={setType} />
        <AdminSort label={t("filter.platform")} options={[{ value: "all" as const, label: t("filter.all") }, ...ACQUISITION_PLATFORMS.map((v) => ({ value: v, label: t(`platforms.${v}`) }))]} value={platform} onChange={setPlatform} />
        <AdminSearch label={t("filter.search")} value={query} onChange={setQuery} />
        <AdminButton onClick={add}>
          <Plus aria-hidden className="size-4" />
          {t("add")}
        </AdminButton>
      </div>
    ) : undefined;

  return (
    <AdminShell
      title={tm("title")}
      tabs={<TopicHeader page="marketing" title={tm("title")} />}
      subTabs={<AdminSubTabs<View> label={t("views.label")} value={view} onChange={(v) => setAdminSearch({ view: v === "list" ? null : v })} tabs={VIEWS.map((value) => ({ value, label: t(`views.${value}`) }))} />}
      aside={aside}
      period
    >
      <div data-acquisition className="flex flex-col gap-(--adm-section)">
        <Head contacts={contacts} today={today} onDue={() => (setAdminSearch({ view: null }, { replace: true }), setDueOnly((d) => !d))} dueOnly={dueOnly} onStage={(s) => (setAdminSearch({ view: null }, { replace: true }), setStatus(s))} />
        {view === "list" && <ContactList contacts={contacts} today={today} filter={{ status, type, platform, query, dueOnly }} onStatus={setStatus} onClearDue={() => setDueOnly(false)} onOpen={setOpenId} />}
        {view === "templates" && <Templates />}
        {view === "launch" && <LaunchDay contacts={contacts} />}
      </div>
      <Sheet variant="panel" open={open !== null} onClose={() => setOpenId(null)} title={open?.name ?? t("contact")}>
        {open && <ContactSheet key={open.id} contact={open} today={today} onDeleted={() => setOpenId(null)} />}
      </Sheet>
    </AdminShell>
  );
}

// ── Kopf ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Progress to 100 as one bar – a section per stage (2px gap between them); the stages that count (from „Bestätigt“) in the page colour,
 * the ones before lighter. Below the legend (a click filters the list) and the row „Heute“.
 */
function Head({ contacts, today, onDue, dueOnly, onStage }: { contacts: readonly AcquisitionContact[]; today: string; onDue: () => void; dueOnly: boolean; onStage: (s: AcquisitionStatus) => void }) {
  const t = useTranslations("admin.marketing.acquisition");
  const actions = useAdminActions();
  const n = acquisitionNumbers(contacts);
  const scale = Math.max(FOUNDING_GOAL, contacts.length - n.declined);
  const dms = useAdminData().acquisitionDms?.[today] ?? 0;
  const callsToday = callsBetween(contacts, today, today);
  const due = contacts.filter((c) => isDue(c, today)).length;
  // Founding stages first (they fill the bar from the left), the stages before them after.
  const order = [...ACQUISITION_CHAIN.slice(ACQUISITION_CHAIN.indexOf("confirmed")), ...ACQUISITION_CHAIN.slice(0, ACQUISITION_CHAIN.indexOf("confirmed"))];
  return (
    <section data-acquisition-head className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-h2 text-ink">
          {num(n.founding)} <span className="text-muted">/ {num(FOUNDING_GOAL)}</span>
          <span className="ml-3 text-body text-muted">{t("head.founding")}</span>
        </p>
        <p className="text-small text-muted">{t("head.scale", { total: num(contacts.length), declined: num(n.declined) })}</p>
      </div>
      <div role="img" aria-label={t("head.barLabel", { founding: n.founding, goal: FOUNDING_GOAL })} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-(--adm-chart-track)">
        {order.map((s) =>
          n.byStatus[s] > 0 ? <span key={s} data-tooltip-info={`${t(`statuses.${s}`)} · ${num(n.byStatus[s])}`} className="h-full first:rounded-l-full" style={{ width: `${(n.byStatus[s] / scale) * 100}%`, background: isFounding({ status: s }) ? SOLID : LIGHT } as CSSProperties} /> : null,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {ACQUISITION_CHAIN.map((s) => (
          <li key={s}>
            <button type="button" onClick={() => onStage(s)} className={cn("adm-press inline-flex items-center gap-1.5 rounded-md text-small hover:text-ink", n.byStatus[s] > 0 ? "text-ink" : "text-muted")}>
              <span aria-hidden className="size-2.5 rounded-xs" style={{ background: isFounding({ status: s }) ? SOLID : LIGHT }} />
              {t(`statuses.${s}`)} <span className="tabular-nums text-muted">{num(n.byStatus[s])}</span>
            </button>
          </li>
        ))}
      </ul>
      {/* Heute: DMs sent against the daily target (+1), calls today, the due steps (a click filters the list). */}
      <div data-acquisition-today className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-ink/8 pt-4">
        <span className="text-eyebrow uppercase text-(--adm-label)">{t("today.title")}</span>
        <span className="inline-flex items-center gap-3">
          <span className="text-small text-muted">{t("today.dms")}</span>
          <span className="text-h3 tabular-nums text-ink">
            {num(dms)} <span className="text-muted">/ {num(DM_DAILY_TARGET)}</span>
          </span>
          <button type="button" onClick={() => actions.bumpAcquisitionDms(today, 1)} aria-label={t("today.plusOne")} className="adm-cap adm-press">
            +1
          </button>
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="text-small text-muted">{t("today.calls")}</span>
          <span className="text-h3 tabular-nums text-ink">{num(callsToday)}</span>
        </span>
        <button type="button" onClick={onDue} data-on={dueOnly ? "" : undefined} aria-pressed={dueOnly} className="adm-cap adm-press">
          {t("today.due")} <span className="tabular-nums">{num(due)}</span>
        </button>
      </div>
    </section>
  );
}

// ── Liste ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

interface ListFilter {
  status: AcquisitionStatus | "all";
  type: AcquisitionType | "all";
  platform: AcquisitionPlatform | "all";
  query: string;
  dueOnly: boolean;
}

function ContactList({ contacts, today, filter, onStatus, onClearDue, onOpen }: { contacts: readonly AcquisitionContact[]; today: string; filter: ListFilter; onStatus: (s: AcquisitionStatus | "all") => void; onClearDue: () => void; onOpen: (id: string) => void }) {
  const t = useTranslations("admin.marketing.acquisition");
  const n = acquisitionNumbers(contacts);
  const q = filter.query.trim().toLowerCase();
  const shown = contacts
    .filter((c) => (filter.status === "all" || c.status === filter.status) && (filter.type === "all" || c.type === filter.type) && (filter.platform === "all" || c.platform === filter.platform) && (!q || c.name.toLowerCase().includes(q)) && (!filter.dueOnly || isDue(c, today)))
    // Due first (oldest first), then the rest by name.
    .toSorted((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") || a.name.localeCompare(b.name));
  const th = "py-2 pr-4 text-left text-small font-medium text-(--adm-label)";
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <AdminTabs<AcquisitionStatus | "all">
          level="sub"
          label={t("filter.status")}
          value={filter.status}
          onChange={onStatus}
          tabs={[{ value: "all" as const, label: t("filter.all"), count: contacts.length }, ...ACQUISITION_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`), count: n.byStatus[s] }))]}
        />
        {filter.dueOnly && (
          <button type="button" onClick={onClearDue} className="adm-cap adm-press" data-on="">
            {t("filter.dueOnly")} ×
          </button>
        )}
      </div>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[960px] text-body">
          <thead>
            <tr>
              <th className={th}>{t("cols.name")}</th>
              <th className={th}>{t("cols.platform")}</th>
              <th className={th}>{t("cols.type")}</th>
              <th className={cn(th, "text-right")}>{t("cols.followers")}</th>
              <th className={th}>{t("cols.status")}</th>
              <th className={th}>{t("cols.next")}</th>
              <th className={cn(th, "pr-0 text-right")}>
                <span className="sr-only">{t("cols.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const overdue = isOverdue(c, today);
              const wa = waLink(c.whatsapp);
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)} className="adm-press cursor-pointer border-t border-ink/8 hover:bg-ink/3">
                  <td className="py-2.5 pr-4">
                    <button type="button" onClick={(e) => (e.stopPropagation(), onOpen(c.id))} className="text-left font-semibold text-ink hover:underline">
                      {c.name}
                    </button>
                  </td>
                  <td className="py-2.5 pr-4 text-ink">{t(`platforms.${c.platform}`)}</td>
                  <td className="py-2.5 pr-4 text-ink">{t(`types.${c.type}`)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-ink">{num(c.followers)}</td>
                  <td className="py-2.5 pr-4 text-ink">{t(`statuses.${c.status}`)}</td>
                  <td className="py-2.5 pr-4">
                    <span className="block text-ink">{c.nextStep || "–"}</span>
                    {c.dueAt && <span className={cn("block text-small", overdue ? "font-medium text-adm-critical" : "text-muted")}>{overdue ? t("overdue", { date: day(c.dueAt) }) : t("dueOn", { date: day(c.dueAt) })}</span>}
                  </td>
                  <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions contact={c} wa={wa} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="py-8 text-body text-muted">{t("empty")}</p>}
      </div>
    </section>
  );
}

/** Profil · WhatsApp (only with a number) · House-Entwurf (only with a link) – links in a new tab; a missing one leaves its place free. */
function RowActions({ contact, wa }: { contact: AcquisitionContact; wa: string | null }) {
  const t = useTranslations("admin.marketing.acquisition");
  const icon = "adm-press inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-ink/6 hover:text-ink";
  const slot = (href: string | null, label: string, Icon: typeof ExternalLink) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label}: ${contact.name}`} data-tooltip={label} className={icon}>
        <Icon aria-hidden className="size-4" />
      </a>
    ) : (
      <span aria-hidden className="inline-block size-8" />
    );
  return (
    <span className="inline-flex items-center gap-1">
      {slot(contact.profileUrl || null, t("actions.profile"), ExternalLink)}
      {slot(wa, t("actions.whatsapp"), MessageCircle)}
      {slot(contact.draftUrl, t("actions.draft"), FileText)}
    </span>
  );
}

// ── Seitenblatt: bearbeiten ──────────────────────────────────────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-small text-muted">{label}</span>
      {children}
    </label>
  );
}

function ContactSheet({ contact, today, onDeleted }: { contact: AcquisitionContact; today: string; onDeleted: () => void }) {
  const t = useTranslations("admin.marketing.acquisition");
  const actions = useAdminActions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = (p: Partial<Omit<AcquisitionContact, "id" | "history">>) => actions.patchAcquisitionContact(contact, p, today, p.status ? t(`statuses.${p.status}`) : undefined);
  const wa = waLink(contact.whatsapp);
  return (
    // The sheet is a portal on <body>: the admin scope here, so the admin capsules, menus and tokens apply inside it.
    <div data-acquisition-sheet className="admin-scope flex flex-col gap-5 bg-transparent px-6 pb-6">
      {/* Status: the chain as capsules, „Abgesagt“ apart – a change lands in the history. */}
      <div className="flex flex-col gap-2">
        <span className="text-small text-muted">{t("cols.status")}</span>
        <div role="radiogroup" aria-label={t("cols.status")} className="flex flex-wrap gap-(--adm-cap-gap)">
          {ACQUISITION_STATUSES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={contact.status === s} data-on={contact.status === s ? "" : undefined} onClick={() => contact.status !== s && patch({ status: s })} className={cn("adm-cap adm-press", s === "declined" && "ml-2")}>
              {t(`statuses.${s}`)}
            </button>
          ))}
        </div>
      </div>
      <Field label={t("cols.name")}>
        <Input value={contact.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("cols.platform")}>
          <AdminSort label={t("cols.platform")} options={ACQUISITION_PLATFORMS.map((v) => ({ value: v, label: t(`platforms.${v}`) }))} value={contact.platform} onChange={(v) => patch({ platform: v })} />
        </Field>
        <Field label={t("cols.type")}>
          <AdminSort label={t("cols.type")} options={ACQUISITION_TYPES.map((v) => ({ value: v, label: t(`types.${v}`) }))} value={contact.type} onChange={(v) => patch({ type: v })} />
        </Field>
      </div>
      <Field label={t("fields.profile")}>
        <Input type="url" inputMode="url" value={contact.profileUrl} placeholder="https://instagram.com/…" onChange={(e) => patch({ profileUrl: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("cols.followers")}>
          <Input type="number" inputMode="numeric" min={0} value={contact.followers} onChange={(e) => patch({ followers: Math.max(0, Number(e.target.value) || 0) })} />
        </Field>
        <Field label={t("fields.due")}>
          <Input type="date" value={contact.dueAt ?? ""} onChange={(e) => patch({ dueAt: e.target.value || null })} />
        </Field>
      </div>
      <Field label={t("cols.next")}>
        <Input value={contact.nextStep} onChange={(e) => patch({ nextStep: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("fields.whatsapp")}>
          <Input type="tel" inputMode="tel" value={contact.whatsapp ?? ""} placeholder="49151…" onChange={(e) => patch({ whatsapp: e.target.value.trim() || null })} />
        </Field>
        <Field label={t("fields.draft")}>
          <Input type="url" inputMode="url" value={contact.draftUrl ?? ""} onChange={(e) => patch({ draftUrl: e.target.value.trim() || null })} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        {contact.profileUrl && (
          <a href={contact.profileUrl} target="_blank" rel="noopener noreferrer" className="adm-cap adm-press">
            <ExternalLink aria-hidden className="size-3.5" /> {t("actions.profile")}
          </a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-cap adm-press">
            <MessageCircle aria-hidden className="size-3.5" /> {t("actions.whatsapp")}
          </a>
        )}
        {contact.draftUrl && (
          <a href={contact.draftUrl} target="_blank" rel="noopener noreferrer" className="adm-cap adm-press">
            <FileText aria-hidden className="size-3.5" /> {t("actions.draft")}
          </a>
        )}
      </div>
      <Field label={t("fields.note")}>
        <Textarea rows={3} value={contact.note} onChange={(e) => patch({ note: e.target.value })} />
      </Field>
      <section>
        <h3 className="mb-2 text-eyebrow uppercase text-(--adm-label)">{t("fields.history")}</h3>
        <ol className="flex flex-col gap-1">
          {contact.history.toReversed().map((h, i) => (
            <li key={`${h.at}-${i}`} className="flex items-baseline justify-between gap-4 text-small">
              <span className="text-ink">{t(`statuses.${h.status}`)}</span>
              <span className="tabular-nums text-muted">{day(h.at)}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="flex items-center gap-2 border-t border-ink/8 pt-4">
        {confirmDelete ? (
          <>
            <span className="flex-1 text-small text-ink">{t("deleteConfirm")}</span>
            <AdminButton variant="secondary" onClick={() => setConfirmDelete(false)}>
              {t("cancel")}
            </AdminButton>
            <AdminButton onClick={() => (actions.removeAcquisitionContact(contact.id), onDeleted())}>{t("delete")}</AdminButton>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="adm-press inline-flex items-center gap-1.5 text-small text-muted hover:text-ink">
            <Trash2 aria-hidden className="size-3.5" /> {t("delete")}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Vorlagen ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The text with its placeholders ({Name}, {Ort}, {Thema}, {Nummer}) marked – a soft fill in the page colour, the word in the text colour. */
function Marked({ text }: { text: string }) {
  const parts = text.split(/(\{(?:Name|Ort|Thema|Nummer)\})/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\{(?:Name|Ort|Thema|Nummer)\}$/.test(p) ? (
          <mark key={i} data-placeholder className="rounded-sm px-1 font-semibold text-ink" style={{ background: "color-mix(in oklab, var(--adm-page-color) 22%, transparent)" }}>
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Templates() {
  const t = useTranslations("admin.marketing.acquisition");
  const edited = useAdminData().acquisitionTemplates ?? {};
  return (
    <section data-acquisition-templates className="grid gap-x-10 gap-y-(--adm-section) lg:grid-cols-2">
      {ACQUISITION_TEMPLATE_IDS.map((id) => (
        <TemplateBlock key={id} id={id} current={edited[id] ?? ACQUISITION_TEMPLATES[id]} isEdited={Boolean(edited[id])} title={id === "whatsapp" ? t("templates.whatsapp") : t(`types.${id}`)} />
      ))}
      <p className="text-small text-muted lg:col-span-2">{t("templates.note")}</p>
    </section>
  );
}

function TemplateBlock({ id, current, isEdited, title }: { id: AcquisitionTemplateId; current: { subject: string | null; body: string }; isEdited: boolean; title: string }) {
  const t = useTranslations("admin.marketing.acquisition");
  const actions = useAdminActions();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await copyText(current.subject ? `${current.subject}\n\n${current.body}` : current.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  const save = () => {
    actions.setAcquisitionTemplate(id, title, draft);
    setEditing(false);
  };
  return (
    <article data-template={id} className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-h3 text-ink">
          {title}
          {current.subject !== null && <span className="ml-2 text-small font-normal text-muted">{t("templates.asMail")}</span>}
        </h3>
        <span className="flex items-center gap-2">
          {editing ? (
            <>
              <AdminButton variant="secondary" onClick={() => (setDraft(current), setEditing(false))}>
                {t("cancel")}
              </AdminButton>
              <AdminButton onClick={save}>{t("templates.save")}</AdminButton>
            </>
          ) : (
            <>
              {isEdited && (
                <button type="button" onClick={() => actions.setAcquisitionTemplate(id, title, null)} className="adm-press text-small text-muted hover:text-ink hover:underline">
                  {t("templates.reset")}
                </button>
              )}
              <button type="button" onClick={() => (setDraft(current), setEditing(true))} className="adm-cap adm-press">
                {t("templates.edit")}
              </button>
              <button type="button" onClick={copy} className="adm-cap adm-press" data-on={copied ? "" : undefined}>
                {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
                {copied ? t("templates.copied") : t("templates.copy")}
              </button>
            </>
          )}
        </span>
      </header>
      {editing ? (
        <div className="flex flex-col gap-2">
          {draft.subject !== null && <Input value={draft.subject} aria-label={t("templates.subject")} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />}
          <Textarea rows={9} value={draft.body} aria-label={title} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </div>
      ) : (
        <div className="whitespace-pre-line text-body leading-relaxed text-ink">
          {current.subject !== null && (
            <p className="mb-2">
              <span className="text-small text-muted">{t("templates.subject")}: </span>
              <Marked text={current.subject} />
            </p>
          )}
          <Marked text={current.body} />
        </div>
      )}
    </article>
  );
}

// ── Launch-Tag ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const LAUNCH_CHECKS = ["kit", "story", "bio"] as const;

function LaunchDay({ contacts }: { contacts: readonly AcquisitionContact[] }) {
  const t = useTranslations("admin.marketing.acquisition");
  const actions = useAdminActions();
  const { today } = useAdminInputs();
  const list = useMemo(() => contacts.filter(isFounding).toSorted((a, b) => a.name.localeCompare(b.name)), [contacts]);
  const posted = list.filter((c) => c.launch.story).length;
  const th = "py-2 pr-4 text-left text-small font-medium text-(--adm-label)";
  return (
    <section data-launch-day className="flex flex-col gap-3">
      <p className="text-h3 text-ink">{t("launch.counter", { posted: num(posted), all: num(list.length) })}</p>
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[640px] text-body">
          <thead>
            <tr>
              <th className={th}>{t("cols.name")}</th>
              <th className={th}>{t("cols.status")}</th>
              {LAUNCH_CHECKS.map((k) => (
                <th key={k} className={cn(th, "text-center")}>
                  {t(`launch.${k}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-ink/8">
                <td className="py-2 pr-4 font-semibold text-ink">{c.name}</td>
                <td className="py-2 pr-4 text-ink">{t(`statuses.${c.status}`)}</td>
                {LAUNCH_CHECKS.map((k) => (
                  <td key={k} className="py-2 pr-4 text-center">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={c.launch[k]}
                      aria-label={`${t(`launch.${k}`)}: ${c.name}`}
                      onClick={() => actions.patchAcquisitionContact(c, { launch: { ...c.launch, [k]: !c.launch[k] } }, today)}
                      className={cn("adm-press inline-flex size-6 items-center justify-center rounded-md border-[1.5px]", c.launch[k] ? "border-ink bg-ink text-inverse" : "border-ink/30 hover:border-ink/60")}
                    >
                      {c.launch[k] && <Check aria-hidden className="size-4" strokeWidth={2.5} />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="py-8 text-body text-muted">{t("launch.empty")}</p>}
      </div>
    </section>
  );
}

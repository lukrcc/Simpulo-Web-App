"use client";
import { AdminButton } from "./AdminButton";

// Admin › Launch › Marketing › Partner: one record per collaboration – list left (name, kind, ladder step, open Houses, next step; filters
// kind · step · due), the detail right with its own tabs (Übersicht · Vereinbarung · Houses · Wirkung · Content · Verlauf). Data: the admin
// data (lib/admin/store.ts; Firestore marketingPartners later – admins only, firestore.rules), numbers from lib/admin/metrics.ts
// (partner*), every change through useAdminActions (logged). Never a payout button: the open share is shown only.
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { AdminListDetail, AdminSort, AdminSubTabs, BackToList, PeriodMenu } from "@/components/admin/AdminLayout";
import { InfoTip, KeyNumbers } from "@/components/admin/AdminNumbers";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useAdminActions } from "@/lib/admin/actions";
import { download } from "@/lib/admin/exporters";
import { tableCsv } from "@/lib/admin/exporters/csv";
import { partnerEffect, partnerHouses, partnerOpenHouses, partnerStepDue } from "@/lib/admin/metrics";
import { useAdminPeriod } from "@/lib/admin/period";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import type { MarketingMotivation, MarketingPartner, PartnerAgreementStatus, PartnerKind, PartnerLadder } from "@/lib/data";
import { MARKETING_KINDS, MOTIVATIONS, MOTIVATION_OFFERS } from "@/config/marketing";
import { day, eur, num } from "@/lib/i18n/adminFormat";
import { linkBase } from "@/lib/links";
import { findUser, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { copyText } from "@/lib/clipboard";

export const PARTNER_KINDS: readonly PartnerKind[] = MARKETING_KINDS;
const LADDERS: readonly PartnerLadder[] = [1, 2, 3];
const STATUSES: readonly PartnerAgreementStatus[] = ["draft", "active", "ended"];
type DetailTab = "overview" | "agreement" | "houses" | "effect" | "content" | "history";
const DETAIL_TABS: readonly DetailTab[] = ["overview", "agreement", "houses", "effect", "content", "history"];
type What = "name" | "kind" | "motivation" | "reach" | "channels" | "ladder" | "foundingHost" | "share" | "from" | "to" | "payoutAfterPaid" | "contentRights" | "collabPosts" | "contract" | "status" | "houses" | "content" | "nextStep";

/** A partner's own link – /?ref=<code> (lib/growth.ts counts it as the source "partner", the code as the campaign). */
export const partnerLinkOf = (p: Pick<MarketingPartner, "refCode">) => `${linkBase()}/?ref=${encodeURIComponent(p.refCode)}`;

export interface PartnerFilters {
  kind: PartnerKind | "all";
  ladder: "all" | "1" | "2" | "3";
  due: "all" | "due";
}

/** The click row's controls for the Partner tab: kind, step, due – CSV and "Neuer Partner". */
export function PartnerControls({ filters, onFilters, partners, onAdd }: { filters: PartnerFilters; onFilters: (next: PartnerFilters) => void; partners: readonly MarketingPartner[]; onAdd: () => void }) {
  const t = useTranslations("admin.marketing.partners");
  const actions = useAdminActions();
  const exportCsv = () => {
    const head = t.raw("csvHead") as string[];
    const rows = partners.map((p) => [p.name, t(`kinds.${p.kind}`), p.reach, p.channels.join(", "), p.ladder, p.foundingHost ? "ja" : "nein", p.agreement.sharePercent, p.agreement.from ?? "", p.agreement.to ?? "", t(`agreementStatus.${p.agreement.status}`), p.houseIds.join(" "), p.content.planned, p.content.delivered, p.content.approved, p.nextStep?.text ?? "", p.nextStep?.due ?? "", partnerLinkOf(p)]);
    download(`marketing-partner-${new Date().toISOString().slice(0, 10)}.csv`, tableCsv(head, rows));
    actions.logPartnerExport(partners.length);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminSort label={t("kind")} options={[{ value: "all" as const, label: t("all") }, ...PARTNER_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))]} value={filters.kind} onChange={(kind) => onFilters({ ...filters, kind })} />
      <AdminSort label={t("ladder")} options={[{ value: "all" as const, label: t("all") }, ...LADDERS.map((l) => ({ value: String(l) as "1" | "2" | "3", label: t(`ladderShort.${l}`) }))]} value={filters.ladder} onChange={(ladder) => onFilters({ ...filters, ladder })} />
      <AdminSort label={t("due")} options={[{ value: "all" as const, label: t("all") }, { value: "due" as const, label: t("dueOnly") }]} value={filters.due} onChange={(due) => onFilters({ ...filters, due })} />
      <AdminButton variant="secondary" onClick={exportCsv}>
        {t("export")}
      </AdminButton>
      <AdminButton onClick={onAdd}>
        <Plus aria-hidden className="size-4" />
        {t("add")}
      </AdminButton>
    </div>
  );
}

export function Partners({ partners, filters, selectedId, onSelect }: { partners: readonly MarketingPartner[]; filters: PartnerFilters; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const t = useTranslations("admin.marketing.partners");
  const inputs = useAdminInputs();
  const shown = partners.filter((p) => (filters.kind === "all" || p.kind === filters.kind) && (filters.ladder === "all" || String(p.ladder) === filters.ladder) && (filters.due === "all" || partnerStepDue(p, inputs.today)));
  const selected = partners.find((p) => p.id === selectedId) ?? null;
  const rows = shown.map((p) => {
    const due = partnerStepDue(p, inputs.today);
    return {
      id: p.id,
      // Ember only for "needs you": the next step is due.
      status: due ? ("critical" as const) : null,
      title: p.name,
      meta: [t(`kinds.${p.kind}`), t(`ladderShort.${p.ladder}`), t("openHouses", { count: partnerOpenHouses(inputs.stays, p) })].join(" · "),
      aside: <span className={cn("max-w-36 truncate text-small", due ? "text-ink" : "text-muted")}>{p.nextStep ? `${p.nextStep.text}${p.nextStep.due ? ` · ${day(p.nextStep.due)}` : ""}` : t("noStep")}</span>,
    };
  });
  return (
    <AdminListDetail
      label={t("list")}
      rows={rows}
      selectedId={selected?.id ?? null}
      onSelect={onSelect}
      empty={<p className="text-body text-muted">{t("empty")}</p>}
      detail={selected ? <PartnerDetail key={selected.id} partner={selected} onBack={() => onSelect(null)} onDeleted={() => onSelect(null)} /> : <p className="text-body text-muted">{t("pick")}</p>}
    />
  );
}

function Field({ label, info, children }: { label: string; info?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
        {label}
        {info && <InfoTip text={info} />}
      </p>
      {children}
    </div>
  );
}

function SwitchRow({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex min-h-(--adm-row-h) items-center justify-between gap-4 border-b border-ink/8 py-1">
      <span className="text-body text-ink">{label}</span>
      <Switch on={on} label={label} onChange={onChange} />
    </div>
  );
}

export function PartnerDetail({ partner, onBack, onDeleted }: { partner: MarketingPartner; onBack: () => void; onDeleted: () => void }) {
  const t = useTranslations("admin.marketing.partners");
  const actions = useAdminActions();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [confirming, setConfirming] = useState(false);
  const save = (patch: Partial<Omit<MarketingPartner, "id" | "refCode" | "createdAt">>, what: What) => actions.updatePartner(partner, patch, t(`what.${what}`));
  return (
    <div data-marketing-partner={partner.id} className="flex flex-col gap-5">
      <BackToList onBack={onBack} />
      <div>
        <p className="text-h3 text-ink">{partner.name}</p>
        <p className="text-small text-muted">
          {t(`kinds.${partner.kind}`)} · {t(`ladderShort.${partner.ladder}`)} · {t(`agreementStatus.${partner.agreement.status}`)}
        </p>
      </div>
      <AdminSubTabs label={partner.name} value={tab} onChange={setTab} tabs={DETAIL_TABS.map((value) => ({ value, label: t(`tabs.${value}`) }))} />
      {tab === "overview" && <Overview partner={partner} save={save} />}
      {tab === "agreement" && <Agreement partner={partner} save={save} />}
      {tab === "houses" && <Houses partner={partner} save={save} />}
      {tab === "effect" && <Effect partner={partner} />}
      {tab === "content" && <ContentPart partner={partner} save={save} />}
      {tab === "history" && <History partner={partner} save={save} />}
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body text-ink">{t("deleteConfirm")}</span>
          <AdminButton variant="secondary" onClick={() => setConfirming(false)}>
            {t("cancel")}
          </AdminButton>
          <AdminButton
            onClick={() => {
              actions.deletePartner(partner);
              onDeleted();
            }}
          >
            {t("deleteYes")}
          </AdminButton>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center gap-2 self-start text-body text-danger hover:underline">
          <Trash2 aria-hidden className="size-4" />
          {t("delete")}
        </button>
      )}
    </div>
  );
}

type Save = (patch: Partial<Omit<MarketingPartner, "id" | "refCode" | "createdAt">>, what: What) => void;

function Overview({ partner, save }: { partner: MarketingPartner; save: Save }) {
  const t = useTranslations("admin.marketing.partners");
  const store = useStore();
  const [draft, setDraft] = useState({ name: partner.name, reach: String(partner.reach), channels: partner.channels.join(", ") });
  const host = partner.hostUserId ? findUser(store, partner.hostUserId) : undefined;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("fields.name")}>
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => draft.name.trim() && draft.name.trim() !== partner.name && save({ name: draft.name.trim() }, "name")} />
      </Field>
      <Field label={t("fields.reach")}>
        <Input inputMode="numeric" value={draft.reach} onChange={(e) => setDraft({ ...draft, reach: e.target.value })} onBlur={() => { const v = Math.max(0, Number(draft.reach.replace(/\D/g, "")) || 0); if (v !== partner.reach) save({ reach: v }, "reach"); }} />
      </Field>
      <div className="sm:col-span-2">
        <Field label={t("fields.kind")}>
          <CapsuleGroup size="sm" label={t("fields.kind")} value={partner.kind} onChange={(kind) => save({ kind }, "kind")} options={PARTNER_KINDS.map((k) => ({ value: k, content: t(`kinds.${k}`) }))} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t("fields.motivation")}>
          <MotivationPicker value={partner.motivation} onChange={(motivation) => save({ motivation }, "motivation")} />
        </Field>
      </div>
      {partner.motivation && (
        <div className="sm:col-span-2">
          <MatchingOffer motivation={partner.motivation} name={partner.name} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Field label={`${t("fields.channels")} (${t("fields.channelsHint")})`}>
          <Input value={draft.channels} onChange={(e) => setDraft({ ...draft, channels: e.target.value })} onBlur={() => { const next = draft.channels.split(",").map((c) => c.trim()).filter(Boolean); if (next.join(",") !== partner.channels.join(",")) save({ channels: next }, "channels"); }} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t("fields.ladder")}>
          <CapsuleGroup size="sm" label={t("fields.ladder")} value={String(partner.ladder) as "1" | "2" | "3"} onChange={(v) => save({ ladder: Number(v) as PartnerLadder }, "ladder")} options={LADDERS.map((l) => ({ value: String(l) as "1" | "2" | "3", content: t(`ladders.${l}`, { name: partner.name }) }))} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <SwitchRow label={t("fields.foundingHost")} on={partner.foundingHost} onChange={(on) => save({ foundingHost: on }, "foundingHost")} />
      </div>
      <Field label={t("fields.host")}>
        {host ? (
          <Link href={`/admin/hosts?host=${host.id}`} className="text-body font-semibold text-ink hover:underline">
            {t("fields.hostOpen", { name: host.name })}
          </Link>
        ) : (
          <p className="text-body text-muted">{t("fields.hostNone")}</p>
        )}
      </Field>
      {partner.contactId && (
        <Field label={t("fields.contact")}>
          <Link href={`/admin/marketing?tab=pipeline&contact=${partner.contactId}`} className="text-body font-semibold text-ink hover:underline">
            {partner.contactId} →
          </Link>
        </Field>
      )}
    </div>
  );
}

function Agreement({ partner, save }: { partner: MarketingPartner; save: Save }) {
  const t = useTranslations("admin.marketing.partners");
  const a = partner.agreement;
  const [draft, setDraft] = useState({ share: String(a.sharePercent), rights: a.contentRights, contract: a.contractUrl });
  const set = (patch: Partial<MarketingPartner["agreement"]>, what: What) => save({ agreement: { ...a, ...patch } }, what);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("fields.status")}>
        <CapsuleGroup size="sm" label={t("fields.status")} value={a.status} onChange={(status) => set({ status }, "status")} options={STATUSES.map((s) => ({ value: s, content: t(`agreementStatus.${s}`) }))} />
      </Field>
      <Field label={t("fields.share")}>
        <Input inputMode="decimal" value={draft.share} onChange={(e) => setDraft({ ...draft, share: e.target.value })} onBlur={() => { const v = Math.min(100, Math.max(0, Number(draft.share.replace(",", ".")) || 0)); if (v !== a.sharePercent) set({ sharePercent: v }, "share"); }} />
      </Field>
      <Field label={t("fields.from")}>
        <Input type="date" value={a.from ?? ""} onChange={(e) => set({ from: e.target.value || null }, "from")} />
      </Field>
      <Field label={t("fields.to")}>
        <Input type="date" value={a.to ?? ""} onChange={(e) => set({ to: e.target.value || null }, "to")} />
      </Field>
      <div className="sm:col-span-2">
        <SwitchRow label={t("fields.payoutAfterPaid")} on={a.payoutAfterPaidStay} onChange={(on) => set({ payoutAfterPaidStay: on }, "payoutAfterPaid")} />
        <SwitchRow label={t("fields.collabPosts")} on={a.collabPosts} onChange={(on) => set({ collabPosts: on }, "collabPosts")} />
      </div>
      <div className="sm:col-span-2">
        <Field label={t("fields.contentRights")}>
          <Input value={draft.rights} onChange={(e) => setDraft({ ...draft, rights: e.target.value })} onBlur={() => draft.rights !== a.contentRights && set({ contentRights: draft.rights.trim() }, "contentRights")} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t("fields.contract")}>
          <div className="flex items-center gap-3">
            <Input inputMode="url" value={draft.contract} onChange={(e) => setDraft({ ...draft, contract: e.target.value })} onBlur={() => draft.contract !== a.contractUrl && set({ contractUrl: draft.contract.trim() }, "contract")} />
            {/^https?:\/\//.test(a.contractUrl) && (
              <a href={a.contractUrl} target="_blank" rel="noreferrer noopener" className="shrink-0 text-body font-semibold text-ink hover:underline">
                {t("fields.contractOpen")}
              </a>
            )}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Houses({ partner, save }: { partner: MarketingPartner; save: Save }) {
  const t = useTranslations("admin.marketing.partners");
  const { stays } = useAdminInputs();
  const houses = partnerHouses(stays, partner);
  const linkable = stays.filter((s) => !s.isExample && s.status !== "draft_unclaimed" && !houses.some((h) => h.id === s.id)).toSorted((a, b) => a.title.localeCompare(b.title));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-muted">{t("housesInfo")}</p>
      {houses.length === 0 ? (
        <p className="text-body text-muted">{t("housesEmpty")}</p>
      ) : (
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {houses.map((h) => (
            <li key={h.id} data-partner-house={h.id} className="flex min-h-(--adm-row-h) items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <Link href={`/admin/houses?house=${h.id}`} className="block truncate text-body font-semibold text-ink hover:underline">
                  {h.title}
                </Link>
                <span className="block text-small text-muted">
                  {t(`houseStatus.${h.status}`)} · {t("fill", { in: h.spotsFilled, total: h.spotsTotal })}
                </span>
              </span>
              {partner.houseIds.includes(h.id) && (
                <button type="button" onClick={() => save({ houseIds: partner.houseIds.filter((id) => id !== h.id) }, "houses")} className="min-h-11 shrink-0 text-small text-muted hover:text-ink">
                  {t("unlink")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Field label={t("linkHouse")}>
        <select
          value=""
          onChange={(e) => e.target.value && save({ houseIds: [...partner.houseIds, e.target.value] }, "houses")}
          className="h-12 w-full rounded-xl border border-ink/10 bg-transparent px-3 text-body text-ink"
        >
          <option value="">–</option>
          {linkable.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Effect({ partner }: { partner: MarketingPartner }) {
  const t = useTranslations("admin.marketing.partners");
  const store = useStore();
  const { today } = useAdminInputs();
  const [period] = useAdminPeriod();
  const e = useMemo(() => partnerEffect(store.events, partner, period, today), [store.events, partner, period, today]);
  const [copied, setCopied] = useState(false);
  const link = partnerLinkOf(partner);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted">{t("effect.info")}</p>
        <PeriodMenu />
      </div>
      <KeyNumbers
        items={[
          { key: "visitors", label: t("effect.visitors"), info: t("effect.info"), value: num(e.visits), change: e.change.visits },
          { key: "requests", label: t("effect.requests"), info: t("effect.info"), value: num(e.requests), change: e.change.requests },
          { key: "paid", label: t("effect.paid"), info: t("effect.info"), value: num(e.paid), change: e.change.paid },
          { key: "revenue", label: t("effect.revenue"), info: t("effect.info"), value: eur(e.revenue), change: e.change.revenue },
        ]}
      />
      <p data-open-share className="flex items-center gap-1 text-body text-ink">
        {t("effect.openShare")}: <span className="font-semibold tabular-nums">{eur(e.openShare)}</span> <span className="text-small text-muted">({partner.agreement.sharePercent} %)</span>
        <InfoTip text={t("effect.openShareInfo")} />
      </p>
      <div className="flex items-center gap-2">
        <code data-partner-link className="min-w-0 flex-1 truncate rounded-xl bg-(--adm-block) px-3 py-2.5 text-small text-ink">{link}</code>
        <AdminButton
          variant="secondary"
          onClick={() => {
            void copyText(link).catch(() => {});
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
        </AdminButton>
      </div>
    </div>
  );
}

function ContentPart({ partner, save }: { partner: MarketingPartner; save: Save }) {
  const t = useTranslations("admin.marketing.partners");
  const keys = ["planned", "delivered", "approved"] as const;
  return (
    <dl className="grid grid-cols-3 gap-4">
      {keys.map((k) => (
        <div key={k}>
          <dt className="text-eyebrow uppercase text-(--adm-label)">{t(`fields.${k}`)}</dt>
          <dd className="mt-2">
            <Input inputMode="numeric" defaultValue={String(partner.content[k])} onBlur={(e) => { const v = Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0); if (v !== partner.content[k]) save({ content: { ...partner.content, [k]: v } }, "content"); }} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function History({ partner, save }: { partner: MarketingPartner; save: Save }) {
  const t = useTranslations("admin.marketing.partners");
  const actions = useAdminActions();
  const [step, setStep] = useState(partner.nextStep?.text ?? "");
  const [note, setNote] = useState("");
  const commitStep = (text: string, due: string | null) => {
    const next = text.trim() ? { text: text.trim(), due } : null;
    if ((next?.text ?? "") !== (partner.nextStep?.text ?? "") || (next?.due ?? null) !== (partner.nextStep?.due ?? null)) save({ nextStep: next }, "nextStep");
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Field label={t("fields.nextStep")}>
          <Input value={step} onChange={(e) => setStep(e.target.value)} onBlur={() => commitStep(step, partner.nextStep?.due ?? null)} />
        </Field>
        <Field label={t("fields.nextDue")}>
          <Input type="date" value={partner.nextStep?.due ?? ""} onChange={(e) => commitStep(step || partner.nextStep?.text || "", e.target.value || null)} />
        </Field>
      </div>
      <Field label={t("fields.note")}>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <AdminButton
        variant="secondary"
        className="self-start"
        disabled={!note.trim()}
        onClick={() => {
          actions.addPartnerNote(partner, note.trim());
          setNote("");
        }}
      >
        {t("fields.addNote")}
      </AdminButton>
      {partner.notes.length === 0 ? (
        <p className="text-body text-muted">{t("notesEmpty")}</p>
      ) : (
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {partner.notes.map((n) => (
            <li key={n.id} className="flex gap-4 py-2.5">
              <span className="w-20 shrink-0 text-small tabular-nums text-muted">{day(n.at)}</span>
              <span className="min-w-0 flex-1 text-body text-ink">{n.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Motivation as capsules (Geld · Gleichgesinnte · Status), "offen" = not judged yet. CapsuleGroup – styled the same in a panel's portal. */
export function MotivationPicker({ value, onChange }: { value: MarketingMotivation | undefined; onChange: (next: MarketingMotivation | undefined) => void }) {
  const t = useTranslations("admin.marketing");
  return (
    <CapsuleGroup
      size="sm"
      label={t("motivation.label")}
      value={value ?? "none"}
      onChange={(v) => onChange(v === "none" ? undefined : v)}
      options={[...MOTIVATIONS.map((m) => ({ value: m, content: t(`motivation.${m}`) })), { value: "none" as const, content: t("motivation.none") }]}
    />
  );
}

/** Kind (Creator · Streamer · Community-Betreiber · Connector · Ort/Marke) for a contact, "offen" = not judged yet. */
export function KindPicker({ value, onChange }: { value: PartnerKind | undefined; onChange: (next: PartnerKind | undefined) => void }) {
  const t = useTranslations("admin.marketing");
  return (
    <CapsuleGroup
      size="sm"
      label={t("pipeline.kind")}
      value={value ?? "none"}
      onChange={(v) => onChange(v === "none" ? undefined : v)}
      options={[...MARKETING_KINDS.map((k) => ({ value: k, content: t(`partners.kinds.${k}`) })), { value: "none" as const, content: t("motivation.none") }]}
    />
  );
}

/** "Passendes Angebot": what fits this motivation (config/marketing.ts MOTIVATION_OFFERS). */
export function MatchingOffer({ motivation, name }: { motivation: MarketingMotivation; name: string }) {
  const t = useTranslations("admin.marketing");
  return (
    <section data-matching-offer={motivation} className="rounded-xl bg-(--adm-block) p-4 ring-1 ring-ink/8">
      <p className="text-eyebrow uppercase text-(--adm-label)">
        {t("offer.title")} · {t(`motivation.${motivation}`)}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {MOTIVATION_OFFERS[motivation].map((o) => (
          <li key={o} className="rounded-full bg-(--adm-pill) px-3 py-1 text-body text-ink">
            {o.replace("{name}", name)}
          </li>
        ))}
      </ul>
    </section>
  );
}

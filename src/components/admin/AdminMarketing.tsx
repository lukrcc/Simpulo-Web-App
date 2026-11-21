"use client";

// Admin › Launch › Marketing: Plan · Kontakte · Trichter · Content · Schleifen. The plan's content from config/marketing.ts, the contacts
// from the admin data (lib/admin/store.ts; Firestore marketingContacts later – admins only, firestore.rules), every number from
// lib/admin/metrics.ts (marketing*), every change through useAdminActions (logged). German, dark, the admin's tokens.
import { Check, Copy, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { AdminListDetail, AdminSort, AdminTabs, BackToList, type AdminTab } from "@/components/admin/AdminLayout";
import { ProgressBar, StatusDot } from "@/components/admin/AdminCharts";
import { InfoTip, KeyNumbers } from "@/components/admin/AdminNumbers";
import { Button } from "@/components/ui/ActionButton";
import { Img } from "@/components/ui/Img";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import {
  CONTACT_CHANNELS,
  FUNNEL_ASSUMPTIONS,
  MARKETING_CHANNELS,
  MARKETING_CORE,
  MARKETING_LOOPS,
  MARKETING_NEXT_STEPS,
  MARKETING_STAGES,
  MARKETING_TIMELINE,
  MAX_FOLLOW_UPS,
  NEXT_CONTACTS_FOR_BEST_NICHE,
  PROJECTION_HOUSES,
  SERIES_CAST,
  SERIES_CAST_SIZE,
  SERIES_CLIP_TARGET,
  SERIES_STRUCTURE,
  SHOT_LIST,
} from "@/config/marketing";
import { useAdminActions } from "@/lib/admin/actions";
import { againstAssumption, compareDate, getChange, marketingFilledHouses, marketingFunnel, marketingLoops, type FunnelRow, type Status } from "@/lib/admin/metrics";
import { download } from "@/lib/admin/exporters";
import { tableCsv } from "@/lib/admin/exporters/csv";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import type { MarketingContact, MarketingContactStatus, MarketingContactWay, MarketingPartner } from "@/lib/data";
import { PartnerControls, Partners, type PartnerFilters } from "@/components/admin/AdminPartners";
import { compact, day, num, share } from "@/lib/i18n/adminFormat";
import { linkBase } from "@/lib/links";
import { cn, housePhotos } from "@/lib/utils";
import { findUser, useStore } from "@/lib/store";
import { memoriesStats } from "@/lib/memories";
import { useMemorySrc } from "@/lib/memoryMedia";
import type { HouseMemory } from "@/lib/types";

type Tab = "plan" | "contacts" | "partners" | "funnel" | "content" | "loops";
const TABS: readonly Tab[] = ["plan", "contacts", "partners", "funnel", "content", "loops"];
const STATUSES: readonly MarketingContactStatus[] = ["open", "replied", "demo", "house", "later"];
const WAYS: readonly MarketingContactWay[] = ["email", "dm", "form"];

/** A contact's own demo link – opening it moves the contact to "Demo gesehen" (lib/admin/store.ts markContactDemoSeen). */
const demoLinkOf = (id: string) => `${linkBase()}/?ref=${encodeURIComponent(id)}`;

export function AdminMarketing() {
  const t = useTranslations("admin.marketing");
  const [tab, setTab] = useState<Tab>("plan");
  const data = useAdminData();
  const contacts = data.marketingContacts;
  // Kontakte: the filters and the open one live here, so the click row can hold them.
  const [niche, setNiche] = useState<string>("all");
  const [status, setStatus] = useState<MarketingContactStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const actions = useAdminActions();
  // Partner: filters and the open one.
  const [partnerFilters, setPartnerFilters] = useState<PartnerFilters>({ kind: "all", ladder: "all", due: "all" });
  const [partnerId, setPartnerId] = useState<string | null>(null);
  // Links from the Posteingang and between the tabs: ?tab=partners&partner=… · ?tab=contacts&contact=… – read once on arrival.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("tab");
    if (wanted !== "partners" && wanted !== "contacts") return;
    requestAnimationFrame(() => {
      setTab(wanted);
      if (wanted === "partners") setPartnerId(params.get("partner"));
      else setSelectedId(params.get("contact"));
    });
  }, []);
  const partners = data.marketingPartners;
  const toPartner = (contact: MarketingContact) => {
    const existing = partners.find((p) => p.contactId === contact.id);
    const partner = existing ?? actions.partnerFromContact(contact);
    setTab("partners");
    setPartnerFilters({ kind: "all", ladder: "all", due: "all" });
    setPartnerId(partner.id);
  };
  const addPartner = () => {
    const added = actions.addPartner({
      contactId: null,
      name: t("partners.newName"),
      kind: partnerFilters.kind !== "all" ? partnerFilters.kind : "creator",
      reach: 0,
      channels: [],
      ladder: 1,
      foundingHost: false,
      hostUserId: null,
      agreement: { sharePercent: 0, from: null, to: null, payoutAfterPaidStay: true, contentRights: "", collabPosts: false, contractUrl: "", status: "draft" },
      houseIds: [],
      content: { planned: 0, delivered: 0, approved: 0 },
      notes: [],
      nextStep: null,
    });
    setPartnerFilters({ kind: "all", ladder: "all", due: "all" });
    setPartnerId(added.id);
  };
  const niches = useMemo(() => [...new Set(contacts.map((c) => c.niche))].toSorted(), [contacts]);

  const tabs: AdminTab<Tab>[] = TABS.map((value) => ({ value, label: t(`tabs.${value}`), count: value === "contacts" ? contacts.length : value === "partners" ? partners.length : undefined }));
  const tc = useTranslations("admin.marketing.contacts");
  const addContact = () => {
    const added = actions.addMarketingContact({
      name: tc("newName"),
      channel: CONTACT_CHANNELS[0],
      niche: niche !== "all" ? niche : (niches[0] ?? ""),
      followers: 0,
      contactWay: "dm",
      firstMessageAt: null,
      followUps: 0,
      status: "open",
      launchConsent: false,
      launchConsentAt: null,
      launchMail: false,
      note: "",
    });
    setStatus("all");
    setSelectedId(added.id);
  };
  const exportCsv = () => {
    const head = tc.raw("csvHead") as string[];
    const rows = contacts.map((c) => [c.name, c.channel, c.niche, c.followers, tc(`ways.${c.contactWay}`), c.firstMessageAt ?? "", c.followUps, tc(`statuses.${c.status}`), c.launchConsent ? "ja" : "nein", c.launchConsentAt ?? "", c.launchMail ? "ja" : "nein", c.note, demoLinkOf(c.id)]);
    download(`marketing-kontakte-${new Date().toISOString().slice(0, 10)}.csv`, tableCsv(head, rows));
    actions.logMarketingExport(contacts.length);
  };

  const controls =
    tab === "contacts" ? (
      <div className="flex flex-wrap items-center gap-2">
        <AdminSort label={tc("niche")} options={[{ value: "all", label: tc("all") }, ...niches.map((n) => ({ value: n, label: n }))]} value={niche} onChange={setNiche} />
        <AdminSort label={tc("status")} options={[{ value: "all" as const, label: tc("all") }, ...STATUSES.map((s) => ({ value: s, label: tc(`statuses.${s}`) }))]} value={status} onChange={setStatus} />
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          {tc("export")}
        </Button>
        <Button size="sm" onClick={addContact}>
          <Plus aria-hidden className="size-4" />
          {tc("add")}
        </Button>
      </div>
    ) : tab === "partners" ? (
      <PartnerControls filters={partnerFilters} onFilters={setPartnerFilters} partners={partners} onAdd={addPartner} />
    ) : undefined;

  return (
    <AdminShell title={t("title")} tabs={<AdminTabs label={t("title")} tabs={tabs} value={tab} onChange={setTab} />} aside={controls}>
      {tab === "plan" && <Plan />}
      {tab === "contacts" && <Contacts contacts={contacts} niche={niche} status={status} selectedId={selectedId} onSelect={setSelectedId} partnerOf={(id) => partners.find((p) => p.contactId === id) ?? null} onToPartner={toPartner} />}
      {tab === "partners" && <Partners partners={partners} filters={partnerFilters} selectedId={partnerId} onSelect={setPartnerId} />}
      {tab === "funnel" && <Funnel contacts={contacts} />}
      {tab === "content" && <Content clips={data.marketingClips} />}
      {tab === "loops" && <Loops />}
    </AdminShell>
  );
}

// ─── Plan ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Plan() {
  const t = useTranslations("admin.marketing.plan");
  const inputs = useAdminInputs();
  const data = useAdminData();
  const actions = useAdminActions();
  const filled = marketingFilledHouses(inputs);
  const month = inputs.today.slice(0, 7);
  // The phase today falls in: the last one that has begun.
  const current = MARKETING_TIMELINE.findLast((p) => p.from <= month)?.key ?? MARKETING_TIMELINE[0].key;
  const done = MARKETING_NEXT_STEPS.filter((s) => data.marketingSteps[s.id]).length;
  return (
    <>
      <p className="text-eyebrow uppercase text-(--adm-label)">{t("core")}</p>
      <p className="mt-2 max-w-[760px] text-adm-motto text-ink">{MARKETING_CORE}</p>

      <AdminSection title={t("ladder")} className="mt-(--adm-section)">
        <KeyNumbers items={[{ key: "filled", label: t("filled"), info: t("ladderInfo"), value: num(filled), change: getChange("mktFilledHouses", filled, null) }]} />
        <ol className="mt-(--adm-inner) grid gap-4 md:grid-cols-3">
          {MARKETING_STAGES.map((stage, i) => {
            const prev = i === 0 ? 0 : MARKETING_STAGES[i - 1].target;
            const ratio = Math.max(0, Math.min(1, (filled - prev) / (stage.target - prev)));
            const reached = filled >= stage.target;
            return (
              <li key={stage.key} data-marketing-stage={stage.key} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cn("text-body font-semibold", reached ? "text-ink" : "text-ink/80")}>
                    {i + 1}. {stage.label}
                  </p>
                  <p className="flex items-center gap-1.5 text-small tabular-nums text-muted">
                    {reached && <StatusDot status="good" />}
                    {reached ? t("reached") : t("ofTarget", { value: num(Math.min(filled, stage.target)), target: num(stage.target) })}
                  </p>
                </div>
                <ProgressBar ratio={ratio} label={t("ofTarget", { value: num(filled), target: num(stage.target) })} className="mt-2" />
              </li>
            );
          })}
        </ol>
      </AdminSection>

      <AdminSection title={t("channels")}>
        {MARKETING_CHANNELS.length > 0 && (
          <ol className="divide-y divide-ink/8 border-y border-ink/8">
            {MARKETING_CHANNELS.toSorted((a, b) => a.rank - b.rank).map((c) => (
              <li key={c.rank} className="flex min-h-(--adm-row-h) items-center gap-4 py-2">
                <span className="w-6 shrink-0 tabular-nums text-muted">{c.rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{c.name}</span>
                  {(c.tools.length > 0 || c.note) && <span className="block truncate text-small text-muted">{[c.tools.join(", "), c.note].filter(Boolean).join(" · ")}</span>}
                </span>
                <span className={cn("shrink-0 text-small", c.status === "now" ? "font-semibold text-ink" : "text-muted")}>{t(`channelStatus.${c.status}`)}</span>
              </li>
            ))}
          </ol>
        )}
      </AdminSection>

      <AdminSection title={t("timeline")}>
        <ol className="grid gap-2 md:grid-cols-4">
          {MARKETING_TIMELINE.map((phase) => {
            const here = phase.key === current;
            return (
              <li key={phase.key} data-marketing-phase={phase.key} className={cn("rounded-xl px-4 py-3", here ? "bg-(--adm-here)" : "bg-(--adm-block)")}>
                <p className="text-small text-muted">{phase.when}</p>
                <p className="mt-0.5 text-body font-semibold text-ink">{phase.label}</p>
                {here && <p className="mt-1 text-small font-semibold text-adm-chart-1">{t("here")}</p>}
              </li>
            );
          })}
        </ol>
      </AdminSection>

      <AdminSection title={t("steps")} aside={MARKETING_NEXT_STEPS.length > 0 ? <span className="text-small text-muted">{t("stepsDone", { done, total: MARKETING_NEXT_STEPS.length })}</span> : undefined}>
        {MARKETING_NEXT_STEPS.length > 0 && (
          <ul className="divide-y divide-ink/8 border-y border-ink/8">
            {MARKETING_NEXT_STEPS.map((step) => {
              const on = Boolean(data.marketingSteps[step.id]);
              return (
                <li key={step.id}>
                  <label className="flex min-h-(--adm-row-h) cursor-pointer items-center gap-3 py-2">
                    <input type="checkbox" checked={on} onChange={(e) => actions.setMarketingStep(step.id, step.text, e.target.checked)} className="size-4 accent-(--text)" />
                    <span className={cn("min-w-0 flex-1 text-body", on ? "text-muted line-through" : "text-ink")}>{step.text}</span>
                    <span className="shrink-0 text-small text-muted">{step.due}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </>
  );
}

// ─── Kontakte ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The status as a dot: House opened good, demo seen and replied neutral steps, later grey, open none. */
const statusDot = (s: MarketingContactStatus): Status | null => (s === "house" ? "good" : s === "demo" ? "warning" : null);

function Contacts({ contacts, niche, status, selectedId, onSelect, partnerOf, onToPartner }: { contacts: readonly MarketingContact[]; niche: string; status: MarketingContactStatus | "all"; selectedId: string | null; onSelect: (id: string | null) => void; partnerOf: (contactId: string) => MarketingPartner | null; onToPartner: (contact: MarketingContact) => void }) {
  const t = useTranslations("admin.marketing.contacts");
  const shown = contacts.filter((c) => (niche === "all" || c.niche === niche) && (status === "all" || c.status === status));
  const selected = contacts.find((c) => c.id === selectedId) ?? null;
  const rows = shown.map((c) => ({
    id: c.id,
    status: statusDot(c.status),
    title: c.name,
    meta: [c.niche, c.channel, t("followers", { count: compact(c.followers) }), t(`statuses.${c.status}`)].join(" · "),
    aside: <span className="text-small tabular-nums text-muted">{c.firstMessageAt ? day(c.firstMessageAt) : t("notWritten")}</span>,
  }));
  return (
    <AdminListDetail
      label={t("list")}
      rows={rows}
      selectedId={selected?.id ?? null}
      onSelect={onSelect}
      empty={<p className="text-body text-muted">{t("empty")}</p>}
      detail={selected ? <ContactDetail key={selected.id} contact={selected} onBack={() => onSelect(null)} onDeleted={() => onSelect(null)} isPartner={partnerOf(selected.id) !== null} onToPartner={() => onToPartner(selected)} /> : <p className="text-body text-muted">{t("pick")}</p>}
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

function ContactDetail({ contact, onBack, onDeleted, isPartner, onToPartner }: { contact: MarketingContact; onBack: () => void; onDeleted: () => void; isPartner: boolean; onToPartner: () => void }) {
  const tPartners = useTranslations("admin.marketing.partners");
  const t = useTranslations("admin.marketing.contacts");
  const actions = useAdminActions();
  // Text fields keep their own draft and save when left (one log line per change, not per key).
  const [draft, setDraft] = useState({ name: contact.name, niche: contact.niche, followers: String(contact.followers), note: contact.note });
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const save = (patch: Partial<Omit<MarketingContact, "id" | "createdAt">>, what: WhatKey) => actions.updateMarketingContact(contact, patch, t(`what.${what}`));
  const commit = (key: "name" | "niche" | "note") => {
    const value = draft[key].trim();
    if (value !== contact[key] && (key === "note" || value !== "")) save({ [key]: value }, key);
  };
  const commitFollowers = () => {
    const value = Math.max(0, Math.round(Number(draft.followers.replace(/\D/g, "")) || 0));
    if (value !== contact.followers) save({ followers: value }, "followers");
  };
  const link = demoLinkOf(contact.id);
  const locked = !contact.launchConsent;
  return (
    <div data-marketing-contact={contact.id} className="flex flex-col gap-5">
      <BackToList onBack={onBack} />
      {/* A contact that turns into a collaboration: its data over to Partner, the contact linked back. */}
      <Button size="sm" variant="secondary" className="self-start" onClick={onToPartner}>
        {isPartner ? tPartners("isPartner") : tPartners("fromContact")}
      </Button>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.name")}>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => commit("name")} />
        </Field>
        <Field label={t("fields.channel")}>
          <select value={contact.channel} onChange={(e) => save({ channel: e.target.value }, "channel")} className="h-12 w-full rounded-xl border border-ink/10 bg-transparent px-3 text-body text-ink">
            {[...new Set([...CONTACT_CHANNELS, contact.channel])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("fields.niche")}>
          <Input value={draft.niche} onChange={(e) => setDraft({ ...draft, niche: e.target.value })} onBlur={() => commit("niche")} />
        </Field>
        <Field label={t("fields.followers")}>
          <Input inputMode="numeric" value={draft.followers} onChange={(e) => setDraft({ ...draft, followers: e.target.value })} onBlur={commitFollowers} />
        </Field>
        <Field label={t("fields.firstMessage")}>
          <Input type="date" value={contact.firstMessageAt ?? ""} onChange={(e) => save({ firstMessageAt: e.target.value || null }, "firstMessage")} />
        </Field>
        <Field label={t("fields.contactWay")}>
          <CapsuleGroup size="sm" label={t("fields.contactWay")} value={contact.contactWay} onChange={(contactWay) => save({ contactWay }, "contactWay")} options={WAYS.map((w) => ({ value: w, content: t(`ways.${w}`) }))} />
        </Field>
      </div>
      <Field label={t("fields.followUps")}>
        <div className="flex flex-wrap items-center gap-3">
          <CapsuleGroup
            size="sm"
            label={t("fields.followUps")}
            value={String(contact.followUps) as "0" | "1" | "2"}
            onChange={(v) => save({ followUps: Number(v) as 0 | 1 | 2 }, "followUps")}
            options={(["0", "1", "2"] as const).map((v) => ({ value: v, content: v }))}
          />
          {contact.followUps >= MAX_FOLLOW_UPS && <span className="text-small font-semibold text-ink">{t("quiet")}</span>}
        </div>
      </Field>
      <Field label={t("fields.status")}>
        <CapsuleGroup size="sm" label={t("fields.status")} value={contact.status} onChange={(s) => save({ status: s }, "status")} options={STATUSES.map((s) => ({ value: s, content: t(`statuses.${s}`) }))} />
      </Field>
      <div className="flex flex-col divide-y divide-ink/8 border-y border-ink/8">
        <div className="flex min-h-(--adm-row-h) items-center justify-between gap-4 py-1">
          <span className="text-body text-ink">
            {t("fields.consent")}
            <span className="ml-2 text-small text-muted">{contact.launchConsent && contact.launchConsentAt ? t("consentSince", { date: day(contact.launchConsentAt) }) : contact.launchConsent ? "" : t("consentNo")}</span>
          </span>
          <Switch
            on={contact.launchConsent}
            label={t("fields.consent")}
            onChange={(on) => save(on ? { launchConsent: true, launchConsentAt: new Date().toISOString().slice(0, 10) } : { launchConsent: false, launchConsentAt: null, launchMail: false }, "consent")}
          />
        </div>
        <div className={cn("flex min-h-(--adm-row-h) items-center justify-between gap-4 py-1", locked && "opacity-60")}>
          <span className="flex items-center gap-1 text-body text-ink">
            {t("fields.launchMail")}
            {locked && <InfoTip text={t("launchMailLocked")} />}
          </span>
          {/* Locked without consent – "later" without consent can't get the launch mail. */}
          <Switch disabled={locked} on={Boolean(contact.launchMail) && !locked} label={t("fields.launchMail")} onChange={(on) => !locked && save({ launchMail: on }, "launchMail")} />
        </div>
      </div>
      <Field label={t("fields.demoLink")} info={t("demoInfo")}>
        <div className="flex items-center gap-2">
          <code data-demo-link className="min-w-0 flex-1 truncate rounded-xl bg-(--adm-block) px-3 py-2.5 text-small text-ink">{link}</code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(link).catch(() => {});
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
      </Field>
      <Field label={t("fields.note")}>
        <Textarea rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} onBlur={() => commit("note")} />
      </Field>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body text-ink">{t("deleteConfirm")}</span>
          <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              actions.deleteMarketingContact(contact);
              onDeleted();
            }}
          >
            {t("deleteYes")}
          </Button>
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
/** The field names the log may say (no personal values). */
type WhatKey = "name" | "channel" | "niche" | "followers" | "contactWay" | "firstMessage" | "followUps" | "status" | "consent" | "launchMail" | "note";

// ─── Trichter ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Funnel({ contacts }: { contacts: readonly MarketingContact[] }) {
  const t = useTranslations("admin.marketing.funnel");
  const inputs = useAdminInputs();
  const compareDay = compareDate(inputs.today, "month");
  const f = marketingFunnel(contacts, compareDay);
  const range = (r: { from: number; to: number }) => t("assumption", { from: share(r.from), to: share(r.to) });
  const rate = (key: "reply" | "demo" | "house") => {
    const value = key === "reply" ? f.all.replyRate : key === "demo" ? f.all.demoRate : f.all.houseRate;
    const r = key === "reply" ? FUNNEL_ASSUMPTIONS.replied : key === "demo" ? FUNNEL_ASSUMPTIONS.demo : FUNNEL_ASSUMPTIONS.house;
    const metric = key === "reply" ? "mktReplyRate" : key === "demo" ? "mktDemoRate" : "mktHouseRate";
    return { key, label: t(`${key}Rate`), info: t(`info.${key}Rate`), value: share(value), change: getChange(metric, value === null ? null : value * 100, null), target: { text: range(r), status: againstAssumption(value, r) } };
  };
  const pct = (n: number, rate: number | null) => (
    <span className="tabular-nums">
      {num(n)} <span className="text-muted">· {share(rate)}</span>
    </span>
  );
  const row = (r: FunnelRow) => (
    <tr key={r.key} data-funnel-row={r.key} className={cn("border-b border-ink/8", r.key === "all" && "font-semibold")}>
      <td className="py-2.5 pr-4 text-ink">
        <span className="inline-flex items-center gap-2">
          {r.key === "all" ? t("all") : r.key}
          {r.key === f.best && <span className="rounded-full bg-(--adm-here) px-2 py-0.5 text-small font-semibold text-adm-chart-1">{t("best")}</span>}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-right tabular-nums text-ink">{num(r.contacted)}</td>
      <td className="py-2.5 pr-4 text-right text-ink">{pct(r.replied, r.replyRate)}</td>
      <td className="py-2.5 pr-4 text-right text-ink">{pct(r.demo, r.demoRate)}</td>
      <td className="py-2.5 text-right text-ink">{pct(r.house, r.houseRate)}</td>
    </tr>
  );
  return (
    <>
      <p className="max-w-[760px] text-adm-motto text-ink">{t("lead", { count: num(NEXT_CONTACTS_FOR_BEST_NICHE) })}</p>
      <p className="mt-1 text-body text-muted">
        {t("best")}: <span className="font-semibold text-ink">{f.best ?? t("bestNone")}</span>
      </p>
      <KeyNumbers
        className="mt-(--adm-section)"
        items={[
          { key: "contacted", label: t("contacted"), info: t("info.contacted"), value: num(f.all.contacted), change: getChange("mktContacted", f.all.contacted, f.contactedBefore), against: t("against") },
          rate("reply"),
          rate("demo"),
          rate("house"),
        ]}
      />
      <AdminSection title={t("niche")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-body">
            <thead>
              <tr className="border-b border-ink/8 text-left text-eyebrow uppercase text-(--adm-label)">
                <th className="py-2 pr-4 font-semibold">{t("niche")}</th>
                <th className="py-2 pr-4 text-right font-semibold">{t("contacted")}</th>
                <th className="py-2 pr-4 text-right font-semibold">{t("replied")}</th>
                <th className="py-2 pr-4 text-right font-semibold">{t("demo")}</th>
                <th className="py-2 text-right font-semibold">{t("house")}</th>
              </tr>
            </thead>
            <tbody>
              {f.perNiche.map(row)}
              {row(f.all)}
            </tbody>
          </table>
        </div>
      </AdminSection>
      <AdminSection title={t("projection")}>
        <p className="text-body text-ink">{f.projection.current ? t("projectionLine", { houses: PROJECTION_HOUSES, count: num(f.projection.current) }) : t("projectionNone", { houses: PROJECTION_HOUSES })}</p>
        <p className="mt-1 text-small text-muted">
          {t("projectionAssumed", { from: num(FUNNEL_ASSUMPTIONS.house.from * 100), to: num(FUNNEL_ASSUMPTIONS.house.to * 100), low: num(f.projection.assumed.from ?? 0), high: num(f.projection.assumed.to ?? 0) })}
        </p>
      </AdminSection>
    </>
  );
}

// ─── Content ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Houses kept for content (Admin › Houses › Läuft gut → "Für Content vormerken"), newest first – photo, title, the day it was kept. */
function ContentHouses() {
  const t = useTranslations("admin.marketing.content");
  const data = useAdminData();
  const store = useStore();
  const kept = data.contentHouses.flatMap((c) => {
    const stay = store.stays.find((s) => s.id === c.stayId);
    return stay ? [{ stay, at: c.at }] : [];
  });
  return (
    <AdminSection title={t("houses")}>
      {kept.length === 0 ? (
        <p className="text-body text-muted">{t("housesNone")}</p>
      ) : (
        <ul className="divide-y divide-ink/8 border-y border-ink/8">
          {kept.map(({ stay, at }) => (
            <li key={stay.id} className="flex min-h-(--adm-row-h) items-center gap-3 py-2">
              <Img src={housePhotos(stay, findUser(store, stay.hostId))[0]} alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg object-cover" />
              <Link href={`/admin/houses?house=${stay.id}`} className="min-w-0 flex-1 truncate text-body text-ink hover:underline">
                {stay.title}
              </Link>
              <span className="shrink-0 text-small text-muted">{day(at)}</span>
            </li>
          ))}
        </ul>
      )}
    </AdminSection>
  );
}

/** A House Memory's file (the demo's public one, or the upload kept in this browser). */
function MemoryThumb({ memory }: { memory: HouseMemory }) {
  const src = useMemorySrc(memory);
  if (!src) return <span className="block size-9 shrink-0 rounded-lg bg-(--adm-block)" />;
  if (memory.kind === "clip") return <video src={src} muted playsInline preload="metadata" className="size-9 shrink-0 rounded-lg object-cover" />;
  return <Img src={src} alt="" width={36} height={36} className="size-9 shrink-0 rounded-lg object-cover" />;
}

/**
 * House Memories: uploaded (in all albums, removed ones not counted) and approved for Simpulo's own posts – and the approved files. Only
 * what people explicitly approved is listed. TODO(backend): precomputed stats and the storage's files.
 */
function HouseMemories() {
  const t = useTranslations("admin.marketing.content");
  const store = useStore();
  const [now] = useState(() => Date.now());
  const stats = memoriesStats(store, now);
  const [all, setAll] = useState(false);
  const shown = all ? stats.approvedList : stats.approvedList.slice(0, 10);
  return (
    <AdminSection title={t("memories")}>
      <dl className="grid max-w-[480px] grid-cols-2 gap-4">
        <div>
          <dt className="text-eyebrow uppercase text-(--adm-label)">{t("uploaded")}</dt>
          <dd data-memories-uploaded className="mt-1 text-h1 tabular-nums text-ink">{num(stats.uploaded)}</dd>
        </div>
        <div>
          <dt className="text-eyebrow uppercase text-(--adm-label)">{t("approved")}</dt>
          <dd data-memories-approved className="mt-1 text-h1 tabular-nums text-ink">{num(stats.approved)}</dd>
        </div>
      </dl>
      {stats.approved === 0 ? (
        <p className="mt-3 text-body text-muted">{t("memoriesNone")}</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-ink/8 border-y border-ink/8">
            {shown.map((m) => {
              const stay = store.stays.find((x) => x.id === m.houseId);
              return (
                <li key={m.id} className="flex min-h-(--adm-row-h) items-center gap-3 py-2">
                  <MemoryThumb memory={m} />
                  <span className="min-w-0 flex-1 truncate text-body text-ink">{stay?.title ?? m.houseId}</span>
                  <span className="shrink-0 text-small text-muted">
                    {t(m.kind === "clip" ? "memoryClip" : "memoryPhoto")} · {findUser(store, m.userId)?.name.split(" ")[0] ?? ""} · {day(m.at)}
                  </span>
                </li>
              );
            })}
          </ul>
          {stats.approvedList.length > shown.length && (
            <Button size="sm" variant="tertiary" className="mt-2" onClick={() => setAll(true)}>
              {t("memoriesAll", { count: stats.approvedList.length })}
            </Button>
          )}
        </>
      )}
      <p className="mt-2 text-small text-muted">{t("memoriesHint")}</p>
    </AdminSection>
  );
}

function Content({ clips }: { clips: number }) {
  const t = useTranslations("admin.marketing.content");
  const actions = useAdminActions();
  return (
    <>
      <AdminSection title={t("shots")}>
        <ol className="flex flex-wrap gap-2">
          {SHOT_LIST.map((shot, i) => (
            <li key={shot} className="rounded-full bg-(--adm-pill) px-3 py-1.5 text-body text-ink">
              <span className="tabular-nums text-muted">{i + 1}</span> {shot}
            </li>
          ))}
        </ol>
      </AdminSection>
      <ContentHouses />
      <AdminSection title={t("series")}>
        <div className="grid gap-(--adm-section) md:grid-cols-3">
          <div>
            <p className="mb-2 text-eyebrow uppercase text-(--adm-label)">{t("cast")}</p>
            {SERIES_CAST.length === 0 ? <p className="text-body text-muted">{t("castPending", { from: SERIES_CAST_SIZE.from, to: SERIES_CAST_SIZE.to })}</p> : <ul className="space-y-1 text-body text-ink">{SERIES_CAST.map((c) => <li key={c}>{c}</li>)}</ul>}
          </div>
          <div>
            <p className="mb-2 text-eyebrow uppercase text-(--adm-label)">{t("structure")}</p>
            <ol className="space-y-1 text-body text-ink">
              {SERIES_STRUCTURE.map((s, i) => (
                <li key={s}>
                  <span className="tabular-nums text-muted">{i + 1}.</span> {s}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-2 text-eyebrow uppercase text-(--adm-label)">{t("clips")}</p>
            <div className="flex items-center gap-3">
              <button type="button" aria-label={t("less")} onClick={() => actions.setMarketingClips(clips - 1)} disabled={clips === 0} className="flex size-11 items-center justify-center rounded-full ring-1 ring-ink/12 text-ink disabled:opacity-40">
                <Minus aria-hidden className="size-4" />
              </button>
              <span data-clip-count className="w-10 text-center text-h1 tabular-nums text-ink">{num(clips)}</span>
              <button type="button" aria-label={t("more")} onClick={() => actions.setMarketingClips(clips + 1)} className="flex size-11 items-center justify-center rounded-full ring-1 ring-ink/12 text-ink">
                <Plus aria-hidden className="size-4" />
              </button>
              {clips >= SERIES_CLIP_TARGET.from && <StatusDot status="good" />}
            </div>
            <p className="mt-2 text-small text-muted">{t("clipsTarget", { from: SERIES_CLIP_TARGET.from, to: SERIES_CLIP_TARGET.to })}</p>
            <ProgressBar ratio={Math.min(1, clips / SERIES_CLIP_TARGET.from)} label={t("clipsTarget", { from: SERIES_CLIP_TARGET.from, to: SERIES_CLIP_TARGET.to })} className="mt-2" />
          </div>
        </div>
      </AdminSection>
      <HouseMemories />
    </>
  );
}

// ─── Schleifen ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

function Loops() {
  const t = useTranslations("admin.marketing.loops");
  const loops = marketingLoops(useAdminInputs());
  return (
    <ul className="divide-y divide-ink/8 border-y border-ink/8">
      {MARKETING_LOOPS.map((loop) => {
        const m = loops[loop.key];
        return (
          <li key={loop.key} data-marketing-loop={loop.key} className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-1 py-3">
            <span className="flex w-56 shrink-0 items-center gap-1 text-body font-semibold text-ink">
              {loop.label}
              <InfoTip text={t(`info.${loop.key}`)} />
            </span>
            <span className={cn("shrink-0 rounded-full bg-(--adm-pill) px-3 py-1 text-small", loop.status === "product" ? "text-ink" : "text-muted")}>{t(`status.${loop.status}`)}</span>
            <span className="min-w-0 flex-1 text-body text-muted">{m ? t(`metric.${loop.key}`, { value: share(m.value), of: num(m.of) }) : t("notYet")}</span>
          </li>
        );
      })}
    </ul>
  );
}

"use client";
import { AdminButton } from "./AdminButton";

// Admin › Launch › Marketing: the launch strategy as a cockpit – Countdown · Pipeline · Partner · Content. The strategy (phases, targets,
// tasks) from config/marketing.ts, contacts, partners, posts and tasks from the admin data (lib/admin/store.ts; Firestore later – admins
// only, firestore.rules), every number from lib/admin/metrics.ts (launchCountdown, marketingFunnel, marketingLoops …), every change through
// useAdminActions (logged). German, dark, the admin's tokens.
import { ChevronLeft, ChevronRight, Check, Copy, Minus, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { AdminSort, AdminTabs, BackToList, type AdminTab } from "@/components/admin/AdminLayout";
import { ProgressBar, StatusDot, ProgressRing } from "@/components/admin/AdminCharts";
import { ChangeLine, InfoTip, KeyNumbers } from "@/components/admin/AdminNumbers";
import { KindPicker, MatchingOffer, MotivationPicker, PartnerControls, PartnerDetail, type PartnerFilters } from "@/components/admin/AdminPartners";
import { Img } from "@/components/ui/Img";
import { CapsuleGroup } from "@/components/ui/CapsuleGroup";
import { Input, Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import {
  CONTACT_CHANNELS,
  CONTENT_WEEKLY_TARGET,
  FALLBACK_RULES,
  FUNNEL_ASSUMPTIONS,
  MARKETING_KINDS,
  MARKETING_LOOPS,
  MOTIVATIONS,
  MARKETING_NEXT_STEPS,
  MAX_FOLLOW_UPS,
  PROJECTION_HOUSES,
  SERIES_CAST,
  SERIES_CAST_SIZE,
  SERIES_CLIP_TARGET,
  SERIES_STRUCTURE,
  SHORT_CHANNELS,
  SHOT_LIST,
} from "@/config/marketing";
import { useAdminActions } from "@/lib/admin/actions";
import { againstAssumption, compareDate, getChange, growthRows, originGroupOf, periodRanges, launchCountdown, marketingFunnel, marketingFunnelBy, marketingLoops, mondayOf, partnerHouses, partnerStepDue, shortsInWeek, strategyDates, type Status, isRunningSpan } from "@/lib/admin/metrics";
import { download } from "@/lib/admin/exporters";
import { tableCsv } from "@/lib/admin/exporters/csv";
import { useAdminData } from "@/lib/admin/store";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import type { MarketingContact, MarketingMotivation, PartnerKind, MarketingContactStatus, MarketingContactWay, MarketingPartner } from "@/lib/data";
import { compact, day, monthYear, num, share } from "@/lib/i18n/adminFormat";
import { linkBase } from "@/lib/links";
import { cn, housePhotos } from "@/lib/utils";
import { isOpenTodo, roadmapTodos } from "@/lib/roadmap";
import { usePlanTodos } from "./AdminZeitplan";
import { routeTiles, withUnits } from "./tileRoutes";
import { setAdminSearch, useAdminTab } from "@/lib/admin/urlState";
import { TileBoard, chunkRows, type TileSpec } from "./AdminTiles";
import { findUser, useStore } from "@/lib/store";
import { memoriesStats } from "@/lib/memories";
import { useMemorySrc } from "@/lib/memoryMedia";
import type { HouseMemory } from "@/lib/types";

type Tab = "overview" | "countdown" | "pipeline" | "partners" | "content";
/** Überblick first and by default (CLAUDE.md "Überblick zuerst"); deep links (?tab=pipeline|partners|content) open their tab. */
const TABS: readonly Tab[] = ["overview", "countdown", "pipeline", "partners", "content"];
const STATUSES: readonly MarketingContactStatus[] = ["open", "replied", "demo", "house", "later"];
const WAYS: readonly MarketingContactWay[] = ["email", "dm", "form"];
const DAY_MS = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** A contact's own demo link – opening it moves the contact to "Demo gesehen" (lib/admin/store.ts markContactDemoSeen). */
const demoLinkOf = (id: string) => `${linkBase()}/?ref=${encodeURIComponent(id)}`;

export function AdminMarketing() {
  const t = useTranslations("admin.marketing");
  const tc = useTranslations("admin.marketing.contacts");
  // The capsule in ?tab= (pushed – back works; old ?tab=contacts → Pipeline). A tile's ?focus=due shows only the partners whose step is due.
  const url = useAdminTab<Tab>(TABS, "overview", { contacts: "pipeline" });
  const tab = url.tab;
  const setTab = (next: Tab) => url.open(next);
  const data = useAdminData();
  const contacts = data.marketingContacts;
  const partners = data.marketingPartners;
  const actions = useAdminActions();
  // Pipeline: the niche filter and the open contact (in a panel).
  const [niche, setNiche] = useState<string>("all");
  const [motivation, setMotivation] = useState<MarketingMotivation | "all">("all");
  const [kind, setKind] = useState<PartnerKind | "all">("all");
  const [contactId, setContactId] = useState<string | null>(null);
  // Partner: filters and the open one.
  const [partnerFilters, setPartnerFilters] = useState<PartnerFilters>({
    kind: "all",
    ladder: "all",
    due: "all",
  });
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const shownFilters: PartnerFilters = url.focus === "due" ? { ...partnerFilters, due: "due" } : partnerFilters;
  // Links from the Posteingang, Bewerbungen and between the tabs: ?tab=partners&partner=… · ?tab=contacts&contact=… (now the Pipeline) – read once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get("tab");
    // The capsule itself comes from the URL (useAdminTab); here only the partner or contact a link names.
    if (wanted !== "partners" && wanted !== "contacts" && wanted !== "pipeline") return;
    requestAnimationFrame(() => {
      if (wanted === "partners") setPartnerId(params.get("partner"));
      else setContactId(params.get("contact"));
    });
  }, []);
  const toPartner = (contact: MarketingContact) => {
    const existing = partners.find((p) => p.contactId === contact.id);
    const partner = existing ?? actions.partnerFromContact(contact);
    setContactId(null);
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
      agreement: {
        sharePercent: 0,
        from: null,
        to: null,
        payoutAfterPaidStay: true,
        contentRights: "",
        collabPosts: false,
        contractUrl: "",
        status: "draft",
      },
      houseIds: [],
      content: { planned: 0, delivered: 0, approved: 0 },
      notes: [],
      nextStep: null,
    });
    setPartnerFilters({ kind: "all", ladder: "all", due: "all" });
    setPartnerId(added.id);
  };
  const niches = useMemo(() => [...new Set(contacts.map((c) => c.niche))].toSorted(), [contacts]);
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
    setContactId(added.id);
  };
  const exportCsv = () => {
    const head = tc.raw("csvHead") as string[];
    const rows = contacts.map((c) => [c.name, c.channel, c.niche, c.followers, tc(`ways.${c.contactWay}`), c.firstMessageAt ?? "", c.followUps, tc(`statuses.${c.status}`), c.launchConsent ? "ja" : "nein", c.launchConsentAt ?? "", c.launchMail ? "ja" : "nein", c.note, demoLinkOf(c.id)]);
    download(`marketing-kontakte-${new Date().toISOString().slice(0, 10)}.csv`, tableCsv(head, rows));
    actions.logMarketingExport(contacts.length);
  };

  const tOverview = useTranslations("admin.overviewBlock");
  const tabs: AdminTab<Tab>[] = withUnits("marketing", TABS.map((value) => ({
    value,
    label: value === "overview" ? tOverview("tab") : t(`tabs.${value}`),
    tooltip: value === "overview" ? undefined : t(`tabInfo.${value}`),
    count: value === "pipeline" ? contacts.length : value === "partners" ? partners.length : undefined,
  })));
  const { start: marketingStart, launch: launchDate } = strategyDates();
  const controls =
    tab === "countdown" ? (
      <Link href="/admin/zeitplan" data-strategy-dates className="text-small text-muted underline-offset-4 hover:text-ink hover:underline">
        {t("countdown.dates", {
          start: day(marketingStart),
          launch: day(launchDate),
        })}{" "}
        · {t("countdown.datesLink")}
      </Link>
    ) : tab === "pipeline" ? (
      <div className="flex flex-wrap items-center gap-2">
        <AdminSort label={tc("niche")} options={[{ value: "all", label: tc("all") }, ...niches.map((n) => ({ value: n, label: n }))]} value={niche} onChange={setNiche} />
        <AdminSort
          label={t("motivation.label")}
          options={[
            { value: "all" as const, label: tc("all") },
            ...MOTIVATIONS.map((m) => ({
              value: m,
              label: t(`motivation.${m}`),
            })),
          ]}
          value={motivation}
          onChange={setMotivation}
        />
        <AdminSort
          label={t("pipeline.kind")}
          options={[
            { value: "all" as const, label: tc("all") },
            ...MARKETING_KINDS.map((k) => ({
              value: k,
              label: t(`partners.kinds.${k}`),
            })),
          ]}
          value={kind}
          onChange={setKind}
        />
        <AdminButton variant="secondary" onClick={exportCsv}>
          {tc("export")}
        </AdminButton>
        <AdminButton onClick={addContact}>
          <Plus aria-hidden className="size-4" />
          {tc("add")}
        </AdminButton>
      </div>
    ) : tab === "partners" && !partnerId ? (
      <PartnerControls filters={shownFilters} onFilters={(next) => (setPartnerFilters(next), url.focus === "due" && setAdminSearch({ focus: null }, { replace: true }))} partners={partners} onAdd={addPartner} />
    ) : undefined;

  const openContact = contacts.find((c) => c.id === contactId) ?? null;
  const openPartner = partners.find((p) => p.id === partnerId) ?? null;
  return (
    <AdminShell
      title={t("title")}
      tabs={
        <AdminTabs
          label={t("title")}
          tabs={tabs}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPartnerId(null);
          }}
        />
      }
      aside={controls}
    >
      {tab === "overview" && (
        <MarketingOverview
          onOpen={(next) => {
            setTab(next);
            setPartnerId(null);
          }}
        />
      )}
      {tab === "countdown" && <Countdown />}
      {tab === "pipeline" && <Pipeline contacts={contacts} filter={{ niche, motivation, kind }} onOpen={setContactId} />}
      {tab === "partners" && (openPartner ? <PartnerDetail key={openPartner.id} partner={openPartner} onBack={() => setPartnerId(null)} onDeleted={() => setPartnerId(null)} /> : <PartnerCards partners={partners} filters={shownFilters} onOpen={setPartnerId} />)}
      {tab === "content" && <Content clips={data.marketingClips} />}
      <Sheet variant="panel" open={tab === "pipeline" && openContact !== null} onClose={() => setContactId(null)} title={openContact?.name ?? tc("list")}>
        {openContact && (
          <div className="px-6 pb-6">
            <ContactDetail key={openContact.id} contact={openContact} inPanel onBack={() => setContactId(null)} onDeleted={() => setContactId(null)} isPartner={partners.some((p) => p.contactId === openContact.id)} onToPartner={() => toPartner(openContact)} />
          </div>
        )}
      </Sheet>
    </AdminShell>
  );
}

// ─── Überblick ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Marketing › Überblick (CLAUDE.md "Überblick zuerst"): only tiles in the Planen colour, three rows of five – the countdown (launch, phase,
 * the four rings as numbers against their goals with today's due), the pipeline (contacts, rates, Houses, contacts for 50 Houses), the
 * partners (all, active, steps due) and the content (shorts this week, the next planned one). Every tile opens its tab.
 */
/** A day `n` days after `d` (YYYY-MM-DD). */
const addDaysIso = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function MarketingOverview({ onOpen }: { onOpen: (tab: Exclude<Tab, "overview">, opts?: { dueOnly?: boolean }) => void }) {
  const t = useTranslations("admin.pageTiles.marketing");
  const tm = useTranslations("admin.marketing");
  const inputs = useAdminInputs();
  const data = useAdminData();
  const c = launchCountdown(inputs);
  const phase = c.phases.find((p) => p.key === c.phase) ?? c.phases[0];
  const funnel = marketingFunnel(data.marketingContacts, compareDate(inputs.today, "month"));
  const partners = data.marketingPartners;
  const contacts = data.marketingContacts;
  const posts = data.contentPosts ?? [];
  const shorts = shortsInWeek(posts, mondayOf(inputs.today));
  const nextShort = posts.filter((p) => p.status === "planned" && p.date >= inputs.today).toSorted((a, b) => a.date.localeCompare(b.date))[0];
  const of = (value: number, total: number) => (
    <>
      {num(value)} <span className="text-body text-muted">/ {num(total)}</span>
    </>
  );
  const phaseLabel = (key: string) => c.phases.find((p) => p.key === key)?.label ?? key;
  const nextPhase = c.phases.find((p) => p.no === phase.no + 1);
  const all = funnel.all;
  // The best niche by a rate (at least 5 written to) – a hint line.
  const bestBy = (rate: "replyRate" | "demoRate" | "houseRate") => funnel.perNiche.filter((r) => r.contacted >= 5 && r[rate] !== null).toSorted((a, b) => (b[rate] ?? 0) - (a[rate] ?? 0))[0];
  const bestLine = (rate: "replyRate" | "demoRate" | "houseRate") => {
    const b = bestBy(rate);
    return b ? t("d.bestNiche", { niche: b.key, rate: share(b[rate]) }) : t("d.bestNicheNone");
  };
  // The kinds, short words, two per line (a tile is narrow).
  const kindParts = (["creator", "streamer", "community", "connector", "brand"] as const)
    .map((k) => ({ k, n: partners.filter((p) => p.kind === k).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${t(`d.kind.${x.k}`)} ${num(x.n)}`);
  const kindLines = Array.from({ length: Math.ceil(kindParts.length / 2) }, (_, i) => (kindParts[2 * i + 1] ? t("d.kindPair", { a: kindParts[2 * i], b: kindParts[2 * i + 1] }) : kindParts[2 * i]));
  const active = partners.filter((p) => p.agreement.status === "active");
  const avgShare = active.length ? Math.round(active.reduce((n, p) => n + p.agreement.sharePercent, 0) / active.length) : null;
  const nextStep = partners
    .filter((p) => p.nextStep)
    .toSorted((a, b) => (a.nextStep!.due ?? "9999").localeCompare(b.nextStep!.due ?? "9999"))[0];
  const weekFrom = mondayOf(inputs.today);
  const plannedWeek = posts.filter((p) => p.status === "planned" && p.date >= weekFrom && p.date <= addDaysIso(weekFrom, 6)).length;
  // Content's reach: visitors through the posts' channels in the running month (the growth events, Wachstum's own count).
  const { events } = useStore();
  const postRows = growthRows(events, (e) => e.utmSource ?? "", "month", inputs.today, periodRanges(inputs.today, "month")).filter((r) => originGroupOf(r.key) === "posts");
  const postVisits = postRows.reduce((n, r) => n + r.visits, 0);
  const bestPostChannel = postRows.toSorted((a, b) => b.visits - a.visits)[0] ?? null;
  // The most due open step: partners' next steps and the plan's open marketing to-dos.
  const plan = usePlanTodos();
  const steps = [
    ...partners.filter((p) => p.nextStep?.due).map((p) => ({ title: p.nextStep!.text, who: p.name, due: p.nextStep!.due!, partner: true })),
    ...plan.filter((x) => x.source === "marketing" && x.status !== "done" && x.status !== "later" && x.due).map((x) => ({ title: x.title, who: t("d.stepPlan"), due: x.due!, partner: false })),
  ].toSorted((a, b) => a.due.localeCompare(b.due));
  const next = steps[0] ?? null;
  const ring = (metric: (typeof c.rings)[number]["metric"]): TileSpec => {
    const r = c.rings.find((x) => x.metric === metric)!;
    return {
      key: metric,
      label: t(`${metric}.label`),
      info: t(`${metric}.info`),
      value: num(r.value),
      change: r.change ?? undefined,
      target: r.status ? { text: t("due", { value: num(r.due) }), status: r.status } : undefined,
      details: [
        t("d.ringGoal", { value: num(r.goal) }),
        t("d.ringNext", { label: phaseLabel(r.next.key), value: num(r.next.target) }),
        t("d.ringDue", { value: num(r.due) }),
        r.goal > r.value ? t("d.ringMissing", { value: num(r.goal - r.value) }) : null,
        r.goal > 0 ? t("d.ringShare", { value: share(r.value / r.goal) }) : null,
      ].filter((l): l is string => l !== null),
      onOpen: () => onOpen("countdown"),
    };
  };
  const tiles: TileSpec[] = [
    // Launch and phase in one tile (CLAUDE.md "Planen"): the days to the launch, the marketing start, the phase, the plan's size.
    {
      key: "launch",
      label: t("launch.label"),
      info: t("launch.info"),
      value: c.state === "launched" ? t("launched") : t("d.days", { days: c.daysLeft }),
      small: true,
      details: [
        c.state === "before" ? t("d.startInDays", { days: num(c.daysToStart) }) : t("d.marketingStart", { date: day(c.start) }),
        c.state === "before" ? t("d.phaseNow", { label: t("d.phaseBefore") }) : t("d.phaseNow", { label: t("phaseWeek", { week: String(c.weekNo), label: phase.label }) }),
        t("d.weeks", { phases: num(c.phases.length), weeks: num(c.weeks) }),
        c.state === "launched" ? t("d.launchDate", { date: day(c.launchDate) }) : t("d.untilLaunch", { date: day(c.launchDate) }),
        c.state === "running" && nextPhase ? t("d.nextPhase", { label: nextPhase.label }) : null,
      ].filter((l): l is string => l !== null),
      onOpen: () => onOpen("countdown"),
    },
    ring("housesOpened"),
    ring("hubs"),
    ring("waitlist"),
    ring("filled"),
    {
      key: "contacted",
      label: t("contacted.label"),
      info: t("contacted.info"),
      value: num(all.contacted),
      change: getChange("mktContacted", all.contacted, funnel.contactedBefore),
      details: [
        t("d.contactedBefore", { value: num(funnel.contactedBefore) }),
        funnel.best ? t("d.niches", { count: funnel.perNiche.length, best: funnel.best }) : t("d.nichesNone", { count: funnel.perNiche.length }),
        t("d.flow", { replied: num(all.replied), demo: num(all.demo) }),
        t("d.housesFrom", { value: num(all.house) }),
        t("d.followUps", { value: num(contacts.filter((x) => x.followUps > 0).length) }),
        t("d.notYet", { value: num(contacts.filter((x) => !x.firstMessageAt).length) }),
      ],
      onOpen: () => onOpen("pipeline"),
    },
    { key: "replyRate", label: t("replyRate.label"), info: t("replyRate.info"), value: share(all.replyRate), target: { text: "10–15 %", status: againstAssumption(all.replyRate, FUNNEL_ASSUMPTIONS.replied) }, details: [t("d.replied", { part: num(all.replied), all: num(all.contacted) }), bestLine("replyRate"), t("d.assumption", { range: "10–15 %" }), t("d.silent", { value: num(Math.max(0, all.contacted - all.replied)) }), t("d.followUps", { value: num(contacts.filter((x) => x.followUps > 0).length) })], onOpen: () => onOpen("pipeline") },
    { key: "demoRate", label: t("demoRate.label"), info: t("demoRate.info"), value: share(all.demoRate), target: { text: "5–8 %", status: againstAssumption(all.demoRate, FUNNEL_ASSUMPTIONS.demo) }, details: [t("d.demo", { part: num(all.demo), all: num(all.contacted) }), bestLine("demoRate"), t("d.assumption", { range: "5–8 %" }), all.demo > 0 ? t("d.demoToHouse", { rate: share(all.house / all.demo) }) : null].filter((l): l is string => l !== null), onOpen: () => onOpen("pipeline") },
    {
      key: "houses",
      label: t("houses.label"),
      info: t("houses.info"),
      value: num(all.house),
      target: { text: "2–4 %", status: againstAssumption(all.houseRate, FUNNEL_ASSUMPTIONS.house) },
      details: [t("houseRate", { rate: share(all.houseRate) }), t("d.house", { part: num(all.house), all: num(all.contacted) }), bestLine("houseRate"), t("d.assumption", { range: "2–4 %" }), t("d.housesNow", { value: num(c.rings.find((x) => x.metric === "housesOpened")?.value ?? 0) })],
      onOpen: () => onOpen("pipeline"),
    },
    {
      key: "forFifty",
      label: t("forFifty.label"),
      info: t("forFifty.info"),
      value: funnel.projection.current === null ? t("forFiftyNone") : num(funnel.projection.current),
      small: funnel.projection.current === null,
      details: [
        ...(funnel.projection.current === null ? [] : [t("d.atRate", { rate: share(all.houseRate) })]),
        funnel.projection.assumed.from !== null && funnel.projection.assumed.to !== null ? t("d.assumed", { from: num(funnel.projection.assumed.from), to: num(funnel.projection.assumed.to) }) : t("d.assumption", { range: "2–4 %" }),
        t("d.contactedSoFar", { value: num(all.contacted) }),
        ...(funnel.projection.current === null ? [] : [t("d.stillToWrite", { value: num(Math.max(0, funnel.projection.current - all.contacted)) })]),
      ],
      onOpen: () => onOpen("pipeline"),
    },
    // All partners and the active ones in one tile: the active as the value against all.
    {
      key: "partners",
      label: t("partners.label"),
      info: t("partners.info"),
      value: of(active.length, partners.length),
      details: [
        partners.length ? t("d.activeOfAll", { active: num(active.length), all: num(partners.length) }) : t("d.noPartners"),
        t("d.agreements", { draft: num(partners.filter((p) => p.agreement.status === "draft").length), ended: num(partners.filter((p) => p.agreement.status === "ended").length) }),
        avgShare === null ? t("d.avgShareNone") : t("d.avgShare", { value: num(avgShare) }),
        t("d.reach", { value: compact(partners.reduce((n, p) => n + p.reach, 0)) }),
        ...kindLines,
      ],
      onOpen: () => onOpen("partners"),
    },
    {
      key: "partnerSteps",
      label: t("partnerSteps.label"),
      info: t("partnerSteps.info"),
      value: num(partners.filter((p) => partnerStepDue(p, inputs.today)).length),
      details: [
        ...(nextStep ? [t("d.nextStep", { name: nextStep.name }), ...(nextStep.nextStep!.due ? [t("d.nextStepText", { date: day(nextStep.nextStep!.due) })] : [])] : [t("d.noStep")]),
        t("d.stepsPlanned", { value: num(partners.filter((p) => p.nextStep).length) }),
        t("d.stepsLate", { value: num(partners.filter((p) => p.nextStep?.due && p.nextStep.due < inputs.today).length) }),
      ],
      onOpen: () => onOpen("partners", { dueOnly: true }),
    },
    {
      key: "shorts",
      label: t("shorts.label"),
      info: t("shorts.info"),
      value: of(shorts, CONTENT_WEEKLY_TARGET),
      details: [
        nextShort ? `${t("nextShort.label")}: ${day(nextShort.date)}` : `${t("nextShort.label")}: ${t("nextShortNone")}`,
        t("d.plannedWeek", { value: num(plannedWeek) }),
        t("d.publishedAll", { value: num(posts.filter((p) => p.status === "published").length) }),
        t("d.plannedAll", { value: num(posts.filter((p) => p.status === "planned" && p.date >= inputs.today).length) }),
        t("d.weeklyGoal", { value: num(CONTENT_WEEKLY_TARGET) }),
      ],
      onOpen: () => onOpen("content"),
    },
    // Content: all shorts so far, their reach (visitors through the posts' channels in the running month – Wachstum › Herkunft "Deine
    // Posts") and the best channel. The calendar keeps no views per short – the best single one is not measurable yet.
    {
      key: "content",
      label: t("content.label"),
      info: t("content.info"),
      value: num(posts.filter((p) => p.status === "published").length),
      details: [
        t("d.contentReach", { value: num(postVisits) }),
        bestPostChannel ? t("d.contentBest", { channel: bestPostChannel.key }) : t("d.contentBestNone"),
        t("d.plannedAll", { value: num(posts.filter((p) => p.status === "planned" && p.date >= inputs.today).length) }),
        t("d.contentPerShort"),
      ],
      onOpen: () => onOpen("content"),
    },
    // Nächster Schritt: the most due open one – a partner's next step or a marketing to-do of the plan (Zeitplan).
    {
      key: "nextStep",
      label: t("nextStepTile.label"),
      info: t("nextStepTile.info"),
      // The step itself as a word value (two lines, never cut), who and when as the first line.
      value: next ? next.title : t("nextStepTile.none"),
      details: next ? [t("d.stepWho", { who: next.who, date: day(next.due) }), next.due < inputs.today ? t("d.overdue") : t("d.dueIn", { days: num(Math.round((Date.parse(next.due) - Date.parse(inputs.today)) / 86_400_000)) }), t("d.openSteps", { value: num(steps.length) })] : [t("d.noStep")],
      onOpen: () => (next?.partner ? onOpen("partners", { dueOnly: true }) : onOpen("countdown")),
    },
  ];
  return <TileBoard label={tm("title")} rows={chunkRows(routeTiles("marketing", tiles), "plan", 5)} />;
}

// ─── Countdown ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────


function Countdown() {
  const t = useTranslations("admin.marketing.countdown");
  const inputs = useAdminInputs();
  const { houseInvites } = useStore();
  const c = launchCountdown(inputs);
  const phase = c.phases.find((p) => p.key === c.phase) ?? c.phases[0];
  const loops = marketingLoops({ ...inputs, houseInvites });
  const tl = useTranslations("admin.marketing.loops");
  const statusWord = (s: Status | null) => (s ? t(`status.${s}`) : null);
  // Before the marketing start: only the countdown to it and the preparation points.
  if (c.state === "before") return <BeforeStart daysToStart={c.daysToStart} daysLeft={c.daysLeft} start={c.start} />;
  return (
    <div data-countdown className="flex flex-col gap-[calc(var(--adm-inner)*1.25)]">
      <p data-countdown-head className="text-adm-motto text-ink">
        {c.state === "launched" ? t("launched") : t("launchIn", { days: c.daysLeft })}
        <span className="text-muted">
          {" · "}
          {t("phase", { no: phase.no, label: phase.label })}
          {c.state === "running" && ` · ${t("week", { n: c.weekNo, of: c.weeks })}`}
        </span>
      </p>

      <dl className="grid grid-cols-2 gap-(--adm-inner) lg:grid-cols-4">
        {c.rings.map((r) => (
          <div key={r.metric} data-ring={r.metric} className="flex min-w-0 items-center gap-4">
            <ProgressRing ratio={r.goal ? r.value / r.goal : 0} due={r.goal ? r.due / r.goal : 0} />
            <div className="min-w-0">
              <dt className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
                {t(`rings.${r.metric}`)}
                <InfoTip text={t(`ringInfo.${r.metric}`)} />
              </dt>
              <dd className="mt-0.5 text-h1 tabular-nums text-ink">
                {num(r.value)}
                <span className="text-body text-muted"> / {num(r.goal)}</span>
              </dd>
              <dd className="mt-0.5 flex items-center gap-1.5 text-small text-muted">
                {r.status ? (
                  <>
                    <StatusDot status={r.status} />
                    {statusWord(r.status)} · {t("due", { value: num(r.due) })}
                  </>
                ) : (
                  t("next", {
                    phase: c.phases.find((p) => p.key === r.next.key)?.label ?? "",
                    value: num(r.next.target),
                  })
                )}
              </dd>
              <dd className="mt-0.5">
                <ChangeLine change={r.change} className="block" />
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <PhaseTimeline today={inputs.today} launchDate={c.launchDate} current={c.phase} phases={c.phases} />
      <p data-fallback className="-mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-small text-muted">
        <span className="flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
          {t("fallback")}
          <InfoTip text={t("fallbackInfo")} />
        </span>
        {FALLBACK_RULES.map((r) => (
          <span key={r.id} data-fallback-rule={r.id} data-applies={c.fallback === r.id || undefined} className={cn("flex items-center gap-1.5", c.fallback === r.id && "font-semibold text-ink")}>
            {c.fallback === r.id && <StatusDot status="warning" />}
            {r.text}
            {c.fallback === r.id && <span className="sr-only">{t("fallbackApplies")}</span>}
          </span>
        ))}
      </p>

      <div className="grid gap-x-(--adm-section) gap-y-[calc(var(--adm-inner)*1.5)] lg:grid-cols-2">
        <ThisWeek begins={c.begins} ends={c.ends} phaseKey={c.phase} />
        <section aria-labelledby="week-numbers">
          <h2 id="week-numbers" className="mb-(--adm-inner) flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
            {t("weekNumbers")}
            <InfoTip text={t("weekInfo")} />
          </h2>
          <ul className="flex flex-col gap-3">
            {c.bars.map((b) => (
              <li key={b.metric} data-week-bar={b.metric}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body text-ink">{t(`bars.${b.metric}`)}</span>
                  <span className="flex items-center gap-1.5 text-small tabular-nums text-muted">
                    {b.status && (
                      <>
                        <StatusDot status={b.status} />
                        <span>{statusWord(b.status)} ·</span>
                      </>
                    )}
                    {b.target > 0
                      ? t("ofTarget", {
                          actual: num(b.actual),
                          target: num(b.target),
                        })
                      : `${num(b.actual)} · ${t("noTarget")}`}
                  </span>
                </div>
                <div className="relative mt-1.5 h-2 rounded-full bg-adm-chart-track">
                  <div
                    className="h-2 rounded-full bg-adm-chart-primary"
                    style={{
                      width: `${b.target > 0 ? Math.min(100, (b.actual / b.target) * 100) : b.actual > 0 ? 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="loops" className="border-t border-ink/8 pt-3">
        <h2 id="loops" className="sr-only">
          {t("loops")}
        </h2>
        <ul className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <li className="text-eyebrow uppercase text-(--adm-label)" aria-hidden>
            {t("loops")}
          </li>
          {MARKETING_LOOPS.map((loop) => {
            const m = loops[loop.key];
            return (
              <li key={loop.key} data-marketing-loop={loop.key} data-loop-status={m.status} className="flex items-baseline gap-2">
                <span className="text-body font-semibold tabular-nums text-ink">{m.main ? share(m.main.value) : "–"}</span>
                <span className="text-small text-muted">{loop.label}</span>
                <InfoTip text={`${tl(`info.${loop.key}`)} ${m.main ? tl(`metric.${loop.key}`, { value: share(m.main.value), of: num(m.main.of) }) : m.status === "prepared" ? tl("off") : tl("notYet")}`} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/**
 * Before the marketing start: "Start in X Tagen" and the to-dos still open that are due "vor öffentlicher Landingpage" (config/roadmap.ts,
 * the same list as System › Zeitplan & Vorbereitung) – ticking one off sets it done there (logged).
 */
function BeforeStart({ daysToStart, daysLeft, start }: { daysToStart: number; daysLeft: number; start: string }) {
  const t = useTranslations("admin.marketing.countdown");
  const tr = useTranslations("admin.platform.roadmap");
  const data = useAdminData();
  const actions = useAdminActions();
  const due = roadmapTodos(data).filter((x) => x.due === "beforeLanding");
  const open = due.filter(isOpenTodo);
  return (
    <div data-countdown data-before-start className="flex flex-col gap-(--adm-section)">
      <p data-countdown-head className="text-adm-motto text-ink">
        {t("startIn", { days: daysToStart })}
        <span className="text-muted">
          {" · "}
          {t("launchIn", { days: daysLeft })} · {t("startOn", { date: day(start) })}
        </span>
      </p>
      <section aria-labelledby="prep" className="max-w-[720px]">
        <h2 id="prep" className="mb-(--adm-inner) flex items-baseline justify-between gap-3 text-eyebrow uppercase text-(--adm-label)">
          {t("prep")}
          <span className="normal-case tracking-normal text-muted">
            {t("tasksDone", {
              done: due.length - open.length,
              total: due.length,
            })}
          </span>
        </h2>
        {open.length === 0 ? (
          <p className="text-body text-muted">{t("prepNone")}</p>
        ) : (
          <ul className="divide-y divide-ink/8 border-y border-ink/8">
            {open.map((x) => (
              <li key={x.id} data-prep={x.id} className="flex min-h-(--adm-row-h) items-center gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
                  <input type="checkbox" checked={false} onChange={() => actions.setRoadmapTodoStatus(x.id, x.title, "done", tr("status.done"))} className="size-4 shrink-0 accent-(--text)" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-ink">{x.title}</span>
                    <span className="block text-small text-muted">{x.text}</span>
                  </span>
                  {x.status === "inProgress" && <span className="shrink-0 text-small text-muted">{tr("status.inProgress")}</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/zeitplan?tab=todos&due=beforeLanding" className="mt-3 inline-block text-small font-semibold text-ink underline-offset-4 hover:underline">
          {t("prepAll")}
        </Link>
      </section>
    </div>
  );
}

/** The phases as one bar from the first phase to the launch, each as wide as its days; today as a line. */
function PhaseTimeline({ today, launchDate, current, phases }: { today: string; launchDate: string; current: string; phases: ReturnType<typeof launchCountdown>["phases"] }) {
  const t = useTranslations("admin.marketing.countdown");
  const start = Date.parse(`${phases[0].from}T00:00:00Z`);
  const end = Date.parse(`${launchDate}T00:00:00Z`);
  const span = Math.max(1, end - start);
  const at = (d: string) => Math.min(100, Math.max(0, ((Date.parse(`${d}T00:00:00Z`) - start) / span) * 100));
  const now = at(today);
  return (
    <section aria-label={t("timeline")} data-phase-timeline className="flex gap-1 pb-5">
      <div className="relative min-w-0 flex-1">
        <ol className="flex h-14 gap-1">
          {phases.map((p) => {
            const width = at(addDays(p.to, 1)) - at(p.from);
            // The running phase in the "current" style (Regel „Admin-Diagramme“).
            const here = p.key === current && isRunningSpan(p.from, p.to, today);
            return (
              <li key={p.key} data-phase={p.key} style={{ width: `${width}%` }} className={cn("flex min-w-0 flex-col justify-center rounded-lg px-3", here ? "border border-dashed border-adm-chart-hover bg-adm-chart-current" : "bg-(--adm-block)")}>
                <span className={cn("truncate text-small font-semibold", here ? "text-ink" : "text-ink/75")}>
                  {p.no} · {p.label}
                </span>
                <span className="truncate text-small text-muted">
                  {t("weeksRange", { from: p.weeks.from, to: p.weeks.to })} · {day(p.from)} – {day(p.to)}
                </span>
              </li>
            );
          })}
        </ol>
        {today >= phases[0].from && today <= launchDate && (
          <div data-today style={{ left: `${now}%` }} className="pointer-events-none absolute top-[calc(100%-4px)] flex w-0 flex-col items-center">
            <span className="h-2.5 w-0.5 shrink-0 rounded-full bg-adm-chart-1" />
            <span className="mt-0.5 whitespace-nowrap text-small font-semibold text-adm-chart-1">{t("today")}</span>
          </div>
        )}
      </div>
      <div className="flex h-14 shrink-0 flex-col justify-center rounded-lg bg-(--adm-block) px-3">
        <span className="text-small font-semibold text-ink">{t("launch")}</span>
        <span className="text-small text-muted">{day(launchDate)}</span>
      </div>
    </section>
  );
}

/** "Diese Woche": the week's numbers as tasks, the phase's tasks (weekly ones per week), and tasks added by hand – ticked off, stored, logged. */
function ThisWeek({ begins, ends, phaseKey }: { begins: string; ends: string; phaseKey: string }) {
  const monday = begins;
  const t = useTranslations("admin.marketing.countdown");
  const actions = useAdminActions();
  const [draft, setDraft] = useState("");
  // The same to-do model as Admin › Zeitplan (lib/roadmap.ts planTodos): this week's marketing tasks (the numbers, the weekly steps), the
  // phase's one-off steps (due at its end) and own tasks of this week – ticked off through the one status store, logged.
  const tStatus = useTranslations("admin.platform.roadmap.status");
  const plan = usePlanTodos();
  type Row = {
    key: string;
    text: string;
    note?: string;
    done: boolean;
    toggle: (on: boolean) => void;
    remove?: () => void;
  };
  const rows: Row[] = plan
    .filter((x) => (x.source === "marketing" && ((x.due !== null && x.due >= begins && x.due <= ends && !x.id.startsWith("step:")) || (x.id.startsWith("step:") && x.milestone === phaseKey))) || (x.source === "own" && x.due !== null && x.due >= begins && x.due <= ends))
    .map((x) => {
      const step = x.id.startsWith("step:") ? MARKETING_NEXT_STEPS.find((s) => `step:${s.id}` === x.id) : MARKETING_NEXT_STEPS.find((s) => x.id === `${monday}:${s.id}`);
      return {
        key: x.id,
        text: x.title,
        note: step ? (step.weekly ? t("weekly") : t("phaseTask", { due: step.due })) : undefined,
        done: x.status === "done",
        toggle: (on: boolean) => actions.setRoadmapTodoStatus(x.id, x.title, on ? "done" : "open", tStatus(on ? "done" : "open")),
        remove: x.removable ? () => actions.deleteLaunchTask(x.id, x.title) : undefined,
      };
    });
  const done = rows.filter((r) => r.done).length;
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    actions.addLaunchTask(monday, text);
    setDraft("");
  };
  return (
    <section aria-labelledby="this-week" data-this-week>
      <div className="mb-(--adm-inner) flex items-baseline justify-between gap-3">
        <h2 id="this-week" className="text-eyebrow uppercase text-(--adm-label)">
          {t("thisWeek")} <span className="normal-case tracking-normal text-muted">· {t("weekRange", { from: day(begins), to: day(ends) })}</span>
        </h2>
        {rows.length > 0 && <span className="text-small tabular-nums text-muted">{t("tasksDone", { done, total: rows.length })}</span>}
      </div>
      {rows.length === 0 && <p className="text-body text-muted">{t("noTasks")}</p>}
      <ul className="divide-y divide-ink/8">
        {rows.map((r) => (
          <li key={r.key} data-week-task={r.key} className="flex min-h-9 items-center gap-3">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1">
              <input type="checkbox" checked={r.done} onChange={(e) => r.toggle(e.target.checked)} className="size-4 shrink-0 accent-(--text)" />
              <span className={cn("min-w-0 flex-1 truncate text-body", r.done ? "text-muted line-through" : "text-ink")}>{r.text}</span>
              {r.note && <span className="shrink-0 text-small text-muted">{r.note}</span>}
            </label>
            {r.remove && (
              <button type="button" aria-label={t("removeTask")} onClick={r.remove} className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink">
                <X aria-hidden className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-1.5 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("addPlaceholder")} aria-label={t("addTask")} className="h-9 min-w-0 flex-1 rounded-full bg-(--adm-cap-bg) px-4 text-body text-ink placeholder:text-muted" />
        <AdminButton variant="secondary" type="submit" disabled={!draft.trim()}>
          <Plus aria-hidden className="size-4" />
          {t("addTask")}
        </AdminButton>
      </form>
    </section>
  );
}

// ─── Pipeline ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Pipeline: the contacts as columns (Angeschrieben · Geantwortet · Demo gesehen · House eröffnet · Später); a card dragged to another column
 * changes its status (logged). On top the rates against the assumptions and the contacts 50 Houses need. A click opens the contact.
 */
function Pipeline({
  contacts,
  filter,
  onOpen,
}: {
  contacts: readonly MarketingContact[];
  filter: {
    niche: string;
    motivation: MarketingMotivation | "all";
    kind: PartnerKind | "all";
  };
  onOpen: (id: string) => void;
}) {
  const t = useTranslations("admin.marketing.pipeline");
  const tc = useTranslations("admin.marketing.contacts");
  const inputs = useAdminInputs();
  const actions = useAdminActions();
  const [over, setOver] = useState<MarketingContactStatus | null>(null);
  const tm = useTranslations("admin.marketing");
  const shown = contacts.filter((c) => (filter.niche === "all" || c.niche === filter.niche) && (filter.motivation === "all" || c.motivation === filter.motivation) && (filter.kind === "all" || c.kind === filter.kind));
  // Per motivation (on the niche and kind filter, not the motivation filter): which group opens Houses most often.
  const byMotivation = marketingFunnelBy(
    contacts.filter((c) => (filter.niche === "all" || c.niche === filter.niche) && (filter.kind === "all" || c.kind === filter.kind)),
    (c) => c.motivation,
    MOTIVATIONS,
  );
  const f = marketingFunnel(shown, compareDate(inputs.today, "month"));
  const range = (r: { from: number; to: number }) => t("assumption", { from: share(r.from), to: share(r.to) });
  const rate = (key: "replied" | "demo" | "house") => {
    const value = key === "replied" ? f.all.replyRate : key === "demo" ? f.all.demoRate : f.all.houseRate;
    const r = FUNNEL_ASSUMPTIONS[key];
    const metric = key === "replied" ? "mktReplyRate" : key === "demo" ? "mktDemoRate" : "mktHouseRate";
    return {
      key,
      label: t(`rates.${key}`),
      info: t(`rateInfo.${key}`),
      value: share(value),
      change: getChange(metric, value === null ? null : value * 100, null),
      target: { text: range(r), status: againstAssumption(value, r) },
    };
  };
  const needed = f.projection.current;
  const move = (id: string, to: MarketingContactStatus) => {
    const contact = contacts.find((c) => c.id === id);
    if (!contact || contact.status === to) return;
    actions.updateMarketingContact(contact, { status: to }, tc("what.status"));
  };
  return (
    <div className="flex flex-col gap-(--adm-section)">
      <KeyNumbers
        className="lg:grid-cols-5"
        items={[
          {
            key: "contacted",
            label: t("contacted"),
            info: t("contactedInfo"),
            value: num(f.all.contacted),
            change: getChange("mktContacted", f.all.contacted, f.contactedBefore),
            against: t("against"),
          },
          rate("replied"),
          rate("demo"),
          rate("house"),
          {
            key: "needed",
            label: t("needed", { houses: PROJECTION_HOUSES }),
            info: t("neededInfo"),
            value: needed ? num(needed) : "–",
            change: null,
            sub: t("neededAssumed", {
              low: num(f.projection.assumed.from ?? 0),
              high: num(f.projection.assumed.to ?? 0),
            }),
          },
        ]}
      />
      <section aria-labelledby="by-motivation" data-by-motivation className="-mt-2">
        <h2 id="by-motivation" className="mb-2 flex items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
          {t("byMotivation")}
          <InfoTip text={t("byMotivationInfo")} />
        </h2>
        <ul className="flex flex-wrap gap-x-8 gap-y-2">
          {byMotivation.rows.map((r) => (
            <li key={r.key} data-motivation-row={r.key} className="flex items-baseline gap-2 text-small">
              <span className="font-semibold text-ink">{tm(`motivation.${r.key as MarketingMotivation}`)}</span>
              <span className="text-muted">
                {t("motivationRow", {
                  contacted: num(r.contacted),
                  reply: share(r.replyRate),
                  demo: share(r.demoRate),
                  house: share(r.houseRate),
                })}
              </span>
              {r.key === byMotivation.best && (
                <span className="flex items-center gap-1 font-semibold text-ink">
                  <StatusDot status="good" />
                  {t("bestMotivation")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
      <p className="text-small text-muted">{t("dragHint")}</p>
      <div className="-mx-1 overflow-x-auto px-1">
        <ol className="grid min-w-[960px] grid-cols-5 gap-3">
          {STATUSES.map((status) => {
            const cards = shown.filter((c) => c.status === status).toSorted((a, b) => (b.firstMessageAt ?? "").localeCompare(a.firstMessageAt ?? ""));
            return (
              <li
                key={status}
                data-column={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setOver(status);
                }}
                onDragLeave={() => setOver((o) => (o === status ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  move(e.dataTransfer.getData("text/plain"), status);
                }}
                className={cn("flex min-w-0 flex-col rounded-xl bg-(--adm-block) p-2 transition-colors", over === status && "bg-(--adm-here)")}
              >
                <p className="flex items-baseline justify-between px-1.5 pb-2 pt-1">
                  <span className="text-small font-semibold text-ink">{t(`columns.${status}`)}</span>
                  <span className="text-small tabular-nums text-muted">{num(cards.length)}</span>
                </p>
                <ul className="flex max-h-[calc(100svh-380px)] min-h-24 flex-col gap-2 overflow-y-auto overscroll-contain">
                  {cards.length === 0 && <li className="rounded-lg border border-dashed border-ink/12 px-3 py-4 text-center text-small text-muted">{t("drop")}</li>}
                  {cards.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        draggable
                        data-pipeline-card={c.id}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", c.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => onOpen(c.id)}
                        className="block w-full cursor-grab rounded-lg bg-(--adm-pill) px-3 py-2 text-left hover:bg-ink/10 active:cursor-grabbing"
                      >
                        <span className="block truncate text-body font-semibold text-ink">{c.name}</span>
                        <span className="block truncate text-small text-muted">{[c.niche, c.channel, tc("followers", { count: compact(c.followers) })].join(" · ")}</span>
                        <span className="block truncate text-small text-muted">
                          {c.firstMessageAt ? day(c.firstMessageAt) : tc("notWritten")}
                          {c.followUps > 0 && ` · ${t("followUps", { count: c.followUps })}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// ─── Partner ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Partner as cards: photo (the host account's face, else the initial), kind and step, the linked Houses, the next step (Ember when due). */
function PartnerCards({ partners, filters, onOpen }: { partners: readonly MarketingPartner[]; filters: PartnerFilters; onOpen: (id: string) => void }) {
  const t = useTranslations("admin.marketing.partners");
  const inputs = useAdminInputs();
  const store = useStore();
  const shown = partners.filter((p) => (filters.kind === "all" || p.kind === filters.kind) && (filters.ladder === "all" || String(p.ladder) === filters.ladder) && (filters.due === "all" || partnerStepDue(p, inputs.today)));
  if (shown.length === 0) return <p className="text-body text-muted">{t("empty")}</p>;
  return (
    <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
      {shown.map((p) => {
        const host = p.hostUserId ? findUser(store, p.hostUserId) : undefined;
        const houses = partnerHouses(inputs.stays, p);
        const due = partnerStepDue(p, inputs.today);
        return (
          <li key={p.id}>
            <button type="button" data-partner-card={p.id} onClick={() => onOpen(p.id)} className="flex h-full w-full flex-col gap-3 rounded-xl bg-(--adm-block) p-4 text-left ring-1 ring-ink/8 hover:bg-ink/7">
              <span className="flex items-center gap-3">
                {host?.photos[0] ? <Img src={host.photos[0]} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full object-cover" /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--adm-pill) text-h3 text-ink">{p.name.slice(0, 1)}</span>}
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold text-ink">{p.name}</span>
                  <span className="block truncate text-small text-muted">
                    {t(`kinds.${p.kind}`)} · {t(`ladderShort.${p.ladder}`)}
                    {p.reach > 0 && ` · ${compact(p.reach)}`}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="flex -space-x-2">
                  {houses.slice(0, 3).map((s) => (
                    <Img key={s.id} src={housePhotos(s, findUser(store, s.hostId))[0]} alt="" width={32} height={32} className="size-8 rounded-md object-cover ring-2 ring-(--adm-block)" />
                  ))}
                </span>
                <span className="text-small text-muted">
                  {t("openHouses", {
                    count: houses.filter((s) => s.status === "published" && s.spotsFilled < s.spotsTotal).length,
                  })}
                </span>
              </span>
              <span className={cn("mt-auto flex items-center gap-2 text-small", due ? "text-ink" : "text-muted")}>
                {due && <StatusDot status="critical" />}
                <span className="truncate">{p.nextStep ? `${p.nextStep.text}${p.nextStep.due ? ` · ${due ? t("stepDue", { date: day(p.nextStep.due) }) : day(p.nextStep.due)}` : ""}` : t("noStep")}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Kontakt (im Panel der Pipeline) ───────────────────────────────────────────────────────────────────────────────────────────────────

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

function ContactDetail({ contact, onBack, onDeleted, isPartner, onToPartner, inPanel }: { contact: MarketingContact; onBack: () => void; onDeleted: () => void; isPartner: boolean; onToPartner: () => void; inPanel?: boolean }) {
  const tPartners = useTranslations("admin.marketing.partners");
  const t = useTranslations("admin.marketing.contacts");
  const actions = useAdminActions();
  // Text fields keep their own draft and save when left (one log line per change, not per key).
  const [draft, setDraft] = useState({
    name: contact.name,
    email: contact.email ?? "",
    niche: contact.niche,
    followers: String(contact.followers),
    note: contact.note,
  });
  // A host application with the same email (Launch › Bewerbungen) – linked both ways.
  const application = useAdminData().applications.find((a) => a.contactId === contact.id || (contact.email && a.email?.toLowerCase() === contact.email.toLowerCase()));
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const save = (patch: Partial<Omit<MarketingContact, "id" | "createdAt">>, what: WhatKey) => actions.updateMarketingContact(contact, patch, t(`what.${what}`));
  const commit = (key: "name" | "email" | "niche" | "note") => {
    const value = draft[key].trim();
    if (value !== (contact[key] ?? "") && (key === "note" || key === "email" || value !== "")) save({ [key]: value || undefined }, key);
  };
  const commitFollowers = () => {
    const value = Math.max(0, Math.round(Number(draft.followers.replace(/\D/g, "")) || 0));
    if (value !== contact.followers) save({ followers: value }, "followers");
  };
  const link = demoLinkOf(contact.id);
  const locked = !contact.launchConsent;
  return (
    <div data-marketing-contact={contact.id} className="flex flex-col gap-5">
      {!inPanel && <BackToList onBack={onBack} />}
      {application && (
        <Link href={`/admin/hosts?tab=applications&app=${application.id}`} className="self-start text-body font-semibold text-ink underline-offset-4 hover:underline">
          {t("application", {
            status: t(`applicationStatus.${application.status}`),
          })}{" "}
          →
        </Link>
      )}
      {/* A contact that turns into a collaboration: its data over to Partner, the contact linked back. */}
      <AdminButton variant="secondary" className="self-start" onClick={onToPartner}>
        {isPartner ? tPartners("isPartner") : tPartners("fromContact")}
      </AdminButton>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.name")}>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => commit("name")} />
        </Field>
        <Field label={t("fields.email")}>
          <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} onBlur={() => commit("email")} />
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
      <Field label={t("fields.kind")}>
        <KindPicker value={contact.kind} onChange={(kind) => save({ kind }, "kind")} />
      </Field>
      <Field label={t("fields.motivation")}>
        <MotivationPicker value={contact.motivation} onChange={(motivation) => save({ motivation }, "motivation")} />
      </Field>
      {contact.motivation && <MatchingOffer motivation={contact.motivation} name={contact.name} />}
      <Field label={t("fields.followUps")}>
        <div className="flex flex-wrap items-center gap-3">
          <CapsuleGroup
            size="sm"
            label={t("fields.followUps")}
            value={String(contact.followUps) as "0" | "1" | "2"}
            onChange={(v) => save({ followUps: Number(v) as 0 | 1 | 2 }, "followUps")}
            options={(["0", "1", "2"] as const).map((v) => ({
              value: v,
              content: v,
            }))}
          />
          {contact.followUps >= MAX_FOLLOW_UPS && <span className="text-small font-semibold text-ink">{t("quiet")}</span>}
        </div>
      </Field>
      <Field label={t("fields.status")}>
        <CapsuleGroup
          size="sm"
          label={t("fields.status")}
          value={contact.status}
          onChange={(s) => save({ status: s }, "status")}
          options={STATUSES.map((s) => ({
            value: s,
            content: t(`statuses.${s}`),
          }))}
        />
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
            onChange={(on) =>
              save(
                on
                  ? {
                      launchConsent: true,
                      launchConsentAt: new Date().toISOString().slice(0, 10),
                    }
                  : {
                      launchConsent: false,
                      launchConsentAt: null,
                      launchMail: false,
                    },
                "consent",
              )
            }
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
          <code data-demo-link className="min-w-0 flex-1 truncate rounded-xl bg-(--adm-block) px-3 py-2.5 text-small text-ink">
            {link}
          </code>
          <AdminButton
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(link).catch(() => {});
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            {copied ? t("copied") : t("copy")}
          </AdminButton>
        </div>
      </Field>
      <Field label={t("fields.note")}>
        <Textarea rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} onBlur={() => commit("note")} />
      </Field>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-body text-ink">{t("deleteConfirm")}</span>
          <AdminButton variant="secondary" onClick={() => setConfirming(false)}>
            {t("cancel")}
          </AdminButton>
          <AdminButton
            onClick={() => {
              actions.deleteMarketingContact(contact);
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
/** The field names the log may say (no personal values). */
type WhatKey = "kind" | "motivation" | "name" | "email" | "channel" | "niche" | "followers" | "contactWay" | "firstMessage" | "followUps" | "status" | "consent" | "launchMail" | "note";

// ─── Content › Kalender ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A week's published shorts against the weekly target: reached good, one short warning, more critical; weeks still to come or before the marketing start: none. */
const weekStatus = (published: number, monday: string, today: string, start: string): Status | null => (monday > today || monday < mondayOf(start) ? null : published >= CONTENT_WEEKLY_TARGET ? "good" : published >= CONTENT_WEEKLY_TARGET - 1 ? "warning" : "critical");

/**
 * The content calendar (month view, weeks Monday–Sunday): planned and published shorts per day, each week's count against the weekly target,
 * content sprints as bands over their days. A day opens below: its shorts (publish, back to planned, remove) and "Short planen".
 */
function ContentCalendar() {
  const t = useTranslations("admin.marketing.content");
  const inputs = useAdminInputs();
  const data = useAdminData();
  const actions = useAdminActions();
  const posts = data.contentPosts ?? [];
  const sprints = data.contentSprints ?? [];
  const [month, setMonth] = useState(inputs.today.slice(0, 7));
  const [picked, setPicked] = useState<string>(inputs.today);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<string>(SHORT_CHANNELS[0]);
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const weeks: string[] = [];
  for (let w = mondayOf(first); w <= lastDay; w = addDays(w, 7)) weeks.push(w);
  const shift = (n: number) => setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  const weekdays = t.raw("weekdays") as string[];
  const dayPosts = posts.filter((p) => p.date === picked).toSorted((a, b) => a.title.localeCompare(b.title));
  const plan = () => {
    const text = title.trim();
    if (!text) return;
    actions.addContentPost({
      date: picked,
      title: text,
      channel,
      status: "planned",
    });
    setTitle("");
  };
  return (
    <AdminSection
      title={t("calendar")}
      aside={
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-small text-muted">
            {t("weekTarget", { target: CONTENT_WEEKLY_TARGET })}
            {sprints.length > 0 && <InfoTip text={t("sprintsInfo")} />}
          </span>
          <button type="button" aria-label={t("prevMonth")} onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-full bg-(--adm-cap-bg) text-ink hover:bg-ink/12">
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <span data-calendar-month className="w-32 text-center text-body font-semibold text-ink">
            {monthYear(month)}
          </span>
          <button type="button" aria-label={t("nextMonth")} onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-full bg-(--adm-cap-bg) text-ink hover:bg-ink/12">
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <div data-content-calendar className="min-w-[760px]">
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_72px] gap-1 pb-1">
            {weekdays.map((w) => (
              <span key={w} className="px-2 text-eyebrow uppercase text-(--adm-label)">
                {w}
              </span>
            ))}
            <span />
          </div>
          {weeks.map((monday) => {
            const published = shortsInWeek(posts, monday);
            const planned = posts.filter((p) => p.status === "planned" && p.date >= monday && p.date <= addDays(monday, 6)).length;
            const status = weekStatus(published, monday, inputs.today, strategyDates().start);
            const inWeek = sprints.filter((s) => s.to >= monday && s.from <= addDays(monday, 6));
            return (
              <div key={monday} data-calendar-week={monday} className="mb-1">
                {inWeek.length > 0 && (
                  <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_72px] gap-1 pb-1">
                    {inWeek.map((s) => {
                      const from = Math.max(0, Math.round((Date.parse(`${s.from}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) / DAY_MS));
                      const to = Math.min(6, Math.round((Date.parse(`${s.to}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) / DAY_MS));
                      return (
                        <span key={s.id} data-sprint={s.id} style={{ gridColumn: `${from + 1} / ${to + 2}` }} className="truncate rounded-full bg-(--adm-sprint-bg) px-3 py-0.5 text-small font-semibold text-(--adm-sprint)">
                          {t("sprint")} · {s.label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_72px] gap-1">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = addDays(monday, i);
                    const inMonth = d.slice(0, 7) === month;
                    const list = posts.filter((p) => p.date === d);
                    const isToday = d === inputs.today;
                    return (
                      <button
                        key={d}
                        type="button"
                        data-calendar-day={d}
                        aria-pressed={picked === d}
                        onClick={() => setPicked(d)}
                        className={cn("flex min-h-20 min-w-0 flex-col gap-1 rounded-lg p-1.5 text-left ring-inset transition-colors", inMonth ? "bg-(--adm-block)" : "bg-transparent", picked === d ? "ring-2 ring-ink/60" : "ring-1 ring-ink/6 hover:bg-ink/7")}
                      >
                        <span className={cn("text-small tabular-nums", isToday ? "font-semibold text-adm-chart-1" : inMonth ? "text-ink/80" : "text-muted")}>{Number(d.slice(8))}</span>
                        {list.slice(0, 3).map((p) => (
                          <span key={p.id} data-post={p.id} data-post-status={p.status} className={cn("flex min-w-0 items-center gap-1 rounded px-1 text-small", p.status === "published" ? "bg-ink/12 text-ink" : "text-muted ring-1 ring-inset ring-ink/15")}>
                            <span className={cn("size-1.5 shrink-0 rounded-full", p.status === "published" ? "bg-ink" : "border border-ink/50")} aria-hidden />
                            <span className="truncate">{p.title}</span>
                          </span>
                        ))}
                        {list.length > 3 && <span className="px-1 text-small text-muted">+{list.length - 3}</span>}
                      </button>
                    );
                  })}
                  <span className="flex flex-col items-end justify-center gap-0.5 pr-1 text-small tabular-nums text-muted" data-week-count={published}>
                    <span className="flex items-center gap-1.5">
                      {status && <StatusDot status={status} />}
                      <span className="text-ink">
                        {t("weekCount", {
                          count: published,
                          target: CONTENT_WEEKLY_TARGET,
                        })}
                      </span>
                    </span>
                    {status && <span className="sr-only">{t(`weekStatus.${status}`)}</span>}
                    {planned > 0 && (
                      <span>
                        +{planned} {t("planned")}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
          <p className="mt-2 flex items-center gap-4 text-small text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-ink" aria-hidden />
              {t("legendPublished")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full border border-ink/50" aria-hidden />
              {t("legendPlanned")}
            </span>
          </p>
        </div>
      </div>

      <div data-calendar-picked={picked} className="mt-(--adm-inner) border-t border-ink/8 pt-(--adm-inner)">
        <p className="text-body font-semibold text-ink">{day(picked)}</p>
        {dayPosts.length === 0 ? (
          <p className="mt-1 text-small text-muted">{t("dayEmpty")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink/8">
            {dayPosts.map((p) => (
              <li key={p.id} className="flex min-h-(--adm-row-h) flex-wrap items-center gap-3 py-1">
                <span className="min-w-0 flex-1 truncate text-body text-ink">{p.title}</span>
                <span className="text-small text-muted">
                  {p.channel} · {t(p.status)}
                </span>
                <AdminButton
                  variant="secondary"
                  onClick={() =>
                    actions.updateContentPost(
                      p,
                      {
                        status: p.status === "published" ? "planned" : "published",
                      },
                      p.status === "published" ? t("planned") : t("published"),
                    )
                  }
                >
                  {p.status === "published" ? t("unpublish") : t("publish")}
                </AdminButton>
                <button type="button" aria-label={t("remove")} onClick={() => actions.deleteContentPost(p)} className="flex size-9 items-center justify-center rounded-full text-muted hover:text-ink">
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            plan();
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} aria-label={t("titlePlaceholder")} className="h-9 min-w-48 flex-1 rounded-full bg-(--adm-cap-bg) px-4 text-body text-ink placeholder:text-muted" />
          <AdminSort label={t("channel")} options={SHORT_CHANNELS.map((c) => ({ value: c, label: c }))} value={channel} onChange={setChannel} />
          <AdminButton type="submit" disabled={!title.trim()}>
            <Plus aria-hidden className="size-4" />
            {t("add")}
          </AdminButton>
        </form>
      </div>
    </AdminSection>
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
          <dd data-memories-uploaded className="mt-1 text-h1 tabular-nums text-ink">
            {num(stats.uploaded)}
          </dd>
        </div>
        <div>
          <dt className="text-eyebrow uppercase text-(--adm-label)">{t("approved")}</dt>
          <dd data-memories-approved className="mt-1 text-h1 tabular-nums text-ink">
            {num(stats.approved)}
          </dd>
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
            <AdminButton variant="secondary" className="mt-2" onClick={() => setAll(true)}>
              {t("memoriesAll", { count: stats.approvedList.length })}
            </AdminButton>
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
      <ContentCalendar />
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
            {SERIES_CAST.length === 0 ? (
              <p className="text-body text-muted">
                {t("castPending", {
                  from: SERIES_CAST_SIZE.from,
                  to: SERIES_CAST_SIZE.to,
                })}
              </p>
            ) : (
              <ul className="space-y-1 text-body text-ink">
                {SERIES_CAST.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
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
              <span data-clip-count className="w-10 text-center text-h1 tabular-nums text-ink">
                {num(clips)}
              </span>
              <button type="button" aria-label={t("more")} onClick={() => actions.setMarketingClips(clips + 1)} className="flex size-11 items-center justify-center rounded-full ring-1 ring-ink/12 text-ink">
                <Plus aria-hidden className="size-4" />
              </button>
              {clips >= SERIES_CLIP_TARGET.from && <StatusDot status="good" />}
            </div>
            <p className="mt-2 text-small text-muted">
              {t("clipsTarget", {
                from: SERIES_CLIP_TARGET.from,
                to: SERIES_CLIP_TARGET.to,
              })}
            </p>
            <ProgressBar
              ratio={Math.min(1, clips / SERIES_CLIP_TARGET.from)}
              label={t("clipsTarget", {
                from: SERIES_CLIP_TARGET.from,
                to: SERIES_CLIP_TARGET.to,
              })}
              className="mt-2"
            />
          </div>
        </div>
      </AdminSection>
      <HouseMemories />
    </>
  );
}

"use client";

// /admin/vision – Vision as a map of building blocks (Warum · Wie · Wohin) with zoom and a timeline. The click row: Karte · Zeitleiste,
// right the status "● Phase 1 · 0/6 Monate bei 5.000 €"; under it the motto (20px) and three numbers. Karte: BlockMap; a block zooms in
// (?block=<id>, breadcrumb "Vision › <Name>", "← Karte") to its content – the former tabs – under a one-line summary. Zeitleiste: the four
// phases as columns, the lanes as rows of capsules (folded "+N"); a phase's head zooms into the phase. Every text from config/vision.ts,
// every number from lib/admin/metrics.ts; the current phase is the one ocean focus ("Du bist hier").
import { ArrowRight, Building2, Castle, HeartPulse, ChevronLeft, Coins, Diamond, Globe, Hourglass, House, Landmark, Layers, MapPin, Milestone, Network, RotateCcw, Route, Shapes, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/ActionButton";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useAdminActions } from "@/lib/admin/actions";
import { useDepthChoice } from "@/config/platform";
import { ACCOMMODATION_CATEGORIES, PLACE_PHASES } from "@/config/accommodation";
import { TRAVEL_OPTIONS } from "@/config/travel";
import {
  BREADTH_DEPTH,
  CORE,
  MOTTO,
  BLOCK_MAP,
  BLOCK_MAP_TEXT,
  TIMELINE_TEXT,
  VISION_VIEWS,
  type BlockId,
  type LaneKey,
  type VisionView,
  CONTINUUM,
  HOST_PHASE_LABEL,
  HOST_PHASE_NOW,
  HOSTS,
  LANES,
  NOT_MEASURABLE,
  PHASE4,
  PHASE_NOW,
  PHASE_TEXT,
  PHASES,
  PLACES,
  ROADMAP,
  SEGMENT_PHASE_NOW,
  SEGMENTS,
  SEGMENTS_TEXT,
  SOURCE_STATUS_LABEL,
  SOURCE_STATUSES,
  sourceCount,
  T_MODEL,
  UNLOCK_LANE_LABEL,
  VISION_TITLE,
  YOU_ARE_HERE,
  TECH,
  LOCATION,
  type LocationSection,
  type BuildKind,
  type TechSection,
  type LaneItem,
  type Phase,
  type PhaseKey,
  type Segment,
  type SegmentPhase,
  type Source,
  type SourceStatus,
} from "@/config/vision";
import { fundingReadiness, coreMetrics, providerCosts, getStatus, byAccommodation, depthUnlockValue, fullHousesPerMonth, hostMix, revenueLast12, moveProgress, revenueBySource, algorithmMetrics, visionPhase, type AdminInputs } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { ADMIN_DE } from "@/lib/i18n/admin.de";
import { dec, eur, num, pct, share } from "@/lib/i18n/adminFormat";
import { InfoTip } from "./AdminNumbers";
import { cn } from "@/lib/utils";
import { ProgressBar, StatusDot, StepMeter } from "./AdminCharts";
import { AdminSection, AdminShell } from "./AdminShell";
import { AdminSubTabs, AdminTabs } from "./AdminLayout";
import { BlockMap, type BlockStatus } from "./BlockMap";
import { MODELS } from "@/config/models";
import { goVision, VISION_NAV } from "@/lib/admin/visionNav";
import { HOF } from "@/config/vision-hof";
import { PatternScales } from "./vision/PatternScales";
import { HofPartView, HofParts } from "./vision/HofParts";
import { ContinuumForms, LongevityView } from "./vision/VisionDiagrams";

export function AdminVision() {
  const inputs = useAdminInputs();
  const { view, block, go, back } = useVisionUrl();
  const move = moveProgress(inputs);
  const phase = PHASES.find((p) => p.key === PHASE_NOW)!;
  const zoomed = block ? zoomOf(block, (next) => go({ view, block: next })) : null;
  return (
    <AdminShell
      title={VISION_TITLE}
      tabs={!zoomed ? <AdminTabs label={VISION_TITLE} value={view} onChange={(next) => go({ view: next, block: null })} tabs={VISION_VIEWS.map((v) => ({ value: v.key, label: v.label }))} /> : <Crumbs title={zoomed.title} onBack={back} backLabel={zoomed.backLabel ?? (zoomed.fromTimeline ? BLOCK_MAP_TEXT.backTimeline : BLOCK_MAP_TEXT.back)} />}
      aside={
        <span className="inline-flex items-center gap-2 text-body text-ink">
          <StatusDot status={getStatus("profitPerMonth", move.current)} />
          {BLOCK_MAP_TEXT.status(phase.number, move.streak, move.streakOf, eur(move.target))}
        </span>
      }
    >
      {zoomed ? (
        <section aria-label={zoomed.title}>
          {/* One line summary (at most 12 words), then the block's content. */}
          <p className="mb-(--adm-section) text-body-lg text-ink/80">{zoomed.summary}</p>
          {zoomed.content(inputs)}
        </section>
      ) : (
        <>
          {/* The motto (20px) and the three numbers, compact. */}
          <p className="text-adm-motto text-ink">{MOTTO.line}</p>
          <OverviewNumbers inputs={inputs} />
          <div className={view === "timeline" ? "mt-(--adm-section)" : "mt-6"}>{view === "timeline" ? <Timeline inputs={inputs} onOpenPhase={(key) => go({ view: "timeline", block: key })} /> : <VisionMap inputs={inputs} onZoom={(id) => go({ view: "map", block: id })} />}</div>
        </>
      )}
    </AdminShell>
  );
}

// ── URL: ?view=map|timeline and ?block=<id> (a deep link; the browser's back goes one step back) ───────────────────────────────────

const noop = () => () => {};
function subscribeUrl(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(VISION_NAV, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(VISION_NAV, callback);
  };
}
function useVisionUrl() {
  const search = useSyncExternalStore(subscribeUrl, () => window.location.search, () => "");
  void noop;
  const params = new URLSearchParams(search);
  const view: VisionView = params.get("view") === "timeline" ? "timeline" : "map";
  const block = params.get("block");
  const go = (next: { view: VisionView; block: string | null }) => {
    const p = new URLSearchParams();
    if (next.view === "timeline") p.set("view", "timeline");
    if (next.block) p.set("block", next.block);
    const q = p.toString();
    goVision(q ? `?${q}` : "");
  };
  const back = () => {
    // Back to the map (or the timeline a phase was opened from): the browser's own back when we came from there, else push it.
    if (window.history.state === null && window.history.length > 1) window.history.back();
    else go({ view, block: null });
  };
  return { view, block, go, back };
}

/** "Vision › <Name>" and "← Karte" in the click row while zoomed. */
function Crumbs({ title, onBack, backLabel }: { title: string; onBack: () => void; backLabel: string }) {
  return (
    <span className="flex items-center gap-4 text-body">
      <button type="button" onClick={onBack} className="font-semibold text-ink hover:underline">
        {backLabel}
      </button>
      <span className="text-ink/60">
        {BLOCK_MAP_TEXT.crumb} › <span className="text-ink">{title}</span>
      </span>
    </span>
  );
}

/** Gesamtmarkt · Kategorie-Führer · Simpulo heute – one compact row. */
function OverviewNumbers({ inputs }: { inputs: AdminInputs }) {
  const N = PHASE_TEXT.overviewNumbers;
  return (
    <dl className="mt-(--adm-inner) flex flex-wrap gap-x-8 gap-y-2">
      {[
        { label: N.market.label, value: N.market.value },
        { label: N.leader.label, value: N.leader.value },
        { label: N.today.label, value: eur(revenueLast12(inputs)), info: N.today.sub },
      ].map((n, i) => (
        <div key={n.label} className={cn("flex items-baseline gap-2", i > 0 && "border-l border-ink/8 pl-8")}>
          <dt className="text-small text-ink/60">{n.label}</dt>
          <dd className="text-body font-semibold tabular-nums text-ink">{n.value}</dd>
          {n.info && <InfoTip text={n.info} />}
        </div>
      ))}
    </dl>
  );
}

const BLOCK_ICONS: Record<BlockId, LucideIcon> = {
  hof: Castle,
  longevity: HeartPulse,
  core: Hourglass,
  segments: Users,
  hosts: House,
  places: MapPin,
  tech: Layers,
  algorithm: Network,
  phases: Milestone,
  tModel: Shapes,
  continuum: Coins,
  roadmap: Route,
  location: Globe,
  funding: Landmark,
};

/** The map: Warum · Wie · Wohin (config/vision.ts BLOCK_MAP), each block with its live number from lib/admin/metrics.ts. */
function VisionMap({ inputs, onZoom }: { inputs: AdminInputs; onZoom: (id: BlockId) => void }) {
  const T = BLOCK_MAP_TEXT;
  const mix = hostMix(inputs);
  const providers = providerCosts(inputs);
  const tooCostly = Object.values(providers.shares).some((p) => p.level !== null);
  const ready = fundingReadiness(inputs);
  const again = coreMetrics(inputs).again;
  const country = inputs.admin.location?.country ?? null;
  const metric: Record<BlockId, { value?: ReactNode; status: BlockStatus }> = {
    hof: { status: "none" },
    longevity: { status: "none" },
    core: { value: again === null ? NOT_MEASURABLE : T.again(share(again)), status: "none" },
    segments: { value: PHASE_TEXT.overviewNumbers.market.value.replace(" pro Jahr", ""), status: "none" },
    hosts: { value: T.hosts(mix.counts.share + mix.counts.pro + mix.counts.anchor, mix.counts.pro), status: "none" },
    places: { value: T.kinds(ACCOMMODATION_CATEGORIES.length), status: "none" },
    tech: { value: T.providers(Object.keys(providers.shares).length), status: tooCostly ? "warn" : "ok" },
    algorithm: { value: T.models(MODELS.length), status: "none" },
    phases: { value: T.phaseOf(PHASES.find((p) => p.key === PHASE_NOW)!.number, PHASES.length), status: "open" },
    tModel: { status: "none" },
    continuum: { value: T.sources(CONTINUUM.groups.reduce((n, g) => n + g.sources.length, 0)), status: "none" },
    roadmap: { value: T.stages(ROADMAP.stages.length), status: "none" },
    location: { value: country ?? T.open, status: country ? "ok" : "open" },
    funding: { value: T.ready(ready.met, ready.total), status: ready.met === ready.total ? "ok" : "open" },
  };
  return (
    // Compact blocks: the map with its end picture fits 1470 × 814 without scrolling.
    <BlockMap
      label={VISION_TITLE}
      compact
      columns={BLOCK_MAP.map((col) => ({
        key: col.key,
        label: col.label,
        blocks: col.blocks.map((b) => ({
          id: b.id,
          icon: BLOCK_ICONS[b.id],
          title: b.title,
          subtitle: b.subtitle,
          metric: metric[b.id].value,
          status: metric[b.id].status,
          ...(b.feature ? { preview: <PatternScales compact /> } : {}),
          ...(b.external ? { externalTab: b.external } : { href: `?block=${b.id}`, onOpen: () => onZoom(b.id) }),
        })),
      }))}
    />
  );
}

/** What a zoom shows: its title, the one summary line and the block's content (the former tabs) – the phases open the timeline's phase. */
function zoomOf(id: string, go?: (block: string) => void): { title: string; summary: string; fromTimeline: boolean; backLabel?: string; content: (inputs: AdminInputs) => ReactNode } | null {
  // Der Hof: its parts as cards (?block=hof), one part in depth (?block=hof.regeln) – breadcrumb "Vision › Der Hof › …".
  if (id === HOF.id) return { title: HOF.title, summary: HOF.sentence, fromTimeline: false, content: () => <HofParts onOpen={(part) => go?.(`${HOF.id}.${part}`)} /> };
  if (id.startsWith(`${HOF.id}.`)) {
    const part = HOF.parts.find((p) => `${HOF.id}.${p.id}` === id);
    if (part) return { title: `${HOF.title} › ${part.title}`, summary: `${part.letter}) ${part.title}`, fromTimeline: false, backLabel: `← ${HOF.title}`, content: () => <HofPartView part={part} /> };
  }
  const phase = PHASES.find((p) => p.key === id);
  if (phase) return { title: `${PHASE_TEXT.phase(phase.number)} · ${phase.title}`, summary: phase.goal ? `${PHASE_TEXT.goal}: ${phase.goal}` : phase.title, fromTimeline: true, content: (inputs) => (phase.key === "p4" ? <Phase4View /> : <PhaseView phase={phase} inputs={inputs} />) };
  const def = BLOCK_MAP.flatMap((c) => c.blocks).find((b) => b.id === id);
  if (!def || def.external) return null;
  const views: Partial<Record<BlockId, (inputs: AdminInputs) => ReactNode>> = {
    core: (inputs) => <CoreView inputs={inputs} />,
    segments: () => <SegmentsView />,
    hosts: (inputs) => <HostsView inputs={inputs} />,
    places: (inputs) => <PlacesView inputs={inputs} />,
    tech: (inputs) => <TechView inputs={inputs} />,
    phases: (inputs) => <Timeline inputs={inputs} onOpenPhase={() => undefined} />,
    tModel: (inputs) => <TModelView inputs={inputs} />,
    // The forms of living together on top, then the sources of revenue (the former content).
    continuum: (inputs) => (
      <>
        <ContinuumForms />
        <ContinuumView inputs={inputs} />
      </>
    ),
    longevity: () => <LongevityView />,
    roadmap: () => <RoadmapView />,
    location: (inputs) => <LocationView inputs={inputs} />,
  };
  const content = views[def.id];
  return content ? { title: def.title, summary: def.summary, fromTimeline: false, content } : null;
}

const LANE_ICONS: Record<LaneKey | "unlock", LucideIcon> = { segments: Users, revenue: Coins, places: MapPin, hosts: House, structure: Building2, unlock: Diamond };

/**
 * The timeline: the four phases as columns (the current one ocean 10 % with "Du bist hier"), the lanes as rows with their icon –
 * Zielgruppen · Einnahmen · Orte · Hosts · Struktur · Freigabe. Each cell capsules, folded to "+N" (what comes new); a click on a row opens
 * every cell of it. Freigabe: the diamond, the goal in short, its progress (segments) or "noch nicht messbar". A click on a phase's head
 * zooms into the phase.
 */
function Timeline({ inputs, onOpenPhase }: { inputs: AdminInputs; onOpenPhase: (key: PhaseKey) => void }) {
  const [open, setOpen] = useState<ReadonlySet<LaneKey>>(new Set());
  const toggle = (lane: LaneKey) => setOpen((now) => {
    const next = new Set(now);
    if (next.has(lane)) next.delete(lane);
    else next.add(lane);
    return next;
  });
  return (
    <>
    <TimelineVertical inputs={inputs} onOpenPhase={onOpenPhase} />
    <div data-timeline className="grid grid-cols-[140px_repeat(4,minmax(0,1fr))] max-md:hidden max-lg:overflow-x-auto">
      <span />
      {PHASES.map((phase) => {
        const here = phase.key === PHASE_NOW;
        return (
          <button key={phase.key} type="button" onClick={() => onOpenPhase(phase.key)} aria-label={TIMELINE_TEXT.openPhase(phase.title)} className={cn("border-l border-ink/8 px-4 pb-3 pt-3 text-left", here && "bg-(--adm-here)")}>
            <span className="flex items-center gap-2">
              <span className={cn("flex size-6 items-center justify-center rounded-full text-small tabular-nums", here ? "bg-adm-chart-1 text-on-signal" : "border-[1.5px] border-ink/25 text-muted")}>{phase.number}</span>
              {here && <Here />}
            </span>
            <span className="mt-1.5 block text-adm-block text-ink hover:underline">{phase.title}</span>
            {phase.goal && <span className="block text-small text-ink/60">{phase.goal}</span>}
          </button>
        );
      })}
      {LANES.map((lane) => {
        const Icon = LANE_ICONS[lane.key];
        const expanded = open.has(lane.key);
        return (
          <div key={lane.key} role="row" className="contents">
            <button type="button" onClick={() => toggle(lane.key)} aria-expanded={expanded} className="flex items-start gap-2 border-t border-ink/8 py-3 pr-3 text-left text-body text-ink">
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink/70" />
              {lane.label}
            </button>
            {PHASES.map((phase, i) => {
              const cell = phase.lanes[lane.key];
              const plus = i > 0 && cell.plus;
              return (
                <button key={phase.key} type="button" onClick={() => toggle(lane.key)} aria-label={`${lane.label} · ${phase.title}: ${expanded ? TIMELINE_TEXT.collapse : TIMELINE_TEXT.expand}`} className={cn("flex items-start border-l border-t border-ink/8 px-4 py-3 text-left", phase.key === PHASE_NOW && "bg-(--adm-here)")}>
                  {cell.items.length === 0 ? (
                    <span className="text-small text-muted">{PHASE_TEXT.none}</span>
                  ) : expanded ? (
                    <span className="flex flex-wrap gap-1.5">
                      {cell.items.map((item) => (
                        <span key={item.label} className="inline-flex h-7 items-center rounded-full bg-ink/6 px-2.5 text-small text-ink">
                          {plus && <span className="mr-1 text-ink/50">+</span>}
                          {item.label}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="inline-flex h-7 items-center rounded-full bg-ink/6 px-2.5 text-small tabular-nums text-ink">{plus ? BLOCK_MAP_TEXT.more(cell.items.length) : BLOCK_MAP_TEXT.count(cell.items.length)}</span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
      {/* Der Hof: its milestones as small marks (config/vision-hof.ts). */}
      <div role="row" className="contents" data-hof-milestones>
        <span className="flex items-start gap-2 border-t border-ink/8 py-3 pr-3 text-body text-ink">
          <Castle aria-hidden className="mt-0.5 size-4 shrink-0 text-ink/70" />
          {HOF.timelineLane}
        </span>
        {PHASES.map((phase) => {
          const marks = HOF.milestones.filter((m) => m.phase === phase.key);
          return (
            <div key={phase.key} className={cn("flex flex-wrap items-start gap-1.5 border-l border-t border-ink/8 px-4 py-3", phase.key === PHASE_NOW && "bg-(--adm-here)")}>
              {marks.length === 0 ? (
                <span className="text-small text-muted">{PHASE_TEXT.none}</span>
              ) : (
                marks.map((m) => (
                  <span key={m.label} className="inline-flex h-6 items-center gap-1.5 rounded-full border border-ink/20 px-2 text-small text-ink">
                    <span aria-hidden className="size-1.5 rotate-45 bg-(--adm-hof-shared)" />
                    {m.label}
                  </span>
                ))
              )}
            </div>
          );
        })}
      </div>
      <div role="row" className="contents">
        <span className="flex items-start gap-2 border-t border-ink/8 py-3 pr-3 text-body text-ink">
          <Diamond aria-hidden className="mt-0.5 size-4 shrink-0 text-ink/70" />
          {UNLOCK_LANE_LABEL}
        </span>
        {PHASES.map((phase) => (
          <div key={phase.key} className={cn("border-l border-t border-ink/8 px-4 py-3", phase.key === PHASE_NOW && "bg-(--adm-here)")}>
            <UnlockMark phase={phase} inputs={inputs} />
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

/**
 * Phones (< 744px): the timeline from top to bottom instead of four columns – each phase a block (number, title, goal, "Du bist hier"; a tap
 * on the head opens the phase), under it its lanes with what comes new as capsules (Phase 1 all of it), Der Hof's marks and the release.
 */
function TimelineVertical({ inputs, onOpenPhase }: { inputs: AdminInputs; onOpenPhase: (key: PhaseKey) => void }) {
  return (
    <ol data-timeline-vertical className="flex flex-col gap-(--adm-inner) md:hidden">
      {PHASES.map((phase, i) => {
        const here = phase.key === PHASE_NOW;
        const marks = HOF.milestones.filter((m) => m.phase === phase.key);
        return (
          <li key={phase.key} className={cn("rounded-xl border border-ink/8 p-4", here && "bg-(--adm-here)")}>
            <button type="button" onClick={() => onOpenPhase(phase.key)} aria-label={TIMELINE_TEXT.openPhase(phase.title)} className="w-full text-left">
              <span className="flex items-center gap-2">
                <span className={cn("flex size-6 items-center justify-center rounded-full text-small tabular-nums", here ? "bg-adm-chart-1 text-on-signal" : "border-[1.5px] border-ink/25 text-muted")}>{phase.number}</span>
                {here && <Here />}
              </span>
              <span className="mt-1.5 block text-adm-block text-ink">{phase.title}</span>
              {phase.goal && <span className="block text-small text-ink/60">{phase.goal}</span>}
            </button>
            <dl className="mt-3 flex flex-col gap-3">
              {LANES.map((lane) => {
                const Icon = LANE_ICONS[lane.key];
                const cell = phase.lanes[lane.key];
                const plus = i > 0 && cell.plus;
                return (
                  <div key={lane.key}>
                    <dt className="flex items-center gap-2 text-small text-(--adm-label)">
                      <Icon aria-hidden className="size-3.5 shrink-0" />
                      {lane.label}
                    </dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {cell.items.length === 0 ? (
                        <span className="text-small text-muted">{PHASE_TEXT.none}</span>
                      ) : (
                        cell.items.map((item) => (
                          <span key={item.label} className="inline-flex min-h-7 items-center rounded-full bg-ink/6 px-2.5 text-small text-ink">
                            {plus && <span className="mr-1 text-ink/50">+</span>}
                            {item.label}
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                );
              })}
              {marks.length > 0 && (
                <div>
                  <dt className="flex items-center gap-2 text-small text-(--adm-label)">
                    <Castle aria-hidden className="size-3.5 shrink-0" />
                    {HOF.timelineLane}
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {marks.map((m) => (
                      <span key={m.label} className="inline-flex h-6 items-center gap-1.5 rounded-full border border-ink/20 px-2 text-small text-ink">
                        <span aria-hidden className="size-1.5 rotate-45 bg-(--adm-hof-shared)" />
                        {m.label}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              <div>
                <dt className="flex items-center gap-2 text-small text-(--adm-label)">
                  <Diamond aria-hidden className="size-3.5 shrink-0" />
                  {UNLOCK_LANE_LABEL}
                </dt>
                <dd className="mt-1.5">
                  <UnlockMark phase={phase} inputs={inputs} />
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ol>
  );
}

// ── Shared pieces ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** "You are here" – the one ocean focus of a view. */
function Here({ className }: { className?: string }) {
  return <span className={cn("text-eyebrow uppercase text-adm-chart-1", className)}>{YOU_ARE_HERE}</span>;
}

/** live: a filled dot · prepared: half filled · idea: a hollow dashed ring – ink only (status colours are for numbers with a target). */
function SourceGlyph({ status }: { status: SourceStatus }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-ink">
      {status === "live" && <circle cx="6" cy="6" r="5.25" fill="currentColor" />}
      {status === "prepared" && (
        <>
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.25a4.75 4.75 0 0 1 0 9.5z" fill="currentColor" />
        </>
      )}
      {status === "idea" && <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="2 1.75" />}
    </svg>
  );
}

/** "● 2 live · ◌ 9 idea" for a list of sources (statuses with none are left out). */
function Legend({ sources }: { sources: readonly Source[] }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body text-ink">
      {SOURCE_STATUSES.map((status) => {
        const count = sources.filter((s) => s.status === status).length;
        return count === 0 ? null : (
          <li key={status} className="inline-flex items-center gap-2">
            <SourceGlyph status={status} />
            {sourceCount(count, status)}
          </li>
        );
      })}
    </ul>
  );
}

/** One source: its status glyph and name; a live one with this month's revenue and a thin bar of its share. */
function SourceRow({ source, number, revenue }: { source: Source; number?: number; revenue: ReturnType<typeof revenueBySource> }) {
  const value = source.measure ? revenue[source.measure] : null;
  const total = revenue.serviceFee + revenue.hostFeeShare;
  return (
    <li className={cn("grid items-baseline gap-x-3", number ? "grid-cols-[20px_14px_minmax(0,1fr)_auto]" : "grid-cols-[14px_minmax(0,1fr)_auto]")}>
      {number !== undefined && <span className="text-small tabular-nums text-muted">{number}</span>}
      <span className="flex translate-y-0.5 justify-center">
        <SourceGlyph status={source.status} />
        <span className="sr-only">{SOURCE_STATUS_LABEL[source.status]}</span>
      </span>
      <span className={cn("min-w-0 text-body", source.status === "idea" ? "text-ink/70" : "font-semibold text-ink")}>{source.name}</span>
      {value !== null ? <span className="text-body tabular-nums text-ink">{eur(value)}</span> : <span />}
      {value !== null && total > 0 && (
        <span aria-hidden className={cn("col-end-[-1] mt-2 h-1 overflow-hidden rounded-full bg-ink/8", number ? "col-start-3" : "col-start-2")}>
          <span className="block h-full rounded-full bg-ink/70" style={{ width: `${(value / total) * 100}%` }} />
        </span>
      )}
    </li>
  );
}

// ── Gesamtbild ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The diamond with what opens the next phase, and how far it is: the move as six segments, the others "noch nicht messbar". */
function UnlockMark({ phase, inputs, wide = false }: { phase: Phase; inputs: AdminInputs; wide?: boolean }) {
  if (!phase.unlock) return <p className="text-small text-muted">{PHASE_TEXT.none}</p>;
  const move = phase.unlock.measure === "move" ? moveProgress(inputs) : null;
  return (
    <div className="flex gap-2.5">
      <span aria-hidden className={cn("mt-1 size-3 shrink-0 rotate-45 border-[1.5px] border-ink", move?.reached && "bg-ink")} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-ink", wide ? "text-body font-semibold" : "text-small")}>{phase.unlock.label}</p>
        {move ? (
          <>
            <StepMeter reached={move.streak} of={move.streakOf} label={PHASE_TEXT.monthsInRow(move.streak, move.streakOf)} className={cn("mt-2", wide ? "max-w-80" : "max-w-40")} />
            <p className="mt-1 text-small tabular-nums text-muted">
              {PHASE_TEXT.monthsInRow(move.streak, move.streakOf)}
              {wide && ` · ${PHASE_TEXT.thisMonth(eur(move.current), eur(move.target))}`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-small text-muted">{NOT_MEASURABLE}</p>
        )}
      </div>
    </div>
  );
}

// ── Phase 1–3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A phase in detail: goal and what opens the next one (with progress), the numbers that count, the lanes with their details, the steps (Takt). */
function PhaseView({ phase, inputs }: { phase: Phase; inputs: AdminInputs }) {
  const tPlace = useTranslations("admin.accommodation");
  const here = phase.key === PHASE_NOW;
  const index = PHASES.indexOf(phase);
  const revenue = revenueBySource(inputs);
  const detailOf = (item: LaneItem): string | null => {
    if (item.segment) {
      const s = SEGMENTS.find((x) => x.key === item.segment);
      return s ? PHASE_TEXT.segmentDetail(usersOf(s), billions(s.revenue.min, s.revenue.max)) : null;
    }
    if (item.category) {
      const c = ACCOMMODATION_CATEGORIES.find((x) => x.id === item.category);
      return c ? `${PLACES.crew(c.crew.min, c.crew.max)} · ${PLACES.price(tPlace(`price.${c.price}`))}` : null;
    }
    if (item.measure) return eur(revenue[item.measure]);
    return null;
  };
  const takt = phase.takt.map((key) => [...BREADTH_DEPTH.breadth, ...BREADTH_DEPTH.depth].find((s) => s.key === key)!).filter(Boolean);

  return (
    <>
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-eyebrow uppercase text-(--adm-label)">
            {PHASE_TEXT.phase(phase.number)} · {phase.title}
            {here && <Here />}
          </p>
          <p className="mt-2 text-small text-muted">{PHASE_TEXT.goal}</p>
          <h2 className={cn("text-h1", here ? "text-adm-chart-1" : "text-ink")}>{phase.goal ?? phase.title}</h2>
        </div>
        <div className="min-w-0 lg:border-l lg:border-ink/8 lg:pl-10">
          <p className="mb-2 text-small text-muted">
            {PHASE_TEXT.unlock}
            {PHASES[index + 1] && ` · ${PHASE_TEXT.unlockNext(PHASES[index + 1].number)}`}
          </p>
          <UnlockMark phase={phase} inputs={inputs} wide />
        </div>
      </div>

      {phase.metrics.length > 0 && <PhaseMetrics metrics={phase.metrics} inputs={inputs} />}

      <AdminSection title={PHASE_TEXT.lanes} className="mt-(--adm-section)">
        <dl className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {LANES.map((lane) => {
            const { items, plus } = phase.lanes[lane.key];
            return (
              <div key={lane.key} className="min-w-0 border-t border-ink/8 pt-3">
                <dt className="text-small text-muted">{lane.label}</dt>
                <dd className="mt-2">
                  {items.length === 0 ? (
                    <p className="text-body text-muted">{PHASE_TEXT.none}</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {items.map((item) => {
                        const detail = detailOf(item);
                        return (
                          <li key={item.label}>
                            <p className="text-body text-ink">
                              {index > 0 && plus && <span className="text-muted">+ </span>}
                              {item.label}
                            </p>
                            {detail && <p className="text-small tabular-nums text-muted">{detail}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </AdminSection>

      {takt.length > 0 && (
        <AdminSection title={PHASE_TEXT.takt} className="mt-(--adm-section)">
          <ol className="flex flex-wrap gap-x-10 gap-y-6">
            {takt.map((step) => {
              const unlock = "unlock" in step ? step.unlock : null;
              const value = unlock ? depthUnlockValue(unlock.measure, inputs) : null;
              return (
                <li key={step.key} className="w-56 min-w-0">
                  <p className="text-small tabular-nums text-muted">{step.key}</p>
                  <p className="text-body font-semibold text-ink">{step.title}</p>
                  {unlock && (
                    <div className="mt-2 flex gap-2">
                      <span aria-hidden className={cn("mt-1 size-2.5 shrink-0 rotate-45 border-[1.5px] border-ink", value !== null && unlock.target !== null && value >= unlock.target && "bg-ink")} />
                      <div className="min-w-0">
                        <p className="text-small text-ink">{unlock.criterion}</p>
                        {value !== null && unlock.target !== null ? (
                          <>
                            <ProgressBar ratio={Math.min(1, value / unlock.target)} label={unlock.criterion} className="mt-2" />
                            <p className="mt-1 text-small tabular-nums text-muted">{BREADTH_DEPTH.progress(value, unlock.target)}</p>
                          </>
                        ) : (
                          <p className="mt-1 text-small text-muted">{NOT_MEASURABLE}</p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-(--adm-inner) max-w-2xl text-small text-muted">{PHASE_TEXT.taktNote}</p>
        </AdminSection>
      )}
    </>
  );
}

/** The numbers that count in a phase (Phase 1: full Houses per month, profit against 5.000 €, repeat guests), with their status dots. */
function PhaseMetrics({ metrics, inputs }: { metrics: Phase["metrics"]; inputs: AdminInputs }) {
  const full = fullHousesPerMonth(inputs);
  const move = moveProgress(inputs);
  const repeat = algorithmMetrics(inputs).repeatRate;
  const repeatPct = repeat === null ? null : Math.round(repeat * 100);
  const all = {
    fullHouses: { value: String(full.current), sub: PHASE_TEXT.ofTarget(String(full.target)), status: full.status },
    profit: { value: eur(move.current), sub: PHASE_TEXT.ofTarget(eur(move.target)), status: move.status },
    repeat: { value: repeatPct === null ? "–" : pct(repeatPct), sub: undefined, status: getStatus("repeatRate", repeatPct) },
  };
  return (
    <AdminSection title={PHASE_TEXT.metrics} className="mt-(--adm-section)">
      <dl className="grid gap-y-6 sm:grid-cols-3">
        {metrics.map((key, i) => (
          <div key={key} className={cn("min-w-0", i > 0 && "sm:border-l sm:border-ink/8 sm:pl-6")}>
            <dt className="flex items-center gap-2 text-small text-muted">
              <StatusDot status={all[key].status} />
              {PHASE_TEXT.metricLabel[key]}
            </dt>
            <dd className="mt-1 text-h1 tabular-nums text-ink">{all[key].value}</dd>
            {all[key].sub && <dd className="mt-0.5 text-small text-muted">{all[key].sub}</dd>}
          </div>
        ))}
      </dl>
    </AdminSection>
  );
}

// ── Phase 4: Immobilien & Ausstieg ────────────────────────────────────────────────────────────────────────────────────────────────

/** The separation as a graphic, the village as a ladder with its candidates, the exit as a comparison. */
function Phase4View() {
  const P = PHASE4;
  const open = (v: string | null) => (v ? <span className="text-ink">{v}</span> : <span className="text-muted">{P.open}</span>);
  return (
    <>
      <AdminSection title={P.separation.title}>
        <div className="flex max-w-3xl flex-col gap-3">
          <div className="border-l-4 border-ink/70 py-3 pl-5">
            <p className="text-h3 text-ink">{P.separation.platform}</p>
          </div>
          <div aria-hidden className="border-t border-dashed border-ink/25" />
          <div className="border-l-4 border-ink/25 py-3 pl-5">
            <p className="text-h3 text-ink">{P.separation.realEstate}</p>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-body-lg text-ink">{P.separation.sentence}</p>
      </AdminSection>

      <AdminSection title={P.village.title} className="mt-(--adm-section)">
        <ol className="grid max-w-4xl grid-cols-3 items-end gap-3">
          {P.village.steps.map((step, i) => (
            <li key={step.title} className="flex min-w-0 flex-col">
              <p className="text-small tabular-nums text-muted">{i + 1}</p>
              <p className="text-h3 text-ink">{step.title}</p>
              <p className="mt-0.5 text-small text-muted">{step.text}</p>
              <span aria-hidden className="mt-3 block rounded-t-[12px] bg-ink/8" style={{ height: 24 + i * 28 }} />
            </li>
          ))}
        </ol>
        <p className="mb-2 mt-(--adm-section) text-small text-muted">{P.village.candidatesTitle}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] max-w-4xl text-left text-small">
            <thead className="text-muted">
              <tr className="border-b border-ink/8">
                <th className="py-2.5 pr-4 font-medium" />
                <th className="py-2.5 pr-4 font-medium">{P.village.strength}</th>
                <th className="py-2.5 font-medium">{P.village.weakness}</th>
              </tr>
            </thead>
            <tbody>
              {P.village.candidates.map((c) => (
                <tr key={c.name} className="border-b border-ink/8 align-top">
                  <td className="py-2.5 pr-4">
                    <span className="block text-body font-semibold text-ink">{c.name}</span>
                    {c.note && <span className="block text-muted">{c.note}</span>}
                  </td>
                  <td className="py-2.5 pr-4">{open(c.strength)}</td>
                  <td className="py-2.5">{open(c.weakness)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection title={P.exit.title} className="mt-(--adm-section)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] max-w-4xl text-left text-small">
            <thead>
              <tr className="border-b border-ink/8">
                <th className="py-2.5 pr-4" />
                {P.exit.options.map((o) => (
                  <th key={o} className="py-2.5 pr-4 text-body font-semibold text-ink">
                    {o}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {P.exit.criteria.map((criterion) => (
                <tr key={criterion} className="border-b border-ink/8">
                  <td className="py-2.5 pr-4 text-muted">{criterion}</td>
                  {P.exit.options.map((o) => (
                    <td key={o} className="py-2.5 pr-4">
                      {open(P.exit.values[o]?.[criterion] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-2xl text-body-lg text-ink">{P.exit.sentence}</p>
      </AdminSection>
    </>
  );
}

// ── T-Model ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const STEP_H = 64;

/** The T: breadth as the top bar (5 fields), depth as the bar down its middle (7 steps, 1–3 active); the arrow from breadth to step 6. Then the matrix. */
function TModelView({ inputs }: { inputs: AdminInputs }) {
  const { breadth, depth, arrow, matrix } = T_MODEL;
  const phase = visionPhase(inputs);
  return (
    <>
      <p className="text-eyebrow uppercase text-(--adm-label)">{breadth.title}</p>
      {/* The top bar: one surface, its five fields split by 1px lines. */}
      <ol className="mt-3 grid rounded-[24px] bg-surface max-md:divide-y max-md:divide-ink/8 md:grid-cols-5 md:divide-x md:divide-ink/8">
        {breadth.fields.map((field) => (
          <li key={field.title} className="min-w-0 px-5 py-5">
            <p className="text-body font-semibold text-ink">{field.title}</p>
            <p className="mt-1 text-small text-muted">{field.text}</p>
          </li>
        ))}
      </ol>

      {/* The stem: the same surface straight down from the bar's middle; the arrow on its right. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px_minmax(0,1fr)]">
        <div className="relative min-w-0 lg:col-start-2">
          <ol className="rounded-b-[24px] bg-surface max-lg:mt-2 max-lg:rounded-t-[24px]">
            {depth.steps.map((step, i) => (
              <li key={step.title} className={cn("flex items-center gap-3 px-5", i > 0 && "border-t border-ink/8")} style={{ minHeight: STEP_H }}>
                <span
                  className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-small tabular-nums", step.active ? "bg-ink text-inverse" : "border-[1.5px] border-ink/25 text-muted")}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-body", step.active ? "font-semibold text-ink" : "text-ink/70")}>{step.title}</span>
                  <span className="block truncate text-small text-muted">
                    {step.text}
                    {i + 1 === arrow.toStep && <span className="xl:hidden"> · ← {arrow.text}</span>}
                  </span>
                </span>
                {step.active && <span className="text-small text-muted">{depth.active}</span>}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-center text-eyebrow uppercase text-(--adm-label)">{depth.title}</p>
          {/* From the bar down the stem's right side, then left into step 6. */}
          <div aria-hidden className="absolute left-full top-0 ml-6 max-xl:hidden" style={{ height: STEP_H * (arrow.toStep - 0.5) }}>
            <div className="relative h-full w-10 rounded-br-xl border-b-[1.5px] border-r-[1.5px] border-dashed border-ink/40">
              <ChevronLeft className="absolute -bottom-[9px] -left-2 size-4 text-ink/60" strokeWidth={2} />
            </div>
            <p className="absolute left-14 top-1/2 w-32 -translate-y-1/2 text-small font-semibold text-ink">{arrow.text}</p>
          </div>
        </div>
      </div>

      {/* The matrix: five phases × five rows; the current phase's column in ocean 12 % under "You are here". */}
      <div className="mt-(--adm-section) overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed text-left">
          <thead>
            <tr>
              <th className="w-28" />
              {matrix.phases.map((p, i) => (
                <th key={p} className={cn("px-3 pb-3 align-bottom font-normal", i === phase && "rounded-t-[16px] bg-adm-chart-1-soft pt-3")}>
                  {i === phase && <Here className="block" />}
                  <span className={cn("block text-body", i === phase ? "font-semibold text-ink" : "text-muted")}>{p}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row, r) => (
              <tr key={row.title} className="border-t border-ink/8">
                <th className="py-3 pr-3 text-small font-semibold text-ink">{row.title}</th>
                {row.cells.map((cell, i) => (
                  <td key={i} className={cn("px-3 py-3 align-top text-small", i === phase ? "bg-adm-chart-1-soft text-ink" : "text-ink/70", i === phase && r === matrix.rows.length - 1 && "rounded-b-[16px]")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Continuum ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Three columns of numbered sources (1–15) with their status, the live ones with this month's revenue; two arrows under them. */
function ContinuumView({ inputs }: { inputs: AdminInputs }) {
  const revenue = revenueBySource(inputs);
  const all = CONTINUUM.groups.flatMap((g) => [...g.sources]);
  let n = 0;
  return (
    <>
      <Legend sources={all} />
      <div className="mt-(--adm-section) grid gap-y-10 lg:grid-cols-3">
        {CONTINUUM.groups.map((group, i) => (
          <section key={group.title} className={cn("min-w-0", i > 0 && "lg:border-l lg:border-ink/8 lg:pl-8", i < 2 && "lg:pr-8")}>
            <h2 className="text-h3 text-ink">{group.title}</h2>
            <ul className="mt-5 flex flex-col gap-4">
              {group.sources.map((source) => (
                <SourceRow key={source.name} source={source} number={++n} revenue={revenue} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-(--adm-section) flex flex-col gap-4 text-small font-semibold text-ink">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-ink/30" />
          <span className="shrink-0">{CONTINUUM.arrows.right}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="shrink-0">{CONTINUUM.arrows.left}</span>
          <span className="h-px flex-1 bg-ink/30" />
        </div>
      </div>
    </>
  );
}

// ── Roadmap ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A staircase of six stages, each with its new revenue; stage 1 "You are here". Under it the parallel lane "Partner ecosystem", each area under the stage it starts at. */
function RoadmapView() {
  const cols = ROADMAP.stages.length;
  return (
    <>
      <ol className="grid gap-y-8 lg:grid-cols-6 lg:items-end lg:gap-x-3">
        {ROADMAP.stages.map((stage, i) => {
          const here = i + 1 === ROADMAP.current;
          return (
            <li key={stage.title} className="flex min-w-0 flex-col">
              <div className="pb-4">
                {here && <Here className="mb-1 block" />}
                <p className="text-small tabular-nums text-muted">{i + 1}</p>
                <p className="text-h3 text-ink">{stage.title}</p>
                <p className="mt-1 text-small text-muted">{stage.text}</p>
                <p className="mt-3 text-eyebrow uppercase text-(--adm-label)">{ROADMAP.revenueLabel}</p>
                <p className="mt-0.5 text-small font-semibold text-ink">{stage.revenue}</p>
              </div>
              {/* The step itself: each one higher than the last. */}
              <span aria-hidden className={cn("block rounded-t-[12px] max-lg:hidden", here ? "bg-adm-chart-1-soft" : "bg-ink/8")} style={{ height: 24 + i * 28 }} />
            </li>
          );
        })}
      </ol>

      <AdminSection title={ROADMAP.partnerTitle} className="mt-(--adm-section)">
        <div className="relative lg:grid lg:grid-cols-6 lg:gap-x-3">
          <span aria-hidden className="absolute inset-x-0 top-1.5 h-px bg-ink/15 max-lg:hidden" />
          {Array.from({ length: cols }, (_, c) => {
            const areas = ROADMAP.partners.filter((p) => p.from === c + 1);
            return (
              <div key={c} className="min-w-0">
                {areas.length > 0 && <span aria-hidden className="relative block size-3 rounded-full border-[1.5px] border-ink/40 bg-bg max-lg:hidden" />}
                <ul className="flex flex-col gap-4 lg:mt-4">
                  {areas.map((area) => (
                    <li key={area.title} className="max-lg:mt-4">
                      <p className="text-body font-semibold text-ink">{area.title}</p>
                      <p className="text-small text-muted">{area.text}</p>
                      <p className="mt-0.5 text-small text-ink/50">{ROADMAP.fromStage(area.from)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </AdminSection>
    </>
  );
}

// ── Hosts ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const HOST_PHASES = ["launch", "abroad"] as const;

/**
 * The three tiers as a pyramid (Share the wide base, Anchor the top), each with its role, how many hosts it has today and "What they look
 * for"; the gap as two sides with ↔ and the sentence; the formats and the host circle under their phase – "You are here" on launch.
 */
function HostsView({ inputs }: { inputs: AdminInputs }) {
  const mix = hostMix(inputs);
  const widths = ["100%", "72%", "44%"];
  return (
    <>
      <AdminSection title={HOSTS.tiersTitle}>
        <ol className="flex flex-col-reverse gap-2">
          {HOSTS.tiers.map((tier, i) => (
            <li key={tier.tier} className="grid items-center gap-x-8 gap-y-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
              <div className="flex justify-center">
                <div className="flex min-h-16 items-center justify-between gap-4 rounded-[16px] bg-ink/8 px-5 py-3" style={{ width: widths[i] }}>
                  <span className="min-w-0">
                    <span className="block text-body font-semibold text-ink">{tier.title}</span>
                    <span className="block text-small text-muted">{tier.role}</span>
                  </span>
                  <span className="shrink-0 text-small tabular-nums text-ink">{HOSTS.hosts(mix.counts[tier.tier])}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-eyebrow uppercase text-(--adm-label)">{HOSTS.lookForLabel}</p>
                {tier.lookFor.length > 0 ? <p className="mt-1 text-small text-ink">{tier.lookFor.join(" · ")}</p> : <p className="mt-1 text-small text-muted">{HOSTS.lookForEmpty}</p>}
              </div>
            </li>
          ))}
        </ol>
      </AdminSection>

      <AdminSection title={HOSTS.gapTitle} className="mt-(--adm-section)">
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {[HOSTS.gap.left, null, HOSTS.gap.right].map((side, i) =>
            side ? (
              <div key={side.title} className={cn("min-w-0", i === 2 && "md:text-right")}>
                <p className="text-h3 text-ink">{side.title}</p>
                <p className="mt-1 text-body text-muted">{side.text}</p>
              </div>
            ) : (
              <span key="vs" aria-hidden className="mt-1 text-h2 text-ink/40 max-md:hidden">
                ↔
              </span>
            ),
          )}
        </div>
        <p className="mt-8 max-w-2xl text-body-lg text-ink">{HOSTS.gap.sentence}</p>
      </AdminSection>

      {/* Formats and the host circle: one row per phase pair, launch (now) on the left. */}
      {[
        { title: HOSTS.formatsTitle, items: HOSTS.formats.map((f) => ({ key: f.title, title: f.title, text: undefined as string | undefined, phase: f.phase })) },
        { title: HOSTS.circleTitle, items: HOSTS.circle.map((c) => ({ key: c.title, title: c.title, text: c.text as string | undefined, phase: c.phase })) },
      ].map((block, b) => (
        <AdminSection key={block.title} title={block.title} className="mt-(--adm-section)">
          <div className="grid gap-y-8 md:grid-cols-2">
            {HOST_PHASES.map((phase, i) => {
              const now = phase === HOST_PHASE_NOW;
              // One "You are here" per view: on the formats; the host circle marks launch in ink.
              const here = now && b === 0;
              return (
                <div key={phase} className={cn("min-w-0", i > 0 && "md:border-l md:border-ink/8 md:pl-8", i === 0 && "md:pr-8")}>
                  <div aria-hidden className="flex h-4 items-center">
                    <span className={cn("size-3 shrink-0 rounded-full", here ? "bg-adm-chart-1 ring-4 ring-adm-chart-1-soft" : now ? "bg-ink" : "border-[1.5px] border-ink/30")} />
                    <span className="ml-2 h-0.5 flex-1 rounded-full bg-ink/10" />
                  </div>
                  <p className="mt-3 text-small text-muted">
                    {HOST_PHASE_LABEL[phase]}
                    {here && <Here className="ml-2" />}
                  </p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {block.items
                      .filter((item) => item.phase === phase)
                      .map((item) => (
                        <li key={item.key}>
                          <p className="text-body font-semibold text-ink">{item.title}</p>
                          {item.text && <p className="text-small text-muted">{item.text}</p>}
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </AdminSection>
      ))}
    </>
  );
}

// ── Places ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The kinds of place on one track by phase (Launch "You are here" · Soon · Later · Highlight · Abroad): each category with its crew, price, examples and real Houses today. */
function PlacesView({ inputs }: { inputs: AdminInputs }) {
  const t = useTranslations("admin.accommodation");
  const counts = new Map(byAccommodation(inputs).map((r) => [r.id, r.houses]));
  return (
    <>
    <ol className="grid gap-y-10 lg:grid-cols-5 lg:gap-x-6">
      {PLACE_PHASES.map((phase, i) => {
        const here = phase === PLACES.now;
        return (
          <li key={phase} className="min-w-0">
            <div aria-hidden className="flex h-4 items-center">
              <span className={cn("size-3 shrink-0 rounded-full", here ? "bg-adm-chart-1 ring-4 ring-adm-chart-1-soft" : "border-[1.5px] border-ink/30")} />
              {i < PLACE_PHASES.length - 1 && <span className="ml-2 h-0.5 flex-1 rounded-full bg-ink/10 lg:-mr-6" />}
            </div>
            <p className="mt-3 text-small text-muted">
              {t(`phase.${phase}`)}
              {here && <Here className="ml-2" />}
            </p>
            <ul className="mt-4 flex flex-col gap-6">
              {ACCOMMODATION_CATEGORIES.filter((c) => c.phase === phase).map((c) => (
                <li key={c.id}>
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="text-body font-semibold text-ink">{t(`category.${c.id}`)}</span>
                    <span className="shrink-0 text-small tabular-nums text-muted">{PLACES.houses(counts.get(c.id) ?? 0)}</span>
                  </p>
                  <p className="mt-0.5 text-small text-muted">
                    {PLACES.crew(c.crew.min, c.crew.max)} · {PLACES.price(t(`price.${c.price}`))}
                  </p>
                  <p className="mt-1 text-small text-ink/70">{c.types.map((type) => t(`type.${type.id as keyof typeof ADMIN_DE.accommodation.type}`)).join(", ")}</p>
                  {!c.overnight && <p className="mt-1 text-small font-semibold text-ink">{PLACES.dayOnly}</p>}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>

    {/* Getting there (config/travel.ts): how the crew travels together – under the same phases, with how Simpulo takes part. */}
    <AdminSection title={PLACES.travelTitle} className="mt-(--adm-section)">
      <ul className="divide-y divide-ink/8 border-y border-ink/8">
        {TRAVEL_OPTIONS.map((option) => (
          <li key={option.id} className="grid gap-x-6 gap-y-1 py-4 md:grid-cols-[minmax(0,1fr)_140px_minmax(0,220px)] md:items-baseline">
            <span className="min-w-0">
              <span className="block text-body text-ink">{option.types.join(", ")}</span>
              <span className="block text-small text-muted">
                {PLACES.crew(option.crew.min, option.crew.max)} · {PLACES.price(t(`price.${option.price}`))}
              </span>
            </span>
            <span className={cn("text-small", option.phase === PLACES.now ? "font-semibold text-ink" : "text-muted")}>{t(`phase.${option.phase}`)}</span>
            <span className="text-small text-ink">{PLACES.travelMode(option.mode)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-small text-muted">{PLACES.travelNote}</p>
    </AdminSection>
    </>
  );
}

// ── Zielgruppen ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Colour by phase: the current one (launch) is the view's ocean focus; the others in the admin's chart and area colours. */
const PHASE_BG: Record<SegmentPhase, string> = {
  launch: "bg-adm-chart-1",
  early: "bg-adm-chart-3",
  afterLaunch: "bg-adm-chart-3",
  growth: "bg-adm-chart-2",
  scale: "bg-adm-chart-4",
  abroad: "bg-adm-chart-5",
};
/** The legend: one entry per colour (early and "kurz nach Launch" share one). */
const PHASE_LEGEND: readonly SegmentPhase[] = ["launch", "early", "growth", "scale", "abroad"];

const billions = (min: number, max: number) => `${dec(min)}–${dec(max)} ${SEGMENTS_TEXT.billions}`;
const usersOf = (s: Segment) => `${dec(s.users.min)}–${dec(s.users.max)} ${SEGMENTS_TEXT.millions}${s.users.unit ? ` ${s.users.unit}` : ""}`;
const perStayOf = (s: Segment) => `${eur(s.simpuloPerStay.amount)}${s.simpuloPerStay.unit ? ` ${s.simpuloPerStay.unit}` : ""}`;

/**
 * Who Simpulo could be for (config/vision.ts SEGMENTS – rough assumptions to change there): horizontal bars of the theoretical revenue per
 * group (the range lighter, colour by phase, the current phase in ocean), the season strip (which groups fill which months), the table and
 * the note. No cards.
 */
function SegmentsView() {
  const T = SEGMENTS_TEXT;
  const top = Math.max(...SEGMENTS.map((s) => s.revenue.max));
  const phaseName = (phase: SegmentPhase) => SEGMENTS.find((s) => s.phase === phase)?.phaseLabel ?? phase;
  return (
    <>
      <section aria-label={T.graphTitle}>
        <h2 className="text-eyebrow uppercase text-(--adm-label)">{T.graphTitle}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {SEGMENTS.map((s) => {
            const here = s.phase === SEGMENT_PHASE_NOW;
            return (
              <li key={s.key} className="grid grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] items-center gap-x-4">
                <span className={cn("min-w-0 truncate text-body", here ? "font-semibold text-ink" : "text-ink")}>
                  {s.name}
                  {here && <Here className="ml-2" />}
                </span>
                <span aria-hidden className="relative h-3 rounded-full bg-ink/6">
                  <span className={cn("absolute inset-y-0 left-0 rounded-full opacity-35", PHASE_BG[s.phase])} style={{ width: `${(s.revenue.max / top) * 100}%` }} />
                  <span className={cn("absolute inset-y-0 left-0 rounded-full", PHASE_BG[s.phase])} style={{ width: `${(s.revenue.min / top) * 100}%` }} />
                </span>
                <span className="w-32 text-right text-small tabular-nums text-ink">{billions(s.revenue.min, s.revenue.max)}</span>
              </li>
            );
          })}
        </ul>
        <PhaseLegend phaseName={phaseName} extra={T.rangeHint} />
      </section>

      <AdminSection title={T.seasonTitle} className="mt-(--adm-section)">
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-[minmax(0,200px)_repeat(12,minmax(0,1fr))] gap-x-1 gap-y-1.5">
            <span />
            {T.monthLabels.map((m) => (
              <span key={m} className="text-center text-small text-muted">
                {m}
              </span>
            ))}
            {SEGMENTS.map((s) => (
              <SeasonRow key={s.key} segment={s} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-small text-muted">{T.seasonLegend}</p>
      </AdminSection>

      <AdminSection title={T.tableTitle} className="mt-(--adm-section)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-small">
            <thead className="text-muted">
              <tr className="border-b border-ink/8">
                {(["group", "age", "motive", "frequency", "valuePerStay", "phase", "users", "staysPerMonth", "season", "simpuloPerStay", "revenue"] as const).map((c) => (
                  <th key={c} className={cn("py-3 pr-3 align-bottom font-medium last:pr-0", (c === "users" || c === "staysPerMonth" || c === "simpuloPerStay" || c === "revenue") && "text-right")}>
                    {T.col[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink">
              {SEGMENTS.map((s) => (
                <tr key={s.key} className="border-b border-ink/8 align-top">
                  <td className="w-40 py-3 pr-3">
                    <span className="block text-body font-semibold">{s.name}</span>
                    <span className="block text-muted">{s.examples}</span>
                  </td>
                  <td className="py-3 pr-3">{s.age}</td>
                  <td className="py-3 pr-3">{s.motive}</td>
                  <td className="py-3 pr-3">{s.frequency}</td>
                  <td className="py-3 pr-3">{s.valuePerStay}</td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-start gap-1.5">
                      <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", PHASE_BG[s.phase])} />
                      {s.phaseLabel}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{usersOf(s)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{s.staysPerMonth}</td>
                  <td className="py-3 pr-3">{s.season}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{perStayOf(s)}</td>
                  <td className="whitespace-nowrap py-3 text-right font-semibold tabular-nums">{billions(s.revenue.min, s.revenue.max)}</td>
                </tr>
              ))}
              <tr className="align-top font-semibold">
                <td className="py-3 pr-3 text-body">{T.total.label}</td>
                <td colSpan={5} />
                <td className="py-3 pr-3 text-right">{T.total.users}</td>
                <td className="py-3 pr-3 text-right">{T.total.staysPerMonth}</td>
                <td colSpan={2} />
                <td className="py-3 text-right">{T.total.revenue}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-small text-muted">{T.note}</p>
      </AdminSection>
    </>
  );
}

function PhaseLegend({ phaseName, extra }: { phaseName: (phase: SegmentPhase) => string; extra?: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-muted">
      <span>{SEGMENTS_TEXT.legend}:</span>
      {PHASE_LEGEND.map((phase) => (
        <span key={phase} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-full", PHASE_BG[phase])} />
          {phase === "early" ? `${phaseName("early")} / ${phaseName("afterLaunch")}` : phaseName(phase)}
        </span>
      ))}
      {extra && <span>· {extra}</span>}
    </div>
  );
}

/** One group across Jan–Dez: its months filled in its phase colour (lighter), the strong ones full. */
function SeasonRow({ segment }: { segment: Segment }) {
  return (
    <>
      <span className={cn("min-w-0 truncate text-small", segment.phase === SEGMENT_PHASE_NOW ? "font-semibold text-ink" : "text-ink")}>{segment.name}</span>
      {Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const on = segment.months.includes(month);
        const strong = segment.strong?.includes(month);
        return <span key={month} aria-hidden className={cn("h-4 rounded-[4px]", on ? PHASE_BG[segment.phase] : "bg-ink/6", on && !strong && "opacity-45")} />;
      })}
    </>
  );
}

// ── Technik ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Vision › Technik (config/vision.ts TECH): four parts as capsules – Ebenen · Selbst oder einkaufen · Schnittstellen · Anbieter heute. */
function TechView({ inputs }: { inputs: AdminInputs }) {
  const [section, setSection] = useState<TechSection>("layers");
  return (
    <>
      <AdminSubTabs label="Technik" className="mb-10" value={section} onChange={setSection} tabs={TECH.sections.map((s) => ({ value: s.key, label: s.label }))} />
      {section === "layers" && <TechLayers />}
      {section === "build" && <TechBuild />}
      {section === "interfaces" && <TechInterfaces />}
      {section === "providers" && <TechProviders inputs={inputs} />}
    </>
  );
}

/** Two stacks side by side, built from the bottom up: what Simpulo builds on (left) and what it is itself (right, numbered 1–5, notes beside). */
function TechLayers() {
  return (
    <div className="grid gap-x-12 gap-y-12 lg:grid-cols-2">
      <section aria-label={TECH.foundation.title} className="min-w-0">
        <h3 className="mb-4 text-eyebrow uppercase text-(--adm-label)">{TECH.foundation.title}</h3>
        <ol className="flex flex-col-reverse gap-1.5">
          {TECH.foundation.layers.map((l) => (
            <li key={l.title} className="flex min-h-16 flex-col justify-center rounded-[12px] bg-ink/5 px-5 py-3">
              <span className="text-body font-semibold text-ink">{l.title}</span>
              <span className="text-small text-muted">{l.text}</span>
            </li>
          ))}
        </ol>
      </section>
      <section aria-label={TECH.own.title} className="min-w-0">
        <h3 className="mb-4 text-eyebrow uppercase text-(--adm-label)">{TECH.own.title}</h3>
        <ol className="flex flex-col-reverse gap-1.5">
          {TECH.own.layers.map((l) => (
            <li key={l.n} className="flex min-h-16 items-center gap-4 rounded-[12px] bg-ink/10 px-5 py-3">
              <span className="w-5 shrink-0 text-h3 tabular-nums text-muted">{l.n}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">{l.title}</span>
                <span className="block text-small text-muted">{l.text}</span>
              </span>
              {l.note && <span className="shrink-0 text-right text-eyebrow uppercase text-ink max-sm:max-w-28">{l.note}</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** ● selbst · ◐ selbst auf eingekauften Werkzeugen · ○ einkaufen – ink only. */
function BuildGlyph({ kind }: { kind: BuildKind }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="size-3 shrink-0 text-ink">
      {kind === "own" && <circle cx="6" cy="6" r="5.25" fill="currentColor" />}
      {kind === "mixed" && (
        <>
          <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.25a4.75 4.75 0 0 1 0 9.5z" fill="currentColor" />
        </>
      )}
      {kind === "buy" && <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />}
    </svg>
  );
}

/** The table Baustein · Empfehlung · Ab wann überdenken (glyph per recommendation, legend above), then the three conditions and the sentence. */
function TechBuild() {
  const b = TECH.build;
  return (
    <>
      <ul className="mb-(--adm-inner) flex flex-wrap gap-x-6 gap-y-2 text-small text-muted">
        {(["own", "mixed", "buy"] as const).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <BuildGlyph kind={k} />
            {b.kindLabel[k]}
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-ink/8 text-small text-muted">
              <th scope="col" className="py-2 pr-6 font-normal">{b.columns.block}</th>
              <th scope="col" className="py-2 pr-6 font-normal">{b.columns.advice}</th>
              <th scope="col" className="py-2 font-normal">{b.columns.rethink}</th>
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r) => (
              <tr key={r.block} className="border-b border-ink/8 align-top">
                <th scope="row" className="py-3 pr-6 font-semibold text-ink">{r.block}</th>
                <td className="py-3 pr-6 text-ink">
                  <span className="flex items-center gap-2">
                    <BuildGlyph kind={r.kind} />
                    {r.advice}
                  </span>
                </td>
                <td className={cn("py-3", r.rethink ? "text-ink" : "text-muted")}>{r.rethink ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AdminSection title={b.conditionsTitle} className="mt-(--adm-section)">
        <ol className="flex flex-wrap gap-x-10 gap-y-3">
          {b.conditions.map((c, i) => (
            <li key={c} className="flex items-baseline gap-3">
              <span className="text-h3 tabular-nums text-muted">{i + 1}</span>
              <span className="text-h3 text-ink">{c}</span>
            </li>
          ))}
        </ol>
        <p className="mt-(--adm-inner) text-body-lg text-ink">{b.sentence}</p>
      </AdminSection>
    </>
  );
}

/** The interfaces as a time line (left to right; on phones top to bottom), each with its phase; the note below. */
function TechInterfaces() {
  const items = TECH.interfaces.items;
  return (
    <>
      <ol className="relative grid gap-y-6 lg:grid-cols-5 lg:gap-x-4">
        <span aria-hidden className="absolute inset-x-0 top-1.5 h-px bg-ink/15 max-lg:hidden" />
        <span aria-hidden className="absolute bottom-1.5 left-1.5 top-1.5 w-px bg-ink/15 lg:hidden" />
        {items.map((item) => (
          <li key={item.title} className="relative flex min-w-0 gap-4 lg:flex-col lg:gap-4">
            <span aria-hidden className="relative block size-3 shrink-0 rounded-full border-[1.5px] border-ink/50 bg-bg" />
            <span className="min-w-0">
              <span className="block text-small text-muted">{item.when}</span>
              <span className="mt-0.5 block text-body font-semibold text-ink">{item.title}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-(--adm-section) text-body text-ink">{TECH.interfaces.note}</p>
    </>
  );
}

const COST_TEXT = { warning: "text-adm-warning", critical: "text-adm-critical", good: "text-ink" } as const;
/** The bar's scale: 15 % of revenue fills it. */
const COST_SCALE = 15;

/** Today's providers: purpose, adapter yes/no and the cost in % of revenue (providerCosts) as a thin bar – from 5 % amber, from 10 % ember. */
function TechProviders({ inputs }: { inputs: AdminInputs }) {
  const p = TECH.providers;
  const costs = providerCosts(inputs);
  return (
    <>
      {costs.example && <p className="mb-4 text-small text-muted">{p.exampleNote}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-ink/8 text-small text-muted">
              <th scope="col" className="py-2 pr-6 font-normal">{p.columns.name}</th>
              <th scope="col" className="py-2 pr-6 font-normal">{p.columns.purpose}</th>
              <th scope="col" className="py-2 pr-6 font-normal">{p.columns.adapter}</th>
              <th scope="col" className="w-[40%] py-2 font-normal">{p.columns.cost}</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((item) => {
              const { share, level } = costs.shares[item.key];
              return (
                <tr key={item.key} className="border-b border-ink/8">
                  <th scope="row" className="py-3 pr-6 font-semibold text-ink">{item.name}</th>
                  <td className="py-3 pr-6 text-ink">{item.purpose}</td>
                  <td className="py-3 pr-6 text-ink">{item.adapter ? p.yes : p.no}</td>
                  <td className="py-3">
                    {share === null ? (
                      <span className="text-muted">{NOT_MEASURABLE}</span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <span aria-hidden className="h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-ink/8">
                          <span className="block h-full rounded-full bg-ink/70" style={{ width: `${Math.min(100, (share / COST_SCALE) * 100)}%` }} />
                        </span>
                        {level && <StatusDot status={level} />}
                        <span className={cn("tabular-nums", level ? `font-semibold ${COST_TEXT[level]}` : "text-ink")}>{`${dec(share)} %`}</span>
                        {level === "critical" && <span className="text-small text-adm-critical">{p.checkOwn}</span>}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Standort ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Vision › Standort (config/vision.ts LOCATION): the note on top, three parts as capsules, the decision at the end of each. */
function LocationView({ inputs }: { inputs: AdminInputs }) {
  const [section, setSection] = useState<LocationSection>("why");
  return (
    <>
      <p className="mb-(--adm-inner) text-body text-muted">{LOCATION.note}</p>
      <AdminSubTabs label="Standort" className="mb-10" value={section} onChange={setSection} tabs={LOCATION.sections.map((s) => ({ value: s.key, label: s.label }))} />
      {section === "why" && <LocationWhy />}
      {section === "candidates" && <LocationCandidates />}
      {section === "window" && <LocationWindow inputs={inputs} />}
      <LocationDecision inputs={inputs} />
    </>
  );
}

/** Two columns – what doesn't fit for good, what is right for the start –, then the line Germany → move → abroad. */
function LocationWhy() {
  const w = LOCATION.why;
  return (
    <>
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="min-w-0">
          <h3 className="mb-4 text-eyebrow uppercase text-(--adm-label)">{w.againstTitle}</h3>
          <ol className="flex flex-col gap-4">
            {w.against.map((text, i) => (
              <li key={text} className="flex gap-4 text-body text-ink">
                <span className="w-5 shrink-0 text-h3 tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0">{text}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="min-w-0 border-ink/8 lg:border-l lg:pl-12">
          <h3 className="mb-4 text-eyebrow uppercase text-(--adm-label)">{w.forTitle}</h3>
          <ul className="flex flex-col gap-4">
            {w.for.map((text) => (
              <li key={text} className="flex items-center gap-3 text-body text-ink">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-ink/70" />
                {text}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {/* The line: three stops on one rail; the first is where Simpulo stands. */}
      <ol className="relative mt-(--adm-section) grid grid-cols-3 gap-x-4">
        <span aria-hidden className="absolute left-1.5 right-1.5 top-1.5 h-px bg-ink/20" />
        {w.path.map((step, i) => (
          <li key={step} className="relative flex flex-col gap-3">
            <span aria-hidden className={cn("block size-3 rounded-full border-[1.5px]", i === 0 ? "border-adm-chart-1 bg-adm-chart-1" : "border-ink/40 bg-bg")} />
            {i === 0 && <Here />}
            <span className="text-body font-semibold text-ink">{step}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Each candidate's points (1–5) per criterion as dots and the weighted total as a bar, then the table. */
function LocationCandidates() {
  const c = LOCATION.candidates;
  const weightSum = c.criteria.reduce((n, k) => n + c.weights[k.key], 0);
  const totalOf = (key: string) => c.criteria.reduce((n, k) => n + (LOCATION.scores[key]?.[k.key] ?? 0) * c.weights[k.key], 0) / weightSum;
  return (
    <>
      <AdminSection title={c.scoreTitle} aside={<span className="text-small text-muted">{c.scoreNote}</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-ink/8 text-small text-muted">
                <th scope="col" className="py-2 pr-6 font-normal">{c.columns.country}</th>
                {c.criteria.map((k) => (
                  <th key={k.key} scope="col" className="py-2 pr-6 font-normal">{k.label}</th>
                ))}
                <th scope="col" className="w-56 py-2 font-normal">{c.total}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row) => {
                const total = totalOf(row.key);
                return (
                  <tr key={row.key} className="border-b border-ink/8">
                    <th scope="row" className="py-3 pr-6 font-semibold text-ink">{row.country}</th>
                    {c.criteria.map((k) => {
                      const v = LOCATION.scores[row.key]?.[k.key] ?? 0;
                      return (
                        <td key={k.key} className="py-3 pr-6">
                          <span role="img" aria-label={`${v} von 5`} className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span key={n} aria-hidden className={cn("size-2 rounded-full", n <= v ? "bg-ink/70" : "bg-ink/10")} />
                            ))}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3">
                      <span className="flex items-center gap-3">
                        <span aria-hidden className="h-2 w-36 overflow-hidden rounded-full bg-ink/8">
                          <span className="block h-full rounded-full bg-ink/70" style={{ width: `${(total / 5) * 100}%` }} />
                        </span>
                        <span className="text-small tabular-nums text-ink">{dec(Math.round(total * 10) / 10)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminSection>
      <div className="mt-(--adm-section) overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-ink/8 text-small text-muted">
              <th scope="col" className="py-2 pr-6 font-normal">{c.columns.country}</th>
              <th scope="col" className="py-2 pr-6 font-normal">{c.columns.tax}</th>
              <th scope="col" className="py-2 pr-6 font-normal">{c.columns.strengths}</th>
              <th scope="col" className="py-2 font-normal">{c.columns.weaknesses}</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row) => (
              <tr key={row.key} className="border-b border-ink/8 align-top">
                <th scope="row" className="py-3 pr-6 font-semibold text-ink">{row.country}</th>
                <td className="py-3 pr-6 text-ink">{row.tax}</td>
                <td className="py-3 pr-6 text-ink">{row.strengths}</td>
                <td className="py-3 text-ink">{row.weaknesses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * The time window: income climbs steadily, the value (and with it the tax when moving) stays low, then climbs steeply – between them the window.
 * Beside it live: profit this month, months in a row at 5.000 € and the status (open · soon · not yet), and the link to the tax advisor's questions.
 */
function LocationWindow({ inputs }: { inputs: AdminInputs }) {
  const w = LOCATION.window;
  const move = moveProgress(inputs);
  const status = move.reached ? "open" : move.streak > 0 || move.current >= move.target ? "soon" : "notYet";
  // The two curves on a 0–100 grid (x: time, y: up); the window between x 34 and 62.
  const income = Array.from({ length: 21 }, (_, i) => [i * 5, 12 + i * 3.4] as const);
  const value = Array.from({ length: 21 }, (_, i) => [i * 5, 6 + 70 * Math.pow(i / 20, 3.2)] as const);
  const path = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${(x * 4.4 + 20).toFixed(1)} ${(200 - y * 1.8).toFixed(1)}`).join(" ");
  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <figure className="min-w-0">
        <figcaption className="mb-3 text-eyebrow uppercase text-(--adm-label)">{w.chartTitle}</figcaption>
        <svg viewBox="0 0 480 220" role="img" aria-label={w.chartTitle} className="h-auto w-full max-w-[560px]">
          <rect x={20 + 34 * 4.4} y={20} width={(62 - 34) * 4.4} height={180} rx={8} className="fill-adm-chart-1-soft" />
          <text x={20 + 48 * 4.4} y={38} textAnchor="middle" className="fill-adm-chart-1 text-small font-semibold">
            {w.window}
          </text>
          <line x1={20} y1={200} x2={460} y2={200} className="stroke-ink/20" />
          <path d={path(income)} fill="none" strokeWidth={2} className="stroke-ink/70" />
          <path d={path(value)} fill="none" strokeWidth={2} className="stroke-adm-chart-3" />
          <text x={460} y={216} textAnchor="end" className="fill-muted text-small">
            {w.time} →
          </text>
        </svg>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-small text-ink">
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-ink/70" />
            {w.income}
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-adm-chart-3" />
            {w.value}
          </li>
        </ul>
      </figure>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-small text-muted">{w.profit}</p>
          <p className="mt-1 text-h1 tabular-nums text-ink">{eur(move.current)}</p>
        </div>
        <div>
          <p className="text-small text-muted">{w.streak}</p>
          <p className="mt-1 text-h1 tabular-nums text-ink">
            {move.streak} / {move.streakOf}
          </p>
          <StepMeter reached={move.streak} of={move.streakOf} label={w.streak} className="mt-2 w-48" />
        </div>
        <div>
          <p className="text-small text-muted">{w.status}</p>
          <p className="mt-1 flex items-center gap-2 text-h3 text-ink">
            <StatusDot status={status === "open" ? "good" : status === "soon" ? "warning" : null} />
            {w.statusLabel[status]}
          </p>
          <p className="mt-1 text-small text-muted">{w.rule}</p>
        </div>
        <Link href="/admin/money/taxes#fragen" className="text-body font-semibold text-ink hover:underline">
          {w.questionsLink}
        </Link>
      </div>
    </div>
  );
}

/** The decision: the chosen country (empty: "Noch offen") and why – saved through the adapter (AdminData.location), into the log. */
function LocationDecision({ inputs }: { inputs: AdminInputs }) {
  const d = LOCATION.decision;
  const actions = useAdminActions();
  const showToast = useToast();
  const saved = inputs.admin.location;
  const [country, setCountry] = useState(saved.country ?? "");
  const [reason, setReason] = useState(saved.reason);
  const options = LOCATION.candidates.rows.map((r) => r.country);
  return (
    <AdminSection title={d.title} className="mt-(--adm-section)" aside={<span className="text-small text-muted">{saved.country ?? d.open}</span>}>
      <form
        className="grid max-w-3xl gap-4 sm:grid-cols-[240px_minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          actions.decideLocation(country || null, reason.trim());
          showToast(d.saved);
        }}
      >
        <label className="flex flex-col gap-1.5 text-small text-muted">
          {d.country}
          <Select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{d.open}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-small text-muted">
          {d.reason}
          <Textarea value={reason} placeholder={d.reasonPlaceholder} onChange={(e) => setReason(e.target.value)} className="min-h-12" />
        </label>
        <span className="sm:col-span-2">
          <Button type="submit" variant="secondary" size="sm">
            {d.save}
          </Button>
        </span>
      </form>
    </AdminSection>
  );
}

// ── Kern ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const PILLAR_ICON: Record<(typeof CORE.pillars.items)[number]["key"], LucideIcon> = { matching: Users, arc: Hourglass, network: Network };

/** The motto, on top of the whole picture and of Kern. */
function Motto() {
  return (
    <>
      <p className="text-h2 text-ink text-balance">{MOTTO.line}</p>
      <p className="mt-2 text-body text-muted">{MOTTO.sub}</p>
    </>
  );
}

/**
 * Vision › Kern (config/vision.ts CORE), graphics first, no cards: the motto; (a) 200 Stunden – Alltag against House on one time scale, the
 * House bar the one ocean focus; (b) the three pillars, each with its live number (lib/admin/metrics.ts coreMetrics); (c) the arc of a House
 * and the three depths; (d) the network as circles, the loop and "Einladen"; the rules small underneath.
 */
function CoreView({ inputs }: { inputs: AdminInputs }) {
  const live = coreMetrics(inputs);
  const L = CORE.live;
  const numbers: Record<(typeof CORE.pillars.items)[number]["key"], { label: string; info: string; value: string; sub?: string }> = {
    matching: { label: L.matching.label, info: L.matching.info, value: live.again === null ? "–" : share(live.again), sub: live.again === null ? NOT_MEASURABLE : `${L.matching.sub} · ${L.matching.example}` },
    arc: { label: L.arc.label, info: L.arc.info, value: live.closingRounds === null ? "–" : num(live.closingRounds), sub: live.closingRounds === null ? L.arc.notMeasured : undefined },
    network: { label: L.network.label, info: L.network.info, value: num(live.yourPeoplePairs), sub: live.bookings.share === null ? undefined : L.network.share(share(live.bookings.share)) },
  };
  return (
    <div className="space-y-16">
      <section>
        <Motto />
      </section>
      <CoreHours />
      <section aria-label={CORE.pillars.title}>
        <h3 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{CORE.pillars.title}</h3>
        <div className="grid gap-y-10 md:grid-cols-3">
          {CORE.pillars.items.map((p, i) => {
            const Icon = PILLAR_ICON[p.key];
            const n = numbers[p.key];
            return (
              <div key={p.key} className={cn("min-w-0", i > 0 && "md:border-l md:border-ink/8 md:pl-8", i < 2 && "md:pr-8")}>
                <Icon aria-hidden className="size-7 text-ink" strokeWidth={1.5} />
                <p className="mt-4 text-h3 text-ink">{p.title}</p>
                <p className="text-body text-muted">{p.text}</p>
                <dl className="mt-(--adm-inner)">
                  <dt className="flex items-center gap-1 text-small text-muted">
                    {n.label}
                    <InfoTip text={n.info} />
                  </dt>
                  <dd className="mt-1 text-h1 tabular-nums text-ink">{n.value}</dd>
                  {n.sub && <dd className="mt-0.5 text-small text-muted">{n.sub}</dd>}
                </dl>
              </div>
            );
          })}
        </div>
      </section>
      <CoreArc />
      <CoreNetwork viaInvite={live.bookings.viaInvite} />
      <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/8 pt-6 text-small text-muted">
        {CORE.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  );
}

/** Two bars on one time scale (0–2 years): the everyday 200 hours over 1–2 years (dark to 1 year, lighter to 2), the House in 2 weeks. */
function CoreHours() {
  const H = CORE.hours;
  const at = (months: number) => `${(months / H.scaleMonths) * 100}%`;
  return (
    <section aria-label={H.title}>
      <h3 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{H.title}</h3>
      <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-5">
        <span className="text-body font-semibold text-ink">{H.everyday.label}</span>
        <div>
          <div className="relative h-3 rounded-full bg-ink/5" role="img" aria-label={H.everyday.text}>
            <span className="absolute inset-y-0 left-0 rounded-full bg-ink/15" style={{ width: at(H.everyday.toMonths) }} />
            <span className="absolute inset-y-0 left-0 rounded-full bg-ink/70" style={{ width: at(H.everyday.fromMonths) }} />
          </div>
          <p className="mt-1.5 text-small text-muted">{H.everyday.text}</p>
        </div>
        <span className="text-body font-semibold text-ink">{H.house.label}</span>
        <div>
          <div className="relative h-3 rounded-full bg-ink/5" role="img" aria-label={H.house.text}>
            <span className="absolute inset-y-0 left-0 min-w-3 rounded-full bg-adm-chart-1" style={{ width: at(H.house.months) }} />
          </div>
          <p className="mt-1.5 text-small font-semibold text-ink">{H.house.text}</p>
        </div>
        <span />
        <div aria-hidden className="relative h-4 text-small text-muted">
          {H.axis.map((label, i) => (
            <span key={label} className={cn("absolute top-0 whitespace-nowrap", i === 0 ? "" : i === H.axis.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${(i / (H.axis.length - 1)) * 100}%` }}>
              {label}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-(--adm-inner) text-small text-muted">{H.source}</p>
    </section>
  );
}

/** The arc of a House: five phases on one line (from 1024px across, below that down), each with its 2–3 keywords; then the three depths. */
function CoreArc() {
  const A = CORE.arc;
  const depthOn = useDepthChoice();
  return (
    <section aria-label={A.title}>
      <h3 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{A.title}</h3>
      <ol className="relative grid gap-y-6 lg:grid-cols-5">
        {/* The line through the dots */}
        <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-ink/15 lg:bottom-auto lg:left-0 lg:right-0 lg:top-[5px] lg:h-px lg:w-auto" />
        {A.phases.map((p, i) => (
          <li key={p.key} className="relative pl-8 lg:pl-0 lg:pr-6 lg:pt-8">
            <span aria-hidden className="absolute left-0 top-1 size-[11px] rounded-full border-2 border-ink bg-bg lg:top-0" />
            <p className="text-body font-semibold text-ink">
              <span className="mr-2 tabular-nums text-muted">{i + 1}</span>
              {p.title}
            </p>
            <ul className="mt-2 space-y-1">
              {p.points.map((point) => (
                <li key={point} className="text-small text-muted">
                  {point}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-(--adm-inner) text-small text-muted">{A.placeholder}</p>
      {/* The three depths (config/depth.ts) – each level switches more of the arc on. */}
      <div className="mt-(--adm-section) flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-eyebrow uppercase text-(--adm-label)">{A.depthsTitle}</h4>
        <span className="rounded-full border border-ink/12 px-2.5 py-0.5 text-small text-muted">{depthOn ? A.depthsOn : A.depthsOff}</span>
      </div>
      <ol className="mt-4 grid max-w-[880px] gap-1.5 sm:grid-cols-3">
        {A.depths.map((d, i) => (
          <li key={d.key} className={cn("flex min-h-20 flex-col justify-center rounded-[12px] px-5 py-3", ["bg-ink/5", "bg-ink/8", "bg-ink/12"][i])}>
            <span className="text-body font-semibold text-ink">{d.title}</span>
            <span className="text-small text-muted">{d.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The network: three circles inside each other – Gemerkt (private) · Lived with (automatic) · Your people (mutual), the closer the tighter –,
 * beside them the crew as a group; underneath the loop (House → Your people → see where you go → book along → new House) and "Einladen" with
 * its ways and the live number of bookings through invites.
 */
function CoreNetwork({ viaInvite }: { viaInvite: number }) {
  const N = CORE.network;
  const radii = [120, 84, 48];
  const tints = ["fill-ink/4", "fill-ink/8", "fill-ink/12"];
  return (
    <section aria-label={N.title}>
      <h3 className="mb-(--adm-inner) text-eyebrow uppercase text-(--adm-label)">{N.title}</h3>
      <div className="flex flex-wrap items-center gap-x-16 gap-y-8">
        <figure className="flex items-center gap-8">
          <svg viewBox="0 0 260 260" className="w-[220px] shrink-0 sm:w-[260px]" role="img" aria-label={N.circles.map((c) => `${c.title} (${c.text})`).join(" · ")}>
            {N.circles.map((c, i) => (
              <circle key={c.key} cx="130" cy="130" r={radii[i]} className={cn(tints[i], "stroke-ink/15")} strokeWidth="1" />
            ))}
            {N.circles.map((c, i) => (
              <g key={`${c.key}-label`} className="fill-ink">
                <text x="130" y={i === 2 ? 126 : 130 - radii[i] + 22} textAnchor="middle" className="text-small font-semibold">
                  {c.title}
                </text>
                <text x="130" y={i === 2 ? 144 : 130 - radii[i] + 38} textAnchor="middle" className="fill-ink/60 text-small">
                  {c.text}
                </text>
              </g>
            ))}
          </svg>
          {/* The crew: one group, everyone in the same House */}
          <div className="flex flex-col items-center gap-3">
            <svg viewBox="0 0 96 72" className="w-24" aria-hidden>
              {[
                [24, 22],
                [48, 14],
                [72, 22],
                [32, 50],
                [64, 50],
              ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="11" className="fill-ink/12 stroke-ink/25" strokeWidth="1" />
              ))}
            </svg>
            <div className="text-center">
              <p className="text-body font-semibold text-ink">{N.crew.title}</p>
              <p className="text-small text-muted">{N.crew.text}</p>
            </div>
          </div>
        </figure>
        <div className="min-w-0 flex-1 space-y-8">
          <div>
            <h4 className="mb-3 text-eyebrow uppercase text-(--adm-label)">{N.loopTitle}</h4>
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-body text-ink">
              {N.loop.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className={cn("rounded-full px-3 py-1", i === 0 || i === N.loop.length - 1 ? "bg-ink/8 font-semibold" : "bg-ink/4")}>{step}</span>
                  {i < N.loop.length - 1 && <ArrowRight aria-hidden className="size-4 text-muted" />}
                </li>
              ))}
              <li aria-hidden className="flex items-center gap-1 text-small text-muted">
                <RotateCcw className="size-4" />
              </li>
            </ol>
          </div>
          <div>
            <h4 className="mb-3 text-eyebrow uppercase text-(--adm-label)">{N.inviteTitle}</h4>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <ul className="flex flex-wrap gap-2">
                {N.invite.map((way) => (
                  <li key={way} className="rounded-full border border-ink/12 px-3 py-1 text-small text-ink">
                    {way}
                  </li>
                ))}
              </ul>
              <dl>
                <dt className="flex items-center gap-1 text-small text-muted">
                  {N.inviteLive.label}
                  <InfoTip text={N.inviteLive.info} />
                </dt>
                <dd className="mt-1 text-h2 tabular-nums text-ink">{num(viaInvite)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

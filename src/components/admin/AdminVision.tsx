"use client";
import { AdminButton } from "./AdminButton";

// /admin/vision – Vision as a map of building blocks (Warum · Wie · Wohin) with zoom and a timeline. The click row: Karte · Zeitleiste,
// right the phase ("Phase 1"); under it the motto (20px) and three numbers. Karte: BlockMap; a block zooms in
// (?block=<id>, breadcrumb "Vision › <Name>", "← Karte") to its content – the former tabs – under a one-line summary. Zeitleiste: the four
// phases as columns, the lanes as rows of capsules (folded "+N"); a phase's head zooms into the phase. Every text from config/vision.ts,
// every number from lib/admin/metrics.ts; the current phase is the one ocean focus ("Du bist hier"). First tab and the default: Überblick –
// only tiles (TileBoard, group Planen), the numbers of the blocks, each opening its block zoom, the map or the timeline.
import { ArrowRight, Building2, Castle, ChevronLeft, Coins, Diamond, Hourglass, House, MapPin, Network, RotateCcw, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type ReactNode } from "react";
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
  VISION_VIEW_ALIASES,
  type BlockId,
  type LaneKey,
  type VisionView,
  CONTINUUM,
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
  LOCATION,
  type LocationSection,
  type LaneItem,
  type Phase,
  type PhaseKey,
  type Segment,
  type SegmentPhase,
  type Source,
  type SourceStatus,
} from "@/config/vision";
import { money, fundingReadiness, connectionRateNow, visionLayerNumbers, coreMetrics, getStatus, byAccommodation, depthUnlockValue, fullHousesPerMonth, revenueLast12, revenueBySource, algorithmMetrics, visionPhase, type AdminInputs } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { ADMIN_DE } from "@/lib/i18n/admin.de";
import { dec, eur, num, pct, share } from "@/lib/i18n/adminFormat";
import { InfoTip } from "./AdminNumbers";
import { cn } from "@/lib/utils";
import { ProgressBar, StatusDot } from "./AdminCharts";
import { AdminSection, AdminShell } from "./AdminShell";
import { AdminSubTabs, AdminTabs } from "./AdminLayout";
import { OVERVIEW_TARGETS } from "@/config/admin";
import { goVision, VISION_NAV } from "@/lib/admin/visionNav";
import { HOF } from "@/config/vision-hof";
import { HofPartView, HofParts } from "./vision/HofParts";
import { ContinuumForms, LongevityView } from "./vision/VisionDiagrams";
import { chunkRows, TileBoard, type TileSpec } from "./AdminTiles";
import { VISION_LAYERS } from "@/lib/admin/vision/layers";
import { VisionLayers } from "./vision/VisionLayers";
import { routeTiles, withUnits } from "./tileRoutes";

export function AdminVision() {
  const inputs = useAdminInputs();
  const { view, block, go, back, focus } = useVisionUrl();
  const phase = PHASES.find((p) => p.key === PHASE_NOW)!;
  const zoomed = block ? zoomOf(block, (next) => go({ view, block: next })) : null;
  const tOverview = useTranslations("admin.overviewBlock");
  return (
    <AdminShell
      title={VISION_TITLE}
      tabs={
        !zoomed ? (
          <AdminTabs<VisionTab> label={VISION_TITLE} value={view} onChange={(next) => go({ view: next, block: null })} tabs={withUnits("vision", [{ value: "overview" as const, label: tOverview("tab") }, ...VISION_VIEWS.map((v) => ({ value: v.key, label: v.label }))])} />
        ) : (
          <Crumbs title={zoomed.title} onBack={back} backLabel={zoomed.backLabel ?? (view === "overview" ? `← ${tOverview("tab")}` : zoomed.fromTimeline ? BLOCK_MAP_TEXT.backTimeline : BLOCK_MAP_TEXT.back)} />
        )
      }
      aside={
        <span className="inline-flex items-center gap-2 text-body text-ink">{BLOCK_MAP_TEXT.status(phase.number)}</span>
      }
    >
      {zoomed ? (
        <section aria-label={zoomed.title}>
          {/* One line summary (at most 12 words), then the block's content. */}
          <p className="mb-(--adm-section) text-body-lg text-ink/80">{zoomed.summary}</p>
          {zoomed.content(inputs)}
        </section>
      ) : view === "overview" ? (
        <VisionOverview inputs={inputs} />
      ) : view === "layers" ? (
        // Schichten: the four layers with the continuum axis and the detail field; the flywheel small as the close.
        <VisionLayers key={focus ?? "layers"} inputs={inputs} focus={focus} onZoom={(id) => go({ view: "layers", block: id })} />
      ) : view === "continuum" ? (
        <>
          <ContinuumForms />
          <ContinuumView inputs={inputs} />
        </>
      ) : view === "market" ? (
        // Markt: the motto and the three numbers, then the T-model (where the money comes from).
        <>
          <p className="text-adm-motto text-ink">{MOTTO.line}</p>
          <OverviewNumbers inputs={inputs} />
          <div className="mt-(--adm-section)">
            <TModelView inputs={inputs} />
          </div>
        </>
      ) : view === "segments" ? (
        <>
          <SegmentsView />
          <div className="mt-(--adm-section)">
            <LongevityView />
          </div>
        </>
      ) : view === "roadmap" ? (
        // Roadmap: the phases' timeline (a phase's head zooms in), under it the stages to the stock market.
        <>
          <Timeline inputs={inputs} onOpenPhase={(key) => go({ view: "roadmap", block: key })} />
          <div className="mt-(--adm-section)">
            <RoadmapView />
          </div>
        </>
      ) : (
        <LocationView inputs={inputs} />
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
  // No ?view= is the Überblick (the default); ?view=map and ?view=timeline the other two.
  // ?view= (Vision's own) or ?tab= (a tile's route, config/admin-tiles.ts – the same capsules).
  const raw0 = params.get("view") ?? params.get("tab");
  const raw = raw0 ? (VISION_VIEW_ALIASES[raw0] ?? raw0) : null;
  const view: VisionTab = VISION_VIEWS.some((v) => v.key === raw) ? (raw as VisionView) : "overview";
  const block = params.get("block");
  const go = (next: { view: VisionTab; block: string | null }) => {
    const p = new URLSearchParams();
    if (next.view !== "overview") p.set("view", next.view);
    if (next.block) p.set("block", next.block);
    const q = p.toString();
    goVision(q ? `?${q}` : "");
  };
  const back = () => {
    // Back to the map (or the timeline a phase was opened from): the browser's own back when we came from there, else push it.
    if (window.history.state === null && window.history.length > 1) window.history.back();
    else go({ view, block: null });
  };
  return { view, block, go, back, focus: params.get("focus") };
}

type VisionTab = "overview" | VisionView;

/**
 * Überblick (CLAUDE.md "Vision"): eight tiles in the one tile plan, group Planen, no scrolling – Schichten · Kontinuum · Markt · Zielgruppen ·
 * Verbindung · Roadmap · Standort · Finanzierung; each leads to its capsule (config/admin-tiles.ts, "vision"), Finanzierung to its page.
 */
function VisionOverview({ inputs }: { inputs: AdminInputs }) {
  const t = useTranslations("admin.pageTiles.vision");
  const N = PHASE_TEXT.overviewNumbers;
  const ready = fundingReadiness(inputs);
  const connection = connectionRateNow(inputs);
  const layerNumbers = visionLayerNumbers(inputs);
  const country = inputs.admin.location?.country ?? null;
  const phase = PHASES.find((p) => p.key === PHASE_NOW)!;
  const nextPhase = PHASES.find((p) => p.number === phase.number + 1);
  const now = VISION_LAYERS.find((l) => l.status === "now")!;
  const next = VISION_LAYERS.find((l) => l.status === "next");
  // "10–25 Mrd. € pro Jahr" → the value with its unit ("10–25 Mrd. €", CLAUDE.md "Einheit am Hauptwert"), the rest ("pro Jahr") as a line.
  const split = (text: string) => {
    const at = text.indexOf("€");
    return at < 0 ? { value: text, unit: undefined } : { value: text.slice(0, at + 1).trim(), unit: text.slice(at + 1).trim() || undefined };
  };
  const market = split(N.market.value);
  const leader = split(N.leader.value);
  const keep = (...lines: (string | null | undefined)[]) => lines.filter((l): l is string => Boolean(l));
  const sourcesBy = (status: "live" | "idea") => CONTINUUM.groups.reduce((n, g) => n + g.sources.filter((src) => src.status === status).length, 0);
  const segmentsNow = SEGMENTS.filter((seg) => seg.phase === SEGMENT_PHASE_NOW).length;
  const critShort = { repeatRate: t("crit.repeatRate"), fullHousesGrowth: t("crit.fullHousesGrowth"), hubsFill: t("crit.hubsFill"), contribution: t("crit.contribution") } as const;
  const tiles: TileSpec[] = [
    {
      key: "layers",
      label: t("layers.label"),
      info: t("layers.info"),
      value: t("layers.value", { n: String(now.no), total: String(VISION_LAYERS.length) }),
      details: keep(t("layersNow", { title: now.title }), next ? t("layersNext", { title: next.title }) : null, t("layersRelease", { met: num(layerNumbers.places.met), of: num(layerNumbers.places.of) })),
    },
    {
      key: "continuum",
      label: t("continuum.label"),
      info: t("continuum.info"),
      value: t("continuum.value"),
      details: keep(t("contNow"), t("contNext"), t("contLater"), t("liveIdea", { live: String(sourcesBy("live")), idea: String(sourcesBy("idea")) })),
    },
    {
      key: "market",
      label: t("market.label"),
      info: t("market.info"),
      value: market.value,
      details: keep(market.unit, t("leaderLine", { value: leader.value }), t("todayLine", { value: eur(revenueLast12(inputs)) })),
    },
    {
      key: "segments",
      label: t("segments.label"),
      info: t("segments.info"),
      value: t("segments.value", { n: String(SEGMENTS.length) }),
      details: keep(t("segmentsNow", { count: String(segmentsNow) }), ...SEGMENTS.map((seg) => seg.name)),
    },
    {
      key: "connection",
      label: t("connection.label"),
      info: t("connection.info"),
      value: connection === null ? NOT_MEASURABLE : pct(connection),
      target: { text: t("coreTarget", { target: pct(OVERVIEW_TARGETS.connectionRate) }), status: getStatus("connectionRate", connection) },
      details: keep(t("coreWhat"), t("coreSource"), t("connectionLayer")),
    },
    {
      key: "roadmap",
      label: t("roadmap.label"),
      info: t("roadmap.info"),
      value: t("phase.value", { n: String(phase.number), total: String(PHASES.length) }),
      details: keep(phase.title, nextPhase ? t("nextPhase", { title: nextPhase.title }) : null, phase.goal ? t("goal", { goal: phase.goal }) : null),
    },
    {
      key: "location",
      label: t("location.label"),
      info: t("location.info"),
      value: country ?? t("location.open"),
      small: true,
      details: keep(t("candidates", { count: String(LOCATION.candidates.rows.length) }), ...LOCATION.candidates.rows.map((r) => r.country)),
    },
    {
      key: "funding",
      label: t("funding.label"),
      info: t("funding.info"),
      value: t("funding.value", { met: String(ready.met), total: String(ready.total) }),
      details: keep(t("funding.extra"), ...[...ready.items.filter((i) => !i.met), ...ready.items.filter((i) => i.met)].map((i) => t(i.met ? "critMet" : "critOpen", { name: critShort[i.key] }))),
    },
  ];
  return <TileBoard label={VISION_TITLE} columns={4} rows={chunkRows(routeTiles("vision", tiles), "plan", 4)} />;
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
    places: (inputs) => <PlacesView inputs={inputs} />,
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
        <span aria-hidden className={cn("col-end-[-1] mt-2 h-1 overflow-hidden rounded-full bg-adm-chart-track", number ? "col-start-3" : "col-start-2")}>
          <span className="block h-full rounded-full bg-adm-chart-primary" style={{ width: `${(value / total) * 100}%` }} />
        </span>
      )}
    </li>
  );
}

// ── Gesamtbild ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The diamond with what opens the next phase ("noch nicht messbar" – no money target opens a phase). */
function UnlockMark({ phase, wide = false }: { phase: Phase; inputs?: AdminInputs; wide?: boolean }) {
  if (!phase.unlock) return <p className="text-small text-muted">{PHASE_TEXT.none}</p>;
  return (
    <div className="flex gap-2.5">
      <span aria-hidden className="mt-1 size-3 shrink-0 rotate-45 border-[1.5px] border-ink" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-ink", wide ? "text-body font-semibold" : "text-small")}>{phase.unlock.label}</p>
        <p className="mt-1 text-small text-muted">{NOT_MEASURABLE}</p>
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

/** The numbers that count in a phase (Phase 1: full Houses per month, profit this month – no money target –, repeat guests), with their status dots. */
function PhaseMetrics({ metrics, inputs }: { metrics: Phase["metrics"]; inputs: AdminInputs }) {
  const full = fullHousesPerMonth(inputs);
  const profit = money(inputs).profitThisMonth;
  const repeat = algorithmMetrics(inputs).repeatRate;
  const repeatPct = repeat === null ? null : Math.round(repeat * 100);
  const all = {
    fullHouses: { value: String(full.current), sub: PHASE_TEXT.ofTarget(String(full.target)), status: full.status },
    profit: { value: eur(profit), sub: undefined, status: null },
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

/** Colour by phase (Regel „Admin-Diagramme“: at most three colours): launch primary, early chart-2, growth chart-3, the later ones in greys. */
const PHASE_BG: Record<SegmentPhase, string> = {
  launch: "bg-adm-chart-primary",
  early: "bg-adm-chart-2",
  afterLaunch: "bg-adm-chart-2",
  growth: "bg-adm-chart-3",
  scale: "bg-adm-chart-compare",
  abroad: "bg-adm-chart-4",
};
/** The legend: one entry per colour (early and "kurz nach Launch" share one). */
const PHASE_LEGEND: readonly SegmentPhase[] = ["launch", "early", "growth", "scale", "abroad"];

const billions = (min: number, max: number) => `${dec(min)}–${dec(max)} ${SEGMENTS_TEXT.billions}`;
const usersOf = (s: Segment) => `${dec(s.users.min)}–${dec(s.users.max)} ${SEGMENTS_TEXT.millions}${s.users.unit ? ` ${s.users.unit}` : ""}`;
const perStayOf = (s: Segment) => `${eur(s.simpuloPerStay.amount)}${s.simpuloPerStay.unit ? ` ${s.simpuloPerStay.unit}` : ""}`;

/**
 * Who Simpulo could be for (config/vision.ts SEGMENTS – rough assumptions to change there): horizontal bars of the theoretical revenue per
 * group (the range lighter, colour by phase, the current phase in primary), the season strip (which groups fill which months), the table and
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
        return <span key={month} aria-hidden className={cn("h-4 rounded-[4px]", on ? PHASE_BG[segment.phase] : "bg-adm-chart-track", on && !strong && "opacity-45")} />;
      })}
    </>
  );
}

// ── Technik ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────








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
                              <span key={n} aria-hidden className={cn("size-2 rounded-full", n <= v ? "bg-adm-chart-primary" : "bg-adm-chart-track")} />
                            ))}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3">
                      <span className="flex items-center gap-3">
                        <span aria-hidden className="h-2 w-36 overflow-hidden rounded-full bg-adm-chart-track">
                          <span className="block h-full rounded-full bg-adm-chart-primary" style={{ width: `${(total / 5) * 100}%` }} />
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
          <AdminButton type="submit" variant="secondary">
            {d.save}
          </AdminButton>
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
    matching: { label: L.matching.label, info: L.matching.info, value: live.again === null ? "–" : share(live.again), sub: live.again === null ? NOT_MEASURABLE : L.matching.sub },
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
          <div className="relative h-3 rounded-full bg-adm-chart-track" role="img" aria-label={H.everyday.text}>
            <span className="absolute inset-y-0 left-0 rounded-full bg-adm-chart-primary-soft" style={{ width: at(H.everyday.toMonths) }} />
            <span className="absolute inset-y-0 left-0 rounded-full bg-adm-chart-primary" style={{ width: at(H.everyday.fromMonths) }} />
          </div>
          <p className="mt-1.5 text-small text-muted">{H.everyday.text}</p>
        </div>
        <span className="text-body font-semibold text-ink">{H.house.label}</span>
        <div>
          <div className="relative h-3 rounded-full bg-adm-chart-track" role="img" aria-label={H.house.text}>
            <span className="absolute inset-y-0 left-0 min-w-3 rounded-full bg-adm-chart-2" style={{ width: at(H.house.months) }} />
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

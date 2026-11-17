"use client";

// Admin › Vision, the diagrams added on top of blocks (boxes and lines, the BlockMap like the flows in Algorithmus):
//   ContinuumForms – Simpulo, Zusammenleben auf Zeit → Day House · Wochenende · 1–4 Wochen · Hof / Dorf; the sentence; "Positionierung".
//   HofTogether    – MARKTPLATZ → five pillars → DER HOF ("Wo alles zusammenkommt").
//   HofBranches    – Der Hof → six branches, each opening its part (or Finanzierung › Firmenstruktur, or Longevity).
//   LongevityView  – five factors → LÄNGER UND BESSER LEBEN; products, limits, sources (to check before any use outside), the sentence.
// Texts from lib/admin/vision/*.ts.
import { Activity, Building2, Calendar, CalendarDays, Castle, Cpu, HeartPulse, Home, Layers, MapPin, Puzzle, Sparkles, Store, Sun, Users, type LucideIcon } from "lucide-react";
import { CONTINUUM_FORMS } from "@/lib/admin/vision/continuum";
import { HOF_BRANCHES, HOF_TOGETHER } from "@/lib/admin/vision/hofOverview";
import { LONGEVITY } from "@/lib/admin/vision/longevity";
import { goVision } from "@/lib/admin/visionNav";
import { BlockMap } from "../BlockMap";

const link = (from: string, to: string) => ({ from, to, weight: 2 });

function Capsules({ items, dashed = false }: { items: readonly string[]; dashed?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className={dashed ? "inline-flex h-7 items-center rounded-full border border-dashed border-ink/25 px-2.5 text-small text-ink/80" : "inline-flex h-7 items-center rounded-full bg-ink/6 px-2.5 text-small text-ink"}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Heading({ children }: { children: string }) {
  return <h2 className="mb-3 text-small font-semibold text-(--adm-label)">{children}</h2>;
}

const FORM_ICONS: Record<string, LucideIcon> = { day: Sun, weekend: CalendarDays, weeks: Calendar, hof: Castle };

export function ContinuumForms() {
  const C = CONTINUUM_FORMS;
  return (
    <section className="mb-(--adm-section)" aria-label={C.title}>
      <div className="max-w-4xl">
        <BlockMap
          label={C.title}
          compact
          links={C.forms.map((f) => link(C.root.id, f.id))}
          columns={[
            { key: "root", label: C.rootLabel, blocks: [{ id: C.root.id, icon: Layers, title: C.root.title, subtitle: C.root.subtitle, status: "none" }] },
            { key: "forms", label: C.formsLabel, blocks: C.forms.map((f) => ({ id: f.id, icon: FORM_ICONS[f.id] ?? Home, title: f.title, subtitle: f.subtitle, status: "none" as const })) },
          ]}
        />
      </div>
      <p className="mt-(--adm-inner) text-adm-block text-ink">{C.sentence}</p>
      <div className="mt-(--adm-inner) max-w-3xl rounded-xl border border-ink/20 bg-(--adm-block) px-4 py-3">
        <p className="text-small font-semibold text-(--adm-label)">{C.positioning.title}</p>
        <p className="mt-1 text-adm-block leading-normal text-ink">{C.positioning.text}</p>
        <p className="mt-2 text-small text-ink/70">
          {C.positioning.categoryLabel}: <span className="font-semibold text-ink">{C.positioning.category}</span>
        </p>
      </div>
    </section>
  );
}

const PILLAR_ICONS: Record<string, LucideIcon> = { people: Users, moment: Sparkles, space: Building2, place: MapPin, tech: Cpu };

export function HofTogether() {
  const H = HOF_TOGETHER;
  return (
    <section className="mb-(--adm-section)" aria-label={H.title}>
      <Heading>{H.title}</Heading>
      <BlockMap
        label={H.title}
        compact
        links={[...H.pillars.map((p) => link(H.base.id, p.id)), ...H.pillars.map((p) => link(p.id, H.goal.id))]}
        columns={[
          { key: "base", label: H.baseLabel, blocks: [{ id: H.base.id, icon: Store, title: H.base.title, subtitle: H.base.subtitle, status: "none" }] },
          { key: "pillars", label: H.pillarsLabel, blocks: H.pillars.map((p) => ({ id: p.id, icon: PILLAR_ICONS[p.id] ?? Layers, title: p.title, subtitle: p.subtitle, status: "none" as const })) },
          { key: "goal", label: H.goalLabel, blocks: [{ id: H.goal.id, icon: Castle, title: H.goal.title, status: "none" }] },
        ]}
      />
    </section>
  );
}

const BRANCH_ICONS: Record<string, LucideIcon> = { muster: Layers, beweis: Activity, produkte: Puzzle, eigentum: Building2, markt: Store, longevity: HeartPulse };

export function HofBranches({ onOpenPart }: { onOpenPart: (part: string) => void }) {
  const B = HOF_BRANCHES;
  return (
    <section className="mb-(--adm-section)" aria-label={B.title}>
      <Heading>{B.title}</Heading>
      <div className="max-w-4xl">
        <BlockMap
          label={B.title}
          compact
          links={B.branches.map((b) => link("center", b.id))}
          columns={[
            { key: "center", label: B.centerLabel, blocks: [{ id: "center", icon: Castle, title: B.title.toUpperCase(), status: "none" }] },
            {
              key: "branches",
              label: B.branchesLabel,
              blocks: B.branches.map((b) => ({
                id: b.id,
                icon: BRANCH_ICONS[b.id] ?? Layers,
                title: b.title,
                subtitle: b.subtitle,
                status: "none" as const,
                // A part opens inside Der Hof; Eigentum jumps to Finanzierung › Firmenstruktur; Longevity to its own block.
                ...(b.href ? { externalTab: b.href } : b.part ? { href: `?block=hof.${b.part}`, onOpen: () => onOpenPart(b.part!) } : { href: `?block=${b.block}`, onOpen: () => goVision(`?block=${b.block}`) }),
              })),
            },
          ]}
        />
      </div>
    </section>
  );
}

const FACTOR_ICONS: Record<string, LucideIcon> = { belonging: Home, connection: Users, meaning: Sparkles, transitions: MapPin, habits: Activity };

export function LongevityView() {
  const L = LONGEVITY;
  return (
    <div className="flex flex-col gap-(--adm-section)">
      <div className="max-w-4xl">
        <BlockMap
          label={L.goal.title}
          compact
          links={L.factors.map((f) => link(f.id, L.goal.id))}
          columns={[
            { key: "factors", label: L.factorsLabel, blocks: L.factors.map((f) => ({ id: f.id, icon: FACTOR_ICONS[f.id] ?? Layers, title: f.title, subtitle: f.subtitle, status: "none" as const })) },
            { key: "goal", label: L.goalLabel, blocks: [{ id: L.goal.id, icon: HeartPulse, title: L.goal.title, status: "none" }] },
          ]}
        />
      </div>
      <div className="grid gap-x-8 gap-y-(--adm-inner) md:grid-cols-2">
        <section>
          <Heading>{L.productsTitle}</Heading>
          <Capsules items={L.products} />
        </section>
        <section>
          <Heading>{L.limitsTitle}</Heading>
          <Capsules items={L.limits} dashed />
        </section>
      </div>
      <section>
        <Heading>{L.sourcesTitle}</Heading>
        <ul className="flex flex-col gap-1 text-small text-ink/85">
          {L.sources.map((s) => (
            <li key={s}>· {s}</li>
          ))}
        </ul>
        <p className="mt-2 text-small text-ink/50">{L.sourcesNote}</p>
      </section>
      <p className="text-adm-block text-ink">{L.sentence}</p>
    </div>
  );
}

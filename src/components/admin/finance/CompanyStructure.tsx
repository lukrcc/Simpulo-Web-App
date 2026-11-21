"use client";

// Admin › Finanzierung › Firmenstruktur: a sub-navigation Gruppe · Höfe · Franchise · Phasen. The diagrams are boxes and lines – the BlockMap
// with its connections, like the flows in Algorithmus; the rest blocks, capsules and a compact table (CLAUDE.md "Lesbarkeit im Admin").
// Every text from lib/admin/finance/structure.ts; strategic orientation, no financial or legal advice.
import { ArrowRight, Building2, CornerDownLeft, Cpu, Diamond, Handshake, Home, Landmark, Layers, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import { STRUCTURE, type StructureBox, type StructureView } from "@/lib/admin/finance/structure";
import { cn } from "@/lib/utils";
import { AdminSubTabs } from "../AdminLayout";
import { BlockMap, type MapColumn } from "../BlockMap";

const S = STRUCTURE;
const ICONS: Record<string, LucideIcon> = {
  group: Layers,
  tech: Cpu,
  places: Building2,
  simpulo: Cpu,
  earns: Wallet,
  fund: Landmark,
  partner: Handshake,
  coop: Users,
  decides: Layers,
  fills: Store,
  franchise: Store,
  operating: Handshake,
  own: Home,
};

function Tags({ tags }: { tags: readonly string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex min-h-6 items-center rounded-full bg-ink/6 px-2.5 py-0.5 text-small leading-normal text-ink/85">
          {t}
        </span>
      ))}
    </span>
  );
}

/** A diagram: the config's columns of boxes and their lines, drawn by the BlockMap. */
function Diagram({ label, columns, links }: { label: string; columns: readonly { key: string; label: string; boxes: readonly StructureBox[] }[]; links: readonly { from: string; to: string }[] }) {
  const mapColumns: MapColumn[] = columns.map((c) => ({
    key: c.key,
    label: c.label,
    blocks: c.boxes.map((b) => ({
      id: b.id,
      icon: ICONS[b.id] ?? Layers,
      title: b.title,
      status: "none" as const,
      // The line under the title wraps (a box's text, not a five-word subtitle); the facts as capsules.
      extra:
        b.subtitle || b.tags ? (
          <span className="flex flex-col gap-1.5">
            {b.subtitle && <span className="text-small leading-normal text-ink/70">{b.subtitle}</span>}
            {b.tags && <Tags tags={b.tags} />}
          </span>
        ) : undefined,
    })),
  }));
  return (
    // Narrow screens: the boxes stack (the lines show from 1024px).
    <BlockMap label={label} columns={mapColumns} links={links.map((l) => ({ ...l, weight: 2 }))} />
  );
}

/** The tab's sub-navigation (Gruppe · Höfe · Franchise · Phasen) – AdminSubTabs right under the head's row (AdminFunding passes it there). */
export function CompanyStructureTabs({ view, onChange }: { view: StructureView; onChange: (view: StructureView) => void }) {
  return <AdminSubTabs label={S.tab} value={view} onChange={onChange} tabs={S.views.map((v) => ({ value: v.key, label: v.label }))} />;
}

export function CompanyStructure({ view }: { view: StructureView }) {
  return (
    <section aria-label={S.tab}>
      <div>
        {view === "group" && <Group />}
        {view === "farms" && <Farms />}
        {view === "franchise" && <Franchise />}
        {view === "phases" && <Phases />}
      </div>
      <p className="mt-(--adm-section) text-small text-ink/50">{S.note}</p>
    </section>
  );
}

function Group() {
  const G = S.group;
  return (
    <>
      <div className="max-w-4xl">
        <Diagram label={S.views[0].label} columns={G.columns} links={G.links} />
      </div>
      {/* The way back: returns from Places to the group. */}
      <p className="mt-3 flex items-center gap-2 text-small text-ink/80">
        <CornerDownLeft aria-hidden className="size-4 shrink-0 text-ink/60" />
        <span className="text-ink/50">{G.backFrom}:</span>
        {G.back}
      </p>
      <div className="mt-(--adm-section) grid gap-x-8 gap-y-(--adm-inner) lg:grid-cols-2">
        <section className="rounded-xl border border-ink/8 bg-(--adm-block) px-4 py-3">
          <h3 className="text-adm-block text-ink">{G.why.title}</h3>
          <div className="mt-2">
            <Tags tags={G.why.reasons} />
          </div>
          <p className="mt-3 text-small font-semibold text-(--adm-label)">{G.why.examplesTitle}</p>
          <div className="mt-1.5">
            <Tags tags={G.why.examples} />
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-small font-semibold text-(--adm-label)">{G.lifetime.title}</h3>
          <ol className="flex flex-wrap gap-1.5">
            {G.lifetime.items.map((item) => (
              <li key={item.label} className="flex min-w-24 flex-col rounded-xl border border-ink/8 bg-(--adm-block) px-3 py-2">
                <span className="text-small text-ink/60">{item.label}</span>
                <span className="text-body font-semibold text-ink">{item.value}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

function Farms() {
  const F = S.farms;
  return (
    <>
      <Diagram label={S.views[1].label} columns={F.columns} links={F.links} />
      <section className="mt-(--adm-section)">
        <h3 className="mb-2 text-small font-semibold text-(--adm-label)">{F.compare.title}</h3>
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[480px] max-w-3xl text-left text-small">
            <thead className="text-(--adm-label)">
              <tr className="border-b border-ink/8">
                <th className="h-(--adm-row-h) px-3 pl-0 font-medium" />
                {F.compare.ways.map((w, i) => (
                  <th key={w} className={cn("h-(--adm-row-h) px-3 font-medium", i === F.compare.recommended && "text-ink")}>
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {F.compare.rows.map((row) => (
                <tr key={row.label} className="border-b border-ink/8">
                  <td className="h-(--adm-row-h) px-3 pl-0 font-semibold text-ink">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={cn("h-(--adm-row-h) px-3", v === null ? "text-ink/40" : "text-ink/85", i === F.compare.recommended && "bg-(--adm-block)")}>
                      {v ?? F.compare.open}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* The recommendation, set apart. */}
        <p className="mt-(--adm-inner) max-w-3xl rounded-xl border border-ink/20 bg-(--adm-block) px-4 py-3 text-adm-block text-ink">{F.compare.recommendation}</p>
      </section>
    </>
  );
}

function Franchise() {
  const F = S.franchise;
  return (
    <>
      <Diagram label={S.views[2].label} columns={F.columns} links={F.links} />
      <section className="mt-(--adm-section)">
        <h3 className="mb-2 text-small font-semibold text-(--adm-label)">{F.controlTitle}</h3>
        <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {F.control.map((c) => (
            <li key={c.title} className="rounded-xl border border-ink/8 bg-(--adm-block) px-4 py-3">
              <p className="text-adm-block text-ink">{c.title}</p>
              {c.text && <p className="mt-0.5 text-small leading-normal text-ink/60">{c.text}</p>}
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-(--adm-section) text-adm-block text-ink">{F.sentence}</p>
      <p className="mt-2 max-w-3xl text-small leading-normal text-ink/60">{F.note}</p>
    </>
  );
}

/** The phases as a timeline; the release rule as a diamond before the first build. Narrow screens: one under the other. */
function Phases() {
  const P = S.phases;
  return (
    <ol className="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))] lg:pt-24" data-structure-phases>
      {P.steps.map((step, i) => (
        <li key={step.when} className="relative flex flex-col gap-2">
          {i === P.gateBefore && (
            // The release rule, visible: before the first build.
            <span className="flex items-start gap-2 rounded-xl border border-ink/25 px-3 py-2 text-small leading-normal text-ink lg:absolute lg:-top-2 lg:left-0 lg:right-3 lg:-translate-y-full">
              <Diamond aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {P.gate}
            </span>
          )}
          <span className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink/30 text-small tabular-nums text-ink/80">{i + 1}</span>
            <span className="text-adm-block text-ink">{step.when}</span>
            {i < P.steps.length - 1 && <ArrowRight aria-hidden className="ml-auto size-4 shrink-0 text-ink/30 max-lg:hidden" />}
          </span>
          <Tags tags={step.what} />
        </li>
      ))}
    </ol>
  );
}

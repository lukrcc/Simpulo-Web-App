"use client";

// Admin › Finanzierung › Firmenstruktur: a sub-navigation Gruppe · Höfe · Franchise · Phasen. The diagrams are boxes and lines – the BlockMap
// with its connections, like the flows in Algorithmus; the rest blocks, capsules and a compact table (CLAUDE.md "Lesbarkeit im Admin").
// Every text from lib/admin/finance/structure.ts; strategic orientation, no financial or legal advice.
import { ArrowRight, Building2, CornerDownLeft, Cpu, Diamond, Handshake, Home, Landmark, Layers, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import { STRUCTURE, type StructureBox, type StructureView } from "@/lib/admin/finance/structure";
import { cn } from "@/lib/utils";
import { placesEngine } from "@/lib/admin/metrics";
import { useAdminInputs } from "@/lib/admin/useAdminInputs";
import { eur, num, pct } from "@/lib/i18n/adminFormat";
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
        {view === "motors" && <Motors />}
        {view === "group" && <Group />}
        {view === "farms" && <Farms />}
        {view === "franchise" && <Franchise />}
        {view === "phases" && <Phases />}
      </div>
      {view !== "motors" && <p className="mt-(--adm-section) text-small text-ink/50">{S.note}</p>}
    </section>
  );
}

/**
 * Zwei Motoren: left the growth engine (Simpulo Tech), right the return engine (Simpulo Places); between them two arrows – "füllt die Orte"
 * (Tech → Places) and the return flowing back (Places → Tech); under each engine who invests there; the one sentence; the table "Besitzen
 * oder bestimmen" (the second way recommended); the return engine's numbers (prepared) with the release. Planen's orange and neutral only.
 */
function Motors() {
  const M = S.motors;
  const inputs = useAdminInputs();
  const engine = placesEngine(inputs);
  const r = engine.release;
  const numbers = [
    { label: M.numbers.running, value: num(engine.running) },
    { label: M.numbers.occupancy, value: engine.occupancy === null ? "–" : pct(Math.round(engine.occupancy * 100)), sub: engine.occupancy === null ? M.numbers.none : undefined },
    { label: M.numbers.payout, value: eur(engine.payoutPerYear) },
    { label: M.numbers.backflow, value: eur(engine.backflow) },
  ];
  return (
    <div data-motors className="flex flex-col gap-3">
      {/* The two engines and their two arrows. */}
      <section aria-label={S.views[0].label} className="grid items-stretch gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(200px,260px)_minmax(0,1fr)]">
        <EngineBox engine={M.growth} investor={M.investors[0]} accent />
        <div className="flex flex-col justify-center gap-4">
          <FlowArrow label={M.fills} direction="right" />
          <FlowArrow label={M.flowsBack} direction="left" />
        </div>
        <EngineBox engine={M.return} investor={M.investors[1]} />
      </section>
      <p className="text-adm-block text-ink">{M.product}</p>
      {/* Own or decide: the second way recommended (set apart). */}
      <section aria-labelledby="motors-compare">
        <h3 id="motors-compare" className="mb-1 text-small font-semibold text-(--adm-label)">{M.compare.title}</h3>
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[560px] text-left text-small">
            <thead className="text-(--adm-label)">
              <tr className="border-b border-ink/8">
                <th className="h-9 w-[22%] pr-3 font-medium" />
                {M.compare.ways.map((w, i) => (
                  <th key={w} className={cn("h-9 px-3 font-medium", i === M.compare.recommended && "rounded-t-lg bg-(--adm-block) text-ink")}>
                    {w}
                    {i === M.compare.recommended && <span className="ml-2 rounded-full border border-(--adm-group-plan) px-2 py-0.5 text-small font-semibold text-ink">{M.compare.recommendation}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {M.compare.rows.map((row) => (
                <tr key={row.label} className="border-b border-ink/8">
                  <td className="h-9 pr-3 font-semibold text-ink">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className={cn("h-9 px-3 text-ink/85", i === M.compare.recommended && "bg-(--adm-block) text-ink")}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {/* The return engine's numbers – prepared (no Places yet); the release is real. */}
      <section aria-labelledby="motors-numbers">
        <h3 id="motors-numbers" className="mb-1 flex items-center gap-2 text-small font-semibold text-(--adm-label)">
          {M.numbers.title}
          <span className="rounded-full border border-(--line) px-2 py-0.5 text-small font-normal text-muted">{M.numbers.prepared}</span>
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-y border-(--line) py-2 md:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.label} className="min-w-0">
              <dt className="truncate text-small text-muted">{n.label}</dt>
              <dd className="text-h3 font-semibold tabular-nums text-ink">{n.value}</dd>
              {n.sub && <dd className="text-small text-muted">{n.sub}</dd>}
            </div>
          ))}
        </dl>
        <p className="mt-2 text-small text-ink/80">
          {M.numbers.gate} <span className="text-muted">{M.numbers.release.replace("{met}", num(r.met)).replace("{of}", num(r.of)).replace("{percent}", num(r.percent))}</span>
        </p>
      </section>
      <p className="text-small text-ink/50">{M.note}</p>
    </div>
  );
}

/** One engine: its eyebrow, name, parts and what it does; under it who invests there. The growth engine carries the orange edge. */
function EngineBox({ engine, investor, accent = false }: { engine: { eyebrow: string; title: string; parts: readonly string[]; text: string }; investor: { who: string; what: string }; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className={cn("flex flex-1 flex-col gap-0.5 rounded-xl border bg-(--adm-tile-bg) px-4 py-2.5", accent ? "border-(--adm-group-plan)" : "border-(--adm-tile-edge)")}>
        <p className="text-eyebrow uppercase text-(--adm-group-plan)">{engine.eyebrow}</p>
        <p className="text-h3 font-semibold text-ink">{engine.title}</p>
        <p className="text-small text-ink/85">{engine.parts.join(" · ")}</p>
        <p className="text-small text-muted">{engine.text}</p>
      </div>
      <p className="flex items-center gap-2 px-1 text-small text-ink">
        <span className="font-semibold">{investor.who}</span>
        <ArrowRight aria-hidden className="size-3.5 shrink-0 text-(--adm-group-plan)" />
        <span className="text-ink/80">{investor.what}</span>
      </p>
    </div>
  );
}

/** An arrow between the engines with its words above. */
function FlowArrow({ label, direction }: { label: string; direction: "left" | "right" }) {
  return (
    <div className="flex flex-col items-stretch gap-1">
      <span className="text-center text-small leading-snug text-ink/85">{label}</span>
      <svg aria-hidden viewBox="0 0 100 10" preserveAspectRatio="none" className="h-2.5 w-full">
        <line x1="4" y1="5" x2="96" y2="5" stroke="var(--adm-group-plan)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {direction === "right" ? (
          <path d="M90 1 L97 5 L90 9" fill="none" stroke="var(--adm-group-plan)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ) : (
          <path d="M10 1 L3 5 L10 9" fill="none" stroke="var(--adm-group-plan)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  );
}

function Group() {
  const G = S.group;
  return (
    <>
      <div className="max-w-4xl">
        <Diagram label={S.views[1].label} columns={G.columns} links={G.links} />
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
      <Diagram label={S.views[2].label} columns={F.columns} links={F.links} />
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
      <Diagram label={S.views[3].label} columns={F.columns} links={F.links} />
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

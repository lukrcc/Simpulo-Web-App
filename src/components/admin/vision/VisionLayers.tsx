"use client";

// Admin › Vision › Schichten: the map "Vier Schichten" (CLAUDE.md "Vision") – one screen, no scrolling. Left the four layers
// stacked bottom → top (Marktplatz · Verbindungs-Infrastruktur · Raum-Standard · Simpulo Places), each with its status, today's real number
// and the next proof, marked as two groups (growth: 1–3, Tech · return: 4, Places); right the continuum axis (1 night … years), each stop in
// its layer's colour; under them, small, the flywheel. A click on a layer opens its detail field on the right: today's number, the next
// proof, its building blocks (a click zooms in, ?block=) and one way on. Only Planen's orange and neutral (like Market Cap). Words:
// lib/admin/vision/layers.ts.
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { visionLayerNumbers, type AdminInputs } from "@/lib/admin/metrics";
import { num, pct } from "@/lib/i18n/adminFormat";
import { VISION_CONTINUUM, VISION_FLYWHEEL, VISION_LAYERS, VISION_LAYERS_TEXT as T, type LayerKey, type VisionLayer } from "@/lib/admin/vision/layers";
import { cn } from "@/lib/utils";
import { setAdminSearch } from "@/lib/admin/urlState";
import { BLOCK_MAP, type BlockId } from "@/config/vision";
import { useFillHeight } from "../useFillHeight";

/** Each layer's share of Planen's orange – the stronger, the closer to today (the continuum's dots take the same). */
const STRENGTH: Record<LayerKey, number> = { marketplace: 100, infrastructure: 72, space: 48, places: 30 };
const tint = (key: LayerKey, alpha = 1) => `color-mix(in srgb, var(--adm-group-plan) ${Math.round(STRENGTH[key] * alpha)}%, transparent)`;

/** `focus`: a layer a tile led here (?focus=, e.g. "infrastructure" from "Verbindung") – chosen and marked. `onZoom`: a building block. */
export function VisionLayers({ inputs, focus = null, onZoom }: { inputs: AdminInputs; focus?: string | null; onZoom: (id: BlockId) => void }) {
  const [box, height] = useFillHeight<HTMLDivElement>(520);
  const [picked, setPicked] = useState<LayerKey>(() => VISION_LAYERS.find((l) => l.key === focus)?.key ?? "marketplace");
  const numbers = visionLayerNumbers(inputs);
  const layer = VISION_LAYERS.find((l) => l.key === picked)!;
  const metricOf = (l: VisionLayer): string => {
    switch (l.key) {
      case "marketplace":
        return num(numbers.marketplace);
      case "infrastructure":
        return numbers.infrastructure === null ? "–" : pct(numbers.infrastructure);
      case "space":
        return T.spaceOf.replace("{with}", num(numbers.space.with)).replace("{all}", num(numbers.space.all));
      case "places":
        return T.release.replace("{months}", num(numbers.places.met)).replace("{of}", num(numbers.places.of)).replace("{percent}", num(numbers.places.percent));
    }
  };
  // Top to bottom: layer 4 … 1.
  const stacked = VISION_LAYERS.toSorted((a, b) => b.no - a.no);
  return (
    <div ref={box} data-vision-layers className="grid gap-(--adm-grid-gap) lg:grid-cols-[minmax(0,1fr)_minmax(400px,40%)]" style={height ? ({ height } as CSSProperties) : undefined}>
      <section aria-label={T.label} className="flex min-h-0 flex-col gap-3">
        <div className="grid min-h-0 flex-1 grid-cols-[22px_minmax(0,1fr)_96px] gap-x-3">
          {/* The two engines, marked as two groups: Rendite (layer 4) and Wachstum (layers 1–3). */}
          <div className="grid min-h-0 grid-rows-4 gap-2 [@media(max-height:760px)]:gap-1" aria-hidden>
            <EngineMark label={T.engines.return} className="row-span-1" />
            <EngineMark label={T.engines.growth} className="row-span-3" />
          </div>
          <ol className="grid min-h-0 grid-rows-4 gap-2 [@media(max-height:760px)]:gap-1">
            {stacked.map((l) => {
              const on = l.key === picked;
              return (
                <li key={l.key} className="min-h-0">
                  <button
                    type="button"
                    data-layer={l.key}
                    data-focus-key={l.key}
                    aria-pressed={on}
                    aria-label={T.open.replace("{no}", String(l.no)).replace("{title}", l.title)}
                    onClick={() => setPicked(l.key)}
                    className={cn("adm-press relative flex size-full min-h-0 items-stretch overflow-hidden rounded-xl border text-left transition-colors duration-150", on ? "border-(--adm-group-plan) bg-(--adm-tile-bg) shadow-[inset_0_0_0_1px_var(--adm-group-plan)]" : "border-(--adm-tile-edge) bg-(--adm-tile-bg)")}
                  >
                    {/* The layer's band in its share of orange, with its number. */}
                    <span aria-hidden className="flex w-9 shrink-0 items-center justify-center text-h3 font-semibold text-ink" style={{ backgroundColor: tint(l.key, 0.55) }}>
                      {l.no}
                    </span>
                    {/* Title and status, today's number, the parts, the next proof – one column, words wrap instead of being cut. */}
                    <span data-layer-text className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-1 [&>span]:leading-snug [@media(max-height:760px)]:py-0.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-adm-block font-semibold text-ink">{l.title}</span>
                        <span className="shrink-0 rounded-full border border-(--line) px-2 py-0.5 text-small leading-none text-muted">{T.status[l.status]}</span>
                      </span>
                      <span className="text-small text-muted">
                        {l.metric} <span className="font-semibold tabular-nums text-ink">{metricOf(l)}</span>
                      </span>
                      <span className="text-small text-muted">{[l.parts.join(" · "), l.note].filter(Boolean).join(" – ")}</span>
                      <span className="text-small text-ink">
                        <span className="text-muted">{T.proof}: </span>
                        {l.proof}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <Continuum />
        </div>
        {/* The flywheel, small, as the close. */}
        <Flywheel />
      </section>
      {/* The detail field: the chosen layer and its former overview tiles. */}
      <aside aria-label={`${layer.no} · ${layer.title}`} data-layer-detail={layer.key} className="flex min-h-0 flex-col gap-3">
        <div className="shrink-0">
          <p className="text-eyebrow uppercase text-(--adm-label)">
            {layer.no} · {T.status[layer.status]}
          </p>
          <h2 className="text-h3 text-ink">{layer.title}</h2>
          <p className="mt-1 text-small text-ink">
            <span className="text-muted">{T.today}: </span>
            {layer.metric} {metricOf(layer)}
          </p>
          <p className="mt-2 text-small text-ink">
            <span className="text-muted">{T.proof}: </span>
            {layer.proof}
          </p>
          <p className="mt-3 text-eyebrow uppercase text-(--adm-label)">{T.detail}</p>
        </div>
        {/* The layer's building blocks: a click zooms in (the former map's content). */}
        <ul className="flex min-h-0 flex-col gap-2 overflow-hidden">
          {layer.blocks.length === 0 && <li className="text-small text-muted">{T.noBlocks}</li>}
          {layer.blocks.map((id) => {
            const def = BLOCK_MAP.flatMap((c) => c.blocks).find((b) => b.id === id);
            if (!def) return null;
            return (
              <li key={id}>
                <button type="button" data-block={id} onClick={() => onZoom(def.id)} className="adm-press flex w-full flex-col gap-0.5 rounded-xl border border-(--adm-tile-edge) bg-(--adm-tile-bg) px-4 py-3 text-left">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-adm-block font-semibold text-ink">{def.title}</span>
                    <span className="text-small text-muted">{def.subtitle}</span>
                  </span>
                  <span className="text-small text-ink">{def.summary}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {layer.link &&
          (layer.link.href.startsWith("/admin/vision") ? (
            // Within Vision: through the URL state (another capsule), so the page follows and back works.
            <button type="button" onClick={() => setAdminSearch(Object.fromEntries(new URL(layer.link!.href, window.location.origin).searchParams))} className="shrink-0 self-start text-small font-semibold text-ink hover:underline">
              {layer.link.label}
            </button>
          ) : (
            <Link href={layer.link.href} className="shrink-0 text-small font-semibold text-ink hover:underline">
              {layer.link.label}
            </Link>
          ))}
      </aside>
    </div>
  );
}

/** One engine group: a thin bracket with its name written upwards. */
function EngineMark({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("flex min-h-0 items-center justify-center rounded-l-md border-y border-l border-(--line)", className)}>
      <span className="whitespace-nowrap text-small text-muted [writing-mode:vertical-rl] rotate-180">{label}</span>
    </span>
  );
}

/** The continuum: an axis upwards from one night to living, each stop a dot in its layer's orange. */
function Continuum() {
  return (
    <div className="relative flex min-h-0 flex-col">
      <p className="mb-1 shrink-0 text-eyebrow uppercase text-(--adm-label)">{T.continuum}</p>
      <div className="relative min-h-0 flex-1">
        <svg aria-hidden className="absolute left-2 top-0 h-full w-3 overflow-visible" preserveAspectRatio="none">
          <line x1="6" y1="100%" x2="6" y2="6" stroke="var(--line)" strokeWidth="2" />
          <path d="M1 10 L6 2 L11 10" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" />
        </svg>
        <ol className="absolute inset-0 flex flex-col-reverse justify-between py-3 pl-1">
          {VISION_CONTINUUM.map((stop) => (
            <li key={stop.key} className="flex items-center gap-2.5">
              <span aria-hidden className="size-3.5 shrink-0 rounded-full border-2 border-(--bg)" style={{ backgroundColor: tint(stop.layer) }} />
              <span className="text-small text-ink">{stop.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** The flywheel: six steps in a row, the last feeding the first again (the curved line underneath). */
function Flywheel() {
  return (
    <div className="shrink-0">
      <p className="mb-1 text-eyebrow uppercase text-(--adm-label) [@media(max-height:760px)]:sr-only">{T.flywheel}</p>
      {/* Six equal columns – the steps never run out of the map; words wrap inside their capsule. */}
      <ol className="grid grid-cols-6 items-center gap-1">
        {VISION_FLYWHEEL.map((step, i) => (
          <li key={step} className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 flex-1 rounded-full border border-(--line) bg-(--adm-tile-bg) px-2 py-1 text-center text-small leading-tight text-ink">{step}</span>
            {i < VISION_FLYWHEEL.length - 1 && <span aria-hidden className="shrink-0 text-small text-(--adm-group-plan)">→</span>}
          </li>
        ))}
      </ol>
      <svg aria-hidden viewBox="0 0 100 10" preserveAspectRatio="none" className="mt-0.5 h-3 w-full [@media(max-height:760px)]:hidden">
        <path d="M96 0 C96 9, 4 9, 4 1" fill="none" stroke="var(--adm-group-plan)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <path d="M2 3 L4 0 L6 3" fill="none" stroke="var(--adm-group-plan)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

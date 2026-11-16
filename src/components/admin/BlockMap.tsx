"use client";

// BlockMap – a map of building blocks in columns, reusable across the admin (Vision, Algorithmus). Each column a small label (sentence case)
// and its blocks in a fixed order (never re-sorted). A block: surface white 4 %, line white 8 %, radius 12; icon 20px, title 16px, subtitle
// 13px white 60 % (at most five words), the metric 15px with its status dot, an optional line under it (`extra`: a small bar, three dots);
// hover white 7 %; the whole block is the link. A click zooms in (?block=<id> – a deep link, the browser's back works), jumps to another admin
// tab (`externalTab`) or selects it (`onOpen` + `selectedId`: bold, white, underlined – no surface).
// Connections (`links`): curved SVG lines between the columns, white 15 %, their width the link's weight (1–6px). Hovering a block lights
// its lines and the blocks it connects to (white 80 %); everything else fades to 25 %.
// Readability (CLAUDE.md "Admin"): blocks instead of paragraphs, left-aligned, line height 1.5, caps only for short labels.
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Status } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";
import { StatusDot } from "./AdminCharts";

export type BlockStatus = "ok" | "warn" | "open" | "none";

export interface MapBlock {
  id: string;
  icon: LucideIcon;
  title: string;
  /** At most five words */
  subtitle?: string;
  /** A number or a state from lib/admin/metrics.ts */
  metric?: ReactNode;
  status: BlockStatus;
  /** A line under the subtitle: a small bar, three dots */
  extra?: ReactNode;
  /** The zoom target (?block=<id>) – or `externalTab`, a jump into another admin tab */
  href?: string;
  externalTab?: string;
  onOpen?: () => void;
}

export interface MapColumn {
  key: string;
  label: string;
  blocks: readonly MapBlock[];
}

export interface MapLink {
  from: string;
  to: string;
  /** The line's width: 1–6px */
  weight: number;
}

/** ok – sage, warn – amber, open – a quiet neutral dot, none – no dot. */
const DOT: Record<BlockStatus, Status | null | undefined> = { ok: "good", warn: "warning", open: null, none: undefined };

export function BlockMap({ columns, label, links = [], selectedId = null, compact = false }: { columns: readonly MapColumn[]; label: string; links?: readonly MapLink[]; selectedId?: string | null; /** Lower blocks (Algorithmus: eight in a column) */ compact?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [paths, setPaths] = useState<{ key: string; d: string; weight: number; from: string; to: string }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Where each line runs: from the right edge of its block to the left edge of the other, a soft curve. Measured, and again on resize.
  useLayoutEffect(() => {
    if (links.length === 0) return;
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const origin = el.getBoundingClientRect();
      const rectOf = (id: string) => el.querySelector<HTMLElement>(`[data-block="${CSS.escape(id)}"]`)?.getBoundingClientRect();
      setSize({ w: origin.width, h: origin.height });
      setPaths(
        links.flatMap((link) => {
          const a = rectOf(link.from);
          const b = rectOf(link.to);
          if (!a || !b) return [];
          const x1 = a.right - origin.left;
          const y1 = a.top + a.height / 2 - origin.top;
          const x2 = b.left - origin.left;
          const y2 = b.top + b.height / 2 - origin.top;
          const dx = (x2 - x1) / 2;
          return [{ key: `${link.from}>${link.to}`, d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`, weight: link.weight, from: link.from, to: link.to }];
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [links]);

  // The hovered block and everything it connects to.
  const lit = useMemo(() => {
    if (!hovered) return null;
    const set = new Set([hovered]);
    for (const l of links) {
      if (l.from === hovered) set.add(l.to);
      if (l.to === hovered) set.add(l.from);
    }
    return set;
  }, [hovered, links]);

  return (
    <div ref={box} role="list" aria-label={label} className={cn("relative grid gap-y-8 lg:grid-cols-3", links.length > 0 ? "gap-x-12" : "gap-x-6")} data-block-map>
      {links.length > 0 && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 max-lg:hidden" width={size.w} height={size.h}>
          {paths.map((p) => {
            const on = lit !== null && (p.from === hovered || p.to === hovered);
            return <path key={p.key} d={p.d} fill="none" strokeLinecap="round" strokeWidth={Math.max(1, Math.min(6, p.weight))} className={cn("transition-[stroke,opacity] duration-150", on ? "stroke-(--adm-link-on)" : "stroke-(--adm-link)", lit && !on && "opacity-25")} />;
          })}
        </svg>
      )}
      {columns.map((column) => (
        <section key={column.key} aria-label={column.label} className="relative min-w-0">
          <h2 className="mb-3 text-small font-semibold text-(--adm-label)">{column.label}</h2>
          <ul className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2.5")}>
            {column.blocks.map((block) => (
              <li key={block.id} onMouseEnter={() => setHovered(block.id)} onMouseLeave={() => setHovered(null)} className={cn("transition-opacity duration-150", lit && !lit.has(block.id) && "opacity-25")}>
                <Block block={block} selected={selectedId === block.id} compact={compact} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Block({ block, selected, compact }: { block: MapBlock; selected: boolean; compact: boolean }) {
  const Icon = block.icon;
  const dot = DOT[block.status];
  const body = (
    <>
      <Icon aria-hidden className="size-5 shrink-0 text-ink/80" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 leading-normal">
        <span className="flex items-center gap-1 text-adm-block text-ink">
          <span className={cn("truncate font-semibold", selected && "text-(--adm-active) underline decoration-2 underline-offset-4")}>{block.title}</span>
          {block.externalTab && <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-ink/50" />}
        </span>
        {block.subtitle && <span className="block truncate text-small text-ink/60">{block.subtitle}</span>}
        {block.extra && <span className={cn("block", compact ? "mt-1" : "mt-1.5")}>{block.extra}</span>}
      </span>
      {(block.metric !== undefined || dot !== undefined) && (
        <span className="flex shrink-0 items-center gap-2 text-body tabular-nums text-ink">
          {block.metric}
          {dot !== undefined && <StatusDot status={dot} />}
        </span>
      )}
    </>
  );
  const className = cn("relative flex items-center gap-3 rounded-xl border border-ink/8 bg-(--adm-block) px-4 text-left transition-colors duration-150 hover:bg-(--adm-block-hover)", compact ? "min-h-14 py-2" : "min-h-16 py-3");
  const href = block.externalTab ?? block.href;
  if (href)
    return (
      <Link href={href} onClick={block.onOpen ? (e) => (e.preventDefault(), block.onOpen!()) : undefined} data-block={block.id} aria-current={selected || undefined} className={className}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={block.onOpen} data-block={block.id} aria-pressed={selected} className={cn(className, "w-full")}>
      {body}
    </button>
  );
}

"use client";

// The admin's tiles (CLAUDE.md "Überblick je Seitentyp", "Admin: Kacheln einheitlich"): the overview (/admin) and every page's "Überblick" tab show only these – equal tiles,
// lightly tinted in the group of the page (Heute blue, Zahlen green, Plattform lilac, Planen orange). TileBoard fills the height left under
// the sticky bar: rows share it evenly, the tiles grow on large screens and get compact on small ones (never a scroll at ≥ 1280 × 720).
// Each tile: the title small (with ⓘ), the number left, the change right beside it; under them an extra line left and the target right.
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Change, Status } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";
import { StatusDot } from "./AdminCharts";
import { ChangeLine, InfoTip } from "./AdminNumbers";
import { AREA_TEXT, AREA_TILE, type AreaColor } from "./AdminShell";

export interface TileSpec {
  key: string;
  label: string;
  /** One sentence: what it means and what a good value is */
  info: string;
  value: ReactNode;
  /** Leave out without a comparison – the right side stays empty */
  change?: Change | null;
  target?: { text: string; status: Status | null };
  /** One small line under the number, left */
  extra?: ReactNode;
  /**
   * A rich tile (CLAUDE.md "Überblick je Seitentyp"): 2–3 detail lines under the number, small (13px) – a breakdown, the top element, a
   * comparison or a hint. `extra` (if given) is the first of them. No charts.
   */
  details?: readonly ReactNode[];
  /** A word rather than a number (a name, "in 8 Tagen") – kept for callers; the size is the same for every value */
  small?: boolean;
  /** Where the tile leads: a page (href) or a tab of this page (onOpen) */
  href?: string;
  onOpen?: () => void;
}

export interface TileRow {
  key: string;
  /** The row's heading (in the group colour); empty: none */
  title?: string;
  group: AreaColor;
  tiles: readonly TileSpec[];
}

/** The tiles' height: never below (≥ 1280 × 720 without scrolling), never above (large screens). */
const TILE_MIN = 72;
const TILE_MAX = 240;
/** A row heading's height with its gap. */
const HEADING_H = 22;
/** Room under the board: the page's bottom padding (--adm-section, 40px). */
const BOTTOM_GAP = 40;

/** Tiles in rows of `columns` (an overview tab's flat list → rows). */
export function chunkRows(tiles: readonly TileSpec[], group: AreaColor, columns = 5): TileRow[] {
  return Array.from({ length: Math.ceil(tiles.length / columns) }, (_, i) => ({ key: `r${i}`, group, tiles: tiles.slice(i * columns, i * columns + columns) }));
}

/**
 * The rows of tiles over the full height left on screen: measured from the board's top to the window's bottom, shared by the rows (with
 * their headings and gaps); the tile height is clamped (TILE_MIN–TILE_MAX), the gaps and the inner padding follow it.
 */
export function TileBoard({ rows, columns = 5, label }: { rows: readonly TileRow[]; columns?: 4 | 5; label: string }) {
  const t = useTranslations("admin.cockpit");
  const box = useRef<HTMLDivElement>(null);
  const [tileH, setTileH] = useState(96);
  const headings = rows.filter((r) => r.title).length;
  useLayoutEffect(() => {
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined || window.innerWidth < 1024) return setTileH(96);
      const room = window.innerHeight - (top + window.scrollY) - BOTTOM_GAP - headings * HEADING_H;
      // The gaps grow with the room (about 1.5 % of the window), the tiles take the rest.
      const gap = Math.min(20, Math.max(10, Math.round(window.innerHeight * 0.015)));
      setTileH(Math.round(Math.min(TILE_MAX, Math.max(TILE_MIN, (room - gap * (rows.length - 1)) / rows.length))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [rows.length, headings]);
  const gap = `clamp(10px, 1.5dvh, 20px)`;
  const big = tileH >= 108;
  const huge = tileH >= 170;
  return (
    <div ref={box} data-tile-board className="flex flex-col" style={{ gap, "--adm-tile-h": `${tileH}px` } as CSSProperties}>
      {rows.map((row) => (
        <section key={row.key} aria-label={row.title || label}>
          {row.title && <h2 className={cn("mb-1 text-eyebrow uppercase", AREA_TEXT[row.group])}>{row.title}</h2>}
          <dl data-key-numbers className={cn("grid grid-cols-2 md:grid-cols-3", columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4")} style={{ gap }}>
            {row.tiles.map(({ key, ...tile }) => (
              <Tile key={key} group={row.group} big={big} huge={huge} {...tile} openLabel={t("openCard", { label: tile.label })} />
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

/** "982 €" → ["982", "€"], "10–25 Mrd. €" → ["10–25", "Mrd. €"]: a number (or span) and a unit without digits after it. Else null. */
export function splitUnit(value: string): [string, string] | null {
  const m = value.match(/^([−+-]?[\d.,]+(?:\s?[–-]\s?[\d.,]+)?)\s+([^\d]+)$/);
  return m ? [m[1], m[2]] : null;
}

/**
 * The value line's main value (CLAUDE.md "Admin: Kacheln einheitlich"): ONE fixed size in every tile (.adm-tile-value, 30px), whatever it
 * is – a number, a span, "1 von 4", a word. A unit after a number small in the same line. Too long: cut with "…" and the full value in the
 * tooltip – never scaled.
 */
export function TileValue({ value, className }: { value: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [cut, setCut] = useState(false);
  const text = typeof value === "string" ? value : null;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setCut(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);
  const parts = text ? splitUnit(text) : null;
  return (
    <span ref={ref} data-tile-value data-tooltip-info={cut && text ? text : undefined} className={cn("adm-tile-value min-w-0 truncate tabular-nums text-ink", className)}>
      {parts ? (
        <>
          {parts[0]}
          <span className="adm-tile-unit">{parts[1]}</span>
        </>
      ) : (
        value
      )}
    </span>
  );
}

/**
 * One tile – exactly --adm-tile-h high, everything aligned to the top (CLAUDE.md "Admin: Kacheln einheitlich"): the title small (caps, ⓘ,
 * one line with "…") on top; right under it the value in one fixed size (TileValue) with the change and the target right in the same line;
 * the detail lines (13px) right under the value; the free room stays at the bottom. The whole tile tinted in its group (AREA_TILE), the
 * title in the group's colour, a link (href) or a button (onOpen). `big`/`huge` (tall tiles) only add padding – never another size.
 */
export function Tile({ group, label, info, value, change, target, extra, details, href, onOpen, openLabel, big = false, huge = false }: Omit<TileSpec, "key"> & { group: AreaColor; openLabel: string; big?: boolean; huge?: boolean }) {
  const lines = [extra, ...(details ?? [])].filter((line) => line !== undefined && line !== null && line !== "");
  const link = "absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";
  return (
    <div data-cockpit-tile className={cn("relative flex h-(--adm-tile-h) min-w-0 flex-col justify-start overflow-hidden rounded-xl border", huge ? "px-5 pt-4 pb-3" : big ? "px-4 pt-3 pb-2.5" : "px-3 pt-2 pb-1.5", AREA_TILE[group])}>
      {href ? <Link href={href} data-card-link aria-label={openLabel} className={link} /> : onOpen ? <button type="button" data-card-link aria-label={openLabel} onClick={onOpen} className={link} /> : null}
      {/* The title in the group's colour, muted. */}
      <dt className="flex min-w-0 shrink-0 items-center gap-1 text-eyebrow uppercase">
        <span className={cn("truncate", AREA_TEXT[group])}>{label}</span>
        <InfoTip text={info} />
      </dt>
      {/* The value line: the value left, the change and the target right. */}
      <dd className="mt-0.5 flex min-w-0 shrink-0 items-center justify-between gap-2">
        <TileValue value={value} />
        {(change !== undefined || target) && (
          <span className="flex shrink-0 flex-col items-end gap-0.5 whitespace-nowrap text-small leading-tight">
            {change !== undefined && <ChangeLine change={change} short />}
            {target && (
              <span className="inline-flex items-center gap-1 text-muted">
                <StatusDot status={target.status} />
                {target.text}
              </span>
            )}
          </span>
        )}
      </dd>
      {/* The detail lines right under the value, 13px, each one line with "…"; whatever room is left stays at the bottom. */}
      {lines.length > 0 && (
        <dd className="mt-0.5 flex min-h-0 min-w-0 flex-col gap-0.5 overflow-hidden text-small leading-snug text-muted">
          {lines.map((line, i) => (
            <span key={i} className="min-w-0 truncate">
              {line}
            </span>
          ))}
        </dd>
      )}
    </div>
  );
}

"use client";

// The admin's tiles (CLAUDE.md "Überblick zuerst"): the overview (/admin) and every page's "Überblick" tab show only these – equal tiles,
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
  /** A word rather than a number (a name, "in 8 Tagen") – a smaller size */
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

/** From this many characters a number takes the smaller size, so it never needs "…". */
const LONG_NUMBER = 7;
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

/**
 * One tile – exactly --adm-tile-h high: the title small on top (ⓘ, one line with "…"), the number left, the change right beside it; under them
 * the extra line left and the target right. A number is never cut (a long one takes the next size down); words may end in "…". The whole
 * tile tinted in its group (AREA_TILE) and a link (href) or a button (onOpen). `big` (tall tiles): more padding, a larger number.
 */
export function Tile({ group, label, info, value, change, target, extra, details, small, href, onOpen, openLabel, big = false, huge = false }: Omit<TileSpec, "key"> & { group: AreaColor; openLabel: string; big?: boolean; huge?: boolean }) {
  const lines = [extra, ...(details ?? [])].filter((line) => line !== undefined && line !== null && line !== "");
  const rich = (details?.length ?? 0) > 0;
  const tight = !big;
  // Compact tiles (small screens) are narrower: there a number of 7 characters already takes the smaller size.
  const long = typeof value === "string" && value.length > (big ? LONG_NUMBER : LONG_NUMBER - 1);
  // Tall tiles (few rows on a page's Überblick) carry a larger number.
  // The display size only where it can't be cut: a short number (≤ 5 characters) without a change beside it.
  const short = typeof value === "string" ? value.length <= 5 : true;
  // A number with a change (or target) beside it shares the row: from 6 characters it takes the smaller size too, so it is never cut.
  const crowded = typeof value === "string" && value.length >= 6 && (change !== undefined || (rich && target !== undefined));
  // Very low tiles (≈ 1280 × 720 with five rows) keep the number one size down, so title, number and a line fit.
  const low = !big && !huge && tight;
  // Very long next to a change ("338.325 €"): body size, semibold – still the tile's largest text after the title row.
  const veryCrowded = crowded && typeof value === "string" && (value.length >= 9 || !big);
  const size = veryCrowded
    ? "text-body font-semibold"
    : crowded
      ? "text-h3"
      : small || long
        ? big
          ? "text-h2"
          : "text-h3"
        : huge && change === undefined && short
          ? "text-display"
          : big
            ? "text-h1"
            : low
              ? "text-h3"
              : "text-h2";
  const changeBelow = veryCrowded && change !== undefined ? <span className="shrink-0 whitespace-nowrap"><ChangeLine change={change} short /></span> : null;
  const link = "absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";
  return (
    <div data-cockpit-tile className={cn("relative grid h-(--adm-tile-h) min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border transition-colors duration-150", huge ? "px-5 pt-4 pb-3.5" : big ? "px-4 pt-3 pb-2.5" : "px-3 pt-1.5 pb-1", AREA_TILE[group])}>
      {href ? <Link href={href} data-card-link aria-label={openLabel} className={link} /> : onOpen ? <button type="button" data-card-link aria-label={openLabel} onClick={onOpen} className={link} /> : null}
      {/* The title in the group's colour, muted. */}
      <dt className="flex min-w-0 items-center gap-1 text-eyebrow uppercase text-(--adm-label)">
        <span className={cn("truncate", AREA_TEXT[group])}>{label}</span>
        <InfoTip text={info} />
      </dt>
      {/* Very crowded ("338.325 €" in a narrow tile): the number keeps its size – the change moves to the bottom line, right. */}
      <dd className="flex min-w-0 items-center justify-between gap-2">
        <span className={cn("min-w-0 tabular-nums text-ink", veryCrowded ? "shrink-0 whitespace-nowrap" : "truncate", size)}>{value}</span>
        {((change !== undefined && !veryCrowded) || (rich && target)) && (
          <span className="flex shrink-0 flex-col items-end gap-0.5 whitespace-nowrap text-small leading-tight">
            {change !== undefined && !veryCrowded && <ChangeLine change={change} short />}
            {rich && target && (
              <span className="inline-flex items-center gap-1 text-muted">
                <StatusDot status={target.status} />
                {target.text}
              </span>
            )}
          </span>
        )}
      </dd>
      {rich ? (
        // Rich tile: the detail lines, 13px, each one line with "…".
        <dd className="flex min-w-0 flex-col gap-0.5 text-small leading-snug text-muted">
          {lines.map((line, i) => (
            <span key={i} className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 truncate">{line}</span>
              {i === 0 && changeBelow}
            </span>
          ))}
        </dd>
      ) : (
        <dd className="flex min-h-4 min-w-0 items-center justify-between gap-2 text-small leading-tight text-muted">
          <span className="min-w-0 truncate">{extra}</span>
          {changeBelow}
          {target && (
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
              <StatusDot status={target.status} />
              {target.text}
            </span>
          )}
        </dd>
      )}
    </div>
  );
}

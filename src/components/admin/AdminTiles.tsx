"use client";

// The admin's tiles (CLAUDE.md "Überblick je Seitentyp", "Admin: Kacheln einheitlich"): the overview (/admin) and every page's "Überblick" tab show only these – equal tiles,
// lightly tinted in the group of the page (Heute blue, Zahlen green, Plattform lilac, Planen orange). TileBoard fills the height left under
// the sticky bar: rows share it evenly, the tiles grow on large screens and get compact on small ones (never a scroll at ≥ 1280 × 720).
// Each tile: the title small (with ⓘ), the number left, the change right beside it; under them an extra line left and the target right.
import { pageInset } from "@/lib/admin/inset";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Change, Status } from "@/lib/admin/metrics";
import { cn } from "@/lib/utils";
import { ChangeLine, InfoTip } from "./AdminNumbers";
import { AREA_TEXT, AREA_TILE, type AreaColor } from "./AdminShell";

export interface TileSpec {
  key: string;
  /** The tile's own group when it differs from its row's (the overview's first row: Heute and Planen side by side) */
  group?: AreaColor;
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
  /** Its unit (the capsule it belongs to, config/admin-tiles.ts): tiles of one unit stand together, a wider gap between two units in a row */
  unit?: string;
  /** Its unit's colour (a CSS colour): the tile's surface softly filled in it (admin-tokens.css "Unit colour"); the words stay neutral */
  unitColor?: string | null;
  /** Its key for ?focus= (data-focus-key) */
  focusKey?: string;
  /** Chosen in a capsule's mini-tile row (AdminCapsuleView): a stronger fill and a 2px edge in the full unit colour */
  selected?: boolean;
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
/** A row heading's height with its gap. */
const HEADING_H = 22;
/** Room under the board: the page's bottom padding (--adm-section, 40px). */

/**
 * One decision per page (CLAUDE.md "Kachel-Titel nie abkürzen"): when any tile's title and change don't fit its top row, the change of EVERY
 * tile on that board moves into the value row, right – the same position on the whole page. Tiles report through this context.
 */
const ChangePlace = createContext<{ low: boolean; report: (id: string, crowded: boolean) => void } | null>(null);

/** One shared change place for tiles outside a TileBoard (a capsule's mini-tile row): any crowded tile moves every change down. */
export function TileChangePlace({ children }: { children: ReactNode }) {
  const [crowdedIds, setCrowdedIds] = useState<ReadonlySet<string>>(new Set());
  const report = useCallback((id: string, crowded: boolean) => {
    setCrowdedIds((now) => {
      if (now.has(id) === crowded) return now;
      const next = new Set(now);
      if (crowded) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  return <ChangePlace.Provider value={{ low: crowdedIds.size > 0, report }}>{children}</ChangePlace.Provider>;
}

/** Tiles in rows of `columns` (an overview tab's flat list → rows). */
export function chunkRows(tiles: readonly TileSpec[], group: AreaColor, columns = 5): TileRow[] {
  return Array.from({ length: Math.ceil(tiles.length / columns) }, (_, i) => {
    // One grid, equal columns, one gap (CLAUDE.md "Raster"): no wider gaps between units – their colour sets them apart.
    return { key: `r${i}`, group, tiles: tiles.slice(i * columns, i * columns + columns) };
  });
}

/**
 * The rows of tiles over the full height left on screen: measured from the board's top to the window's bottom, shared by the rows (with
 * their headings and gaps) – ALWAYS the whole height, 2, 3 or 4 rows alike (CLAUDE.md "Kacheln füllen die volle Höhe"): no empty room at the
 * bottom; only a floor (TILE_MIN, ≥ 1280 × 720 without scrolling). Taller tiles show more detail lines; the value stays on top.
 */
export function TileBoard({ rows, columns = 5, label, spacious = false, colorTitles = false }: { rows: readonly TileRow[]; columns?: 2 | 4 | 5; label: string; /** More padding inside the tiles (the overview) – the gaps are the same on every page */ spacious?: boolean; /** Titles in the group colour of the page each tile leads to – only the overview (CLAUDE.md "Farbe nur zur Orientierung") */ colorTitles?: boolean }) {
  const t = useTranslations("admin.cockpit");
  const box = useRef<HTMLDivElement>(null);
  const [tileH, setTileH] = useState(96);
  const headings = rows.filter((r) => r.title).length;
  // Measured after every render too (setState only on a change): rows above it can appear later – the period's day row after hydrating.
  useLayoutEffect(() => {
    const measure = () => {
      const top = box.current?.getBoundingClientRect().top;
      if (top === undefined || window.innerWidth < 1024) return setTileH(96);
      const room = window.innerHeight - (top + window.scrollY) - pageInset() - headings * HEADING_H;
      // One gap on every page (--adm-grid-gap, admin-tokens.css), read as rendered; the tiles take the rest.
      const gap = box.current ? parseFloat(getComputedStyle(box.current).rowGap) || 0 : 0;
      const next = Math.floor(Math.max(TILE_MIN, (room - gap * (rows.length - 1)) / rows.length));
      setTileH((now) => (now === next ? now : next));
    };
    measure();
    // A row above appearing later (the sticky bar growing): watch the bar's size, re-measure on a resize.
    const bar = document.querySelector("[data-admin-bar]");
    const observer = bar ? new ResizeObserver(measure) : null;
    if (bar) observer!.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rows.length, headings, spacious]);
  const gap = "var(--adm-grid-gap)";
  // Which tiles have no room for title + change on top; any → the change sits in the value row on every tile of this board.
  const [crowdedIds, setCrowdedIds] = useState<ReadonlySet<string>>(new Set());
  const report = useCallback((id: string, crowded: boolean) => {
    setCrowdedIds((now) => {
      if (now.has(id) === crowded) return now;
      const next = new Set(now);
      if (crowded) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const place = { low: crowdedIds.size > 0, report };
  const big = tileH >= 108;
  const huge = tileH >= 170;
  return (
    <ChangePlace.Provider value={place}>
    <div ref={box} data-tile-board data-change-low={place.low || undefined} className="flex flex-col" style={{ gap, "--adm-tile-h": `${tileH}px` } as CSSProperties}>
      {rows.map((row) => (
        <section key={row.key} aria-label={row.title || label}>
          {row.title && <h2 className={cn("mb-1 text-eyebrow uppercase", AREA_TEXT[row.group])}>{row.title}</h2>}
          <dl
            data-key-numbers
            className={cn("grid grid-cols-2", columns === 2 ? "lg:grid-cols-2" : columns === 5 ? "md:grid-cols-3 lg:grid-cols-5" : "md:grid-cols-3 lg:grid-cols-4")}
            style={{ gap }}
          >
            {row.tiles.map(({ key, group, ...tile }) => (
              <Tile key={key} tileKey={key} tileId={`${row.key}:${key}`} group={group ?? row.group} big={big || spacious} huge={huge} colorTitle={colorTitles} {...tile} openLabel={t("openCard", { label: tile.label })} />
            ))}
          </dl>
        </section>
      ))}
    </div>
    </ChangePlace.Provider>
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
  const parts = text ? splitUnit(text) : null;
  // A word value (a name, "Fitness · 1–2 Wochen", "Anchor Creator"): a step smaller than numbers, up to two lines, never "…" – too long for
  // two lines at 22px, it steps down (18px, then 15px). Numbers stay one line in the one size.
  const isText = text !== null && parts === null && /[A-Za-zÄÖÜäöüß]{3,}/.test(text);
  const [step, setStep] = useState(0);
  // A new value starts at the full word size again (reset while rendering, not in an effect).
  const [stepFor, setStepFor] = useState(value);
  if (stepFor !== value) {
    setStepFor(value);
    setStep(0);
  }
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (isText) {
        const lineH = parseFloat(getComputedStyle(el).lineHeight) || 26;
        // The rendered height (an inline span has no scrollHeight); a card's larger word steps once more (CLAUDE.md "Karten-Inhalte größer").
        if (el.getBoundingClientRect().height > lineH * 2 + 2) setStep((s) => Math.min(3, s + 1));
        setCut(false);
      } else setCut(el.scrollWidth > el.clientWidth + 1);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, isText, step]);
  if (isText)
    return (
      <span ref={ref} data-tile-value data-tile-text={step} className={cn("adm-tile-text min-w-0 text-ink", step === 1 && "adm-tile-text-sm", step === 2 && "adm-tile-text-xs", step === 3 && "adm-tile-text-xxs", className)}>
        {text}
      </span>
    );
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

/** A detail line: one line; cut with "…" only when it can't be helped – then its full words in the tooltip. */
function TileLine({ children, title = false, inRow = false }: { children: ReactNode; /** The tile's title (data-tile-title, not a detail line) */ title?: boolean; /** Beside something (the title row, the last line with the target): it may shrink and end in "…" */ inRow?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [full, setFull] = useState<string | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setFull(el.scrollWidth > el.clientWidth + 1 ? (el.textContent ?? null) : null);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);
  return (
    <span ref={ref} data-tile-line={title ? undefined : true} data-tile-title={title || undefined} data-tooltip-info={full ?? undefined} className={cn("min-w-0 truncate", !(title || inRow) && "shrink-0")}>
      {children}
    </span>
  );
}

/** One detail line's height (13px text, line-height ≈ 1.375) and the gap between lines – the measure for how many fit. */
const LINE_H = 18;
const LINE_GAP = 2;

/**
 * One tile – the same fixed plan everywhere (CLAUDE.md "Admin: fester Kachel-Bauplan"), exactly --adm-tile-h high:
 *   top left the title + ⓘ · top right the change (▲/▼) – always that corner
 *   under them the value (one fixed size, a unit small after it)
 *   bottom left the detail lines, the LAST one flush with the bottom edge (the free room lies between value and details)
 *   bottom right the target (● Ziel x) – always that corner
 * The detail lines come as a list ordered by importance; as many are shown as fit the room left (measured, never cut), so a large tile
 * shows more. The whole tile a link (href) or a button (onOpen).
 */
export function Tile({ tileKey, tileId, group, label, info, value, change, target, extra, details, href, onOpen, unitColor, focusKey, selected, openLabel, big = false, huge = false, colorTitle = false }: Omit<TileSpec, "key"> & { /** Its key (data-tile-key: the tile → capsule routes) */ tileKey?: string; /** Its id on the board (for the page-wide change place) */ tileId?: string; group: AreaColor; openLabel: string; big?: boolean; huge?: boolean; /** The title in its group's colour (the overview only); elsewhere secondary grey */ colorTitle?: boolean }) {
  const all = [extra, ...(details ?? [])].filter((line) => line !== undefined && line !== null && line !== "");
  // How many lines fit: the room between the value and the bottom edge (beside the target), measured.
  const room = useRef<HTMLElement>(null);
  const [fit, setFit] = useState(all.length);
  useLayoutEffect(() => {
    const el = room.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      const next = Math.max(0, Math.floor((h + LINE_GAP) / (LINE_H + LINE_GAP)));
      setFit((now) => (now === next ? now : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const lines = all.slice(0, fit);
  // Title never cut: measured against the top row; no room for the change too → the board moves every change into the value row; no
  // room even for the title alone → its type a step smaller (11px).
  const board = useContext(ChangePlace);
  const topRow = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const changeRef = useRef<HTMLSpanElement>(null);
  const [crowded, setCrowded] = useState(false);
  const [tight, setTight] = useState(false);
  useLayoutEffect(() => {
    const row = topRow.current;
    const title = titleRef.current;
    if (!row || !title) return;
    const check = () => {
      const info = 22; // the ⓘ and its gap
      const need = title.scrollWidth + info;
      const changeW = changeRef.current ? changeRef.current.getBoundingClientRect().width + 8 : 0;
      const isCrowded = change !== undefined && need + changeW > row.clientWidth;
      setCrowded(isCrowded);
      setTight(need > row.clientWidth);
      if (tileId) board?.report(tileId, isCrowded);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(row);
    return () => observer.disconnect();
  }, [label, change, tileId, board]);
  const low = change !== undefined && (board ? board.low : crowded);
  const changeEl = change !== undefined && (
    <span ref={changeRef} data-tile-change className="shrink-0 text-small whitespace-nowrap normal-case tracking-normal">
      <ChangeLine change={change} short />
    </span>
  );
  const targetNode = target ? (
          <span data-tile-target className="inline-flex shrink-0 items-center gap-1 text-small whitespace-nowrap text-muted">
            {/* The target's dot neutral (CLAUDE.md "Farbe nur zur Orientierung"); its status is in the words for screen readers. */}
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-current opacity-60" />
            {target.text}
            {target.status && <span className="sr-only"> ({target.status})</span>}
          </span>
        ) : null;
  const link = "absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";
  return (
    <div data-cockpit-tile data-tile-key={tileKey} data-focus-key={focusKey} data-selected={selected || undefined} data-routed={unitColor ? "" : undefined} className={cn("relative flex h-(--adm-tile-h) min-w-0 flex-col overflow-hidden rounded-xl border", huge ? "px-5 pt-4 pb-3.5" : big ? "px-4 pt-3 pb-3" : "px-3 pt-2 pb-2", AREA_TILE[group])}>
      {href ? <Link href={href} data-card-link aria-label={openLabel} className={link} /> : onOpen ? <button type="button" data-card-link aria-label={openLabel} onClick={onOpen} className={link} /> : null}
      {/* Top: the title + ⓘ left, the change right. */}
      <dt ref={topRow} className="flex min-w-0 shrink-0 items-center gap-2 text-eyebrow uppercase">
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span ref={titleRef} data-tile-title className={cn("whitespace-nowrap", tight && "text-[11px]", colorTitle ? AREA_TEXT[group] : "adm-page-title")}>
            {label}
          </span>
          <InfoTip text={info} />
        </span>
        {!low && changeEl}
      </dt>
      {/* The value, one fixed size; the change right beside it when the page moved it down. */}
      <dd className="mt-1 flex min-w-0 shrink-0 flex-wrap items-center gap-x-2">
        <TileValue value={value} className="max-w-full" />
        {/* Too narrow for both: the change goes right-aligned under the value – the number is never cut for it. */}
        {low && <span className="ml-auto">{changeEl}</span>}
      </dd>
      {/* Bottom: the detail lines (the last flush with the bottom edge), the free room above them; the target right beside the LAST line only,
          so the other lines keep the full width. */}
      <dd ref={room} data-tile-lines className="mt-1 flex min-h-0 min-w-0 flex-1 flex-col justify-end gap-0.5 text-small leading-snug text-muted">
        {lines.map((line, i) =>
          i === lines.length - 1 && target ? (
            <span key={i} className="flex min-w-0 shrink-0 items-center gap-3">
              <TileLine inRow>{line}</TileLine>
              <span className="ml-auto shrink-0">{targetNode}</span>
            </span>
          ) : (
            <TileLine key={i}>{line}</TileLine>
          ),
        )}
        {lines.length === 0 && target && <span className="ml-auto shrink-0">{targetNode}</span>}
      </dd>
    </div>
  );
}

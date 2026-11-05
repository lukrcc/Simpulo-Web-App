"use client";

import { geoNaturalEarth1 } from "d3-geo";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createHrefOf } from "@/components/create/model";
import { useDismiss } from "@/components/explore/Filters";
import { shortMonth } from "@/components/form/MonthChips";
import { Button } from "@/components/ui/ActionButton";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { IconButton } from "@/components/ui/IconButton";
import { regionOfCountry } from "@/lib/data/places";
import { WORLD_HEIGHT, WORLD_LAND, WORLD_SCALE, WORLD_TRANSLATE, WORLD_WIDTH } from "@/lib/data/world-map.generated";
import type { PlaceDemand } from "@/lib/savedSearches";
import { cn } from "@/lib/utils";
import { continentOf } from "@/lib/worldRegions";
import { createMapClusters, type MapMarker, type MapPlaceBase } from "@/lib/worldMapMarkers";
import { useFormatter } from "next-intl";

/** The map's margin inside the panel. */
const PAD = 16;
/** How far in, and how much air a zoomed-to area keeps around it. */
const MAX_K = 24;
const FIT_MARGIN = 72;
/** Below this zoom it's the world view: one circle per region. */
const WORLD_UNTIL = 1.15;
const REGION_MIN_K = 1.3;
const REGION_MAX_K = 6;
const DRAG_THRESHOLD = 6;
const WHEEL_SPEED = 0.01;
const POPOVER_W = 280;
/** Months named in a popover. */
const MAX_MONTHS = 3;

const projection = geoNaturalEarth1().scale(WORLD_SCALE).translate(WORLD_TRANSLATE);

interface MapPlace extends MapPlaceBase {
  demand: PlaceDemand;
}

interface View {
  k: number;
  x: number;
  y: number;
}
const WORLD_VIEW: View = { k: 1, x: 0, y: 0 };

type Popover = { kind: "place"; placeId: string } | { kind: "list"; key: string };

/**
 * Where people are looking: one ring per place with saved searches. Regions in the world view, cities as you zoom in (a click on a region or
 * cluster, Ctrl/⌘ + scroll, a pinch; drag to move). Land and markers only ever move by transform, the markers are one group, nothing overlaps (worldMapMarkers).
 */
export function WorldMap({ demand, className }: { demand: readonly PlaceDemand[]; className?: string }) {
  const t = useTranslations("explore.search.map");
  const format = useFormatter();
  const places = useMemo(
    () =>
      demand.flatMap((d): MapPlace[] => {
        const at = projection([d.place.lng, d.place.lat]);
        const region = regionOfCountry(d.place.country);
        return at ? [{ id: d.place.id, x: at[0], y: at[1], continent: region ? continentOf(region) : null, people: d.people, demand: d }] : [];
      }),
    [demand],
  );
  const clusters = useMemo(() => createMapClusters(places), [places]);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  /** Where it was moved to, good for this size; otherwise the whole world. */
  const [moved, setMoved] = useState<{ w: number; h: number; view: View } | null>(null);
  const [live, setLive] = useState(false);
  const [popover, setPopover] = useState<Popover | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const w = size?.w ?? 0;
  const h = size?.h ?? 0;
  const fit = size ? Math.min((w - 2 * PAD) / WORLD_WIDTH, (h - 2 * PAD) / WORLD_HEIGHT) : 1;
  const x0 = (w - WORLD_WIDTH * fit) / 2;
  const y0 = (h - WORLD_HEIGHT * fit) / 2;

  /** Never further out than the world, never past its edges: narrower than the panel, it stays centred. */
  const clampView = (view: View): View => {
    const k = Math.max(1, Math.min(MAX_K, view.k));
    const axis = (t: number, offset: number, length: number, panel: number) => {
      const scaled = length * k;
      if (scaled <= panel) return (panel - scaled) / 2 - offset * k;
      return Math.min(-offset * k, Math.max(panel - (offset + length) * k, t));
    };
    return { k, x: axis(view.x, x0, WORLD_WIDTH * fit, w), y: axis(view.y, y0, WORLD_HEIGHT * fit, h) };
  };
  const viewOver = (list: readonly MapPlace[], maxK = MAX_K, minK = 1): View => {
    const xs = list.map((p) => x0 + p.x * fit);
    const ys = list.map((p) => y0 + p.y * fit);
    const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.max(minK, Math.min(maxK, (w - 2 * FIT_MARGIN) / Math.max(1, right - left), (h - 2 * FIT_MARGIN) / Math.max(1, bottom - top)));
    return clampView({ k, x: w / 2 - ((left + right) / 2) * k, y: h / 2 - ((top + bottom) / 2) * k });
  };
  const view = moved && moved.w === w && moved.h === h ? moved.view : WORLD_VIEW;
  const zoomed = view.k > 1.01;
  const worldMode = view.k < WORLD_UNTIL;
  const zoomLevel = clusters.zoomOf(fit * view.k);
  const markers = useMemo(() => {
    const pixels = Math.max(fit, 0.0001);
    return worldMode ? clusters.world(pixels) : clusters.at(zoomLevel, pixels);
  }, [clusters, worldMode, zoomLevel, fit]);

  const moveTo = (next: View) => {
    setMoved({ w, h, view: clampView(next) });
    setPopover(null);
  };
  const closePopover = () => setPopover(null);
  useDismiss(popover !== null, closePopover, popoverRef);

  // Ctrl/⌘ + scroll (a trackpad's pinch comes the same way); plain scrolling stays the page's. Not passive: it has to stop the browser's own zoom.
  const moveToRef = useRef(moveTo);
  const viewRef = useRef(view);
  useEffect(() => {
    moveToRef.current = moveTo;
    viewRef.current = view;
  });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let frame = 0;
    let settle = 0;
    let pending: View | null = null;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const box = svg.getBoundingClientRect();
      const from = pending ?? viewRef.current;
      const k = Math.max(1, Math.min(MAX_K, from.k * Math.exp(-e.deltaY * WHEEL_SPEED)));
      const [px, py] = [e.clientX - box.left, e.clientY - box.top];
      pending = { k, x: px - ((px - from.x) * k) / from.k, y: py - ((py - from.y) * k) / from.k };
      setLive(true);
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (pending) moveToRef.current(pending);
        });
      }
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        pending = null;
        setLive(false);
      }, 140);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [size !== null]); // eslint-disable-line react-hooks/exhaustive-deps -- the svg exists once it's measured

  // Drag to move once zoomed, two fingers to zoom. A marker's click only counts if nothing moved.
  const gesture = useRef<{ pointers: Map<number, { x: number; y: number }>; from: View; start: { x: number; y: number }; moved: boolean; pinch: { distance: number; k: number; x: number; y: number } | null }>({ pointers: new Map(), from: WORLD_VIEW, start: { x: 0, y: 0 }, moved: false, pinch: null });
  const local = (e: ReactPointerEvent) => {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    const at = local(e);
    g.pointers.set(e.pointerId, at);
    g.from = view;
    g.start = at;
    g.moved = false;
    g.pinch = null;
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.pinch = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), k: view.k, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    const at = local(e);
    g.pointers.set(e.pointerId, at);
    if (g.pinch && g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      const safe = Math.max(1, Math.min(MAX_K, g.pinch.k * (Math.hypot(a.x - b.x, a.y - b.y) / g.pinch.distance)));
      g.moved = true;
      setLive(true);
      moveTo({ k: safe, x: g.pinch.x - ((g.pinch.x - g.from.x) * safe) / g.from.k, y: g.pinch.y - ((g.pinch.y - g.from.y) * safe) / g.from.k });
      return;
    }
    if (g.from.k <= 1.01 || g.pinch) return;
    const [dx, dy] = [at.x - g.start.x, at.y - g.start.y];
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!g.moved) e.currentTarget.setPointerCapture(e.pointerId);
    g.moved = true;
    setLive(true);
    moveTo({ k: g.from.k, x: g.from.x + dx, y: g.from.y + dy });
  };
  const onPointerEnd = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size === 0) {
      g.pinch = null;
      setLive(false);
    }
  };

  const openMarker = (marker: MapMarker<MapPlace>) => {
    if (gesture.current.moved) return;
    if (!marker.cluster) return setPopover({ kind: "place", placeId: marker.places[0].id });
    if (marker.regional) return moveTo(viewOver(marker.places, REGION_MAX_K, REGION_MIN_K));
    if (view.k >= MAX_K * 0.99) return setPopover({ kind: "list", key: marker.key });
    const target = viewOver(marker.places);
    moveTo({ ...target, k: Math.max(target.k, Math.min(MAX_K, view.k * 2)) });
  };

  const screen = (x: number, y: number) => ({ x: (x0 + x * fit) * view.k + view.x, y: (y0 + y * fit) * view.k + view.y });
  const chosen = popover?.kind === "place" ? places.find((p) => p.id === popover.placeId) : undefined;
  const listed = popover?.kind === "list" ? markers.find((m) => m.key === popover.key) : undefined;
  const anchorMarker = chosen ? markers.find((m) => m.places.includes(chosen)) : listed;
  const anchor = anchorMarker && screen(anchorMarker.x, anchorMarker.y);

  return (
    <GlassPanel ref={rootRef} className={cn("relative h-[clamp(360px,48vh,520px)] overflow-hidden shadow-(--panel-shadow)!", className)}>
      {size && (
        <svg
          ref={svgRef}
          width={w}
          height={h}
          role="img"
          aria-label={t("label", { count: places.length })}
          data-map-live={live ? "" : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClick={closePopover}
          style={{ touchAction: zoomed ? "none" : "pan-y" }}
          className={cn("absolute inset-0 block select-none", zoomed && (live ? "cursor-grabbing" : "cursor-grab"))}
        >
          <g className="map-move" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
            <path d={WORLD_LAND} transform={`translate(${x0} ${y0}) scale(${fit})`} fill="rgba(34,30,27,0.07)" />
          </g>
          <g>
            {markers.map((marker) => {
              const at = screen(marker.x, marker.y);
              return (
                <g key={marker.key} className="map-move" style={{ transform: `translate(${at.x}px, ${at.y}px)` }}>
                  <g className="map-enter">
                    <circle
                      r={clusters.radius(marker)}
                      fill="var(--accent)"
                      fillOpacity={0.15}
                      stroke="var(--accent)"
                      strokeWidth={2}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMarker(marker);
                      }}
                    />
                    <text textAnchor="middle" dominantBaseline="central" fill="var(--ink)" className="pointer-events-none text-small font-semibold tabular-nums">
                      {marker.places.reduce((n, p) => n + p.people, 0)}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {zoomed && (
        <IconButton
          size="sm"
          aria-label={t("reset")}
          title={t("reset")}
          onClick={() => {
            setMoved(null);
            setPopover(null);
          }}
          className="absolute right-3 top-3"
        >
          <RotateCcw className="size-4" aria-hidden />
        </IconButton>
      )}

      {popover && anchor && anchorMarker && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={chosen?.demand.place.name ?? t("title")}
          style={{ width: POPOVER_W, left: Math.max(8, Math.min(w - POPOVER_W - 8, anchor.x - POPOVER_W / 2)), maxHeight: h - 16, ...(anchor.y > h / 2 ? { bottom: Math.max(8, h - anchor.y + clusters.radius(anchorMarker) + 8) } : { top: Math.min(h - 180, anchor.y + clusters.radius(anchorMarker) + 8) }) }}
          className="glass-panel animate-fade-in absolute z-20 overflow-y-auto rounded-[20px]! p-4"
        >
          {chosen && (
            <>
              <p className="truncate text-h3 text-ink">{chosen.demand.place.name.split(",")[0]}</p>
              <p className="mt-0.5 truncate text-small text-muted">
                {[t("people", { count: chosen.demand.people }), chosen.demand.months.slice(0, MAX_MONTHS).map((m) => m.month).toSorted().map((m) => shortMonth(format, m, false)).join(", ")].filter(Boolean).join(" · ")}
              </p>
              <Button href={createHrefOf({ place: chosen.demand.place, month: chosen.demand.months[0]?.month ?? null })} variant="primary" size="md" data-preview-action className="mt-4 w-full">
                {t("open")}
              </Button>
            </>
          )}
          {listed && (
            <ul className="max-h-60 overflow-y-auto">
              {listed.places.map((place) => (
                <li key={place.id}>
                  <button type="button" onClick={() => setPopover({ kind: "place", placeId: place.id })} className="block w-full truncate rounded-xl px-2 py-2 text-left text-body text-ink hover:bg-white/50">
                    {place.demand.place.name.split(",")[0]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

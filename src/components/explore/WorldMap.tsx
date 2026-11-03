"use client";

import { geoNaturalEarth1 } from "d3-geo";
import { useFormatter, useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { WORLD_HEIGHT, WORLD_LAND, WORLD_SCALE, WORLD_TRANSLATE, WORLD_WIDTH } from "@/lib/data/world-map.generated";
import type { DestinationSpot } from "@/lib/destinations";
import { cn } from "@/lib/utils";
import { monthSpan, useThisMonth } from "./spotInterest";

const MIN_RADIUS = 8;
const MAX_RADIUS = 28;
/** The map's margin inside the panel. */
const PAD = 16;
const TOOLTIP_W = 200;

const projection = geoNaturalEarth1().scale(WORLD_SCALE).translate(WORLD_TRANSLATE);

/**
 * Where people want to go. One circle per place, area by how many (√ of the share of the largest), the small ones on top so each can
 * be reached; your own picks in full accent. Static land, no animation but the filter's fade. The grid below holds the same places
 * and the same actions for the keyboard, so the map itself takes no focus.
 */
export function WorldMap({ spots, matches, mine, onOpen, className }: { spots: readonly DestinationSpot[]; matches: (spot: DestinationSpot) => boolean; mine: ReadonlySet<string>; onOpen: (spot: DestinationSpot) => void; className?: string }) {
  const t = useTranslations("explore.whereNext");
  const format = useFormatter();
  const thisMonth = useThisMonth();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = size ? Math.min((size.w - 2 * PAD) / WORLD_WIDTH, (size.h - 2 * PAD) / WORLD_HEIGHT) : 1;
  const x0 = size ? (size.w - WORLD_WIDTH * scale) / 2 : 0;
  const y0 = size ? (size.h - WORLD_HEIGHT * scale) / 2 : 0;
  const top = Math.max(1, ...spots.map((s) => s.count));
  const circles = useMemo(
    () =>
      spots
        .flatMap((spot) => {
          const point = projection([spot.destination.lng, spot.destination.lat]);
          return point ? [{ spot, point, r: MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.sqrt(spot.count / top) }] : [];
        })
        .toSorted((a, b) => b.r - a.r),
    [spots, top],
  );
  const shown = circles.find((c) => c.spot.destinationId === hovered);
  const tip = shown && size ? { x: x0 + shown.point[0] * scale, y: y0 + shown.point[1] * scale } : null;
  const when = shown ? monthSpan(format, shown.spot, thisMonth) : null;

  return (
    <GlassPanel ref={ref} className={cn("relative h-[clamp(320px,42vh,480px)] overflow-hidden shadow-(--panel-shadow)!", className)}>
      {size && (
        <svg width={size.w} height={size.h} role="img" aria-label={t("mapLabel", { count: spots.length })} className="absolute inset-0 block">
          <path d={WORLD_LAND} transform={`translate(${x0} ${y0}) scale(${scale})`} fill="rgba(34,30,27,0.08)" />
          {circles.map(({ spot, point, r }) => {
            const on = matches(spot);
            const own = mine.has(spot.destinationId);
            return (
              <circle
                key={spot.destinationId}
                data-map-spot={spot.destinationId}
                cx={x0 + point[0] * scale}
                cy={y0 + point[1] * scale}
                r={r}
                fill="var(--accent)"
                fillOpacity={own ? 1 : 0.35}
                stroke="var(--accent)"
                strokeWidth={2}
                opacity={on ? 1 : 0.1}
                pointerEvents={on ? undefined : "none"}
                tabIndex={-1}
                onPointerEnter={() => setHovered(spot.destinationId)}
                onPointerLeave={() => setHovered((current) => (current === spot.destinationId ? null : current))}
                onClick={() => onOpen(spot)}
                className="map-spot cursor-pointer outline-none"
              />
            );
          })}
        </svg>
      )}
      {shown && tip && size && (
        <div
          role="tooltip"
          style={{
            width: TOOLTIP_W,
            left: Math.min(size.w - TOOLTIP_W - 8, Math.max(8, tip.x - TOOLTIP_W / 2)),
            ...(tip.y > size.h / 2 ? { bottom: size.h - tip.y + MAX_RADIUS + 4 } : { top: tip.y + MAX_RADIUS + 4 }),
          }}
          className="glass-panel pointer-events-none absolute z-10 rounded-2xl! px-3 py-2"
        >
          <p className="truncate text-body font-semibold text-ink">{shown.spot.placeName}</p>
          <p className="truncate text-small text-muted">
            {t("tooltipWant", { count: shown.spot.count })}
            {when && ` · ${when}`}
          </p>
        </div>
      )}
    </GlassPanel>
  );
}

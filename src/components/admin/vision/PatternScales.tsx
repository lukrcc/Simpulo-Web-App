"use client";

// Admin › Vision › Der Hof: the pattern in five sizes as a plan view (SVG) – Wohnung (rooms around a middle), Haus (larger), Hof (a ring of
// rooms around a round middle, a gap as the gate), Stadthof (a block with an inner courtyard), Dorf (six small rings around a square).
// Colours only through admin tokens: shared (an amber tone), private (a turquoise tone), entrance/guests (a violet tone). The legend under
// it. Responsive (viewBox, width 100 %); narrow (390px) a horizontally scrolling strip. Texts from config/vision-hof.ts.
import { HOF } from "@/config/vision-hof";
import { cn } from "@/lib/utils";

const SHARED = "fill-(--adm-hof-shared)";
const PRIVATE = "fill-(--adm-hof-private)";
const GUEST = "fill-(--adm-hof-guest)";
const SLOT = 200;
const CY = 92;

/** A ring segment between two angles (degrees, 0 = up, clockwise). */
function arc(cx: number, cy: number, rOuter: number, rInner: number, from: number, to: number) {
  const p = (r: number, a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`;
  };
  const large = to - from > 180 ? 1 : 0;
  return `M${p(rOuter, from)} A${rOuter},${rOuter} 0 ${large} 1 ${p(rOuter, to)} L${p(rInner, to)} A${rInner},${rInner} 0 ${large} 0 ${p(rInner, from)} Z`;
}

/** A ring of rooms around a round middle, one slot left as the gate (at the bottom). */
function Ring({ cx, cy, outer, inner, middle, slots }: { cx: number; cy: number; outer: number; inner: number; middle: number; slots: number }) {
  const step = 360 / slots;
  const gate = Math.floor(slots / 2);
  return (
    <g>
      {Array.from({ length: slots }, (_, i) => (
        <path key={i} d={arc(cx, cy, outer, inner, i * step + 2, (i + 1) * step - 2)} className={i === gate ? GUEST : PRIVATE} />
      ))}
      <circle cx={cx} cy={cy} r={middle} className={SHARED} />
    </g>
  );
}

/** Rooms on both sides (and on top) of a shared middle, the door at the bottom. */
function Rect({ cx, w, h, side, top }: { cx: number; w: number; h: number; side: number; top: number }) {
  const x = cx - w / 2;
  const y = CY - h / 2;
  const roomW = w * 0.28;
  const rows = Array.from({ length: side }, (_, i) => i);
  const roomH = (h - (top > 0 ? h * 0.24 : 0)) / side;
  const topH = top > 0 ? h * 0.24 : 0;
  const midX = x + roomW + 3;
  const midW = w - 2 * roomW - 6;
  return (
    <g>
      {top > 0 && Array.from({ length: top }, (_, i) => <rect key={`t${i}`} x={midX + (i * midW) / top + 1} y={y} width={midW / top - 2} height={topH - 3} rx={2} className={PRIVATE} />)}
      {rows.map((i) => (
        <rect key={`l${i}`} x={x} y={y + topH + i * roomH} width={roomW} height={roomH - 3} rx={2} className={PRIVATE} />
      ))}
      {rows.map((i) => (
        <rect key={`r${i}`} x={x + w - roomW} y={y + topH + i * roomH} width={roomW} height={roomH - 3} rx={2} className={PRIVATE} />
      ))}
      <rect x={midX} y={y + topH} width={midW} height={h - topH - 3} rx={3} className={SHARED} />
      <rect x={cx - 8} y={y + h - 1} width={16} height={7} rx={2} className={GUEST} />
    </g>
  );
}

/** A block with rooms all round an inner courtyard, the gate at the bottom. */
function Block({ cx }: { cx: number }) {
  const w = 156;
  const h = 128;
  const x = cx - w / 2;
  const y = CY - h / 2;
  const d = 20;
  const across = 7;
  const down = 4;
  const cellW = w / across;
  const cellH = (h - 2 * d) / down;
  return (
    <g>
      {Array.from({ length: across }, (_, i) => (
        <rect key={`t${i}`} x={x + i * cellW + 1} y={y} width={cellW - 2} height={d - 2} rx={2} className={PRIVATE} />
      ))}
      {Array.from({ length: across }, (_, i) => (
        <rect key={`b${i}`} x={x + i * cellW + 1} y={y + h - d + 2} width={cellW - 2} height={d - 2} rx={2} className={i === Math.floor(across / 2) ? GUEST : PRIVATE} />
      ))}
      {Array.from({ length: down }, (_, i) => (
        <rect key={`l${i}`} x={x} y={y + d + i * cellH + 1} width={d - 2} height={cellH - 2} rx={2} className={PRIVATE} />
      ))}
      {Array.from({ length: down }, (_, i) => (
        <rect key={`r${i}`} x={x + w - d + 2} y={y + d + i * cellH + 1} width={d - 2} height={cellH - 2} rx={2} className={PRIVATE} />
      ))}
      <rect x={x + d + 4} y={y + d + 4} width={w - 2 * d - 8} height={h - 2 * d - 8} rx={4} className={SHARED} />
    </g>
  );
}

/** Six small rings around a square. */
function Village({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy={CY} r={17} className={SHARED} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        return <Ring key={i} cx={cx + 51 * Math.sin(a)} cy={CY - 51 * Math.cos(a)} outer={20} inner={13} middle={9} slots={6} />;
      })}
    </g>
  );
}

export function PatternScales({ compact = false, className }: { /** The block preview: no labels, no legend */ compact?: boolean; className?: string }) {
  // The preview: the drawings only, cropped close (the tallest shape spans about 130 of the 190 units around CY).
  const height = compact ? 146 : 230;
  return (
    <figure className={cn("min-w-0", className)}>
      {/* Narrow screens: the strip scrolls sideways; nothing runs out of the picture. */}
      <div className={cn(!compact && "overflow-x-auto overscroll-x-contain")}>
        <svg role="img" aria-label={HOF.scales.map((s) => `${s.label} ${s.people}`).join(" · ")} viewBox={compact ? `0 ${CY - 73} ${SLOT * 5} ${height}` : `0 0 ${SLOT * 5} ${height}`} className={cn("block h-auto w-full", !compact && "min-w-[560px]")}>
          <Rect cx={SLOT * 0.5} w={86} h={72} side={2} top={0} />
          <Rect cx={SLOT * 1.5} w={120} h={104} side={3} top={2} />
          <Ring cx={SLOT * 2.5} cy={CY} outer={66} inner={44} middle={34} slots={11} />
          <Block cx={SLOT * 3.5} />
          <Village cx={SLOT * 4.5} />
          {!compact &&
            HOF.scales.map((s, i) => (
              <text key={s.key} x={SLOT * i + SLOT / 2} y={height - 14} textAnchor="middle" className="fill-(--text) text-small">
                {s.label} <tspan className="fill-(--text-muted)">{s.people}</tspan>
              </text>
            ))}
        </svg>
      </div>
      {!compact && (
        <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink/70">
          {[
            { label: HOF.legend.shared, cls: "bg-(--adm-hof-shared)" },
            { label: HOF.legend.private, cls: "bg-(--adm-hof-private)" },
            { label: HOF.legend.guest, cls: "bg-(--adm-hof-guest)" },
          ].map((l) => (
            <span key={l.label} className="inline-flex items-center gap-2">
              <span aria-hidden className={cn("size-3 rounded-sm", l.cls)} />
              {l.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

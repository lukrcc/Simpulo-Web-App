"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Container } from "@/components/layout/Container";
import { CardTab } from "@/components/ui/CardTab";
import { NotchedCard } from "@/components/ui/NotchedCard";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { Img } from "@/components/ui/Img";
import { PlaceText } from "@/components/ui/PlaceText";
import { useFormat } from "@/i18n/format";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePageHidden } from "@/lib/usePageHidden";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { cn, firstName, firstSentence } from "@/lib/utils";

/** One cell switches this often – A, then B, then C, then A again. */
const TICK_MS = 5_000;
const CELL_COUNT = 3;
/** Crossfade of the switching cell (and of all three on shuffle). */
const FADE_MS = 600;
/** A House stays up for a full round (one tick per cell) – its photo zooms 1 → 1.06 over that time. */
const ZOOM_MS = TICK_MS * CELL_COUNT;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Cell positions by how many featured Houses there are – fewer than three never leave an empty cell. */
const CELL_LAYOUTS: Record<1 | 2 | 3, readonly string[]> = {
  1: ["col-span-12 row-span-2"], // A across the whole block
  2: ["col-span-7 row-span-2", "col-span-5 col-start-8 row-span-2"], // A + B, both full height
  3: [
    "col-span-7 row-span-2", // A
    "col-span-5 col-start-8 row-start-1", // B
    "col-span-5 col-start-8 row-start-2", // C
  ],
};

/** The next `n` Houses (indexes) after `cursor` in the featured order that aren't on screen – never one twice. */
function nextUnseen(shown: readonly number[], cursor: number, n: number, total: number): number[] {
  const picks: number[] = [];
  for (let i = 0; i < total && picks.length < n; i++) {
    const index = mod(cursor + i, total);
    if (!shown.includes(index) && !picks.includes(index)) picks.push(index);
  }
  return picks;
}

interface Rotation {
  /** House index per cell */
  shown: number[];
  /** Per cell: the House that was there before its last switch – stays mounted (invisible) while it fades out */
  previous: (number | null)[];
  /** Where the featured order continues */
  cursor: number;
  /** Single-cell switches since the last shuffle – the next one is cell ticks % cells */
  ticks: number;
  /** Every switch (tick or shuffle) – restarts the timer and the ring */
  steps: number;
  /** Shuffles – spin the icon */
  shuffles: number;
}

const initialRotation = (cells: number): Rotation => ({
  shown: Array.from({ length: cells }, (_, i) => i),
  previous: Array.from({ length: cells }, () => null),
  cursor: cells,
  ticks: 0,
  steps: 0,
  shuffles: 0,
});

/**
 * Desktop (≥ lg) top section: one large and two small featured Houses. Every 5 seconds ONE cell switches to the next
 * House that isn't on screen – A, B, C, A … – with a 600ms crossfade; each photo zooms slowly (Ken Burns) while it's
 * up. Shuffle switches all three at once and starts the round over at A. Every cell keeps its upcoming House mounted
 * (invisible), so the photo is loaded before it's shown. Pauses while hovered and while the tab is hidden; resuming
 * gives the cell a full 5 seconds. Reduced motion: no zoom, instant swaps.
 */
export function BentoTop({ stays }: { stays: Stay[] }) {
  const t = useTranslations("explore");
  const store = useStore();
  const items = stays.flatMap((stay) => {
    const host = findUser(store, stay.hostId);
    const guests = getCrew(store, stay).filter((u) => u.id !== stay.hostId);
    return host ? [{ stay, host, guests }] : [];
  });
  const cells = Math.min(items.length, CELL_COUNT);
  const canRotate = items.length > cells;

  const [rotation, setRotation] = useState<Rotation>(() => initialRotation(cells));
  const [hovered, setHovered] = useState(false);
  const pageHidden = usePageHidden();
  const reducedMotion = usePrefersReducedMotion();
  const switchingUntil = useRef(0);
  const running = canRotate && !hovered && !pageHidden;

  // The featured list changed size (data presets): start over.
  if (rotation.shown.length !== cells) setRotation(initialRotation(cells));

  /** A guard against a second switch while a crossfade is still running. */
  const claimSwitch = useCallback(() => {
    const now = performance.now();
    if (now < switchingUntil.current) return false;
    switchingUntil.current = now + FADE_MS + 50;
    return true;
  }, []);

  const tick = useCallback(() => {
    if (!claimSwitch()) return;
    setRotation((r) => {
      const cell = r.ticks % r.shown.length;
      const [next] = nextUnseen(r.shown, r.cursor, 1, items.length);
      if (next === undefined) return r;
      return {
        ...r,
        shown: r.shown.map((index, i) => (i === cell ? next : index)),
        previous: r.shown.map((index, i) => (i === cell ? index : null)),
        cursor: next + 1,
        ticks: r.ticks + 1,
        steps: r.steps + 1,
      };
    });
  }, [claimSwitch, items.length]);

  const shuffle = useCallback(() => {
    if (!claimSwitch()) return;
    setRotation((r) => {
      const picks = nextUnseen(r.shown, r.cursor, r.shown.length, items.length);
      // Fewer unseen Houses than cells: keep the rest where they are.
      const shown = r.shown.map((index, i) => picks[i] ?? index);
      return {
        shown,
        previous: r.shown.map((index, i) => (shown[i] !== index ? index : null)),
        cursor: (picks.at(-1) ?? r.cursor - 1) + 1,
        ticks: 0,
        steps: r.steps + 1,
        shuffles: r.shuffles + 1,
      };
    });
  }, [claimSwitch, items.length]);

  // One timeout per tick: every switch (tick or shuffle) and every resume after a pause starts a full 5 seconds.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(tick, TICK_MS);
    return () => clearTimeout(timer);
  }, [running, rotation.steps, tick]);

  if (items.length === 0 || rotation.shown.length !== cells) return null;
  const layout = CELL_LAYOUTS[cells as 1 | 2 | 3];
  const upcoming = canRotate ? nextUnseen(rotation.shown, rotation.cursor, cells, items.length) : [];
  const nextCell = rotation.ticks % cells;
  const firstRender = rotation.steps === 0;

  return (
    <Container className="hidden pt-6 lg:block">
      <section
        aria-label={t("featuredHouses")}
        aria-roledescription="carousel"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="grid h-[min(72vh,820px)] min-h-[560px] grid-cols-12 grid-rows-2 gap-6"
      >
        {rotation.shown.map((index, i) => {
          const shown = items[index];
          const large = i === 0;
          const previousIndex = rotation.previous[i];
          // Preloaded underneath: the House this cell gets on its next tick, and the one a shuffle would bring.
          const preload = [i === nextCell ? upcoming[0] : undefined, upcoming[i]];
          // Current on top; the one fading out and the preloaded ones underneath, invisible. One layer per House.
          const layers = [
            { index, visible: true, leaving: false },
            ...(previousIndex === null ? [] : [{ index: previousIndex, visible: false, leaving: true }]),
            ...preload.filter((p) => p !== undefined).map((p) => ({ index: p, visible: false, leaving: false })),
          ].filter((layer, n, all) => all.findIndex((l) => l.index === layer.index) === n);
          const fade: CSSProperties = reducedMotion ? { transition: "none" } : { transition: `opacity ${FADE_MS}ms ease-in-out` };
          return (
            // One clipped silhouette per cell, notched around its host tab (NotchedCard). Cell A is the hover group
            // for the shuffle control.
            <NotchedCard
              key={i}
              className={cn(layout[i], large && "group/a")}
              clipClassName="rounded-[28px] bg-ink"
              tabKey={shown.stay.id}
              tab={
                // One tab per cell: only the avatar and name fade in with the cell.
                <CardTab
                  key={`tab-${shown.stay.id}`}
                  host={shown.host}
                  contentClassName={previousIndex !== null && !reducedMotion ? "bento-swap-in" : undefined}
                />
              }
            >
              {layers.map((layer) => (
                // key = House: the preloaded layer becomes the visible one, so its loaded photo is reused as is.
                <div
                  key={items[layer.index].stay.id}
                  aria-hidden={!layer.visible}
                  inert={!layer.visible}
                  style={fade}
                  className={cn("absolute inset-0", layer.visible ? "opacity-100" : "opacity-0")}
                >
                  <CellLayer
                    {...items[layer.index]}
                    large={large}
                    // Zooms while on screen and while fading out (no jump back); paused with the timer.
                    zoom={!reducedMotion && (layer.visible || layer.leaving)}
                    zoomPaused={!running}
                    eager={layer.visible}
                    preload={firstRender && layer.visible && large}
                  />
                </div>
              ))}

              <Link
                href={`/house/${shown.stay.slug}`}
                aria-label={t("houseWithHost", { title: shown.stay.title, host: firstName(shown.host) })}
                className="absolute inset-0 cursor-pointer"
              />
              {large && canRotate && (
                <ShuffleButton
                  label={t("nextHouses")}
                  steps={rotation.steps}
                  shuffles={rotation.shuffles}
                  running={running}
                  showRing={!reducedMotion}
                  onClick={shuffle}
                />
              )}
            </NotchedCard>
          );
        })}
      </section>
    </Container>
  );
}

/** The 40px ring: r = 19 with a 2px stroke, so the stroke sits just inside the edge. */
const RING_SIZE = 40;
const RING_RADIUS = 19;

interface ShuffleButtonProps {
  label: string;
  /** Switches so far (ticks and shuffles) – each one restarts the ring */
  steps: number;
  /** Shuffles so far – each one spins the icon */
  shuffles: number;
  /** False while paused (hover, hidden tab): the ring holds; resuming starts it over, like the timer */
  running: boolean;
  /** Off under reduced motion: no ring, just the icon. */
  showRing: boolean;
  onClick: () => void;
}

/**
 * Shuffle control, bottom-right of cell A: by default only a thin ring (35%) that fills over the 5 seconds to the next
 * switch; hovering cell A (or focusing the button) brightens it and fades in the icon on a glass circle.
 */
function ShuffleButton({ label, steps, shuffles, running, showRing, onClick }: ShuffleButtonProps) {
  const gradientId = useId();
  const progressRef = useRef<SVGCircleElement>(null);
  const fillRef = useRef<Animation | null>(null);

  const lastSteps = useRef(steps);

  // Web Animations API: a pause freezes the ring where it is; a switch empties it (also while paused, e.g. a shuffle
  // click with the pointer on the bento); running again starts a fresh fill, like the timer's fresh 5 seconds.
  useEffect(() => {
    const ring = progressRef.current;
    if (!ring) return;
    const switched = steps !== lastSteps.current;
    lastSteps.current = steps;
    if (!running && !switched) {
      fillRef.current?.pause();
      return;
    }
    fillRef.current?.cancel();
    fillRef.current = ring.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: TICK_MS, easing: "linear", fill: "forwards" });
    if (!running) fillRef.current.pause();
  }, [steps, running, showRing]);

  // Unmount (or ring hidden): drop the fill so a remounted ring starts fresh.
  useEffect(
    () => () => {
      fillRef.current?.cancel();
      fillRef.current = null;
    },
    [showRing],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group/shuffle absolute bottom-10 right-10 z-20 flex size-10 items-center justify-center rounded-full text-white outline-none transition-[background-color,backdrop-filter] duration-200",
        "group-hover/a:bg-[rgba(20,20,22,0.45)] group-hover/a:backdrop-blur-[16px] focus-visible:bg-[rgba(20,20,22,0.45)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent",
        // Reduced motion has no ring – the icon is all there is, so it stays visible.
        !showRing && "bg-[rgba(20,20,22,0.45)]",
      )}
    >
      {showRing && (
        <svg
          aria-hidden
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          // -rotate-90: the stroke starts at 12 o'clock.
          className="pointer-events-none absolute inset-0 -rotate-90 opacity-35 transition-opacity duration-200 group-hover/a:opacity-100 group-focus-visible/shuffle:opacity-100"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F7A27A" />
              <stop offset="100%" stopColor="#F0633A" />
            </linearGradient>
          </defs>
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={2} className="stroke-white/40" />
          <circle
            ref={progressRef}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            strokeLinecap="round"
            // pathLength 100: dash offsets are percentages of the circle. Starts empty until the fill runs.
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100}
          />
        </svg>
      )}
      <RefreshCw
        className={cn(
          "size-4.5 transition-opacity duration-200 motion-safe:transition-[opacity,transform] motion-safe:duration-900 motion-safe:ease-in-out",
          showRing && "opacity-0 group-hover/a:opacity-100 group-focus-visible/shuffle:opacity-100",
        )}
        style={{ transform: `rotate(${shuffles * 360}deg)` }}
        aria-hidden
      />
    </button>
  );
}

interface CellLayerProps {
  stay: Stay;
  host: User;
  guests: User[];
  large: boolean;
  /** Ken Burns on the photo (transform only) */
  zoom: boolean;
  zoomPaused: boolean;
  /** On screen: load right away (above the fold) */
  eager: boolean;
  /** Cell A on first render – the LCP image */
  preload: boolean;
}

/** Photo + text of one House in a cell – they fade as one layer (see BentoTop). */
function CellLayer({ stay, host, guests, large, zoom, zoomPaused, eager, preload }: CellLayerProps) {
  const t = useTranslations("explore");
  const format = useFormat();
  const zoomStyle: CSSProperties | undefined = zoom ? { animationDuration: `${ZOOM_MS}ms`, animationPlayState: zoomPaused ? "paused" : "running" } : undefined;

  return (
    <>
      <div className="absolute inset-0">
        <div style={zoomStyle} className={cn("absolute inset-0 will-change-transform", zoom && "animate-kenburns")}>
          <Img
            src={host.photos[0]}
            alt={t("cards.hostAlt", { name: host.name, title: stay.title })}
            fill
            preload={preload}
            loading={eager && !preload ? "eager" : undefined}
            sizes={large ? "(min-width: 1600px) 900px, 58vw" : "(min-width: 1600px) 640px, 42vw"}
            className="object-cover"
          />
        </div>
        {/* Bottom 55%: transparent → 70% black, eased through a midpoint so it stays soft. */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 via-25% to-transparent to-55%" />
      </div>

      <div className={cn("pointer-events-none absolute text-white", large ? "inset-x-10 bottom-10 pr-16" : "inset-x-8 bottom-8")}>
        <h2 className={cn("line-clamp-2 font-bold leading-[1.05] tracking-[-0.02em]", large ? "text-[clamp(32px,3.4vw,48px)]" : "text-2xl")}>
          {stay.title}
        </h2>
        {large && <p className="mt-3 line-clamp-2 max-w-xl text-lg text-white/90">{firstSentence(stay.lookingForText)}</p>}
        <p className={cn("flex items-center gap-1.5 text-sm text-white/80", large ? "mt-3" : "mt-2")}>
          <span className="shrink-0">{format.shortRange(stay.startDate, stay.endDate)} ·</span>
          {/* "City, Region" in every cell ("Sant Josep, Ibiza"). */}
          <PlaceText>{format.shortPlaceLabel(stay)}</PlaceText>
          {stay.language && stay.language !== "en" && (
            <span className="shrink-0 text-white/65">· {format.language(stay.language)}</span>
          )}
        </p>
        {/* All three cells: the crew (or "Just opened"), bottom-left. */}
        <div className={large ? "mt-4" : "mt-3"}>
          <CrewAvatars host={host} members={guests} />
        </div>
      </div>
    </>
  );
}

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

/** One set of three Houses stays up this long. */
const CYCLE_MS = 9_000;
const CELL_COUNT = 3;
/** Crossfade per cell; A starts first, B and C follow by the stagger. */
const FADE_MS = 500;
const STAGGER_MS = 80;
/** Longest switch (C: 160ms delay + 500ms fade), rounded up – manual switches are ignored until it's over. */
const SWITCH_MS = 700;

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

/**
 * The featured Houses in their stable order, in sets of three; a short last set is filled from the start of the list
 * (never with a House it already shows). Fewer than three Houses: one set with all of them.
 */
function setsOf<T extends { stay: Stay }>(items: T[]): T[][] {
  if (items.length <= CELL_COUNT) return [items];
  const sets: T[][] = [];
  for (let start = 0; start < items.length; start += CELL_COUNT) {
    const set = items.slice(start, start + CELL_COUNT);
    for (let i = 0; set.length < CELL_COUNT; i++) {
      if (!set.some((item) => item.stay.id === items[i].stay.id)) set.push(items[i]);
    }
    sets.push(set);
  }
  return sets;
}

interface Rotation {
  /** The set on screen */
  current: number;
  /** The set that was on screen before the last switch – stays mounted (invisible) while it fades out */
  previous: number | null;
  /** Switches so far – restarts the timer and the ring, spins the shuffle icon */
  steps: number;
}

/**
 * Desktop (≥ lg) top section: one large and two small featured Houses. Every 9 seconds all three cells switch to the
 * next set at the same time – a short crossfade per cell, A first. Each cell also keeps the next set's House mounted
 * (invisible), so its photo is loaded before it's shown. Pauses while hovered and while the tab is hidden, then gives
 * the set a full 9 seconds again. Reduced motion: no automatic switching, the shuffle button swaps instantly.
 */
export function BentoTop({ stays }: { stays: Stay[] }) {
  const t = useTranslations("explore");
  const store = useStore();
  const items = stays.flatMap((stay) => {
    const host = findUser(store, stay.hostId);
    const guests = getCrew(store, stay).filter((u) => u.id !== stay.hostId);
    return host ? [{ stay, host, guests }] : [];
  });
  const sets = setsOf(items);
  const canRotate = sets.length > 1;

  const [rotation, setRotation] = useState<Rotation>({ current: 0, previous: null, steps: 0 });
  const [hovered, setHovered] = useState(false);
  const pageHidden = usePageHidden();
  const reducedMotion = usePrefersReducedMotion();
  const switchingUntil = useRef(0);
  const running = canRotate && !hovered && !pageHidden && !reducedMotion;

  const advance = useCallback(() => {
    const now = performance.now();
    if (now < switchingUntil.current) return;
    switchingUntil.current = now + SWITCH_MS;
    setRotation((r) => ({ current: mod(r.current + 1, sets.length), previous: r.current, steps: r.steps + 1 }));
  }, [sets.length]);

  // One timeout per set: every switch (auto or shuffle) and every resume after a pause starts a full cycle.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(advance, CYCLE_MS);
    return () => clearTimeout(timer);
  }, [running, rotation.steps, advance]);

  if (items.length === 0) return null;
  const current = sets[mod(rotation.current, sets.length)];
  const layout = CELL_LAYOUTS[Math.min(current.length, CELL_COUNT) as 1 | 2 | 3];
  const previous = rotation.previous === null ? undefined : sets[mod(rotation.previous, sets.length)];
  const next = canRotate ? sets[mod(rotation.current + 1, sets.length)] : undefined;

  return (
    <Container className="hidden pt-6 lg:block">
      <section
        aria-label={t("featuredHouses")}
        aria-roledescription="carousel"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="grid h-[min(72vh,820px)] min-h-[560px] grid-cols-12 grid-rows-2 gap-6"
      >
        {current.map((shown, i) => {
          const large = i === 0;
          // Current on top; the one fading out and the preloaded next one underneath, invisible. One layer per House.
          const layers = [
            { item: shown, visible: true },
            ...[previous?.[i], next?.[i]].filter((item) => item !== undefined).map((item) => ({ item, visible: false })),
          ].filter((layer, index, all) => all.findIndex((l) => l.item.stay.id === layer.item.stay.id) === index);
          const fade: CSSProperties = reducedMotion
            ? { transition: "none" }
            : { transition: `opacity ${FADE_MS}ms ease-in-out ${i * STAGGER_MS}ms` };
          return (
            // One clipped silhouette per cell, notched around its host tab (NotchedCard).
            <NotchedCard
              key={i}
              style={{ "--stagger": `${i * STAGGER_MS}ms` } as CSSProperties}
              className={layout[i]}
              clipClassName="rounded-[28px] bg-ink"
              tabKey={shown.stay.id}
              tab={
                // One tab per cell: only the avatar and name fade in with the cell.
                <CardTab
                  key={`tab-${shown.stay.id}`}
                  host={shown.host}
                  contentClassName={rotation.previous !== null && !reducedMotion ? "bento-swap-in" : undefined}
                />
              }
            >
              {layers.map(({ item, visible }) => (
                // key = House: the preloaded layer becomes the visible one, so its loaded photo is reused as is.
                <div
                  key={item.stay.id}
                  aria-hidden={!visible}
                  inert={!visible}
                  style={fade}
                  className={cn("absolute inset-0", visible ? "opacity-100" : "opacity-0")}
                >
                  <CellLayer {...item} large={large} />
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
                  running={running}
                  showRing={!reducedMotion}
                  onClick={advance}
                />
              )}
            </NotchedCard>
          );
        })}
      </section>
    </Container>
  );
}

/** Ring around the 44px button: r = 24 with a 2px stroke, so it sits ~1px outside the button edge. */
const RING_SIZE = 52;
const RING_RADIUS = 24;

interface ShuffleButtonProps {
  label: string;
  /** Switches so far (auto or manual) – each one spins the icon and restarts the ring */
  steps: number;
  /** False while paused (hover, hidden tab): the ring holds; resuming starts it over, like the timer */
  running: boolean;
  /** Off under reduced motion: no ring and no auto-switching, just a static icon. */
  showRing: boolean;
  onClick: () => void;
}

/** Shuffle button whose ring fills over the 9-second cycle; every switch and every resume starts it from empty. */
function ShuffleButton({ label, steps, running, showRing, onClick }: ShuffleButtonProps) {
  const gradientId = useId();
  const progressRef = useRef<SVGCircleElement>(null);
  const fillRef = useRef<Animation | null>(null);

  const lastSteps = useRef(steps);

  // Web Animations API: a pause freezes the ring where it is; a switch empties it (also while paused, e.g. a shuffle
  // click with the pointer on the bento); running again starts a fresh fill, like the timer's fresh 9 seconds.
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
    fillRef.current = ring.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: CYCLE_MS, easing: "linear", fill: "forwards" });
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
      className="group absolute bottom-6 right-6 z-20 flex size-11 items-center justify-center rounded-full border border-white/18 bg-[rgba(20,20,22,0.45)] text-white outline-none backdrop-blur-[16px] transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-accent"
    >
      {showRing && (
        <svg
          aria-hidden
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          // -rotate-90: the stroke starts at 12 o'clock.
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F7A27A" />
              <stop offset="100%" stopColor="#F0633A" />
            </linearGradient>
          </defs>
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={2}
            className="stroke-white/18 transition-[stroke] duration-200 group-hover:stroke-white/30"
          />
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
        className="size-5 motion-safe:transition-transform motion-safe:duration-900 motion-safe:ease-in-out"
        style={{ transform: `rotate(${steps * 360}deg)` }}
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
}

/** Photo + text of one House in a cell – they fade as one layer (see BentoTop). */
function CellLayer({ stay, host, guests, large }: CellLayerProps) {
  const t = useTranslations("explore");
  const format = useFormat();

  return (
    <>
      <div className="absolute inset-0">
        <Img
          src={host.photos[0]}
          alt={t("cards.hostAlt", { name: host.name, title: stay.title })}
          fill
          sizes={large ? "(min-width: 1600px) 900px, 58vw" : "(min-width: 1600px) 640px, 42vw"}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 to-transparent to-60%" />
      </div>

      <div className={cn("pointer-events-none absolute inset-x-8 bottom-8 text-white", large && "pr-20")}>
        <h2 className={cn("line-clamp-2 font-bold tracking-tight", large ? "text-[clamp(32px,3.4vw,48px)] leading-[1.05]" : "text-2xl")}>
          {stay.title}
        </h2>
        {large && <p className="mt-3 line-clamp-2 max-w-xl text-lg text-white/90">{firstSentence(stay.lookingForText)}</p>}
        <p className={cn("flex items-center gap-1.5 text-sm text-white/80", large ? "mt-3" : "mt-1")}>
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

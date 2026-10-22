"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Container } from "@/components/layout/Container";
import { CardTab } from "@/components/ui/CardTab";
import { CrewAvatars } from "@/components/ui/CrewAvatars";
import { Img } from "@/components/ui/Img";
import { PlaceText } from "@/components/ui/PlaceText";
import { findUser, getCrew, useStore } from "@/lib/store";
import type { Stay, User } from "@/lib/types";
import { usePageHidden } from "@/lib/usePageHidden";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { cn, firstName, firstSentence, formatShortRange, placeLabel } from "@/lib/utils";

const STEP_INTERVAL_MS = 7_000;
const CELL_COUNT = 3;
/** Delay between cells A → B → C, so a house reads as walking C → B → A. */
const STAGGER_MS = 120;
/** Longest animation (C: 240ms delay + 600ms image fade-in), rounded up. Steps are ignored until it's over. */
const TRANSITION_MS = 900;

/**
 * Pipeline C → B → A → out over the featured list, driven by one queue index:
 * A = featured[i], B = featured[i + 1], C = featured[i + 2] (wrapping). A step is i + 1 – A's house leaves,
 * B's moves to A, C's to B, and the next one enters C. `previousIndex` keeps the outgoing houses mounted
 * so every cell can crossfade.
 */
interface Pipeline {
  queueIndex: number;
  previousIndex: number | null;
  /** Total steps so far – drives the shuffle icon's rotation. */
  steps: number;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

const CELL_LAYOUT = [
  "col-span-7 row-span-2", // A
  "col-span-5 col-start-8 row-start-1", // B
  "col-span-5 col-start-8 row-start-2", // C
] as const;

/** Desktop (≥ lg) top section: one large and two small featured Houses moving through a pipeline. */
export function BentoTop({ stays }: { stays: Stay[] }) {
  const store = useStore();
  const items = stays.flatMap((stay) => {
    const host = findUser(store, stay.hostId);
    const guests = getCrew(store, stay).filter((u) => u.id !== stay.hostId);
    return host ? [{ stay, host, guests }] : [];
  });
  const count = items.length;
  const cellCount = Math.min(CELL_COUNT, count);
  const canRotate = count > CELL_COUNT;

  const [pipeline, setPipeline] = useState<Pipeline>({ queueIndex: 0, previousIndex: null, steps: 0 });
  /** Bumped by a manual step so the 7s interval starts over. */
  const [intervalKey, setIntervalKey] = useState(0);
  const pageHidden = usePageHidden();
  const reducedMotion = usePrefersReducedMotion();
  /** Steps arriving while a transition runs are dropped – no stacking, no skipped frames. */
  const animatingUntil = useRef(0);

  const advance = useCallback((): boolean => {
    const now = performance.now();
    if (now < animatingUntil.current) return false;
    animatingUntil.current = now + TRANSITION_MS;
    setPipeline((p) => ({ queueIndex: mod(p.queueIndex + 1, count), previousIndex: p.queueIndex, steps: p.steps + 1 }));
    return true;
  }, [count]);

  // One interval for the auto steps. Paused only while the tab is hidden or under reduced motion – not on hover.
  useEffect(() => {
    if (!canRotate || pageHidden || reducedMotion) return;
    const timer = setInterval(advance, STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [advance, canRotate, pageHidden, reducedMotion, intervalKey]);

  function manualStep() {
    if (advance()) setIntervalKey((k) => k + 1);
  }

  if (count === 0) return null;

  return (
    <Container className="hidden pt-6 lg:block">
      <section
        aria-label="Featured Houses"
        aria-roledescription="carousel"
        className="grid h-[70vh] min-h-[560px] grid-cols-12 grid-rows-2 gap-6"
      >
        {Array.from({ length: cellCount }, (_, i) => {
          const large = i === 0;
          const current = items[mod(pipeline.queueIndex + i, count)];
          const previous =
            pipeline.previousIndex === null ? undefined : items[mod(pipeline.previousIndex + i, count)];
          const animating = previous !== undefined && previous.stay.id !== current.stay.id;
          const stagger = { "--stagger": `${i * STAGGER_MS}ms` } as CSSProperties;
          return (
            // rounded-tl-none: the host tab covers that corner (see CardTab).
            <div
              key={i}
              style={stagger}
              className={cn("relative overflow-hidden rounded-[28px] rounded-tl-none bg-ink", CELL_LAYOUT[i])}
            >
              {animating && (
                <div key={`out-${previous.stay.id}`} aria-hidden inert className="absolute inset-0">
                  <CellLayer {...previous} large={large} phase="out" />
                </div>
              )}
              {/* key = house: a new house remounts the layer, which replays the animation. */}
              <div key={current.stay.id} className="absolute inset-0">
                <CellLayer {...current} large={large} phase={animating ? "in" : "static"} />
              </div>

              <Link
                href={`/stays/${current.stay.slug}`}
                aria-label={`${current.stay.title} with ${firstName(current.host)}`}
                className="absolute inset-0 cursor-pointer"
              />
              {/* Same cell state as the image and text, so tab, text and photo always change together.
                  One tab per cell keeps its page-coloured background solid – only the avatar and name fade. */}
              <CardTab
                key={`tab-${current.stay.id}`}
                host={current.host}
                contentClassName={animating ? "bento-text-in" : undefined}
              />

              {large && canRotate && (
                <button
                  type="button"
                  onClick={manualStep}
                  aria-label="Next houses"
                  className="glass-dark pulse-ring absolute bottom-6 right-6 z-20 flex size-14 items-center justify-center rounded-full text-white outline-none transition-transform hover:scale-106 focus-visible:ring-2 focus-visible:ring-white"
                >
                  <RefreshCw
                    className="size-[22px] motion-safe:transition-transform motion-safe:duration-900 motion-safe:ease-in-out"
                    style={{ transform: `rotate(${pipeline.steps * 360}deg)` }}
                    aria-hidden
                  />
                </button>
              )}
            </div>
          );
        })}
      </section>
    </Container>
  );
}

interface CellLayerProps {
  stay: Stay;
  host: User;
  guests: User[];
  large: boolean;
  /** "in"/"out" while a step animates; "static" on first render */
  phase: "in" | "out" | "static";
}

/** Photo + text of one House in a cell. Image and text animate separately (see .bento-* in globals.css). */
function CellLayer({ stay, host, guests, large, phase }: CellLayerProps) {
  const imageAnimation = phase === "in" ? "bento-img-in" : phase === "out" ? "bento-img-out" : undefined;
  const textAnimation = phase === "in" ? "bento-text-in" : phase === "out" ? "bento-text-out" : undefined;

  return (
    <>
      <div className={cn("absolute inset-0 will-change-[opacity,transform]", imageAnimation)}>
        <Img
          src={host.photos[0]}
          alt=""
          fill
          sizes={large ? "(min-width: 1600px) 900px, 58vw" : "(min-width: 1600px) 640px, 42vw"}
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 to-transparent to-60%" />
      </div>

      <div className={cn("pointer-events-none absolute inset-x-8 bottom-8 text-white", large && "pr-20", textAnimation)}>
        <h2 className={cn("font-bold tracking-tight", large ? "line-clamp-2 text-5xl" : "line-clamp-1 text-2xl")}>
          {stay.title}
        </h2>
        {large && <p className="mt-3 line-clamp-2 max-w-xl text-lg text-white/90">{firstSentence(stay.lookingForText)}</p>}
        <p className={cn("flex items-center gap-1.5 text-sm text-white/80", large ? "mt-3" : "mt-1")}>
          <span className="shrink-0">{formatShortRange(stay.startDate, stay.endDate)} ·</span>
          <PlaceText>{large ? placeLabel(stay) : stay.city}</PlaceText>
        </p>
        {large && (
          <div className="mt-4">
            <CrewAvatars host={host} members={guests} />
          </div>
        )}
      </div>
    </>
  );
}
